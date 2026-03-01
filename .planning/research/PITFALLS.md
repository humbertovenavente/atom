# Pitfalls Research

**Domain:** Multi-agent AI chatbot backend (car dealership, LangChain.js + Gemini + MongoDB + Vercel SSE)
**Researched:** 2026-02-28
**Confidence:** MEDIUM (verified against official docs and GitHub issues; some Analog.js-specific SSE behavior could not be confirmed in production)

---

## Critical Pitfalls

### Pitfall 1: @langchain/google-genai Package Is Deprecated and Broken for Structured Output

**What goes wrong:**
`@langchain/google-genai` is based on the old `@google/generative-ai` SDK (now deprecated). It is not maintained and has a documented bug where `.withStructuredOutput()` defaults to tool-calling extraction instead of Gemini's native JSON schema mode. This produces inferior JSON generation results — the model hallucinates field names, omits required keys, or returns null for populated fields. The new replacement package (`@langchain/google`) was in alpha as of January 2026.

**Why it happens:**
Developers install `@langchain/google-genai` because it appears in most tutorials and the LangChain docs still reference it. The deprecation is buried in GitHub discussions, not prominently flagged in npm or the main docs. The bug causes silent failures: `.withStructuredOutput()` calls succeed but return degraded output.

**How to avoid:**
Use the newer `@langchain/google` package if available and stable (check npm on the day of the hackathon). If still in alpha, use `@langchain/google-genai` but pass `method: "json_schema"` explicitly to `.withStructuredOutput()` so Gemini uses `responseMimeType: "application/json"` + `responseSchema` instead of tool calling. Alternatively, use the direct Google Generative AI SDK (`@google/genai`) and skip LangChain for the Gemini call layer.

**Warning signs:**
- Structured output returns `null` fields that should have values
- Agent reasoning is correct but field extraction fails
- Schema validation errors appearing inconsistently (not every call)
- Response times are faster than expected (tool-calling path is different)

**Phase to address:** Phase 1 — Validate LLM integration and structured output before building agent pipeline.

---

### Pitfall 2: SSE Stream Silently Closes on Vercel Without Explicit Flush

**What goes wrong:**
SSE connections using h3's `createEventStream` experience 10–30 second connection delays or silent closure on Vercel deployments, even though they work perfectly locally. The issue is that Vercel's infrastructure buffers responses. Without an explicit `flushHeaders()` call and proper `Content-Type: text/event-stream` + `Cache-Control: no-cache` + `Connection: keep-alive` headers, the response is held in a buffer and the client receives nothing until the function times out or completes — defeating the purpose of streaming.

**Why it happens:**
H3's `createEventStream` is documented as experimental. Vercel wraps the Node.js Lambda execution with AWS Lambda's response streaming, and the buffering behavior differs from local Node.js. The Analog.js abstraction layer adds another indirection between h3 event handlers and the actual HTTP response, making it unclear when headers are flushed.

**How to avoid:**
Use `event.node.res.flushHeaders()` immediately after setting SSE headers, before any `await` call. Test SSE behavior in a deployed Vercel Preview environment during development — not just locally. Add the Vercel `maxDuration` config to the function (minimum 60s for Hobby, up to 300s). Use `event.node.res.write()` with explicit `\n\n` terminators on each SSE event rather than relying on h3 abstractions if h3 createEventStream proves unreliable.

**Warning signs:**
- SSE works locally but frontend receives no events on Vercel preview
- First event arrives only after LLM completes (buffer flushed at end)
- 504 timeout errors on Vercel before any SSE data arrives
- Frontend connection hangs for 10–30 seconds before first `agent_active` event

**Phase to address:** Phase 1 — Prove SSE works on Vercel before building agent pipeline on top of it. Do not assume local behavior matches Vercel.

---

### Pitfall 3: MongoDB Connections Exhausted Under Concurrent Serverless Invocations

**What goes wrong:**
Each Vercel serverless function invocation creates a new Mongoose connection if no cached connection exists. Under concurrent requests (multiple hackathon judges testing simultaneously), this spawns more connections than MongoDB Atlas M0 free tier allows (500 connections max). When the connection limit is hit, new requests fail with `MongoServerError: too many connections`, crashing the entire API.

**Why it happens:**
Serverless functions do not share memory across invocations. The standard fix — caching the connection in a module-level variable — only works within a single warm function container. Concurrent requests may spawn 10–30 separate containers each with their own connection pool (default pool size: 5 per driver). With 30 concurrent invocations: 30 × 5 = 150 connections, already 30% of the M0 limit.

**How to avoid:**
Use a global cached connection pattern:
```typescript
declare global { var _mongooseConn: typeof mongoose | null; }
if (!global._mongooseConn) {
  global._mongooseConn = await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 3, // Low pool size for serverless
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  });
}
```
Set `maxPoolSize: 3` (not the default 5) to stay within Atlas M0 limits. Use `bufferCommands: false` to fail fast instead of queuing when disconnected. Add connection state check (`mongoose.connection.readyState === 1`) before attempting to reconnect.

**Warning signs:**
- Intermittent `MongoServerError: too many connections` during demo
- API works fine alone but crashes when 2+ users hit it simultaneously
- Connection errors in logs without corresponding application errors
- Atlas dashboard shows connection spikes at request peaks

**Phase to address:** Phase 1 — Implement the cached connection pattern before any feature work. Test with concurrent requests using `k6` or `curl` in parallel.

---

### Pitfall 4: Validator Agent Loses Collected Data When Intent Changes Mid-Conversation

**What goes wrong:**
The validator agent for FAQs collects `clientType`, `employmentType`, and `age` across multiple turns. If the user sends a message that looks like a different intent (e.g., "what cars do you have?" mid-FAQ validation), the orchestrator re-classifies to Catalog intent and discards the partially-collected FAQ validation state. The user must start over. Worse, if intent continuity logic is not implemented, the orchestrator re-classifies on every turn, making validation impossible.

**Why it happens:**
The orchestrator sees each message in isolation and routes based on the current message content, not the conversation state. Validation requires session-scoped state: "we are currently in FAQ validation, waiting for employmentType." This state must be persisted in MongoDB and checked by the orchestrator before re-classifying intent. This is easy to forget and invisible in unit testing.

**How to avoid:**
Store `currentIntent` and `collectedFields` in the MongoDB session document after every validator turn. The orchestrator must check `session.currentIntent` first: if it's set and the validator is still awaiting fields, forward the message to the active validator without re-classifying. Only clear `currentIntent` when the specialist agent returns a final response. Implement a `validationComplete` flag so the orchestrator knows when to proceed.

**Warning signs:**
- Validation questions restart from the beginning mid-conversation
- User can escape a validation loop by sending an off-topic message
- Session document in MongoDB has `currentIntent: null` during active validation
- Specialist agent fires before all required fields are collected

**Phase to address:** Phase 2 — Orchestrator and intent routing. Validate with an end-to-end conversation simulation test before moving to specialist agents.

---

### Pitfall 5: LLM Output Wraps JSON in Markdown Code Blocks, Breaking Parsers

**What goes wrong:**
Gemini (and most LLMs) occasionally wrap their JSON output in markdown code fences (` ```json ... ``` `) even when instructed not to. This causes `JSON.parse()` to throw, crashing the agent chain. This happens intermittently (not every call), making it hard to reproduce in testing but highly likely to occur during a live demo.

**Why it happens:**
LLMs are trained on data where JSON-in-text is formatted with code fences. Without native JSON mode (see Pitfall 1), the model treats the output as a text response and adds formatting. Even with native JSON mode, edge cases in the prompt or complex schema can trigger markdown wrapping. LangChain's `JsonOutputParser` handles this, but only if used — many developers use raw `JSON.parse()` instead.

**How to avoid:**
Never use raw `JSON.parse()` on LLM output. Use LangChain's `JsonOutputParser` which strips markdown code fences before parsing. Alternatively, implement a sanitizer:
```typescript
function extractJSON(text: string): object {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1] : text;
  return JSON.parse(raw.trim());
}
```
Use Zod schema validation after parsing to verify required fields are present. Add a retry wrapper: if parsing fails, re-invoke the LLM with an explicit "respond with raw JSON only, no markdown" instruction appended to the system prompt.

**Warning signs:**
- `JSON.parse` errors appearing intermittently in logs
- Works in testing (deterministic prompts) but fails in production (variable inputs)
- Error messages include "Unexpected token \`" or "Unexpected token j"
- Different error rates across different query types

**Phase to address:** Phase 2 — Implement and verify the JSON extraction pattern before building specialist agents that depend on structured output.

---

### Pitfall 6: Intent Classification Misroutes Ambiguous Messages, Triggering Wrong Agent

**What goes wrong:**
The orchestrator must classify messages into exactly 4 intents: `faqs`, `catalog`, `schedule`, `generic`. Ambiguous messages like "I want to know about financing options" could match FAQ or generic. "When can I visit?" could match schedule or generic. Misclassification fires the wrong specialist, which either returns irrelevant information or fails silently because it has no data to match. The user gets a confusing response and the demo fails.

**Why it happens:**
Few-shot examples in the classifier prompt are insufficient for edge cases. The LLM is asked to make a binary routing decision without a confidence signal. Without a "low confidence" path, every message forces a routing decision even when the right answer is "ask for clarification."

**How to avoid:**
Include a fifth output option: `{ "intent": "ambiguous", "reason": "..." }`. When the orchestrator receives `ambiguous`, route to the generic agent with instructions to ask a clarifying question. Provide 3–5 few-shot examples per intent class in the classifier prompt, including at least one ambiguous example. Test with a set of 15–20 messages covering edge cases before integrating with specialist agents. Use `temperature: 0` for the classifier to maximize determinism.

**Warning signs:**
- Scheduling agent responding to FAQ questions
- Generic agent activating for queries that should be routed to catalog
- Users receiving "I don't understand" for clear intent messages
- Log shows intent classification differs across identical messages (non-deterministic)

**Phase to address:** Phase 2 — Orchestrator setup. Validate classification against a test matrix of 20 messages before wiring agents.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Raw `JSON.parse()` on LLM output | Simpler code | Intermittent crash during demo when Gemini adds markdown fences | Never — use JsonOutputParser or a sanitizer |
| Skipping SSE flush validation on Vercel | Faster local dev | Silent streaming failure in production that appears only at demo time | Never — test on Vercel preview at the start |
| Default Mongoose `maxPoolSize` (5) | No config overhead | Connection exhaustion under concurrent demo judges | Acceptable in single-user dev; set to 3 before deploy |
| Trusting LangChain memory for session state | Less MongoDB code | State loss on cold starts or Lambda restarts; no cross-session persistence | Never for this project — MongoDB is required for the bonus |
| Hardcoding intent examples in orchestrator prompt | Quick to write | Brittle to new phrasing; hard to update without redeploying | Acceptable for 18-hour hackathon if at least 5 examples per intent |
| Skipping `bufferCommands: false` in Mongoose | Simpler startup | Requests queue indefinitely if DB is unavailable; Lambda times out silently | Never — fail fast is always better for debugging |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gemini via LangChain.js | Using `@langchain/google-genai` and trusting `.withStructuredOutput()` defaults | Pass `method: "json_schema"` explicitly, or validate that the package version you install actually supports native JSON mode |
| MongoDB Atlas M0 on Vercel | Creating a new connection per request | Cache connection in `global._mongooseConn` with `maxPoolSize: 3` |
| h3 SSE on Vercel | Not calling `res.flushHeaders()` before the first `await` | Set headers then flush synchronously before any async LLM call |
| Gemini `withStructuredOutput` | Using `z.union()` or `z.record()` in Zod schema | Google's structured output API does not support these — use flat objects and explicit optional fields |
| LangChain message history | Passing entire conversation history to every agent | Apply per-turn context window trimming; keep last N messages or summarize older ones |
| Vercel function timeout | Leaving default maxDuration | Add `export const maxDuration = 60` (Hobby: 300s max) in the route handler to prevent premature 504 |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Passing full conversation history to every agent | Slow responses as conversations grow; token costs spike | Keep last 10 messages for context; summarize or discard older turns | After 5–6 back-and-forth turns in a demo |
| Sequential agent invocations when parallel is possible | Each node in agent_active takes full LLM roundtrip time; demo feels slow | Pipeline agents so data fetching (catalog.json filter) runs while Gemini streams | Every multi-turn validation sequence |
| Cold start + MongoDB reconnect on first request | First request after 15-min idle takes 3–5 seconds; judges see spinner | Implement a health-check endpoint that keeps DB warm, or document cold start behavior | Every demo after any idle period |
| No timeout on Gemini API calls | One slow Gemini response blocks the SSE stream indefinitely | Set `AbortController` with 30s timeout on all Gemini calls | When Gemini API is slow (common during high-load periods like hackathon judging) |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing raw Gemini API key in client-side code or logs | Key theft; unexpected API costs | Keep key in server-only environment variables; never log it; never send it to frontend |
| No rate limiting on `/api/chat` | Demo can be DoS'd by automated requests; Gemini quota exhausted | Add simple in-memory rate limiting (5 req/min per sessionId) or use Vercel's Edge Middleware |
| Storing conversation history without sanitization | Prompt injection via crafted messages that rewrite agent instructions | Sanitize user input: strip system-role markers, reject messages over 2000 chars, log suspicious patterns |
| Using `eval()` or dynamic code execution from LLM output | RCE if LLM is manipulated | Never execute LLM output as code; treat all LLM output as untrusted data |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No error event sent over SSE when agent fails | Frontend hangs indefinitely; judges think the app is broken | Always send `{ event: "error", data: { message: "..." } }` on failure; frontend should show user-facing error message |
| Validator asks all missing fields in one message | Overwhelming; feels like a form, not a chat | Ask one field at a time; surface `validation_update` events so the visual editor lights up each node |
| Specialist agent responds before validator has confirmed all fields | Incomplete/wrong personalization; catalog shows all vehicles ignoring budget constraint | Strict field-completion gate in orchestrator before routing to specialist |
| `agent_active` events not sent during LLM processing | Visual editor shows no activity; judges can't see the multi-agent pipeline in action | Send `agent_active` immediately when routing begins, not after LLM responds |

---

## "Looks Done But Isn't" Checklist

- [ ] **SSE streaming:** Works locally — verify on a real Vercel Preview URL before calling it done. Look for `flushHeaders()` call before any `await`.
- [ ] **Intent continuity:** Orchestrator routes new turns to the active validator, not re-classifying every message. Verify with a multi-turn conversation test in Postman or curl.
- [ ] **MongoDB connection caching:** Cached connection pattern in place with `maxPoolSize: 3`. Verify with two concurrent requests from different terminals.
- [ ] **JSON parsing safety:** Every LLM output goes through `JsonOutputParser` or equivalent sanitizer. No raw `JSON.parse()` on raw LLM text.
- [ ] **Error SSE event:** Every `try/catch` in agent handlers sends `{ event: "error", data }` before closing the stream. Test by deliberately breaking the MongoDB URI.
- [ ] **`done` event sent:** SSE stream sends a `done` event after the specialist finishes. Frontend cannot know the stream is over without it.
- [ ] **Vercel `maxDuration`:** Function route exports `maxDuration` config. Verify with a slow Gemini response that the function doesn't 504 prematurely.
- [ ] **Zod schema compatibility:** No `z.union()` or `z.record()` in schemas passed to Gemini structured output. All schemas are flat objects or arrays.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SSE not working on Vercel | MEDIUM | Drop h3's `createEventStream`, implement raw `res.write()` + `res.flushHeaders()` pattern; takes ~1–2 hours |
| Structured output parsing failures in prod | LOW | Add a retry with sanitizer function around all `withStructuredOutput` calls; takes ~30 minutes |
| MongoDB connection exhaustion | LOW | Drop `maxPoolSize` to 2, redeploy; takes ~10 minutes |
| Validator state loss | HIGH | Requires adding `currentIntent` + `collectedFields` to MongoDB session schema and rewriting orchestrator routing; takes ~3–4 hours |
| Wrong LangChain package (google-genai deprecated issues) | MEDIUM | Swap package, update imports, test structured output; takes ~1–2 hours |
| Intent misclassification causing wrong agent | MEDIUM | Add few-shot examples + `ambiguous` intent path to classifier prompt; retune and redeploy; takes ~1 hour |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Deprecated `@langchain/google-genai` + structured output bug | Phase 1: Foundation & LLM integration | Verify `.withStructuredOutput()` returns all required fields on 10 test calls; check for null values |
| SSE silent closure on Vercel | Phase 1: Foundation & SSE endpoint | Deploy to Vercel Preview and test SSE in a browser EventSource before any agent code |
| MongoDB connection exhaustion | Phase 1: Foundation & database setup | Run 5 concurrent `curl` requests; confirm Atlas connection count stays under 50 |
| Validator state loss across turns | Phase 2: Orchestrator & intent routing | Run a simulated 5-turn conversation where user changes topic mid-validation; confirm state persists |
| LLM output markdown-wrapped JSON | Phase 2: Agent output parsing | Send 20 varied prompts; confirm all parse without error; inject a code-block-containing response in tests |
| Intent misclassification | Phase 2: Orchestrator & intent routing | Test 20-message classification matrix; verify 100% accuracy on clear intents, graceful fallback on ambiguous |
| No error SSE event on failure | Phase 3: Specialist agents | Deliberately break MongoDB URI; confirm frontend receives error event within 5 seconds |
| Missing `done` event | Phase 3: Specialist agents | Test each specialist; confirm frontend EventSource `onmessage` receives `done` type and closes connection |

---

## Sources

- [LangChain.js GitHub Issue #8585: Google Gemini not supporting native structured output](https://github.com/langchain-ai/langchainjs/issues/8585) — MEDIUM confidence (GitHub issue, confirmed by multiple comments)
- [What's Coming with LangChainJS and Gemini? (Dec 2025)](https://medium.com/@afirstenberg/whats-coming-with-langchainjs-and-gemini-dd3188fafbc8) — LOW confidence (single blog post, author is a Google developer)
- [Google GenAI Library Deprecated — LangChain.js Issue #8655](https://github.com/langchain-ai/langchainjs/issues/8655) — MEDIUM confidence (GitHub issue)
- [Vercel Functions Limits — Official Docs](https://vercel.com/docs/functions/limitations) — HIGH confidence (official Vercel documentation, fetched directly)
- [SSE issues with Vercel — h3 GitHub Issue #903](https://github.com/h3js/h3/issues/903) — MEDIUM confidence (GitHub issue with Vercel-specific reproduction)
- [Dangling SSE Streams — h3 GitHub Issue #1045](https://github.com/h3js/h3/issues/1045) — MEDIUM confidence (GitHub issue)
- [Keep a cached mongoose connection with serverless — Vercel Community Discussion #424](https://github.com/vercel/community/discussions/424) — MEDIUM confidence (community discussion with Vercel engineers)
- [LangChain.js OUTPUT_PARSING_FAILURE troubleshooting docs](https://js.langchain.com/docs/troubleshooting/errors/OUTPUT_PARSING_FAILURE) — MEDIUM confidence (official LangChain docs)
- [Intent Recognition and Auto-Routing in Multi-Agent Systems](https://gist.github.com/mkbctrl/a35764e99fe0c8e8c00b2358f55cd7fa) — LOW confidence (community gist)
- [Enhancing Intent Classification and Error Handling in Agentic LLM Applications](https://medium.com/@mr.murga/enhancing-intent-classification-and-error-handling-in-agentic-llm-applications-df2917d0a3cc) — LOW confidence (single blog post)
- [Gemini 2.0 Flash Models — Google AI Docs](https://ai.google.dev/gemini-api/docs/models) — HIGH confidence (official Google documentation)
- [Solving invisible scaling issues with Serverless and MongoDB — DEV.to](https://dev.to/adnanrahic/solving-invisible-scaling-issues-with-serverless-and-mongodb-4m55) — LOW confidence (single article, patterns are well-established)

---
*Pitfalls research for: Multi-agent AI chatbot backend (car dealership)*
*Researched: 2026-02-28*

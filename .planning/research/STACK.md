# Stack Research

**Domain:** Multi-agent AI chatbot backend (car dealership, hackathon)
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (verified with official docs and GitHub releases; some areas limited by network restrictions)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| langchain | ^1.2.28 | Chain orchestration, routing, memory wrappers | Current stable; provides RunnableSequence, LCEL pipe syntax, structured output, and streaming. Verified via GitHub releases (Feb 26, 2026). |
| @langchain/core | ^1.1.29 | Runnable primitives, schemas, streaming base | Peer dependency required by all @langchain/* packages. Version 1.x resolves the Zod v4/withStructuredOutput type inference bug that existed pre-1.0. |
| @langchain/google-genai | ^2.1.22 | ChatGoogleGenerativeAI wrapper for Gemini API | The only stable JS package for Gemini via AI Studio (Google API key). Note: the official docs warn this will be replaced by `@langchain/google` but that package is not yet released for JS as of Feb 2026. Use this for the hackathon. |
| @langchain/mongodb | ^0.0.x (latest) | MongoDBChatMessageHistory for session memory | Official LangChain MongoDB integration. MongoDBChatMessageHistory is in THIS package, not @langchain/community. Provides session-scoped conversation history backed by MongoDB collection. |
| mongoose | ^9.x | MongoDB ODM with schema validation | Mongoose 9.0 released Nov 2025; improved TypeScript inference (40% fewer manual type declarations), schemaLevelProjections, array virtuals. Faster development vs native driver because schema validation catches malformed data early. |
| zod | ^3.23.8 | Structured output schemas for intent classification | CRITICAL: Use Zod v3, NOT v4. Verified open GitHub issue (#8769): Zod v4 + Gemini + withStructuredOutput throws "schema should be of type OBJECT" errors. Zod v3 works correctly with all LangChain withStructuredOutput calls. |
| h3 | (bundled with Nitro) | SSE event stream, request/response helpers | Already available via Analog.js / Nitro. createEventStream() is the correct API for SSE; no additional install needed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mongodb | ^6.x | Native MongoDB driver | Required by @langchain/mongodb as peer dependency. Also use directly for non-Mongoose queries (e.g., low-level collection access in MongoDBChatMessageHistory). |
| dotenv | ^16.x | Environment variable loading in dev | Load GOOGLE_API_KEY, MONGODB_URI locally. In Vercel, env vars are set in dashboard. |
| typescript | ^5.4+ | Type safety throughout | Required for @langchain/core v1.x Zod v4 type fix. TS 5.x resolves type inference issues that existed with TS 4.x. |
| @types/node | ^20 or ^22 | Node.js type definitions | Required for TypeScript compilation of server-side code in Nitro routes. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Nitro (via Analog) | Server runtime and SSE streaming | Already in project via @analogjs/vite-plugin-nitro. API routes go in src/server/routes/. createEventStream comes from h3, which Nitro re-exports. |
| Vercel CLI | Local dev and deployment | `vercel dev` to test serverless function behavior locally before deploy. Critical to test SSE streaming locally — behavior differs from `ng serve`. |

---

## Installation

```bash
# Core AI stack
npm install langchain @langchain/core @langchain/google-genai @langchain/mongodb

# Database
npm install mongoose mongodb

# Validation (MUST be v3, not v4)
npm install zod@^3.23.8

# Dev
npm install -D typescript @types/node dotenv
```

**Environment variables required:**
```env
GOOGLE_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/atom?retryWrites=true&w=majority
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @langchain/google-genai | @google/genai (direct SDK) | If LangChain overhead is unwanted and you need raw Gemini streaming control. More verbose but no abstraction tax. |
| langchain (LCEL chains) | LangGraph.js | If the agent graph is complex with cycles, conditional edges, or state checkpoints. LangGraph is the recommended path for production multi-agent; LCEL is simpler for a linear router→validator→specialist flow with no cycles. |
| Mongoose v9 | native mongodb driver | If schema validation is not needed and you want minimal overhead. For a hackathon with 18-hour timeline, Mongoose's schema safety wins. |
| MongoDBChatMessageHistory | In-memory chat history (BufferMemory) | If conversation persistence across sessions is NOT needed. For the hackathon demo where session continuity matters, use MongoDB. |
| SSE via h3 createEventStream | WebSocket | WebSocket requires stateful server; SSE is unidirectional (sufficient for LLM streaming) and works on Vercel serverless. Project spec explicitly chose SSE. |
| Zod v3 withStructuredOutput | Prompt-based JSON parsing | If you don't need type-safe structured output. withStructuredOutput is more reliable than parsing free-form JSON from LLM output for intent classification. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| zod@^4.x | Verified bug: Zod v4 + Gemini + withStructuredOutput causes "schema should be of type OBJECT" runtime errors (GitHub issue #8769, open as of Feb 2026). Type inference also breaks, falling back to Record<string, any>. | zod@^3.23.8 |
| gemini-2.0-flash model string | Google deprecated Gemini 2.0 Flash in February 2026; retiring March 3, 2026. API calls will fail after cutoff. | "gemini-2.5-flash" (GA, stable as of June 2025) |
| @langchain/google (new package) | The unified @langchain/google replacement for @langchain/google-genai is NOT yet available as a stable JS package as of Feb 2026 (Python got it in langchain-google-genai 4.0.0; JS migration is in-progress per GitHub issue #8655). | @langchain/google-genai@^2.1.22 |
| @langchain/community for MongoDB | MongoDBChatMessageHistory has moved to @langchain/mongodb. The @langchain/community version is deprecated (still works but no new features). | @langchain/mongodb |
| RunnableBranch for routing | Marked as legacy in LangChain docs. Will not be removed but is the old pattern. | Use withStructuredOutput + conditional logic (custom function/lambda) for intent routing |
| AgentExecutor | Deprecated pattern in LangChain. The new approach is LCEL chains with structured output for routing, or LangGraph for stateful agents. | RunnableSequence with LCEL pipe() for sequential flow |
| WebSocket implementation | Out of scope per PROJECT.md; requires stateful server and doesn't work cleanly on Vercel serverless. SSE is sufficient for unidirectional LLM token streaming. | h3 createEventStream SSE |
| RAG / vector database | Out of scope per PROJECT.md. Static JSON files are sufficient for the hackathon demo. | Static JSON loaded at startup |

---

## Stack Patterns by Variant

**For the Orchestrator agent (intent classification):**
- Use `llm.withStructuredOutput(zodSchema)` with Zod v3
- Schema: `z.object({ intent: z.enum(["faqs", "catalog", "schedule", "generic"]) })`
- This returns a typed JS object — no JSON parsing needed

**For Validator agents (data collection):**
- Use a `ChatPromptTemplate` + `ChatGoogleGenerativeAI` + `StringOutputParser` chain
- The LLM asks clarifying questions; you track collected fields in conversation context
- Use `withStructuredOutput` to validate when all fields collected

**For Specialist agents (answer generation with streaming):**
- Use `chain.stream()` (LCEL) which returns an AsyncIterator of chunks
- Pipe each chunk into `eventStream.push({ event: "message_chunk", data: chunk.content })`
- Send `agent_active` event BEFORE starting the chain

**For SSE endpoint in Analog (src/server/routes/api/chat.post.ts):**
```typescript
import { defineEventHandler, readBody, createEventStream } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const eventStream = createEventStream(event)

  // Run pipeline in background (don't await here)
  runPipeline(body, eventStream).catch(() => eventStream.close())

  return eventStream.send()
})
```

**For Mongoose connection caching in Vercel serverless:**
- Cache the connection in a module-level variable (survives across hot function invocations)
- Pattern: `if (mongoose.connection.readyState === 1) return; await mongoose.connect(uri, { maxPoolSize: 1 })`
- Vercel Fluid Compute (enabled by default on Hobby tier now) allows reuse across invocations

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| langchain@^1.2.x | @langchain/core@^1.1.x | Peer dependency must be satisfied. Both must be at major v1. |
| @langchain/google-genai@^2.1.x | @langchain/core@^1.1.x | v2.x integrations require @langchain/core v1.x. |
| @langchain/mongodb@latest | mongodb@^6.x | Native driver required as peer dep. Mongoose already installs mongodb internally. |
| zod@^3.23.8 | @langchain/core@^1.1.x | withStructuredOutput works correctly. Do NOT upgrade to zod v4 without testing first. |
| mongoose@^9.x | mongodb@^6.x | Mongoose 9 requires MongoDB Node driver 6.x. |
| Gemini "gemini-2.5-flash" | @langchain/google-genai@^2.1.x | model: "gemini-2.5-flash" is the GA stable string. "gemini-2.0-flash" is deprecated (retires March 3, 2026). |

---

## Gemini Model Selection

**Use `gemini-2.5-flash` (not 2.0)**

```typescript
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.1,        // Low for classification/validation
  maxOutputTokens: 1024,
  streaming: true,         // Enable for specialist agents
})
```

Free tier limits (as of Feb 2026): 15 RPM, ~500 RPD. Sufficient for hackathon demo traffic. The rate limit slash in December 2025 reduced free tier by 50-80%, but 15 RPM is workable for a single-team demo.

---

## Vercel Deployment Notes

- **Timeout**: Vercel Hobby with Fluid Compute defaults to 300s — more than enough for LLM streaming responses
- **SSE on Vercel**: Supported. Nitro's `createEventStream` works correctly on Vercel serverless (verified via community reports)
- **Bundle size**: Keep `@langchain/google-genai` as the only model integration; don't add OpenAI or Anthropic packages (adds 50MB+ to bundle)
- **Cold start**: Mongoose connection caching pattern is essential. First request after cold start will be ~500ms slower due to MongoDB connection establishment
- **Environment variables**: Set in Vercel dashboard under project Settings > Environment Variables. Do NOT commit GOOGLE_API_KEY or MONGODB_URI to git.
- **File descriptors**: Vercel limit is 1,024 shared across concurrent executions. With maxPoolSize: 1 for Mongoose, each function instance uses 1-2 file descriptors for MongoDB — well within limits.

---

## Sources

- GitHub releases langchain-ai/langchainjs — langchain@1.2.28, @langchain/core@1.1.29, @langchain/google-genai@2.1.22 (verified Feb 28, 2026) — HIGH confidence
- docs.langchain.com/oss/javascript/integrations/chat/google_generative_ai — ChatGoogleGenerativeAI deprecation warning confirmed — HIGH confidence
- ai.google.dev/gemini-api/docs/models/gemini-2.5-flash — gemini-2.5-flash model ID confirmed as GA stable — HIGH confidence
- Vercel docs /docs/functions/limitations — 300s timeout with Fluid Compute confirmed — HIGH confidence
- mongoosejs.com/docs/guide.html — Mongoose 9.x confirmed current — HIGH confidence
- GitHub issue #8769 langchain-ai/langchainjs — Zod v4 + Gemini + withStructuredOutput bug confirmed open — HIGH confidence
- LangChain forum upgrade thread — @langchain/google-genai JS package migration to @langchain/google not complete as of Jan 2026 — MEDIUM confidence (forum post, not official release)
- WebSearch: Gemini 2.0 Flash deprecation Feb 2026 / retiring March 3 — MEDIUM confidence (multiple sources agree)
- WebSearch: Vercel Mongoose connection pooling patterns — MEDIUM confidence (community best practices, multiple sources agree)
- Analog.js SSE createEventStream pattern — MEDIUM confidence (community GitHub + Analog docs, not official Nitro SSE docs which were inaccessible)

---

*Stack research for: Multi-agent AI chatbot backend (car dealership hackathon)*
*Researched: 2026-02-28*

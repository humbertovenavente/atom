import type { ServerResponse } from 'node:http';

export type SSEEventType =
  | 'agent_active'
  | 'message_chunk'
  | 'validation_update'
  | 'done'
  | 'error';

export type SSEEmitter = (eventName: SSEEventType, data: unknown) => void;

export function createEmitter(res: ServerResponse): SSEEmitter {
  return (eventName, data) => {
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  };
}

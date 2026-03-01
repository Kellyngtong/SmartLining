import { Request, Response } from 'express';
import { logger } from './config/logger';

type ClientsMap = Map<number, Set<Response>>;

const clients: ClientsMap = new Map();

export function addSseClient(queueId: number, req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send a comment line and a connected event to establish the stream
  res.write(': connected\n\n');
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ queueId })}\n\n`);

  const set = clients.get(queueId) || new Set<Response>();
  set.add(res);
  clients.set(queueId, set);

  logger.info(`SSE client connected for queue ${queueId}. total clients: ${set.size}`);

  req.on('close', () => {
    set.delete(res);
    if (set.size === 0) clients.delete(queueId);
    logger.info(`SSE client disconnected for queue ${queueId}. remaining: ${set.size}`);
  });
}

export function sendSseEvent(queueId: number, event: string, data: unknown) {
  const set = clients.get(queueId);
  if (!set) return;
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  logger.debug(`Sending SSE event '${event}' to ${set.size} clients for queue ${queueId}`);
  for (const res of set) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${payload}\n\n`);
    } catch (e) {
      // ignore write errors; client will clean up on close
    }
  }
}

export function broadcastEvent(event: string, data: unknown) {
  for (const [queueId] of clients) {
    sendSseEvent(queueId, event, data);
  }
}

export default { addSseClient, sendSseEvent, broadcastEvent };

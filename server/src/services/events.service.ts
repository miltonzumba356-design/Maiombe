import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface SSEClient {
  id: string;
  res: Response;
  heartbeat: ReturnType<typeof setInterval>;
}

class EventsService {
  private clients = new Map<string, SSEClient>();

  addClient(res: Response): string {
    const id = uuidv4();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(': connected\n\n');

    const heartbeat = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { this.removeClient(id); }
    }, 20_000);

    this.clients.set(id, { id, res, heartbeat });
    return id;
  }

  removeClient(id: string) {
    const c = this.clients.get(id);
    if (c) {
      clearInterval(c.heartbeat);
      this.clients.delete(id);
    }
  }

  broadcast(event: string, data: unknown) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.clients) {
      try {
        client.res.write(msg);
      } catch {
        this.removeClient(id);
      }
    }
  }

  get count() { return this.clients.size; }
}

export const eventsBus = new EventsService();

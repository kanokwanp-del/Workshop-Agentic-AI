import type { Env } from './env';
import { json, errorJson } from './lib/http';
import { handleChatRoute } from './module-1.1-chat/chat-routes';

export function route(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/healthz') return Promise.resolve(json({ ok: true }));
  if (url.pathname === '/api/chat') return handleChatRoute(request, env);
  if (url.pathname.startsWith('/api/')) return Promise.resolve(errorJson('ไม่พบ API endpoint นี้', 404));
  if (url.pathname === '/chat' || url.pathname === '/chat/') {
    return env.ASSETS.fetch(new Request(new URL('/chat/index.html', request.url), request));
  }
  return env.ASSETS.fetch(request);
}
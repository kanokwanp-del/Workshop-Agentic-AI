import { route } from './router';
import type { Env } from './env';

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return route(request, env, ctx);
  },
};

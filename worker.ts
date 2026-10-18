import handler from 'vinext/server/fetch-handler';
import { syncGoogleCalendars } from './lib/google-calendar';

export default {
  ...handler,
  async scheduled(_controller: ScheduledController, _env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(syncGoogleCalendars());
  }
};

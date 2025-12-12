import { lt } from 'drizzle-orm';
import { db } from '../db';
import { authorizationCodes } from '../db/schema';
import { CronJob } from 'cron';
import { env } from '@/env';

const onceADayJobs = new CronJob(
  '0 1 * * *',
  async function () {
    await db.delete(authorizationCodes).where(lt(authorizationCodes.expiresAt, new Date()));
  },
  null, // onComplete hook
  false, // autostart
  'America/New_York' // time zone
);

(() => {
  const state: keyof Pick<typeof onceADayJobs, 'start' | 'stop'> =
    env.PAUSE_SCHEDULER === '1' || env.PAUSE_SCHEDULER === 'true' ? 'stop' : 'start';

  onceADayJobs[state]();
})();

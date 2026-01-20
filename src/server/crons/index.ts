import { lt } from 'drizzle-orm';
import { db } from '../db';
import { authorizationCodes, mfaPending } from '../db/schema';
import { CronJob } from 'cron';
import { env } from '@/env';

const onceADayJobs = new CronJob(
  '0 1 * * *',
  async function () {
    const now = new Date();
    await Promise.all([
      db.delete(authorizationCodes).where(lt(authorizationCodes.expiresAt, now)),
      db.delete(mfaPending).where(lt(mfaPending.expiresAt, now)),
    ]);
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

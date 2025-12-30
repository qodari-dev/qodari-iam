import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url(),
    IAM_JWT_SECRET: z.string(),
    IAM_ISSUER: z.string(),
    IAM_APP_SLUG: z.string(),
    RESEND_API_KEY: z.string(),
    RESEND_MAIL_FROM: z.string(),
    PAUSE_SCHEDULER: z
      .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
      .optional(),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  /*
   * Specify what values should be validated by your schemas above.
   *
   * If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
   * For Next.js >= 13.4.4, you can use the experimental__runtimeEnv option and
   * only specify client-side variables.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    IAM_JWT_SECRET: process.env.IAM_JWT_SECRET,
    IAM_ISSUER: process.env.IAM_ISSUER,
    IAM_APP_SLUG: process.env.IAM_APP_SLUG,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_MAIL_FROM: process.env.RESEND_MAIL_FROM,
    PAUSE_SCHEDULER: process.env.PAUSE_SCHEDULER,
  },
  // experimental__runtimeEnv: {
  //   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  // }
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

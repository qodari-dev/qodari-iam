import { Account, User, Application } from '@/server/db/schema';
import { z } from 'zod';

export type PublicUser = Pick<
  User,
  'id' | 'email' | 'firstName' | 'lastName' | 'avatar' | 'isAdmin' | 'status'
>;

export const zUser: z.ZodType<PublicUser> = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  avatar: z.string().url().nullable(),
  isAdmin: z.boolean(),
  status: z.enum(['active', 'suspended', 'pending_verification']),
});

type PublicAccount = Pick<Account, 'id' | 'name' | 'slug' | 'status'>;
export const zAccount: z.ZodType<PublicAccount> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'suspended']),
});

type PublicApplication = Pick<
  Application,
  'id' | 'name' | 'slug' | 'status' | 'logo' | 'description' | 'homeUrl'
>;
export const zApplication: z.ZodType<PublicApplication> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'suspended']),
  logo: z.string().nullable(),
  description: z.string().nullable(),
  homeUrl: z.string(),
});

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginResponseSchema = z.object({
  user: zUser,
  accounts: z.array(zAccount),
  currentAccountId: z.string().uuid(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MeResponseSchema = z.object({
  user: zUser,
  accounts: z.array(zAccount),
  currentAccountId: z.string().uuid(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  applications: z.array(zApplication).optional(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const OauthTokenBodySchema = z.union([
  z.object({
    grant_type: z.literal('authorization_code'),
    code: z.string(),
    redirect_uri: z.string().url().optional(),
    client_id: z.string(),
    client_secret: z.string(),
    code_verifier: z.string().optional(),
  }),
  z.object({
    grant_type: z.literal('refresh_token'),
    refresh_token: z.string(),
    client_id: z.string(),
    client_secret: z.string(),
  }),
]);

export const OauthTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number(),
  scope: z.string().optional(),
});
export type OauthTokenResponse = z.infer<typeof OauthTokenResponseSchema>;

// ---------- Forgot / Reset password ----------
export const ForgotPasswordBodySchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBodySchema>;

export const ForgotPasswordResponseSchema = z.object({
  message: z.string(),
});

export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;

export const ResetPasswordBodySchema = z.object({
  token: z.string().min(10), // el token UUID/base64 suele ser largo
  password: z.string().min(8),
});

export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>;

export const ResetPasswordResponseSchema = z.object({
  message: z.string(),
});

export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;

// ------- Change Password -------
export const ChangePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>;

export const ChangePasswordResponseSchema = z.object({
  message: z.string(),
});

export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>;

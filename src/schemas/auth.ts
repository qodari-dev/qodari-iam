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
  status: z.enum(['active', 'suspended']),
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
  'id' | 'name' | 'slug' | 'status' | 'logo' | 'image' | 'description' | 'homeUrl'
>;
export const zApplication: z.ZodType<PublicApplication> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'suspended']),
  logo: z.string().nullable(),
  image: z.string().nullable(),
  description: z.string().nullable(),
  homeUrl: z.string(),
});

export const LoginBodySchema = z.object({
  accountSlug: z.string(),
  appSlug: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginResponseSchema = z.union([
  z.object({
    user: zUser,
    accountId: z.string().uuid(),
    mfaRequired: z.literal(false).optional(),
  }),
  z.object({
    mfaRequired: z.literal(true),
    mfaToken: z.string().uuid(),
    maskedEmail: z.string(),
  }),
]);

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MeResponseSchema = z.object({
  user: zUser,
  accountId: z.string().uuid(),
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
  z.object({
    grant_type: z.literal('client_credentials'),
    client_id: z.string(),
    client_secret: z.string(),
    app_slug: z.string(), // Application slug to request token for
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
  accountSlug: z.string(),
  email: z.string().email(),
});

export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBodySchema>;

export const ForgotPasswordResponseSchema = z.object({
  message: z.string(),
});

export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;

export const ResetPasswordBodySchema = z.object({
  accountSlug: z.string(),
  token: z.string().min(10), // el token UUID/base64 suele ser largo
  password: z.string().min(8),
});

export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>;

export const ResetPasswordResponseSchema = z.object({
  message: z.string(),
});

export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;

// ---------- Revoke Token (RFC 7009) ----------
export const RevokeTokenBodySchema = z.object({
  token: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
});

export type RevokeTokenBody = z.infer<typeof RevokeTokenBodySchema>;

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

// ---------- MFA Verify ----------
export const MfaVerifyBodySchema = z.object({
  mfaToken: z.string().uuid(),
  code: z.string().length(6),
  accountSlug: z.string(),
  appSlug: z.string(),
});

export type MfaVerifyBody = z.infer<typeof MfaVerifyBodySchema>;

export const MfaVerifyResponseSchema = z.object({
  user: zUser,
  accountId: z.string().uuid(),
});

export type MfaVerifyResponse = z.infer<typeof MfaVerifyResponseSchema>;

// ---------- MFA Resend ----------
export const MfaResendBodySchema = z.object({
  mfaToken: z.string().uuid(),
  accountSlug: z.string(),
  appSlug: z.string(),
});

export type MfaResendBody = z.infer<typeof MfaResendBodySchema>;

export const MfaResendResponseSchema = z.object({
  message: z.string(),
  maskedEmail: z.string(),
});

export type MfaResendResponse = z.infer<typeof MfaResendResponseSchema>;

// ---------- Branding ----------
export const BrandingQuerySchema = z.object({
  accountSlug: z.string(),
  appSlug: z.string().optional(),
});

export type BrandingQuery = z.infer<typeof BrandingQuerySchema>;

export const BrandingResponseSchema = z.object({
  account: z.object({
    name: z.string(),
    slug: z.string(),
    logo: z.string().nullable(),
    imageAd: z.string().nullable(),
  }),
  application: z
    .object({
      name: z.string(),
      slug: z.string(),
      logo: z.string().nullable(),
      imageAd: z.string().nullable(),
    })
    .nullable(),
});

export type BrandingResponse = z.infer<typeof BrandingResponseSchema>;

import {
  ForgotPasswordBodySchema,
  ForgotPasswordResponseSchema,
  LoginBodySchema,
  LoginResponseSchema,
  MeResponseSchema,
  OauthTokenBodySchema,
  OauthTokenResponseSchema,
  ResetPasswordBodySchema,
  ResetPasswordResponseSchema,
} from '@/schemas/auth';
import { TsRestErrorSchema } from '@/schemas/ts-rest';
import { initContract } from '@ts-rest/core';

const c = initContract();
import { z } from 'zod';

export const auth = c.router(
  {
    login: {
      method: 'POST',
      path: '/login',
      summary: 'Login to IAM portal with email/password',
      body: LoginBodySchema,
      responses: {
        200: LoginResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        429: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },

    me: {
      method: 'GET',
      path: '/me',
      summary: 'Get current authenticated user + account context',
      query: z
        .object({
          appSlug: z.string().optional(),
        })
        .optional(),
      responses: {
        200: MeResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },

    logout: {
      method: 'POST',
      path: '/logout',
      summary: 'Logout from IAM portal (invalidate session)',
      body: c.noBody(),
      responses: {
        204: c.noBody(),
        400: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },

    oauthToken: {
      method: 'POST',
      path: '/token',
      summary: 'Exchange authorization code or refresh token for access token',
      body: OauthTokenBodySchema,
      responses: {
        200: OauthTokenResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        429: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    forgotPassword: {
      method: 'POST',
      path: '/forgot-password',
      summary: 'Request password reset email',
      body: ForgotPasswordBodySchema,
      responses: {
        200: ForgotPasswordResponseSchema,
        400: TsRestErrorSchema,
        429: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    resetPassword: {
      method: 'POST',
      path: '/reset-password',
      summary: 'Reset password using reset token',
      body: ResetPasswordBodySchema,
      responses: {
        200: ResetPasswordResponseSchema,
        400: TsRestErrorSchema,
        429: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    changePassword: {
      method: 'POST',
      path: '/change-password',
      body: z.object({
        currentPassword: z.string().min(8),
        newPassword: z.string().min(8),
      }),
      responses: {
        204: c.noBody(),
        400: TsRestErrorSchema,
        429: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/auth' }
);

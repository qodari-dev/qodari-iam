import { env } from '@/env';
import type { NextRequest } from 'next/server';
import { getUnifiedAuthContext } from './auth-context';
import { throwHttpError } from './generic-ts-rest-error';
import { TsRestMetaData } from '@/schemas/ts-rest';
import { TsRestRequest } from '@ts-rest/serverless/next';

async function requirePermission(
  request: NextRequest | TsRestRequest,
  metadata: TsRestMetaData,
  opts?: { appSlug?: string }
) {
  if (metadata.auth === 'public') {
    return;
  }
  const permissionKey = metadata.permissionKey
    ? `${metadata.permissionKey?.resourceKey}:${metadata.permissionKey?.actionKey}`
    : undefined;
  const ctx = await getUnifiedAuthContext(request, {
    requiredPermission: permissionKey,
    appSlug: opts?.appSlug,
  });

  if (!permissionKey || (ctx.type === 'user' && ctx.user.isAdmin)) {
    return ctx;
  }

  const hasPerm = ctx.permissions?.includes(permissionKey);

  if (!hasPerm) {
    throwHttpError({
      status: 403,
      message: 'Forbidden',
      code: 'FORBIDDEN',
    });
  }

  return ctx;
}

export async function requireAdminPermission(
  request: NextRequest | TsRestRequest,
  metadata: TsRestMetaData
) {
  return requirePermission(request, metadata, {
    appSlug: env.IAM_APP_SLUG,
  });
}

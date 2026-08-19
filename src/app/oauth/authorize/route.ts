import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { applications, authorizationCodes, sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { getSessionFromRequest, SESSION_COOKIE_NAME } from '@/server/utils/session';
import { env } from '@/env';

export const runtime = 'nodejs';

function buildPublicAuthorizeUrl(request: NextRequest) {
  const pathname = request.nextUrl.pathname || '/oauth/authorize';
  const search = request.nextUrl.search || '';
  return new URL(`${pathname}${search}`, env.NEXT_PUBLIC_APP_URL).toString();
}

function buildErrorRedirect(params: {
  redirectUri: string;
  error: string;
  errorDescription?: string;
  state?: string;
}) {
  const url = new URL(params.redirectUri);
  url.searchParams.set('error', params.error);
  if (params.errorDescription) {
    url.searchParams.set('error_description', params.errorDescription);
  }
  if (params.state) {
    url.searchParams.set('state', params.state);
  }
  return NextResponse.redirect(url.toString());
}

function buildLoginUrl(request: NextRequest, accountSlug: string, appSlug: string) {
  const loginUrl = new URL(`/${accountSlug}/login`, env.NEXT_PUBLIC_APP_URL);
  loginUrl.searchParams.set('redirect', buildPublicAuthorizeUrl(request));
  loginUrl.searchParams.set('app', appSlug);
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;

  const responseType = url.searchParams.get('response_type');
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const scope = url.searchParams.get('scope') ?? 'openid';
  const state = url.searchParams.get('state') ?? undefined;
  const codeChallenge = url.searchParams.get('code_challenge') ?? undefined;
  const codeChallengeMethod = url.searchParams.get('code_challenge_method') ?? undefined;

  // 1) client_id requerido
  if (!clientId) {
    return new NextResponse('client_id is required', { status: 400 });
  }

  // 2) Buscar aplicación por client_id (incluyendo account para obtener el slug)
  const app = await db.query.applications.findFirst({
    where: eq(applications.clientId, clientId),
    with: { account: true },
  });

  if (!app || app.status !== 'active') {
    return new NextResponse('Unknown or inactive client', { status: 400 });
  }

  const accountSlug = app.account.slug;

  // 3) Determinar redirect_uri final
  const callbackUrls = app.callbackUrls ?? [];

  // Si el cliente manda redirect_uri, debe estar en la lista de callbacks permitidos.
  //
  // Aca NO se redirige: hacerlo mandaria al navegador a la misma URL que se
  // acaba de rechazar, que es un destino sin validar y por lo tanto un open
  // redirect (`?redirect_uri=https://malo.example` sacaria al usuario del IAM).
  // Ademas confunde el diagnostico: la aplicacion recibe un callback sin `code`
  // y reporta "falta el code" en vez del motivo real.
  //
  // El resto de errores de mas abajo si se devuelven por redirect, porque para
  // entonces el destino ya quedo validado.
  if (redirectUri && !callbackUrls.includes(redirectUri)) {
    return new NextResponse(`redirect_uri no registrado para esta aplicacion: ${redirectUri}`, {
      status: 400,
    });
  }

  // Si no hay redirect_uri, usar el primero de la lista
  const finalRedirectUri = redirectUri ?? callbackUrls[0];
  if (!finalRedirectUri) {
    return new NextResponse('No callback URLs configured for this application', { status: 400 });
  }

  // 4) Solo soportamos response_type=code
  if (responseType !== 'code') {
    return buildErrorRedirect({
      redirectUri: finalRedirectUri,
      error: 'unsupported_response_type',
      errorDescription: 'Only response_type=code is supported',
      state,
    });
  }

  // (Opcional futuro) validar scope contra una lista permitida por app

  // 5) Revisar sesión existente en IAM
  const session = await getSessionFromRequest(request);

  if (!session) {
    // No hay sesión: redirigimos a login del IAM con el account slug
    return NextResponse.redirect(buildLoginUrl(request, accountSlug, app.slug));
  }

  // La cookie del IAM es compartida por todas las cuentas. Si el navegador
  // conserva una sesión de A y abre una aplicación de B, nunca se puede emitir
  // un code que mezcle el usuario/account de A con la aplicación de B. Se
  // termina la sesión anterior y se fuerza login explícito en la cuenta dueña
  // de la aplicación solicitada.
  if (session.accountId !== app.accountId) {
    await db.delete(sessions).where(eq(sessions.id, session.id));

    const response = NextResponse.redirect(buildLoginUrl(request, accountSlug, app.slug));
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  }

  // 6) Crear authorization_code
  const code = randomBytes(32).toString('base64url');
  const now = Date.now();
  const expiresAt = new Date(now + app.authCodeExp * 1000);

  await db.insert(authorizationCodes).values({
    userId: session.userId,
    accountId: session.accountId,
    applicationId: app.id,
    code,
    redirectUri: finalRedirectUri,
    state,
    codeChallenge,
    codeChallengeMethod,
    scope,
    used: false,
    expiresAt,
  });

  // 7) Redirigir de vuelta al cliente con code (+ state)
  const redirectBackUrl = new URL(finalRedirectUri);
  redirectBackUrl.searchParams.set('code', code);
  if (state) {
    redirectBackUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectBackUrl.toString());
}

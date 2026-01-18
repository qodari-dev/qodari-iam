import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { applications, authorizationCodes } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getSessionFromRequest } from "@/server/utils/session";
import { env } from "@/env";

export const runtime = "nodejs";

function buildErrorRedirect(params: {
  redirectUri: string;
  error: string;
  errorDescription?: string;
  state?: string;
}) {
  const url = new URL(params.redirectUri);
  url.searchParams.set("error", params.error);
  if (params.errorDescription) {
    url.searchParams.set("error_description", params.errorDescription);
  }
  if (params.state) {
    url.searchParams.set("state", params.state);
  }
  return NextResponse.redirect(url.toString());
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;

  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const scope = url.searchParams.get("scope") ?? "openid";
  const state = url.searchParams.get("state") ?? undefined;
  const codeChallenge = url.searchParams.get("code_challenge") ?? undefined;
  const codeChallengeMethod =
    url.searchParams.get("code_challenge_method") ?? undefined;

  // 1) client_id requerido
  if (!clientId) {
    return new NextResponse("client_id is required", { status: 400 });
  }

  // 2) Buscar aplicación por client_id (incluyendo account para obtener el slug)
  const app = await db.query.applications.findFirst({
    where: eq(applications.clientId, clientId),
    with: { account: true },
  });

  if (!app || app.status !== "active") {
    return new NextResponse("Unknown or inactive client", { status: 400 });
  }

  const accountSlug = app.account.slug;

  // 3) Determinar redirect_uri final
  const callbackUrls = app.callbackUrls ?? [];

  // Si el cliente manda redirect_uri, debe estar en la lista de callbacks permitidos
  if (redirectUri && !callbackUrls.includes(redirectUri)) {
    return buildErrorRedirect({
      redirectUri: redirectUri,
      error: "invalid_request",
      errorDescription: "redirect_uri is not in the list of allowed callbacks",
      state,
    });
  }

  // Si no hay redirect_uri, usar el primero de la lista
  const finalRedirectUri = redirectUri ?? callbackUrls[0];
  if (!finalRedirectUri) {
    return new NextResponse("No callback URLs configured for this application", { status: 400 });
  }

  // 4) Solo soportamos response_type=code
  if (responseType !== "code") {
    return buildErrorRedirect({
      redirectUri: finalRedirectUri,
      error: "unsupported_response_type",
      errorDescription: "Only response_type=code is supported",
      state,
    });
  }

  // (Opcional futuro) validar scope contra una lista permitida por app

  // 5) Revisar sesión existente en IAM
  const session = await getSessionFromRequest(request);

  if (!session) {
    // No hay sesión: redirigimos a login del IAM con el account slug
    const loginUrl = new URL(`/${accountSlug}/login`, env.NEXT_PUBLIC_APP_URL);
    // "redirect" = volver a este authorize con todos los query params
    loginUrl.searchParams.set("redirect", url.toString());
    // Include app slug for branding
    loginUrl.searchParams.set("app", app.slug);

    return NextResponse.redirect(loginUrl.toString());
  }

  // 6) Crear authorization_code
  const code = randomBytes(32).toString("base64url");
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
  redirectBackUrl.searchParams.set("code", code);
  if (state) {
    redirectBackUrl.searchParams.set("state", state);
  }

  return NextResponse.redirect(redirectBackUrl.toString());
}

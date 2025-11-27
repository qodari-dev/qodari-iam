import { env } from "@/env";
import { SignJWT, jwtVerify } from "jose";

const JWT_ALG = "HS256";

function getJwtSecretKey(): Uint8Array {
  const secret = env.IAM_JWT_SECRET;
  if (!secret) {
    throw new Error("IAM_JWT_SECRET env var is required");
  }
  return new TextEncoder().encode(secret);
}

export type AccessTokenPayload = {
  sub: string; // userId
  accountId: string; // current account
  appId: string; // application.id
  roles: string[]; // slugs de roles de esa app en esa account
  permissions: string[]; // "resource:action" de esa app en esa account
};

export async function signAccessToken(opts: {
  payload: AccessTokenPayload;
  expiresInSec: number;
  issuer: string;
  audience: string;
}) {
  const { payload, expiresInSec, issuer, audience } = opts;
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSec)
    .setIssuer(issuer)
    .setAudience(audience)
    .sign(getJwtSecretKey());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecretKey(), {
    algorithms: [JWT_ALG],
  });
  return payload as AccessTokenPayload & {
    iss: string;
    aud: string | string[];
    exp: number;
    iat: number;
  };
}

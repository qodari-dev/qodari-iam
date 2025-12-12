import { SignJWT, jwtVerify } from 'jose';
import { JWSSignatureVerificationFailed, JWTExpired } from 'jose/errors';

const JWT_ALG = 'HS256';

function getJwtSecretKey(jwtSecret: string): Uint8Array {
  return new TextEncoder().encode(jwtSecret);
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
  jwtSecret: string;
}) {
  const { payload, expiresInSec, issuer, audience, jwtSecret } = opts;
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSec)
    .setIssuer(issuer)
    .setAudience(audience)
    .sign(getJwtSecretKey(jwtSecret));
}

export async function verifyAccessToken(token: string, jwtSecret: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(jwtSecret), {
      algorithms: [JWT_ALG],
    });
    return payload as AccessTokenPayload & {
      iss: string;
      aud: string | string[];
      exp: number;
      iat: number;
    };
  } catch (error) {
    if (error instanceof JWTExpired) {
      throw new Error('Token expired');
    }
    if (error instanceof JWSSignatureVerificationFailed) {
      throw new Error('Invalid signature');
    }
    throw new Error('Invalid token');
  }
}

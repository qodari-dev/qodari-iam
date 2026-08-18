import { SignJWT, jwtVerify } from 'jose';
import {
  JWSSignatureVerificationFailed,
  JWTClaimValidationFailed,
  JWTExpired,
} from 'jose/errors';

const JWT_ALG = 'HS256';

function getJwtSecretKey(jwtSecret: string): Uint8Array {
  return new TextEncoder().encode(jwtSecret);
}

export type AccessTokenPayload = {
  sub: string; // userId or apiClientId
  accountId: string; // current account
  appId: string; // application.id
  roles?: string[]; // slugs de roles de esa app en esa account (only for user tokens)
  permissions: string[]; // "resource:action" de esa app en esa account
  grantType?: 'client_credentials'; // Only for M2M tokens
  // Basic user info (only for user tokens, not M2M)
  user?: {
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
  };
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

export type VerifyAccessTokenOptions = {
  /** `iss` esperado: este mismo IAM (`IAM_ISSUER`). */
  issuer: string;
  /** `aud` esperado: el `clientId` de la aplicacion dueña del token. */
  audience: string;
};

/**
 * Verifica un access token emitido por este IAM.
 *
 * `issuer` y `audience` son OBLIGATORIOS: hoy el aislamiento entre aplicaciones
 * lo da el secreto por app (HS256), no una comprobacion explicita. Al pasar a
 * firma asimetrica el `aud` queda como unica barrera, y un parametro opcional
 * se olvida justo cuando empieza a importar.
 */
export async function verifyAccessToken(
  token: string,
  jwtSecret: string,
  options: VerifyAccessTokenOptions
) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(jwtSecret), {
      algorithms: [JWT_ALG],
      issuer: options.issuer,
      audience: options.audience,
    });
    return payload as AccessTokenPayload & {
      iss: string;
      aud: string | string[];
      exp: number;
      iat: number;
    };
  } catch (error) {
    // `JWTExpired` implementa `JWTClaimValidationFailed`: va primero.
    if (error instanceof JWTExpired) {
      throw new Error('Token expired');
    }
    if (error instanceof JWSSignatureVerificationFailed) {
      throw new Error('Invalid signature');
    }
    if (error instanceof JWTClaimValidationFailed) {
      throw new Error(`Invalid token claim: ${error.claim}`);
    }
    throw new Error('Invalid token');
  }
}

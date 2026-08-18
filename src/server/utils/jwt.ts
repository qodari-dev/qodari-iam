import { SignJWT, importPKCS8, importSPKI, jwtVerify, exportJWK, type JWK } from 'jose';
import {
  JWSSignatureVerificationFailed,
  JWTClaimValidationFailed,
  JWTExpired,
} from 'jose/errors';

const HS_ALG = 'HS256';
const RS_ALG = 'RS256';

function getJwtSecretKey(jwtSecret: string): Uint8Array {
  return new TextEncoder().encode(jwtSecret);
}

/**
 * Material de firma de una aplicacion.
 *
 * Se pasa la fila entera y no solo el secreto porque el algoritmo es una
 * propiedad de la APLICACION: migrar de HS256 a RS256 es cambiar `tokenAlg` en
 * la base, sin desplegar nada, y revertir es cambiarlo de vuelta.
 */
export type AppSigningKey = {
  tokenAlg: 'HS256' | 'RS256';
  clientJwtSecret: string;
  jwtKid: string | null;
  jwtPrivateKey: string | null;
  jwtPublicKey: string | null;
};

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

// Importar un PEM no es gratis y se repite en cada firma y cada verificacion.
// La cache va indexada por el PEM, asi que rotar una llave invalida su entrada
// sola: no hay que acordarse de limpiarla.
const keyCache = new Map<string, CryptoKey>();

async function importKey(pem: string, kind: 'private' | 'public'): Promise<CryptoKey> {
  const cacheKey = `${kind}:${pem}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;
  const key =
    kind === 'private' ? await importPKCS8(pem, RS_ALG) : await importSPKI(pem, RS_ALG);
  keyCache.set(cacheKey, key);
  return key;
}

export async function signAccessToken(opts: {
  payload: AccessTokenPayload;
  expiresInSec: number;
  issuer: string;
  audience: string;
  app: AppSigningKey;
}) {
  const { payload, expiresInSec, issuer, audience, app } = opts;
  const now = Math.floor(Date.now() / 1000);

  const jwt = new SignJWT(payload)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSec)
    .setIssuer(issuer)
    .setAudience(audience);

  if (app.tokenAlg === RS_ALG) {
    // Falla ruidosamente en vez de caer a HS256: un fallback silencioso seria
    // una degradacion de seguridad que nadie notaria hasta que fuera tarde.
    if (!app.jwtPrivateKey || !app.jwtKid) {
      throw new Error(
        'Aplicacion marcada como RS256 sin par de llaves. Generarlas antes de cambiar `tokenAlg`.'
      );
    }
    return jwt
      .setProtectedHeader({ alg: RS_ALG, kid: app.jwtKid })
      .sign(await importKey(app.jwtPrivateKey, 'private'));
  }

  return jwt.setProtectedHeader({ alg: HS_ALG }).sign(getJwtSecretKey(app.clientJwtSecret));
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
 * El algoritmo sale de la APLICACION, nunca del header del token: dejar que el
 * token elija como se valida es la confusion de algoritmos de manual. Cada rama
 * fija su `algorithms` y su tipo de llave.
 */
export async function verifyAccessToken(
  token: string,
  app: AppSigningKey,
  options: VerifyAccessTokenOptions
) {
  try {
    const useRs = app.tokenAlg === RS_ALG;
    if (useRs && !app.jwtPublicKey) {
      throw new Error('Aplicacion marcada como RS256 sin llave publica.');
    }

    const key = useRs
      ? await importKey(app.jwtPublicKey as string, 'public')
      : getJwtSecretKey(app.clientJwtSecret);

    const { payload } = await jwtVerify(token, key, {
      algorithms: [useRs ? RS_ALG : HS_ALG],
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

/** Entrada del JWKS publico de una aplicacion que ya tiene par de llaves. */
export async function buildJwk(app: {
  jwtKid: string | null;
  jwtPublicKey: string | null;
}): Promise<JWK | null> {
  if (!app.jwtKid || !app.jwtPublicKey) return null;
  const jwk = await exportJWK(await importKey(app.jwtPublicKey, 'public'));
  return { ...jwk, kid: app.jwtKid, alg: RS_ALG, use: 'sig' };
}

import { generateKeyPairSync, randomBytes } from 'node:crypto';

/**
 * Par de llaves de firma de una aplicacion (RS256).
 *
 * A diferencia del secreto HS256, esto NO se escribe ni se copia a ningun lado:
 * la privada se queda en el IAM y la publica se sirve en `/.well-known/jwks.json`.
 * Por eso no tiene campo en el formulario — no habria nada que hacer con el.
 *
 * Vive aca y no dentro del script para que el alta de una aplicacion y la
 * rotacion generen exactamente el mismo material.
 */
export type GeneratedAppKeys = {
  jwtKid: string;
  jwtPublicKey: string;
  jwtPrivateKey: string;
};

export function generateAppKeys(): GeneratedAppKeys {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    // Aleatorio y no el `applications.id`: el JWKS es un endpoint anonimo y no
    // debe publicar los UUID internos de las aplicaciones.
    jwtKid: randomBytes(16).toString('hex'),
    jwtPublicKey: publicKey,
    jwtPrivateKey: privateKey,
  };
}

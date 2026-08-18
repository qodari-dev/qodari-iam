/**
 * Genera el par de llaves RSA de una aplicacion (Fase 2: RS256 + JWKS).
 *
 * Idempotente: si la aplicacion ya tiene llaves no las toca, salvo `--rotate`.
 * NO cambia `tokenAlg` — generar la llave y empezar a usarla son dos pasos
 * separados a proposito, para poder publicarla en el JWKS antes de que exista
 * un solo token firmado con ella.
 *
 *   npx tsx --env-file=.env scripts/generate-app-keys.ts <slug|--all> [--rotate]
 *
 * Usa su propia conexion en vez del `db` compartido: ese trae el logger de
 * consultas activado en desarrollo, y aqui los parametros de la consulta son la
 * llave PRIVADA — quedaria impresa en la terminal.
 */
import { generateKeyPairSync, randomBytes } from 'node:crypto';

import { Client } from 'pg';

type AppRow = {
  id: string;
  slug: string;
  token_alg: 'HS256' | 'RS256';
  jwt_kid: string | null;
};

function generateKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return {
    // `kid` aleatorio y no el id de la aplicacion: el JWKS es anonimo y no debe
    // filtrar los UUID internos.
    kid: randomBytes(16).toString('hex'),
    publicKey,
    privateKey,
  };
}

async function main() {
  const [target, ...flags] = process.argv.slice(2);
  const rotate = flags.includes('--rotate');

  if (!target) {
    console.error('uso: generate-app-keys.ts <slug|--all> [--rotate]');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const { rows } = await client.query<AppRow>(
      'SELECT id, slug, token_alg, jwt_kid FROM applications ORDER BY slug'
    );
    const targets = target === '--all' ? rows : rows.filter((r) => r.slug === target);

    if (!targets.length) {
      console.error(`no se encontro ninguna aplicacion con slug "${target}"`);
      process.exit(1);
    }

    for (const app of targets) {
      if (app.jwt_kid && !rotate) {
        console.log(
          `  ${app.slug.padEnd(16)} ya tiene llaves (kid ${app.jwt_kid.slice(0, 8)}…) — sin cambios`
        );
        continue;
      }

      const { kid, publicKey, privateKey } = generateKeyPair();
      await client.query(
        'UPDATE applications SET jwt_kid = $1, jwt_public_key = $2, jwt_private_key = $3, updated_at = now() WHERE id = $4',
        [kid, publicKey, privateKey, app.id]
      );

      console.log(
        `  ${app.slug.padEnd(16)} ${app.jwt_kid ? 'ROTADA  ' : 'generada'} kid ${kid.slice(0, 8)}…  (tokenAlg sigue en ${app.token_alg})`
      );

      if (app.jwt_kid && app.token_alg === 'RS256') {
        console.log('      ojo: rotaste una llave EN USO — los tokens vigentes quedan invalidos ya.');
      }
    }

    console.log('\nsiguiente paso: verificar el JWKS y recien ahi cambiar `tokenAlg` a RS256.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

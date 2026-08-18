/**
 * Prueba el circuito M2M con el CODIGO REAL de `jwt.ts`: firma como lo hace el
 * grant client_credentials y verifica como lo hace `getM2MAuthContext`.
 *
 *   npx tsx --env-file=.env scripts/roundtrip-m2m.ts <slug>
 */
import { Client } from 'pg';

import { signAccessToken, verifyAccessToken, type AppSigningKey } from '../src/server/utils/jwt';

type Row = AppSigningKey & { slug: string; client_id: string };

async function main() {
  const slug = process.argv[2] ?? 'qodari-iam';
  const issuer = process.env.IAM_ISSUER!;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const { rows } = await client.query(
    `SELECT slug, client_id, token_alg AS "tokenAlg", client_jwt_secret AS "clientJwtSecret",
            jwt_kid AS "jwtKid", jwt_public_key AS "jwtPublicKey", jwt_private_key AS "jwtPrivateKey"
       FROM applications WHERE slug = $1`,
    [slug]
  );
  await client.end();

  const app = rows[0] as Row;
  if (!app) {
    console.error(`no existe "${slug}"`);
    process.exit(1);
  }

  console.log(`aplicacion: ${app.slug}   tokenAlg: ${app.tokenAlg}\n`);

  const token = await signAccessToken({
    payload: {
      sub: 'api-client-1',
      accountId: 'acc-1',
      appId: 'app-1',
      permissions: ['users:create'],
      grantType: 'client_credentials',
    },
    expiresInSec: 900,
    issuer,
    audience: app.client_id,
    app,
  });

  const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
  console.log(`header firmado: alg=${header.alg}${header.kid ? ` kid=${String(header.kid).slice(0, 12)}…` : ' (sin kid)'}`);

  if (header.alg !== app.tokenAlg) {
    console.error(`FALLA: se esperaba alg=${app.tokenAlg} y se firmo con ${header.alg}`);
    process.exit(1);
  }

  const payload = await verifyAccessToken(token, app, { issuer, audience: app.client_id });
  console.log(`verificado  : sub=${payload.sub} grantType=${payload.grantType} permisos=${payload.permissions.join(',')}`);

  // El aud ajeno debe caer aunque la firma sea buena.
  let colado = false;
  try {
    await verifyAccessToken(token, app, { issuer, audience: 'otro-client-id' });
    colado = true;
  } catch { /* esperado */ }
  console.log(`${colado ? 'FALLA' : 'OK   '} aud ajeno -> ${colado ? 'acepta' : 'rechaza'}`);

  console.log(colado ? '\nMAL' : '\nCircuito M2M correcto con el codigo real.');
  process.exit(colado ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

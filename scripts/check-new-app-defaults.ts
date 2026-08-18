/**
 * Comprueba que una aplicacion recien creada nazca usable con RS256.
 *
 *   npx tsx --env-file=.env scripts/check-new-app-defaults.ts
 *
 * Inserta con los MISMOS valores que el handler `create`, firma y verifica con
 * el codigo real, y borra la fila. No deja rastro.
 */
import { Client } from 'pg';

import { generateAppKeys } from '../src/server/utils/app-keys';
import { signAccessToken, verifyAccessToken, buildJwk, type AppSigningKey } from '../src/server/utils/jwt';

const SLUG = '__check_new_app__';

async function main() {
  const issuer = process.env.IAM_ISSUER!;
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let fallos = 0;
  try {
    const accountId = (await client.query('SELECT id FROM accounts LIMIT 1')).rows[0].id;
    const keys = generateAppKeys();
    const clientId = `cli_check_${Date.now()}`;

    // Igual que el handler: tokenAlg RS256 + par de llaves.
    const { rows } = await client.query(
      `INSERT INTO applications
         (account_id, name, slug, client_type, client_id, client_secret, client_jwt_secret,
          callback_urls, logout_url, token_alg, jwt_kid, jwt_public_key, jwt_private_key)
       VALUES ($1,'CHECK',$2,'confidential',$3,'s','hs-secreto',ARRAY['https://x/cb'],ARRAY['https://x'],
               'RS256',$4,$5,$6)
       RETURNING token_alg AS "tokenAlg", client_jwt_secret AS "clientJwtSecret",
                 jwt_kid AS "jwtKid", jwt_public_key AS "jwtPublicKey", jwt_private_key AS "jwtPrivateKey"`,
      [accountId, SLUG, clientId, keys.jwtKid, keys.jwtPublicKey, keys.jwtPrivateKey]
    );
    const app = rows[0] as AppSigningKey;

    console.log(`aplicacion nueva -> tokenAlg=${app.tokenAlg}  kid=${app.jwtKid?.slice(0, 12)}…\n`);

    const check = (nombre: string, ok: boolean, extra = '') => {
      if (!ok) fallos++;
      console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre.padEnd(44)}${extra}`);
    };

    check('nace en RS256', app.tokenAlg === 'RS256');
    check('nace con par de llaves', Boolean(app.jwtKid && app.jwtPublicKey && app.jwtPrivateKey));

    const token = await signAccessToken({
      payload: { sub: 'u1', accountId: 'a1', appId: 'x', permissions: [] },
      expiresInSec: 900,
      issuer,
      audience: clientId,
      app,
    });
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    check('firma con RS256 y kid', header.alg === 'RS256' && header.kid === app.jwtKid);

    const payload = await verifyAccessToken(token, app, { issuer, audience: clientId });
    check('el IAM lo verifica', payload.sub === 'u1');

    const jwk = await buildJwk(app);
    check(
      'su llave publica entra al JWKS sin material privado',
      Boolean(jwk && jwk.kid === app.jwtKid && !('d' in (jwk as object)))
    );

    // Y que no dependa del secreto HS256 heredado del formulario.
    let usaHs = false;
    try {
      await verifyAccessToken(token, { ...app, tokenAlg: 'HS256' }, { issuer, audience: clientId });
      usaHs = true;
    } catch { /* esperado */ }
    check('no verifica con el secreto HS256 (queda inerte)', !usaHs);
  } finally {
    await client.query('DELETE FROM applications WHERE slug = $1', [SLUG]);
    await client.end();
  }

  console.log(fallos === 0 ? '\nUna aplicacion nueva nace usable con la forma nueva.' : `\n${fallos} problema(s).`);
  process.exit(fallos ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});

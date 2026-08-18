/**
 * Comprueba la cadena RS256 de punta a punta contra los datos reales:
 * firma con la privada de la aplicacion, arma el JWKS igual que la ruta
 * publica, y verifica como lo hara el consumidor (seleccion por `kid`).
 *
 *   npx tsx --env-file=.env scripts/verify-jwks.ts <slug>
 *
 * Correr ANTES de cambiar `tokenAlg` a RS256 y despues de cada rotacion.
 */
import { Client } from 'pg';
import { SignJWT, createLocalJWKSet, exportJWK, importPKCS8, importSPKI, jwtVerify } from 'jose';
import type { JWK } from 'jose';

const RS = 'RS256';

type AppRow = {
  slug: string;
  client_id: string;
  client_jwt_secret: string;
  token_alg: 'HS256' | 'RS256';
  jwt_kid: string | null;
  jwt_public_key: string | null;
  jwt_private_key: string | null;
};

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('uso: verify-jwks.ts <slug>');
    process.exit(1);
  }

  const issuer = process.env.IAM_ISSUER!;
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query<AppRow>(
    'SELECT slug, client_id, client_jwt_secret, token_alg, jwt_kid, jwt_public_key, jwt_private_key FROM applications WHERE status = $1',
    ['active']
  );
  await client.end();

  const app = rows.find((r) => r.slug === slug);
  if (!app) {
    console.error(`no existe la aplicacion "${slug}"`);
    process.exit(1);
  }
  if (!app.jwt_kid || !app.jwt_private_key || !app.jwt_public_key) {
    console.error(`"${slug}" no tiene par de llaves — correr generate-app-keys.ts primero`);
    process.exit(1);
  }

  // El JWKS tal cual lo sirve la ruta publica: todas las apps activas con llave.
  const keys: JWK[] = [];
  for (const r of rows) {
    if (!r.jwt_kid || !r.jwt_public_key) continue;
    const jwk = await exportJWK(await importSPKI(r.jwt_public_key, RS));
    keys.push({ ...jwk, kid: r.jwt_kid, alg: RS, use: 'sig' });
  }
  const jwks = createLocalJWKSet({ keys });

  console.log(`aplicacion   : ${app.slug}  (tokenAlg actual: ${app.token_alg})`);
  console.log(`issuer       : ${issuer}`);
  console.log(`kid          : ${app.jwt_kid.slice(0, 12)}…`);
  console.log(`llaves en JWKS: ${keys.length}\n`);

  const priv = await importPKCS8(app.jwt_private_key, RS);
  const now = Math.floor(Date.now() / 1000);
  const sign = (opts: { kid: string; iss: string; aud: string }) =>
    new SignJWT({ sub: 'u1', accountId: 'a1', appId: 'app1', permissions: [] })
      .setProtectedHeader({ alg: RS, kid: opts.kid })
      .setIssuedAt(now)
      .setExpirationTime(now + 900)
      .setIssuer(opts.iss)
      .setAudience(opts.aud)
      .sign(priv);

  const otra = rows.find((r) => r.slug !== slug && r.jwt_kid);
  const casos: Array<[string, () => Promise<string>, boolean]> = [
    ['token RS256 legitimo', () => sign({ kid: app.jwt_kid!, iss: issuer, aud: app.client_id }), true],
    ['aud de otra aplicacion', () => sign({ kid: app.jwt_kid!, iss: issuer, aud: otra!.client_id }), false],
    ['issuer equivocado', () => sign({ kid: app.jwt_kid!, iss: 'https://malo.example', aud: app.client_id }), false],
    ['kid que no esta en el JWKS', () => sign({ kid: 'deadbeef'.repeat(4), iss: issuer, aud: app.client_id }), false],
  ];

  let fallos = 0;
  for (const [nombre, mk, deberia] of casos) {
    let ok = true;
    let motivo = '';
    try {
      await jwtVerify(await mk(), jwks, { algorithms: [RS], issuer, audience: app.client_id });
    } catch (e) {
      ok = false;
      motivo = (e as { code?: string }).code ?? (e as Error).message;
    }
    const bien = ok === deberia;
    if (!bien) fallos++;
    console.log(
      `${bien ? 'OK  ' : 'FALLA'} ${nombre.padEnd(28)} -> ${ok ? 'acepta ' : 'rechaza'} (esperado: ${deberia ? 'acepta' : 'rechaza'})${motivo ? '  [' + motivo + ']' : ''}`
    );
  }

  // Un token HS256 no debe colarse por la puerta RS256.
  let hsColado = false;
  try {
    const hs = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + 900)
      .setIssuer(issuer)
      .setAudience(app.client_id)
      .sign(new TextEncoder().encode(app.client_jwt_secret));
    await jwtVerify(hs, jwks, { algorithms: [RS], issuer, audience: app.client_id });
    hsColado = true;
  } catch { /* esperado */ }
  if (hsColado) fallos++;
  console.log(`${hsColado ? 'FALLA' : 'OK  '} token HS256 contra el JWKS  -> ${hsColado ? 'acepta' : 'rechaza'} (esperado: rechaza)`);

  console.log(fallos === 0 ? '\nCadena RS256 correcta.' : `\n${fallos} caso(s) mal.`);
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

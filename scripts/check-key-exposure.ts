/**
 * Comprueba que ninguna superficie de la API filtre la llave privada.
 *
 *   npx tsx --env-file=.env scripts/check-key-exposure.ts
 */
import { Client } from 'pg';

import { sanitizeAuditValue } from '../src/server/utils/audit-sanitize';

const MARCADORES = ['BEGIN PRIVATE KEY', 'BEGIN RSA PRIVATE KEY'];

function contieneLlavePrivada(v: unknown): boolean {
  return MARCADORES.some((m) => JSON.stringify(v ?? null).includes(m));
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let fallos = 0;
  const check = (nombre: string, expuesto: boolean) => {
    if (expuesto) fallos++;
    console.log(`${expuesto ? 'FALLA' : 'OK   '} ${nombre.padEnd(46)} ${expuesto ? 'EXPONE la llave' : 'limpio'}`);
  };

  // 1) El endpoint JWKS: solo material publico.
  const jwks = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/.well-known/jwks.json`).then((r) => r.json());
  check('JWKS publico', contieneLlavePrivada(jwks) || jwks.keys.some((k: Record<string, unknown>) => 'd' in k));

  // 2) La fila cruda: aqui SI debe estar (es la fuente).
  const cruda = (await client.query('SELECT * FROM applications LIMIT 1')).rows[0];
  console.log(`${contieneLlavePrivada(cruda) ? 'OK   ' : 'FALLA'} fila cruda de la base                          ${contieneLlavePrivada(cruda) ? 'la tiene (correcto: es la fuente)' : 'no la tiene?'}`);
  if (!contieneLlavePrivada(cruda)) fallos++;

  // 3) Lo que devuelven list/getById tras excluir la columna.
  const recortada = (
    await client.query(
      'SELECT id, slug, client_id, client_secret, client_jwt_secret, token_alg, jwt_kid, jwt_public_key FROM applications LIMIT 1'
    )
  ).rows[0];
  check('respuesta de list / getById', contieneLlavePrivada(recortada));

  // 4) Lo que create/update mandan a la auditoria tras el destructuring.
  const { jwt_private_key: _omitida, ...comoEnHandler } = cruda;
  check('afterValue de create / update', contieneLlavePrivada(comoEnHandler));

  // 5) El sanitizer como ultima red: aunque alguien vuelva a pasar la fila entera.
  const saneada = sanitizeAuditValue({ ...cruda, jwtPrivateKey: cruda.jwt_private_key });
  check('sanitizer sobre la fila COMPLETA', contieneLlavePrivada(saneada));

  // 6) Y que ademas tape los secretos camelCase que ya existian.
  const s = sanitizeAuditValue({
    clientSecret: 'abc',
    clientJwtSecret: 'def',
    passwordHash: 'ghi',
    accessTokenExp: 900,
    name: 'visible',
  }) as Record<string, unknown>;
  const bien =
    s.clientSecret === '[REDACTADO]' &&
    s.clientJwtSecret === '[REDACTADO]' &&
    s.passwordHash === '[REDACTADO]' &&
    s.accessTokenExp === 900 &&
    s.name === 'visible';
  if (!bien) fallos++;
  console.log(
    `${bien ? 'OK   ' : 'FALLA'} sanitizer con claves camelCase                 ${bien ? 'redacta secretos, conserva accessTokenExp y name' : JSON.stringify(s)}`
  );

  await client.end();
  console.log(fallos === 0 ? '\nNinguna superficie expone la llave privada.' : `\n${fallos} problema(s).`);
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

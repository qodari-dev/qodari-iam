/**
 * Cambia el algoritmo de firma de una aplicacion (Fase 2).
 *
 *   npx tsx --env-file=.env scripts/set-token-alg.ts <slug> <HS256|RS256>
 *   npx tsx --env-file=.env scripts/set-token-alg.ts --status
 *
 * El cambio es instantaneo y no requiere desplegar: el IAM lee `tokenAlg` de la
 * base en cada firma. Revertir es correr esto mismo con HS256.
 *
 * Ojo con la base compartida entre local y staging: esto los cambia a los dos.
 * En un entorno que corra codigo viejo (anterior a la Fase 2) la columna se
 * ignora y todo sigue en HS256, asi que el flip solo surte efecto donde ya este
 * desplegado el codigo nuevo.
 */
import { Client } from 'pg';

async function main() {
  const [slug, alg] = process.argv.slice(2);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    if (slug !== '--status') {
      if (!slug || (alg !== 'HS256' && alg !== 'RS256')) {
        console.error('uso: set-token-alg.ts <slug> <HS256|RS256>  |  --status');
        process.exit(1);
      }

      // El guard del `jwt_kid`: marcar RS256 sin par de llaves hace que toda
      // firma de esa aplicacion tire error. Mejor no dejar hacerlo.
      // Los casts son necesarios: `$1` aparece en el SET (donde Postgres lo
      // infiere como el enum) y en el WHERE comparado con un literal de texto.
      // Sin ellos infiere `text` y choca con la columna.
      const { rows } = await client.query(
        `UPDATE applications SET token_alg = $1::token_alg, updated_at = now()
          WHERE slug = $2 AND ($1::text = 'HS256' OR jwt_kid IS NOT NULL)
          RETURNING slug, token_alg`,
        [alg, slug]
      );

      if (!rows.length) {
        console.error(
          `sin cambios: "${slug}" no existe, o no tiene par de llaves (correr generate-app-keys.ts antes de pasar a RS256)`
        );
        process.exit(1);
      }
      console.log(`${rows[0].slug} -> tokenAlg = ${rows[0].token_alg}\n`);
    }

    const all = await client.query(
      'SELECT slug, token_alg, (jwt_kid IS NOT NULL) AS tiene_llaves FROM applications ORDER BY slug'
    );
    console.log('estado:');
    for (const r of all.rows) {
      console.log(
        `  ${r.slug.padEnd(16)} ${String(r.token_alg).padEnd(6)} ${r.tiene_llaves ? 'con llaves' : 'SIN llaves'}`
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { applications } from '@/server/db/schema';
import { buildJwk } from '@/server/utils/jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * JWKS publico del IAM: las llaves con las que los consumidores verifican los
 * access tokens.
 *
 * Un solo endpoint (un `jwks_uri` por issuer, como manda OIDC) con UNA LLAVE
 * POR APLICACION, distinguidas por `kid`. Una llave global unica seria mas
 * simple, pero entonces el aislamiento entre aplicaciones dependeria solo de
 * que cada consumidor valide el `aud`; con llave por aplicacion ese aislamiento
 * se sostiene solo, igual que con el secreto HS256 de hoy.
 *
 * Solo se publican las de aplicaciones ACTIVAS que ya tienen par de llaves. Es
 * material publico por definicion: la privada nunca sale de aqui.
 */
export async function GET() {
  const rows = await db
    .select({
      jwtKid: applications.jwtKid,
      jwtPublicKey: applications.jwtPublicKey,
    })
    .from(applications)
    .where(eq(applications.status, 'active'));

  const keys = (await Promise.all(rows.map(buildJwk))).filter((k) => k !== null);

  return NextResponse.json(
    { keys },
    {
      headers: {
        // Los consumidores cachean el JWKS y solo lo re-piden cuando ven un
        // `kid` desconocido, asi que una cache corta basta y hace que una
        // rotacion se propague en minutos.
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    }
  );
}

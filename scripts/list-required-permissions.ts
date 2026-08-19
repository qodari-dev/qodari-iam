/**
 * Lista los permisos IAM que necesita el panel del PROPIO IAM.
 *
 *   npx tsx --env-file=.env scripts/list-required-permissions.ts [--json]
 *
 * Se recorre el contrato en vez de mantener una lista aparte: una lista a mano
 * se desactualiza en silencio y el sintoma aparece meses despues como un 403
 * que nadie sabe explicar.
 */
import { contract } from '../src/server/api/contracts';

type Perm = { resource: string; action: string };

function collect(node: unknown, out: Map<string, Perm>): void {
  if (!node || typeof node !== 'object') return;

  const meta = (node as { metadata?: { permissionKey?: { resourceKey?: string; actionKey?: string } } })
    .metadata;
  const key = meta?.permissionKey;
  if (key?.resourceKey && key?.actionKey) {
    out.set(`${key.resourceKey}:${key.actionKey}`, {
      resource: key.resourceKey,
      action: key.actionKey,
    });
  }

  for (const value of Object.values(node as Record<string, unknown>)) {
    collect(value, out);
  }
}

const found = new Map<string, Perm>();
collect(contract, found);

const perms = [...found.values()].sort(
  (a, b) => a.resource.localeCompare(b.resource) || a.action.localeCompare(b.action)
);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(perms, null, 2));
} else {
  const byResource = new Map<string, string[]>();
  for (const p of perms) {
    byResource.set(p.resource, [...(byResource.get(p.resource) ?? []), p.action]);
  }
  console.log(`${byResource.size} recursos, ${perms.length} permisos\n`);
  for (const [resource, actions] of [...byResource].sort()) {
    console.log(`  ${resource.padEnd(20)} ${actions.sort().join(', ')}`);
  }
}

import { readFileSync } from 'node:fs';

// Generated from the API contract at packaging time. No secrets, DB or npm needed.
const permissions = JSON.parse(
  readFileSync(new URL('../required-iam-permissions.json', import.meta.url), 'utf8')
);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(permissions, null, 2));
} else {
  for (const { resource, action } of permissions) console.log(`${resource}:${action}`);
  console.log(
    'Crear estos permisos en la aplicación correspondiente del IAM y asignarlos a los roles. Este comando solo lista; no siembra permisos.'
  );
}

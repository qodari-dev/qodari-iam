/**
 * Saneo de los payloads que van al log de auditoria.
 *
 * `beforeValue` / `afterValue` se arman haciendo spread de la fila entera
 * (`{ ...updated }`), asi que arrastran cualquier columna sensible que la tabla
 * tenga hoy o gane manana. Redactar por NOMBRE DE CLAVE aqui es lo unico que
 * escala: cubre todos los recursos de una vez y no hay que acordarse en cada
 * handler nuevo.
 *
 * Ojo con el patron: las columnas de este repo son camelCase (`clientSecret`,
 * `jwtPrivateKey`), asi que no sirve anclar la expresion — hay que normalizar la
 * clave y buscar por fragmento.
 */
const REDACTED = '[REDACTADO]';
const MAX_DEPTH = 8;

/** Claves cuyo valor completo se redacta, con el nombre ya normalizado. */
const SENSITIVE_FRAGMENTS = ['secret', 'password', 'passwd', 'privatekey', 'passwordhash'];

/**
 * Coincidencias exactas para nombres donde el fragmento suelto daria falsos
 * positivos: `accessTokenExp` y `refreshTokenExp` son numeros de configuracion
 * y son utiles en la auditoria, no hay por que taparlos.
 */
const SENSITIVE_EXACT = new Set([
  'token',
  'tokenhash',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'apikey',
  'authorization',
  'cookie',
  'signature',
  'codeverifier',
  'emailverificationtoken',
  'passwordresettoken',
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[_-]/g, '');
  if (SENSITIVE_EXACT.has(normalized)) return true;
  return SENSITIVE_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function visit(value: unknown, depth: number): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return '[PROFUNDIDAD OMITIDA]';
  if (Array.isArray(value)) return value.map((item) => visit(item, depth + 1));

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : visit(child, depth + 1);
    }
    return out;
  }

  return String(value);
}

export function sanitizeAuditValue<T>(input: T): T {
  return visit(input, 0) as T;
}

# IAM: instalación nativa

Paquete para Linux x86-64/glibc (Debian 12) y Node.js 24. Incluye el servidor
Next.js standalone, dependencias (incluido argon2), SQL y herramientas de operación.
No requiere Git, npm, compilación ni Docker en el servidor. Aurora se entrega aparte.
`release.json` identifica aplicación, instalación, commit, versión y URLs compiladas.

## Preparar con TI

- Node 24 y Nginx en el servidor de aplicaciones; PostgreSQL 18 en la red privada,
  con TLS y conexiones restringidas al servidor de aplicaciones. IAM no necesita
  pgvector ni btree_gist; esas extensiones corresponden a la DB de Aurora.
- Revisar `templates/database-iam.sql` con el administrador: crea una **DB nueva**
  `iam`, su propietario `iam_migrator` y un rol `iam_runtime` con permisos DML.
  Usar contraseñas diferentes. No usar el superusuario ni compartir la DB de Aurora.
  Si estos nombres ya existen o se cambian, adaptar la plantilla antes de ejecutarla.
- Crear `/srv/iam/{incoming,releases,shared}` para el usuario operador; `shared` con
  modo 700. El permiso sobre `/srv/aurora` no concede acceso a `/srv/iam`.
- Instalar `templates/iam.service`, revisando usuario, grupo y ruta de Node.
  TI ejecuta `systemctl daemon-reload` y habilita el servicio al arranque. Autorizar al
  operador **stop/restart/status de iam**, más lectura de sus logs. IAM escucha en
  `127.0.0.1:3001`; Aurora usa otro servicio, directorio y puerto (3000).
- Adaptar `templates/nginx-iam.conf.example`, configurar DNS, HTTPS y renovación.
  Validar con `nginx -t`; la plantilla no crea registros DNS ni certificados.
- Acordar correo, S3, backups externos restaurables y monitoreo. IAM guarda sus llaves
  privadas de firma en PostgreSQL: proteger y respaldar esa DB. No entregar esas llaves
  a Aurora. Probar conectividad HTTPS saliente y el acceso público al dominio IAM.

Los accesos SSH y hosts privados se reciben por el canal del cliente, fuera del paquete.
Mantener una sola instancia de IAM: su scheduler no coordina réplicas concurrentes.

## Configurar y transferir

1. Transferir el `.tar.gz` y `.sha256` a `/srv/iam/incoming`. Sustituir VERSION por
   el nombre real que comienza con `iam-`:

```bash
cd /srv/iam/incoming
sha256sum -c VERSION.tar.gz.sha256
# Continuar solo si indica OK y releases/VERSION todavía no existe.
tar --no-same-owner -xzf VERSION.tar.gz -C /srv/iam/releases
```

El checksum comprueba integridad; obtener siempre el archivo desde nuestro artifact confiable.
No extraer sobre la release activa.

2. Copiar `templates/iam.env.example` y `templates/migration.env.example` a
   `/srv/iam/shared/iam.env` y `migration.env`. Completar los valores y aplicar
   `chmod 600` a ambos. El primero usa `iam_runtime`; el segundo `iam_migrator`.
   Host, puerto, base y parámetros TLS deben ser iguales. Ajustar EXPECTED_DATABASE
   y EXPECTED_DB_HOST. Para CA privada, usar sslrootcert y certificado válido para
   el host/IP de conexión. No desactivar TLS por defecto.

Mantener valores entre comillas, especialmente secretos con `#` o espacios. No se
ejecuta sintaxis de shell; solo valores en una línea. Además, codificar caracteres
especiales de la contraseña dentro de DATABASE_URL (por ejemplo `#` como `%23`).
No pasar contraseñas en argumentos ni pegar archivos privados en chats/logs.

`NEXT_PUBLIC_API_URL` debe ser el mismo origen que NEXT_PUBLIC_APP_URL: **sin /api/v1
ni /portal**, pues el contrato agrega las rutas. Las tres URLs deben coincidir con
release.json; cambiar dominios requiere volver a compilar. IAM_DEFAULT_ACCOUNT_SLUG
identifica la cuenta inicial; IAM_APP_SLUG identifica la aplicación del propio panel IAM.
Este servicio no usa TENANCY_MODE: su separación dedicada depende de su DB/configuración.

## Migrar y activar

```bash
node /srv/iam/releases/VERSION/ops/update.mjs --check
node /srv/iam/releases/VERSION/ops/update.mjs --apply --backup-reference=ID_RESPALDO
```

Para una primera DB confirmada vacía, usar `initial-empty-db` como referencia. El
argumento registra una referencia; **no crea ni verifica backups**. Si el perfil está
marcado provisional, ambos comandos exigen `--allow-provisional` para una prueba
coordinada. Confirmar DNS/certificados y reconstruir el perfil antes de producción.

El check valida configuración, conexión e historial SQL sin migrar ni activar. Apply
detiene IAM y su scheduler, migra, cambia el enlace current, reinicia y exige tres
respuestas saludables de la versión nueva. Se necesita ventana de mantenimiento.
Las actualizaciones de IAM interrumpen temporalmente el login de Aurora.

## Primera cuenta y conexión con Aurora

Después de migrar, completar `templates/bootstrap.env.example` en
`/srv/iam/shared/bootstrap.env` (chmod 600), con administrador, contraseña inicial
y valores del plan acordados. El precio es un dato del plan; el bootstrap no cobra
ni activa una suscripción comercial.

```bash
node /srv/iam/current/ops/bootstrap.mjs /srv/iam/shared/iam.env /srv/iam/shared/bootstrap.env
node /srv/iam/current/ops/bootstrap.mjs /srv/iam/shared/iam.env /srv/iam/shared/bootstrap.env --apply
```

El primer comando revisa sin crear. El segundo crea plan, cuenta, aplicación IAM con
llaves RS256, permisos del contrato IAM y administrador en una transacción, usando
el rol runtime. Consulta migration.env solo para verificar el historial. No reemplaza
cuentas existentes ni restablece contraseñas/llaves al repetirlo. Retirar bootstrap.env
después del alta y conservar la contraseña en el gestor autorizado.

Entrar en `/<account-slug>/login` y verificar `/<account-slug>/admin`. Luego:

- Crear la aplicación **Aurora**, sus callbacks y URLs de salida; configurar sus
  credenciales OAuth en Aurora. Usar el mismo UUID de cuenta al inicializar Aurora.
- Cargar los permisos del **paquete Aurora** en la aplicación Aurora. Los de este
  paquete corresponden al panel IAM; no intercambiarlos.
- Crear el cliente M2M y asignar únicamente los roles/permisos requeridos para las
  operaciones de Aurora sobre IAM. Configurar sus credenciales separadas en Aurora.
- Alinear IAM_ISSUER entre ambos servicios y comprobar token, JWKS y firma RS256.
  Verificar login completo y un usuario sin privilegios de administrador.
- Probar recuperación de contraseña/correo, archivos y acceso tras reiniciar el servidor.

`ops/list-required-permissions.mjs --json` lista el contrato IAM de esta release.
Tras actualizaciones, comparar/cargar los nuevos permisos y asignarlos a roles:
el bootstrap inicial no sincroniza permisos de cuentas que ya existen.

## Recuperación

El historial está en `/srv/iam/deployments.jsonl`. Si falla SQL, current no cambia e
IAM queda detenido; si falla arranque/health se intenta detener la versión nueva.
No hay rollback automático de DB/código: una pérdida de conexión al confirmar puede
dejar un resultado ambiguo. Con TI, verificar esquema/historial antes de reintentar o
reiniciar una release anterior compatible. Cambiar current no revierte migraciones.

Una interrupción forzada puede dejar `.update-lock`; comprobar que no hay otro proceso
de actualización antes de retirarlo. Conservar las releases necesarias y limpiar el
disco deliberadamente. La comprobación `/api/health` verifica DB y versión, no correo,
S3, OAuth ni validez de los backups; estos requieren sus propias pruebas.

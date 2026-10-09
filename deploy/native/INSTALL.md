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

## Correo: Resend o Microsoft 365

El proveedor se elige por instalación, tanto en Aurora como en IAM. Sin
`EMAIL_PROVIDER` se usa `resend`: los entornos existentes conservan su API key y
su remitente legado (`RESEND_FROM_EMAIL` en Aurora, `RESEND_MAIL_FROM` en IAM).
`EMAIL_FROM_EMAIL` permite configurar un remitente común a ambos proveedores;
cuando se usa debe ser una dirección simple, sin nombre ni `<...>`.

Para Microsoft 365, completar en el archivo protegido de la aplicación:

```dotenv
EMAIL_PROVIDER="graph"
EMAIL_FROM_EMAIL="no-reply@example.com"
MS_GRAPH_TENANT_ID="CHANGE_ME"
MS_GRAPH_CLIENT_ID="CHANGE_ME"
MS_GRAPH_CLIENT_SECRET="CHANGE_ME"
```

Usar el buzón y las credenciales entregadas por TI. Son credenciales de Microsoft,
no las de integración con IAM. Graph no requiere configurar Resend. Las variables
son de servidor: no agregar `NEXT_PUBLIC_`, secretos al perfil público ni al paquete.
Los archivos `.env` deben conservar permisos 600.

Se requiere `Mail.Send` de aplicación autorizado para el buzón remitente y salida
HTTPS hacia `login.microsoftonline.com` y `graph.microsoft.com`. TI debe limitar
el acceso a los buzones autorizados. Azure Identity obtiene y reutiliza tokens;
el secreto de aplicación se renueva por separado antes de su vencimiento.
El nombre visible del remitente en Graph lo determina el buzón de Microsoft 365;
`replyTo` se conserva para dirigir las respuestas al contacto configurado.

Instalar primero una release que incluya este proveedor, configurar el entorno y
usar el procedimiento de preflight/actualización de este manual. Cambios posteriores
en proveedor o credenciales requieren reiniciar el servicio correspondiente.
No requieren migración de base de datos ni modificar DNS de la aplicación.

Validar con un destinatario de prueba autorizado: recuperación de contraseña/MFA
en IAM y un correo de Aurora, incluyendo una invitación `.ics` si se usa agenda.
Confirmar recepción y revisar Elementos enviados. Graph 202 significa aceptado para
procesamiento, no entrega confirmada. Los errores se propagan sin registrar claves,
tokens, destinatarios ni cuerpos; no se cambia automáticamente a otro proveedor.
El SDK no reintenta el POST de envío: ante un fallo ambiguo revisar Elementos enviados
antes de repetir. Los procesos de negocio pueden tener su propia política de reintentos.

Graph envía HTML y adjuntos pequeños con `Mail.Send`. Esta implementación admite
adjuntos menores de 3 MiB y un JSON total menor de 4 MiB (incluye base64 y HTML).
Para archivos mayores usar enlaces de descarga; no se omiten adjuntos silenciosamente.
Las sesiones de carga de adjuntos grandes requieren otra implementación y permisos
adicionales. Resend conserva sus límites de proveedor.

Pruebas locales sin enviar correo ni usar credenciales reales: `npm run test:email`.

Referencias: [autenticación de aplicación](https://learn.microsoft.com/en-us/graph/sdks/choose-authentication-providers#client-credentials-provider),
[sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0),
[adjuntos grandes](https://learn.microsoft.com/en-us/graph/outlook-large-attachments).


## Almacenamiento S3: bucket privado e imágenes públicas

Se conserva un solo bucket. `STORAGE_PUBLIC_DELIVERY` elige cómo se entregan los
archivos destinados a publicación, independientemente del proveedor S3:

- `direct` (por defecto): conserva las subidas con `public-read` y la URL de Spaces/CDN
  que utilizan las instalaciones existentes. No requiere cambiar sus variables.
- `proxy`: los nuevos logos/imágenes públicas se suben sin ACL y la aplicación los
  entrega desde `/api/public-assets/...`, leyendo el bucket con sus credenciales.
  Compatible con Garage y con S3/Spaces cuando el bucket permite lectura autenticada.
  No habilitar acceso anónimo al bucket ni publicarlo como sitio web.

La ruta solo acepta el entorno, aplicación, UUID de cuenta, tipos públicos y nombres
UUID generados por la subida autenticada. Los documentos, adjuntos, conocimiento y firmas
no están incluidos. La clasificación corresponde al uso, no a la extensión: una imagen
adjunta a una PQRS permanece privada. El endpoint público no permite subir ni listar.
Los logos son públicos para cualquier visitante que tenga su URL, igual que en un CDN.

Para una instalación con bucket privado, actualizar NEXT_PUBLIC_STORAGE_URL en el perfil
público antes de compilar. En `/srv/iam/shared/iam.env`, configurar (ejemplo):

```env
STORAGE_PUBLIC_DELIVERY="proxy"
NEXT_PUBLIC_STORAGE_URL="https://iam.example.com/api/public-assets"
DO_SPACES_ENDPOINT="https://archivos.example.com"
DO_SPACES_REGION="garage"
DO_SPACES_BUCKET="application-files"
DO_SPACES_FORCE_PATH_STYLE="true"
AWS_REQUEST_CHECKSUM_CALCULATION="WHEN_REQUIRED"
```

**El endpoint HTTPS del ejemplo depende de TI**: debe apuntar a la API S3 de Garage
(puerto interno 3900), preservando Host, rutas, query de firmas y métodos. No es el endpoint
web de Garage. Conservar `DO_SPACES_KEY` y `DO_SPACES_SECRET` en el archivo protegido;
no hacen falta otra llave ni otro bucket. Si TI confirma otra URL, usar esa URL de API.
La IP interna HTTP sirve para pruebas desde el servidor, pero no para el flujo actual
de subidas/descargas firmadas desde navegadores externos HTTPS.

Las subidas continúan siendo PUT directo del navegador a S3. Por ello TI debe configurar
HTTPS y CORS en el bucket para los orígenes exactos `https://aurora.example.com` y
`https://iam.example.com`, métodos PUT/GET/HEAD y header Content-Type. En `direct`, también
se requiere x-amz-acl. La lectura del logo por la ruta de la aplicación no depende de
CORS de S3. Las opciones path-style/checksum son optativas; no cambian defaults de Spaces.

La URL NEXT_PUBLIC_STORAGE_URL se incorpora en la compilación. Ejecutar el workflow de
ambas aplicaciones y actualizar el valor en cada .env antes de activar esas releases.
Aurora utiliza su dominio; IAM utiliza el suyo. Preflight rechaza una combinación de
modo y URL incompatible. La plantilla del paquete trae el modo correspondiente a su URL.
No se requieren migraciones SQL nuevas. En una instalación vacía no hay archivos que copiar.
Cambiar de modo no modifica ACL de objetos que ya existieran en otra instalación:
si se migra un bucket con archivos públicos previos, revisar sus permisos por separado.

Comprobación tras desplegar:

1. Subir un logo desde la interfaz y abrir su URL de la aplicación sin iniciar sesión.
2. Comprobar que la URL directa S3 del mismo objeto continúa rechazando acceso anónimo.
3. Cambiar/eliminar el logo y probar la limpieza de imágenes de IAM.
4. Comprobar una descarga privada con sesión/permisos y que su key en
   `/api/public-assets/...` responde 404. Aurora debe mantener conocimiento y adjuntos privados.
5. Verificar errores de CORS en el navegador: un PUT exitoso desde Node no prueba CORS.

La entrega usa streaming, tamaño y MIME limitados, HEAD/ETag y caché pública de cinco
minutos. Al eliminar un logo, una copia cacheada puede persistir ese tiempo. SVG/PDF se
entregan con CSP sandbox y nosniff para impedir scripts con el origen de la aplicación.
La disponibilidad y el tráfico de estas imágenes dependen ahora de la aplicación.

Referencias: [Garage S3](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/),
[checksums del SDK AWS](https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html).

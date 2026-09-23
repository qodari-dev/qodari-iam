# Entrega de IAM para Cafamaz

Usar **Package IAM client server** en Actions, `Run workflow`, rama `master`, perfil
`cafamaz-production`. El botón aparecerá cuando el workflow llegue a la rama predeterminada.
No necesita un GitHub Environment ni las claves/DB del cliente. Genera un artifact con
`iam-cafamaz-production-COMMIT-RUN-ATTEMPT.tar.gz` y su checksum; no despliega ni migra
en Cafamaz. El flujo actual Docker/Dokploy conserva sus disparadores y secretos.

La compilación y las pruebas Linux usan Node 24 sobre Debian 12; PostgreSQL 18 de CI
es desechable. Se prueban roles migrador/runtime, SQL, bootstrap, argon2, health y login.

Perfil provisional aprobado:

| Variable                | Valor                        |
| ----------------------- | ---------------------------- |
| NEXT_PUBLIC_APP_URL     | https://iam.cafamaz.com      |
| NEXT_PUBLIC_API_URL     | https://iam.cafamaz.com      |
| NEXT_PUBLIC_STORAGE_URL | https://archivos.cafamaz.com |

El portal público será https://iam.cafamaz.com/portal. Confirmar los dominios, actualizar
el JSON y `provisional: false`, y generar otra entrega antes de ponerlo en producción.
El API lleva /api/v1 en su contrato; no agregarlo a NEXT_PUBLIC_API_URL.

En el servidor de aplicaciones `aurora`, solicitar a TI `/srv/iam`, la unidad
`iam.service`, permisos stop/restart/status y acceso a logs. Usará 127.0.0.1:3001;
Aurora continúa en /srv/aurora y puerto 3000. En `aurora-2`, solicitar la DB `iam` y
roles `iam_migrator`/`iam_runtime` según la plantilla. No reutilizar el superusuario.
En `iam.service`, reemplazar `CHANGE_ME_OPERATOR` por `user_aurora` en User y Group,
verificando con TI el grupo y la ruta `/usr/bin/node`.
DNS, Nginx, TLS PostgreSQL, correo y S3 todavía requieren configuración real con TI.

Seguir [la guía incluida en cada paquete](../deploy/native/INSTALL.md): transferir,
verificar checksum, completar archivos privados, migrar/activar, inicializar cuenta
y administrador, conectar Aurora. Inicializar IAM primero permite obtener el UUID
de cuenta que necesita Aurora. No hay que ejecutar git pull ni npm en Cafamaz.

Para otro cliente, crear su perfil público JSON con las mismas tres claves, dominios
confirmados y nombre `<cliente>-production`. Las plantillas del paquete son genéricas;
hosts, usuarios y credenciales se completan por instalación.

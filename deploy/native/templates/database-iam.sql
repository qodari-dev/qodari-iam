\set ON_ERROR_STOP on
-- Administrator only. First installation into a NEW database, using psql.
-- Passwords are prompted, never stored in this file. Aurora uses a different DB and roles.
CREATE ROLE iam_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password iam_migrator
CREATE ROLE iam_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password iam_runtime
CREATE DATABASE iam OWNER iam_migrator;
\connect iam
REVOKE CONNECT ON DATABASE iam FROM PUBLIC;
GRANT CONNECT ON DATABASE iam TO iam_migrator, iam_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO iam_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE iam_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO iam_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE iam_migrator IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO iam_runtime;
-- For an EXISTING database also grant privileges on existing tables/sequences.
-- Restrict pg_hba.conf/firewall to the private application host; configure server TLS.

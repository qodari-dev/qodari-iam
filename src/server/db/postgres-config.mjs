import { isIP } from 'node:net';
import { parseIntoClientConfig } from 'pg-connection-string';

/**
 * Preserve pg's URL/TLS options while validating IP certificates against the
 * actual database address. pg supplies TLS servername only for DNS hosts; with
 * its existing socket, Node otherwise falls back to checking "localhost".
 * @param {string | undefined} connectionString
 * @param {boolean} [defaultSsl]
 * @returns {import('pg').ClientConfig}
 */
export function postgresConfig(connectionString, defaultSsl) {
  if (!connectionString) return { connectionString, ssl: defaultSsl };
  // Parse once: leaving TLS parameters in connectionString would make pg replace
  // our SSL options on its second parse, losing the explicit verification host.
  const config = parseIntoClientConfig(connectionString);
  if (config.ssl === undefined) config.ssl = defaultSsl;
  if (config.ssl && config.host && isIP(config.host)) {
    config.ssl = {
      ...(typeof config.ssl === 'object' ? config.ssl : {}),
      host: config.host,
    };
  }
  return config;
}

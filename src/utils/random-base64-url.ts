export function randomBase64Url(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);

  // Uint8Array -> base64
  const b64 = btoa(String.fromCharCode(...arr));

  // base64 -> base64url
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function generateClientId(prefix = 'cli_') {
  return `${prefix}${crypto.randomUUID().replace(/-/g, '')}`;
}

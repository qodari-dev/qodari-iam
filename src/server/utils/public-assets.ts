import 'server-only';
import { env } from '@/env';
import { publicAssetPolicy } from './public-asset-policy';
import { readPublicAssetObject } from './spaces';

function failure(status: number): Response {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Stream only public-purpose assets. Private objects never reach S3 through this route. */
export async function servePublicAsset(request: Request, key: string): Promise<Response> {
  const policy = publicAssetPolicy(key);
  if (env.STORAGE_PUBLIC_DELIVERY !== 'proxy' || !policy) return failure(404);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
  try {
    const object = await readPublicAssetObject(key, request.method === 'HEAD', signal);
    // Convert once; cancelling also closes the upstream S3 stream for rejected/304 responses.
    const stream = object.Body?.transformToWebStream();
    const size = object.ContentLength;
    const contentType = object.ContentType?.split(';')[0].trim().toLowerCase();
    if (
      typeof size !== 'number' ||
      size <= 0 ||
      size > policy.maxBytes ||
      contentType !== policy.contentType
    ) {
      await stream?.cancel();
      return failure(404);
    }
    const headers = new Headers({
      'Content-Type': policy.contentType,
      'Content-Length': String(size),
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      // Uploaded SVG/PDF must never execute scripts with the application's origin.
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    if (object.ETag) headers.set('ETag', object.ETag);
    const matches = request.headers
      .get('if-none-match')
      ?.split(',')
      .some(
        (tag) =>
          tag.trim() === '*' ||
          (object.ETag && tag.trim().replace(/^W\//, '') === object.ETag.replace(/^W\//, ''))
      );
    if (matches) {
      await stream?.cancel();
      headers.delete('Content-Length');
      return new Response(null, { status: 304, headers });
    }
    if (request.method === 'HEAD') return new Response(null, { headers });
    if (!stream) return failure(502);
    let received = 0;
    const bounded = stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          received += chunk.byteLength;
          if (received > size || received > policy.maxBytes) {
            controller.error(new Error('Invalid asset size'));
            return;
          }
          controller.enqueue(chunk);
        },
      }),
      { signal }
    );
    return new Response(bounded, { headers });
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;
    // Do not leak bucket names, keys, credentials or raw SDK errors.
    return failure(status === 404 ? 404 : 502);
  }
}

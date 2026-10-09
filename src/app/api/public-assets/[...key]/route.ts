import { servePublicAsset } from '@/server/utils/public-assets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ key: string[] }> };

export async function GET(request: Request, { params }: Context) {
  const { key } = await params;
  return servePublicAsset(request, key.join('/'));
}

export async function HEAD(request: Request, context: Context) {
  return GET(request, context);
}

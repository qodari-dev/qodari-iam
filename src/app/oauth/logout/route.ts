import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { applications, sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { clearSessionCookie, getSessionFromRequest } from '@/server/utils/session';

export const runtime = 'nodejs';

/**
 * RP-Initiated Logout (OIDC)
 *
 * Query params:
 * - client_id (required): The client ID of the application
 * - post_logout_redirect_uri (optional): Where to redirect after logout
 *
 * Flow:
 * 1. Validate client_id
 * 2. Validate post_logout_redirect_uri is in allowed list (if provided)
 * 3. Delete session from DB
 * 4. Clear session cookie
 * 5. Redirect to post_logout_redirect_uri or show success message
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;

  const clientId = url.searchParams.get('client_id');
  const postLogoutRedirectUri = url.searchParams.get('post_logout_redirect_uri');

  // 1) client_id is required
  if (!clientId) {
    return new NextResponse('client_id is required', { status: 400 });
  }

  // 2) Find application by client_id
  const app = await db.query.applications.findFirst({
    where: eq(applications.clientId, clientId),
  });

  if (!app || app.status !== 'active') {
    return new NextResponse('Unknown or inactive client', { status: 400 });
  }

  // 3) Determine redirect URL
  // If post_logout_redirect_uri is provided, it must match app.logoutUrl
  // Otherwise, use app.logoutUrl as default
  const configuredLogoutUrl = app.logoutUrl;

  if (
    postLogoutRedirectUri &&
    configuredLogoutUrl &&
    configuredLogoutUrl.includes(postLogoutRedirectUri)
  ) {
    return new NextResponse('post_logout_redirect_uri does not match the configured logout URL', {
      status: 400,
    });
  }

  const finalRedirectUri = postLogoutRedirectUri ?? configuredLogoutUrl?.at(0);

  // 4) Get and delete session
  const session = await getSessionFromRequest(request);

  if (session) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
  }

  // 5) Clear session cookie
  await clearSessionCookie();

  // 6) Redirect or show success
  if (finalRedirectUri) {
    return NextResponse.redirect(finalRedirectUri);
  }

  // If no redirect URI, show a simple success page
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Logged Out</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 { color: #333; margin-bottom: 0.5rem; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Logged Out</h1>
          <p>You have been successfully logged out.</p>
        </div>
      </body>
    </html>
    `,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }
  );
}

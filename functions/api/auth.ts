import { authenticateRequest, jsonResponse, PagesContext } from '../../lib/cf-d1';

export async function onRequestPost(context: PagesContext): Promise<Response> {
  let bodyCreds: { username?: string; password?: string } | undefined;
  const contentType = context.request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      bodyCreds = (await context.request.json()) as {
        username?: string;
        password?: string;
      };
    } catch {
      bodyCreds = undefined;
    }
  }

  const auth = await authenticateRequest(
    context.request,
    context.env,
    { requiredRole: 'assistant' },
    bodyCreds
  );
  if ('error' in auth) return auth.error;
  return jsonResponse({ ok: true, user: auth.user });
}


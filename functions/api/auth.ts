import { jsonResponse, PagesContext, verifyAdminPassword } from '../../lib/cf-d1';

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const authError = verifyAdminPassword(context.request, context.env);
  if (authError) return authError;
  return jsonResponse({ ok: true });
}

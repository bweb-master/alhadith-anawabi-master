import { jsonResponse, PagesContext } from '../../lib/cf-d1';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { env } = context;
  if (!env.DB) {
    return jsonResponse({ ok: false, mode: 'local' }, 200);
  }

  try {
    const hadithsCountRow = await env.DB.prepare(
      'SELECT COUNT(*) as c FROM muhalla_hadiths'
    ).first<{ c: number }>();
    const narratorsCountRow = await env.DB.prepare(
      'SELECT COUNT(*) as c FROM narrators'
    ).first<{ c: number }>();
    const nineBooksCountRow = await env.DB.prepare(
      'SELECT COUNT(*) as c FROM nine_books'
    ).first<{ c: number }>();

    return jsonResponse({
      ok: true,
      mode: 'cloudflare-d1',
      hasAdminPassword: Boolean(env.ADMIN_PASSWORD),
      counts: {
        hadiths: Number(hadithsCountRow?.c || 0),
        narrators: Number(narratorsCountRow?.c || 0),
        nineBooks: Number(nineBooksCountRow?.c || 0),
      },
    });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: 'تعذر قراءة جداول D1', details: String(err) },
      500
    );
  }
}

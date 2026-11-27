import {
  authenticateRequest,
  jsonResponse,
  PagesContext,
  requireDb,
} from '../../lib/cf-d1';
import type { PlatformSettings } from '../../src/types/settings';

async function ensureSettingsTable(db: PagesContext['env']['DB']): Promise<void> {
  if (!db) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS platform_settings (
          id TEXT PRIMARY KEY,
          settings_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`
      )
      .run();
  } catch {
    // ignore if already exists
  }
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  await ensureSettingsTable(dbOrRes);

  const row = await dbOrRes
    .prepare('SELECT settings_json, updated_at FROM platform_settings WHERE id = ?1')
    .bind('main')
    .first<{ settings_json: string; updated_at: string }>();

  if (!row) {
    return jsonResponse({ settings: null });
  }

  try {
    const parsed = JSON.parse(row.settings_json) as PlatformSettings;
    return jsonResponse({ settings: parsed, updatedAt: row.updated_at });
  } catch {
    return jsonResponse({ settings: null });
  }
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const auth = await authenticateRequest(context.request, context.env, {
    requiredRole: 'admin',
  });
  if ('error' in auth) return auth.error;

  await ensureSettingsTable(dbOrRes);

  const body = (await context.request.json()) as { settings?: PlatformSettings };
  if (!body.settings || typeof body.settings !== 'object') {
    return jsonResponse({ error: 'بيانات الإعدادات غير صالحة' }, 400);
  }

  const now = new Date().toISOString();
  await dbOrRes
    .prepare(
      `INSERT INTO platform_settings (id, settings_json, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(id) DO UPDATE SET
         settings_json = excluded.settings_json,
         updated_at = excluded.updated_at`
    )
    .bind('main', JSON.stringify(body.settings), now)
    .run();

  return jsonResponse({ ok: true, updatedAt: now });
}

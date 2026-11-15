import {
  jsonResponse,
  PagesContext,
  requireDb,
  verifyAdminPassword,
} from '../../lib/cf-d1';
import type { MuhallaHadith } from '../../src/types/hadith';

interface HadithRow {
  id: string;
  volume: number;
  issue_number: number;
  kitab: string;
  issue_title: string;
  matn_with_tashkeel: string;
  ibn_hazm_isnad_text: string;
  ibn_hazm_hukm: string;
  paths_json: string;
  takhrij_links_json: string;
  gharib_json: string;
  fiqh_analysis: string;
  other_madhahib_notes: string;
  updated_at: string;
}

function rowToHadith(row: HadithRow): MuhallaHadith {
  return {
    id: row.id,
    volume: Number(row.volume || 1),
    issueNumber: Number(row.issue_number || 1),
    kitab: row.kitab,
    issueTitle: row.issue_title,
    matnWithTashkeel: row.matn_with_tashkeel,
    ibnHazmIsnadText: row.ibn_hazm_isnad_text || '',
    ibnHazmHukm: row.ibn_hazm_hukm || '',
    paths: JSON.parse(row.paths_json || '[]'),
    takhrijLinks: JSON.parse(row.takhrij_links_json || '[]'),
    gharib: JSON.parse(row.gharib_json || '[]'),
    fiqhAnalysis: row.fiqh_analysis || '',
    otherMadhahibNotes: row.other_madhahib_notes || '',
    updatedAt: row.updated_at || '',
  };
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const res = await dbOrRes
    .prepare('SELECT * FROM muhalla_hadiths ORDER BY volume ASC, issue_number ASC')
    .all<HadithRow>();

  return jsonResponse({ hadiths: (res.results || []).map(rowToHadith) });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const authError = verifyAdminPassword(context.request, context.env);
  if (authError) return authError;

  const body = (await context.request.json()) as
    | { hadith?: MuhallaHadith; hadiths?: MuhallaHadith[] }
    | MuhallaHadith;

  const items: MuhallaHadith[] =
    'hadiths' in body && Array.isArray(body.hadiths)
      ? body.hadiths
      : 'hadith' in body && body.hadith
        ? [body.hadith]
        : [body as MuhallaHadith];

  const stmt = dbOrRes.prepare(`
    INSERT INTO muhalla_hadiths (
      id, volume, issue_number, kitab, issue_title, matn_with_tashkeel,
      ibn_hazm_isnad_text, ibn_hazm_hukm, paths_json, takhrij_links_json,
      gharib_json, fiqh_analysis, other_madhahib_notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      volume = excluded.volume,
      issue_number = excluded.issue_number,
      kitab = excluded.kitab,
      issue_title = excluded.issue_title,
      matn_with_tashkeel = excluded.matn_with_tashkeel,
      ibn_hazm_isnad_text = excluded.ibn_hazm_isnad_text,
      ibn_hazm_hukm = excluded.ibn_hazm_hukm,
      paths_json = excluded.paths_json,
      takhrij_links_json = excluded.takhrij_links_json,
      gharib_json = excluded.gharib_json,
      fiqh_analysis = excluded.fiqh_analysis,
      other_madhahib_notes = excluded.other_madhahib_notes,
      updated_at = excluded.updated_at
  `);

  const batch = items.map((h) =>
    stmt.bind(
      h.id,
      Number(h.volume || 1),
      Number(h.issueNumber || 1),
      h.kitab,
      h.issueTitle,
      h.matnWithTashkeel,
      h.ibnHazmIsnadText || '',
      h.ibnHazmHukm || '',
      JSON.stringify(h.paths || []),
      JSON.stringify(h.takhrijLinks || []),
      JSON.stringify(h.gharib || []),
      h.fiqhAnalysis || '',
      h.otherMadhahibNotes || '',
      h.updatedAt || new Date().toISOString().slice(0, 10)
    )
  );

  await dbOrRes.batch(batch);
  return jsonResponse({ ok: true, count: items.length });
}

export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const authError = verifyAdminPassword(context.request, context.env);
  if (authError) return authError;

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) return jsonResponse({ error: 'معرف الحديث مفقود' }, 400);

  await dbOrRes.prepare('DELETE FROM muhalla_hadiths WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}

import {
  authenticateRequest,
  jsonResponse,
  PagesContext,
  requireDb,
} from '../../lib/cf-d1';
import type { Narrator } from '../../src/types/hadith';

interface NarratorRow {
  id: string;
  name: string;
  kunya: string;
  birth_year_h: number | null;
  death_year_h: number | null;
  region: string;
  origin: Narrator['origin'];
  tabaqah: string;
  grade: Narrator['grade'];
  ibn_hazm_verdict: string;
  teachers_json: string;
  students_json: string;
  jarh_taadil_json: string;
  notes: string;
}

function rowToNarrator(row: NarratorRow): Narrator {
  return {
    id: row.id,
    name: row.name,
    kunya: row.kunya || undefined,
    birthYearH: row.birth_year_h ?? undefined,
    deathYearH: row.death_year_h ?? undefined,
    region: row.region,
    origin: row.origin,
    tabaqah: row.tabaqah,
    grade: row.grade,
    ibnHazmVerdict: row.ibn_hazm_verdict || '',
    teachers: JSON.parse(row.teachers_json || '[]'),
    students: JSON.parse(row.students_json || '[]'),
    jarhTaadil: JSON.parse(row.jarh_taadil_json || '[]'),
    notes: row.notes || '',
  };
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const res = await dbOrRes.prepare('SELECT * FROM narrators').all<NarratorRow>();
  return jsonResponse({ narrators: (res.results || []).map(rowToNarrator) });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const auth = await authenticateRequest(context.request, context.env, {
    anyPermission: ['edit_narrators'],
  });
  if ('error' in auth) return auth.error;

  const body = (await context.request.json()) as
    | { narrator?: Narrator; narrators?: Narrator[] }
    | Narrator;

  const items: Narrator[] =
    'narrators' in body && Array.isArray(body.narrators)
      ? body.narrators
      : 'narrator' in body && body.narrator
        ? [body.narrator]
        : [body as Narrator];

  const stmt = dbOrRes.prepare(`
    INSERT INTO narrators (
      id, name, kunya, birth_year_h, death_year_h, region, origin,
      tabaqah, grade, ibn_hazm_verdict, teachers_json, students_json,
      jarh_taadil_json, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      kunya = excluded.kunya,
      birth_year_h = excluded.birth_year_h,
      death_year_h = excluded.death_year_h,
      region = excluded.region,
      origin = excluded.origin,
      tabaqah = excluded.tabaqah,
      grade = excluded.grade,
      ibn_hazm_verdict = excluded.ibn_hazm_verdict,
      teachers_json = excluded.teachers_json,
      students_json = excluded.students_json,
      jarh_taadil_json = excluded.jarh_taadil_json,
      notes = excluded.notes
  `);

  const batch = items.map((n) =>
    stmt.bind(
      n.id,
      n.name,
      n.kunya || '',
      n.birthYearH ?? null,
      n.deathYearH ?? null,
      n.region,
      n.origin,
      n.tabaqah,
      n.grade,
      n.ibnHazmVerdict || '',
      JSON.stringify(n.teachers || []),
      JSON.stringify(n.students || []),
      JSON.stringify(n.jarhTaadil || []),
      n.notes || ''
    )
  );

  await dbOrRes.batch(batch);
  return jsonResponse({ ok: true, count: items.length });
}

export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const auth = await authenticateRequest(context.request, context.env, {
    anyPermission: ['delete_records'],
  });
  if ('error' in auth) return auth.error;

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) return jsonResponse({ error: 'معرف الراوي مفقود' }, 400);

  await dbOrRes.prepare('DELETE FROM narrators WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}

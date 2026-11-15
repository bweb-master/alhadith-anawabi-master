import {
  jsonResponse,
  normalizeArabicServer,
  PagesContext,
  requireDb,
  verifyAdminPassword,
} from '../../lib/cf-d1';
import type { NineBookHadith, NineBookKey } from '../../src/types/hadith';

interface NineBookRow {
  uid: string;
  book_key: NineBookKey;
  hadith_id: string;
  id_in_book: number | null;
  chapter_name: string;
  arabic_text: string;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const url = new URL(context.request.url);
  if (url.searchParams.get('counts') === '1') {
    const res = await dbOrRes
      .prepare('SELECT book_key, COUNT(*) as c FROM nine_books GROUP BY book_key')
      .all<{ book_key: string; c: number }>();
    return jsonResponse({ counts: res.results || [] });
  }

  const q = url.searchParams.get('q') || '';
  const book = url.searchParams.get('book') || 'all';
  const norm = normalizeArabicServer(q);

  if (!norm) {
    return jsonResponse({ items: [] });
  }

  const tokens = norm
    .split(' ')
    .map((t) => t.replace(/["'*]/g, '').trim())
    .filter((t) => t.length >= 2)
    .slice(0, 8);

  if (tokens.length === 0) {
    return jsonResponse({ items: [] });
  }

  // Build safe FTS5 OR/prefix query so partial matches rank high
  const ftsQuery = tokens.map((t) => `"${t}"`).join(' OR ');

  const sql =
    book === 'all'
      ? `SELECT nb.uid, nb.book_key, nb.hadith_id, nb.id_in_book, nb.chapter_name, nb.arabic_text
         FROM nine_books_fts fts
         JOIN nine_books nb ON nb.uid = fts.uid
         WHERE nine_books_fts MATCH ?
         ORDER BY bm25(nine_books_fts)
         LIMIT 50`
      : `SELECT nb.uid, nb.book_key, nb.hadith_id, nb.id_in_book, nb.chapter_name, nb.arabic_text
         FROM nine_books_fts fts
         JOIN nine_books nb ON nb.uid = fts.uid
         WHERE nine_books_fts MATCH ? AND nb.book_key = ?
         ORDER BY bm25(nine_books_fts)
         LIMIT 50`;

  const stmt =
    book === 'all'
      ? dbOrRes.prepare(sql).bind(ftsQuery)
      : dbOrRes.prepare(sql).bind(ftsQuery, book);

  const res = await stmt.all<NineBookRow>();
  const items: NineBookHadith[] = (res.results || []).map((r) => ({
    id: r.hadith_id,
    idInBook: r.id_in_book ?? undefined,
    bookKey: r.book_key,
    chapterName: r.chapter_name,
    arabicText: r.arabic_text,
  }));

  return jsonResponse({ items });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const authError = verifyAdminPassword(context.request, context.env);
  if (authError) return authError;

  const body = (await context.request.json()) as {
    bookKey: NineBookKey;
    clearBook?: boolean;
    items: NineBookHadith[];
  };

  if (!body.bookKey || !Array.isArray(body.items)) {
    return jsonResponse({ error: 'بيانات الكتاب غير صالحة' }, 400);
  }

  if (body.clearBook) {
    await dbOrRes
      .prepare('DELETE FROM nine_books WHERE book_key = ?')
      .bind(body.bookKey)
      .run();
    await dbOrRes
      .prepare('DELETE FROM nine_books_fts WHERE book_key = ?')
      .bind(body.bookKey)
      .run();
  }

  const insertMain = dbOrRes.prepare(`
    INSERT INTO nine_books (uid, book_key, hadith_id, id_in_book, chapter_name, arabic_text, normalized_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET
      chapter_name = excluded.chapter_name,
      arabic_text = excluded.arabic_text,
      normalized_text = excluded.normalized_text
  `);

  const deleteFts = dbOrRes.prepare('DELETE FROM nine_books_fts WHERE uid = ?');
  const insertFts = dbOrRes.prepare(`
    INSERT INTO nine_books_fts (uid, book_key, normalized_text, arabic_text)
    VALUES (?, ?, ?, ?)
  `);

  const statements = [];
  for (const item of body.items) {
    const uid = `${body.bookKey}:${item.id}`;
    const norm = normalizeArabicServer(item.arabicText);
    statements.push(
      insertMain.bind(
        uid,
        body.bookKey,
        String(item.id),
        item.idInBook ?? null,
        item.chapterName || '',
        item.arabicText,
        norm
      ),
      deleteFts.bind(uid),
      insertFts.bind(uid, body.bookKey, norm, item.arabicText)
    );
  }

  if (statements.length > 0) {
    await dbOrRes.batch(statements);
  }

  return jsonResponse({ ok: true, inserted: body.items.length });
}

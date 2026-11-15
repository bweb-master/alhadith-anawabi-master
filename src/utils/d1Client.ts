import { MuhallaHadith, Narrator, NineBookHadith, NineBookKey } from '../types/hadith';

export interface D1HealthStatus {
  connected: boolean;
  counts?: {
    hadiths: number;
    narrators: number;
    nineBooks: number;
  };
}

export async function checkD1Health(): Promise<D1HealthStatus> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return { connected: false };
    }
    const data = (await res.json()) as {
      ok?: boolean;
      counts?: { hadiths: number; narrators: number; nineBooks: number };
    };
    if (!data.ok) return { connected: false };
    return { connected: true, counts: data.counts };
  } catch {
    return { connected: false };
  }
}

export async function verifyD1AdminPassword(password: string): Promise<boolean> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'x-admin-password': password },
  });
  return res.ok;
}

export async function fetchD1Hadiths(): Promise<MuhallaHadith[]> {
  const res = await fetch('/api/hadiths', { cache: 'no-store' });
  if (!res.ok) throw new Error('تعذر جلب الأحاديث من D1');
  const data = (await res.json()) as { hadiths: MuhallaHadith[] };
  return data.hadiths || [];
}

export async function saveD1Hadith(
  hadith: MuhallaHadith,
  password: string
): Promise<void> {
  const res = await fetch('/api/hadiths', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password,
    },
    body: JSON.stringify({ hadith }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حفظ الحديث في Cloudflare D1');
  }
}

export async function saveD1HadithsBatch(
  hadiths: MuhallaHadith[],
  password: string
): Promise<void> {
  const res = await fetch('/api/hadiths', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password,
    },
    body: JSON.stringify({ hadiths }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر رفع الأحاديث إلى D1');
  }
}

export async function deleteD1Hadith(id: string, password: string): Promise<void> {
  const res = await fetch(`/api/hadiths?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': password },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حذف الحديث من D1');
  }
}

export async function fetchD1Narrators(): Promise<Narrator[]> {
  const res = await fetch('/api/narrators', { cache: 'no-store' });
  if (!res.ok) throw new Error('تعذر جلب الرواة من D1');
  const data = (await res.json()) as { narrators: Narrator[] };
  return data.narrators || [];
}

export async function saveD1Narrator(
  narrator: Narrator,
  password: string
): Promise<void> {
  const res = await fetch('/api/narrators', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password,
    },
    body: JSON.stringify({ narrator }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حفظ الراوي في Cloudflare D1');
  }
}

export async function saveD1NarratorsBatch(
  narrators: Narrator[],
  password: string
): Promise<void> {
  const res = await fetch('/api/narrators', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password,
    },
    body: JSON.stringify({ narrators }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر رفع الرواة إلى D1');
  }
}

export async function deleteD1Narrator(id: string, password: string): Promise<void> {
  const res = await fetch(`/api/narrators?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': password },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حذف الراوي من D1');
  }
}

export async function searchD1NineBooks(
  query: string,
  bookKey: NineBookKey | 'all'
): Promise<NineBookHadith[]> {
  const params = new URLSearchParams({ q: query, book: bookKey });
  const res = await fetch(`/api/nine-books?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: NineBookHadith[] };
  return data.items || [];
}

export async function fetchD1NineBookCounts(): Promise<Record<string, number>> {
  const res = await fetch('/api/nine-books?counts=1');
  if (!res.ok) return {};
  const data = (await res.json()) as { counts?: { book_key: string; c: number }[] };
  const map: Record<string, number> = {};
  (data.counts || []).forEach((row) => {
    map[row.book_key] = Number(row.c || 0);
  });
  return map;
}

export async function uploadD1NineBookBatch(
  bookKey: NineBookKey,
  items: NineBookHadith[],
  password: string,
  clearBook = false
): Promise<void> {
  const res = await fetch('/api/nine-books', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password,
    },
    body: JSON.stringify({ bookKey, items, clearBook }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حفظ دفعة الكتاب في D1');
  }
}

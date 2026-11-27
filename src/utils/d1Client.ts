import {
  AuthenticatedUser,
  MuhallaHadith,
  Narrator,
  NineBookHadith,
  NineBookKey,
  ResearcherAccount,
  ResearcherPermission,
  ResearcherRole,
} from '../types/hadith';
import type { PlatformSettings } from '../types/settings';

export interface D1Credentials {
  username: string;
  password: string;
}

export interface D1HealthStatus {
  connected: boolean;
  reason?: 'no_api' | 'no_db_binding' | 'db_error';
  errorDetail?: string;
  counts?: {
    hadiths: number;
    narrators: number;
    nineBooks: number;
  };
}

function buildAuthHeaders(
  creds: D1Credentials,
  extra?: Record<string, string>
): Record<string, string> {
  return {
    ...(extra || {}),
    'x-admin-username': encodeURIComponent((creds.username || '').trim()),
    'x-admin-password': encodeURIComponent(creds.password || ''),
  };
}

export async function checkD1Health(): Promise<D1HealthStatus> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { connected: false, reason: 'no_api' };
    }
    const data = (await res.json()) as {
      ok?: boolean;
      mode?: string;
      error?: string;
      details?: string;
      counts?: { hadiths: number; narrators: number; nineBooks: number };
    };
    if (!data.ok) {
      if (data.mode === 'local') {
        return { connected: false, reason: 'no_db_binding' };
      }
      return {
        connected: false,
        reason: 'db_error',
        errorDetail: data.details || data.error,
      };
    }
    return { connected: true, counts: data.counts };
  } catch {
    return { connected: false, reason: 'no_api' };
  }
}

export async function verifyD1Credentials(
  creds: D1Credentials
): Promise<{ ok: true; user: AuthenticatedUser } | { ok: false; error: string }> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: (creds.username || '').trim(),
      password: creds.password,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    user?: AuthenticatedUser;
    error?: string;
  };
  if (res.ok && data.ok && data.user) {
    return { ok: true, user: data.user };
  }
  return {
    ok: false,
    error: data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.',
  };
}

export async function fetchD1Hadiths(): Promise<MuhallaHadith[]> {
  const res = await fetch('/api/hadiths', { cache: 'no-store' });
  if (!res.ok) throw new Error('تعذر جلب الأحاديث من D1');
  const data = (await res.json()) as { hadiths: MuhallaHadith[] };
  return data.hadiths || [];
}

export async function saveD1Hadith(
  hadith: MuhallaHadith,
  creds: D1Credentials
): Promise<void> {
  const res = await fetch('/api/hadiths', {
    method: 'POST',
    headers: buildAuthHeaders(creds, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ hadith }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حفظ الحديث في Cloudflare D1');
  }
}

export async function saveD1HadithsBatch(
  hadiths: MuhallaHadith[],
  creds: D1Credentials
): Promise<void> {
  const res = await fetch('/api/hadiths', {
    method: 'POST',
    headers: buildAuthHeaders(creds, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ hadiths }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر رفع الأحاديث إلى D1');
  }
}

export async function deleteD1Hadith(
  id: string,
  creds: D1Credentials
): Promise<void> {
  const res = await fetch(`/api/hadiths?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(creds),
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
  creds: D1Credentials
): Promise<void> {
  const res = await fetch('/api/narrators', {
    method: 'POST',
    headers: buildAuthHeaders(creds, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ narrator }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حفظ الراوي في Cloudflare D1');
  }
}

export async function saveD1NarratorsBatch(
  narrators: Narrator[],
  creds: D1Credentials
): Promise<void> {
  const res = await fetch('/api/narrators', {
    method: 'POST',
    headers: buildAuthHeaders(creds, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ narrators }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر رفع الرواة إلى D1');
  }
}

export async function deleteD1Narrator(
  id: string,
  creds: D1Credentials
): Promise<void> {
  const res = await fetch(`/api/narrators?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(creds),
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
  creds: D1Credentials,
  clearBook = false
): Promise<void> {
  const res = await fetch('/api/nine-books', {
    method: 'POST',
    headers: buildAuthHeaders(creds, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ bookKey, items, clearBook }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حفظ دفعة الكتاب في D1');
  }
}

export async function fetchD1Users(
  creds: D1Credentials
): Promise<ResearcherAccount[]> {
  const res = await fetch('/api/users', {
    cache: 'no-store',
    headers: buildAuthHeaders(creds),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر جلب حسابات فريق البحث');
  }
  const data = (await res.json()) as { users?: ResearcherAccount[] };
  return data.users || [];
}

export async function saveD1User(
  payload: {
    id?: string;
    username: string;
    fullName: string;
    password?: string;
    role: ResearcherRole;
    permissions: ResearcherPermission[];
    isActive: boolean;
  },
  creds: D1Credentials
): Promise<ResearcherAccount> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: buildAuthHeaders(creds, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    user?: ResearcherAccount;
    error?: string;
  };
  if (!res.ok || !data.user) {
    throw new Error(data.error || 'تعذر حفظ بيانات الحساب');
  }
  return data.user;
}

export async function deleteD1User(
  id: string,
  creds: D1Credentials
): Promise<void> {
  const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(creds),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حذف الحساب');
  }
}

export async function fetchD1Settings(): Promise<PlatformSettings | null> {
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { settings?: PlatformSettings | null };
    return data.settings || null;
  } catch {
    return null;
  }
}

export async function saveD1Settings(
  settings: PlatformSettings,
  creds: D1Credentials
): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: buildAuthHeaders(creds, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'تعذر حفظ إعدادات المنصة في Cloudflare D1');
  }
}

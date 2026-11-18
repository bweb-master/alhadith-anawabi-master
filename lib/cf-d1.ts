export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface CloudflareEnv {
  DB?: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_USERNAME?: string;
}

export interface PagesContext {
  request: Request;
  env: CloudflareEnv;
}

export type ResearcherRole = 'admin' | 'assistant';

export type ResearcherPermission =
  | 'edit_hadiths'
  | 'edit_muhalla_direct'
  | 'edit_narrators'
  | 'link_takhrij'
  | 'delete_records'
  | 'upload_nine_books'
  | 'export_github';

export const ALL_RESEARCHER_PERMISSIONS: ResearcherPermission[] = [
  'edit_hadiths',
  'edit_muhalla_direct',
  'edit_narrators',
  'link_takhrij',
  'delete_records',
  'upload_nine_books',
  'export_github',
];

export const DEFAULT_ASSISTANT_PERMISSIONS: ResearcherPermission[] = [
  'edit_hadiths',
  'edit_narrators',
];

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: ResearcherRole;
  permissions: ResearcherPermission[];
}

interface ResearcherRow {
  id: string;
  username: string;
  full_name: string;
  password_hash: string;
  role: string;
  permissions_json?: string;
  is_active: number;
  created_at: string;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function requireDb(env: CloudflareEnv): D1Database | Response {
  if (!env.DB) {
    return jsonResponse(
      { error: 'قاعدة البيانات D1 غير مربوطة باسم DB في إعدادات Cloudflare.' },
      503
    );
  }
  return env.DB;
}

export function parsePermissionsJson(
  raw: string | undefined,
  role: ResearcherRole
): ResearcherPermission[] {
  if (role === 'admin') {
    return [...ALL_RESEARCHER_PERMISSIONS];
  }
  if (!raw) return [...DEFAULT_ASSISTANT_PERMISSIONS];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validSet = new Set<string>(ALL_RESEARCHER_PERMISSIONS);
    return parsed.filter(
      (p): p is ResearcherPermission => typeof p === 'string' && validSet.has(p)
    );
  } catch {
    return [];
  }
}

export async function ensureResearchersTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS researchers (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'assistant',
        permissions_json TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`
    )
    .run();

  try {
    await db
      .prepare(
        `ALTER TABLE researchers ADD COLUMN permissions_json TEXT NOT NULL DEFAULT '[]'`
      )
      .run();
  } catch {
    // Column already exists
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createPasswordHash(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltHex = bytesToHex(salt);
  const data = new TextEncoder().encode(`${saltHex}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hashHex = bytesToHex(new Uint8Array(digest));
  return `${saltHex}:${hashHex}`;
}

export async function verifyPasswordHash(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [saltHex, expectedHex] = parts;
  if (!saltHex || !expectedHex) return false;
  const data = new TextEncoder().encode(`${saltHex}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const actualHex = bytesToHex(new Uint8Array(digest));
  if (actualHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHex.length; i++) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

function decodeHeaderValue(raw: string | null): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function authenticateRequest(
  request: Request,
  env: CloudflareEnv,
  options: {
    requiredRole?: ResearcherRole;
    anyPermission?: ResearcherPermission[];
  } = {},
  bodyCredentials?: { username?: string; password?: string }
): Promise<{ user: AuthenticatedUser } | { error: Response }> {
  const rawUsername =
    bodyCredentials?.username !== undefined
      ? bodyCredentials.username
      : decodeHeaderValue(request.headers.get('x-admin-username'));
  const rawPassword =
    bodyCredentials?.password !== undefined
      ? bodyCredentials.password
      : decodeHeaderValue(request.headers.get('x-admin-password'));

  const username = rawUsername.trim().toLowerCase();
  const password = rawPassword;

  if (!username || !password) {
    return {
      error: jsonResponse(
        { error: 'يرجى إدخال اسم المستخدم وكلمة المرور.' },
        401
      ),
    };
  }

  const superAdminUsername = (env.ADMIN_USERNAME || 'bweb').trim().toLowerCase();
  const masterPassword = env.ADMIN_PASSWORD;

  // 1) Master Super Admin account (bweb)
  if (username === superAdminUsername) {
    if (!masterPassword) {
      return {
        error: jsonResponse(
          { error: 'لم يتم تعيين المتغير ADMIN_PASSWORD في إعدادات Cloudflare.' },
          500
        ),
      };
    }
    if (password === masterPassword) {
      return {
        user: {
          id: 'master_bweb',
          username: superAdminUsername,
          fullName: 'المشرف العام',
          role: 'admin',
          permissions: [...ALL_RESEARCHER_PERMISSIONS],
        },
      };
    }
    return {
      error: jsonResponse(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' },
        401
      ),
    };
  }

  // 2) Registered researcher / supervisor accounts in Cloudflare D1
  if (env.DB) {
    await ensureResearchersTable(env.DB);
    const row = await env.DB.prepare(
      'SELECT * FROM researchers WHERE lower(username) = ? LIMIT 1'
    )
      .bind(username)
      .first<ResearcherRow>();

    if (row) {
      if (Number(row.is_active) !== 1) {
        return {
          error: jsonResponse(
            { error: 'تم تعطيل هذا الحساب مؤقتاً من قِبل المشرف العام.' },
            403
          ),
        };
      }

      const valid = await verifyPasswordHash(password, row.password_hash);
      if (!valid) {
        return {
          error: jsonResponse(
            { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' },
            401
          ),
        };
      }

      const role: ResearcherRole = row.role === 'admin' ? 'admin' : 'assistant';
      const permissions = parsePermissionsJson(row.permissions_json, role);

      if (options.requiredRole === 'admin' && role !== 'admin') {
        return {
          error: jsonResponse(
            { error: 'هذه الصلاحية مخصصة للمشرف فقط.' },
            403
          ),
        };
      }

      if (
        role !== 'admin' &&
        options.anyPermission &&
        options.anyPermission.length > 0 &&
        !options.anyPermission.some((p) => permissions.includes(p))
      ) {
        return {
          error: jsonResponse(
            { error: 'لا تملك صلاحية تنفيذ هذه المهمة. راجع المشرف العام.' },
            403
          ),
        };
      }

      return {
        user: {
          id: row.id,
          username: row.username,
          fullName: row.full_name,
          role,
          permissions,
        },
      };
    }
  }

  return {
    error: jsonResponse(
      { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' },
      401
    ),
  };
}

export function normalizeArabicServer(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[،؛؟.«»"'\(\)\[\]:\-!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SERVER_STOP_WORDS = new Set([
  'عن',
  'ان',
  'في',
  'من',
  'الي',
  'علي',
  'قال',
  'رسول',
  'الله',
  'صلي',
  'وسلم',
  'عليه',
  'رضي',
  'عنه',
  'عنها',
  'عنهم',
  'حدثنا',
  'اخبرنا',
  'سمعت',
  'يقول',
  'كان',
  'انه',
  'ما',
  'لا',
  'او',
  'ثم',
  'بن',
  'ابي',
  'عبد',
]);

export function tokenizeArabicServer(text: string): string[] {
  const norm = normalizeArabicServer(text);
  if (!norm) return [];
  const words = norm
    .split(' ')
    .map((t) => t.replace(/["'*]/g, '').trim())
    .filter((t) => t.length >= 2);
  const meaningful = Array.from(
    new Set(words.filter((w) => !SERVER_STOP_WORDS.has(w)))
  );
  return meaningful.length > 0 ? meaningful : Array.from(new Set(words));
}


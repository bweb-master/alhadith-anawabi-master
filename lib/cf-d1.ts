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
}

export interface PagesContext {
  request: Request;
  env: CloudflareEnv;
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

export function verifyAdminPassword(request: Request, env: CloudflareEnv): Response | null {
  const configured = env.ADMIN_PASSWORD;
  if (!configured) {
    return jsonResponse(
      { error: 'لم يتم تعيين المتغير ADMIN_PASSWORD في إعدادات Cloudflare.' },
      500
    );
  }
  const provided = request.headers.get('x-admin-password') || '';
  if (provided !== configured) {
    return jsonResponse(
      { error: 'كلمة مرور الباحث غير صحيحة.' },
      401
    );
  }
  return null;
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

import {
  ALL_RESEARCHER_PERMISSIONS,
  authenticateRequest,
  createPasswordHash,
  DEFAULT_ASSISTANT_PERMISSIONS,
  ensureResearchersTable,
  jsonResponse,
  PagesContext,
  parsePermissionsJson,
  requireDb,
  ResearcherPermission,
  ResearcherRole,
} from '../../lib/cf-d1';

interface ResearcherRow {
  id: string;
  username: string;
  full_name: string;
  role: string;
  permissions_json?: string;
  is_active: number;
  created_at: string;
}

function mapUserRow(row: ResearcherRow) {
  const role: ResearcherRole = row.role === 'admin' ? 'admin' : 'assistant';
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role,
    permissions: parsePermissionsJson(row.permissions_json, role),
    isActive: Number(row.is_active) === 1,
    createdAt: row.created_at,
  };
}

function normalizePermissionsInput(
  raw: unknown,
  role: ResearcherRole
): ResearcherPermission[] {
  if (role === 'admin') return [...ALL_RESEARCHER_PERMISSIONS];
  if (!Array.isArray(raw)) return [...DEFAULT_ASSISTANT_PERMISSIONS];
  const validSet = new Set<string>(ALL_RESEARCHER_PERMISSIONS);
  return raw.filter(
    (p): p is ResearcherPermission => typeof p === 'string' && validSet.has(p)
  );
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const auth = await authenticateRequest(context.request, context.env, {
    requiredRole: 'admin',
  });
  if ('error' in auth) return auth.error;

  await ensureResearchersTable(dbOrRes);
  const res = await dbOrRes
    .prepare(
      'SELECT id, username, full_name, role, permissions_json, is_active, created_at FROM researchers ORDER BY created_at DESC'
    )
    .all<ResearcherRow>();

  return jsonResponse({
    users: (res.results || []).map(mapUserRow),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const auth = await authenticateRequest(context.request, context.env, {
    requiredRole: 'admin',
  });
  if ('error' in auth) return auth.error;

  await ensureResearchersTable(dbOrRes);

  const body = (await context.request.json()) as {
    id?: string;
    username?: string;
    fullName?: string;
    password?: string;
    role?: string;
    permissions?: ResearcherPermission[];
    isActive?: boolean;
  };

  const username = (body.username || '').trim().toLowerCase();
  const fullName = (body.fullName || '').trim();
  const role: ResearcherRole = body.role === 'admin' ? 'admin' : 'assistant';
  const permissions = normalizePermissionsInput(body.permissions, role);
  const isActive = body.isActive === false ? 0 : 1;
  const password = body.password || '';
  const superAdminUsername = (context.env.ADMIN_USERNAME || 'bweb')
    .trim()
    .toLowerCase();

  if (!fullName) {
    return jsonResponse({ error: 'يرجى إدخال الاسم الكامل للباحث.' }, 400);
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return jsonResponse(
      {
        error:
          'اسم المستخدم يجب أن يكون بالإنجليزية (3 إلى 32 حرفاً، أحرف وأرقام و . _ - فقط).',
      },
      400
    );
  }
  if (username === superAdminUsername) {
    return jsonResponse(
      { error: `اسم المستخدم "${superAdminUsername}" محجوز لحساب المشرف العام.` },
      400
    );
  }

  const existingById = body.id
    ? await dbOrRes
        .prepare('SELECT id, password_hash, created_at FROM researchers WHERE id = ?')
        .bind(body.id)
        .first<{ id: string; password_hash: string; created_at: string }>()
    : null;

  const conflictUsername = await dbOrRes
    .prepare('SELECT id FROM researchers WHERE lower(username) = ?')
    .bind(username)
    .first<{ id: string }>();

  if (conflictUsername && conflictUsername.id !== existingById?.id) {
    return jsonResponse(
      { error: 'اسم المستخدم مستعمل مسبقاً لباحث آخر.' },
      409
    );
  }

  const permissionsJson = JSON.stringify(permissions);

  if (existingById) {
    if (password && password.length < 4) {
      return jsonResponse(
        { error: 'كلمة المرور يجب أن تتكون من 4 أحرف على الأقل.' },
        400
      );
    }
    const nextHash = password
      ? await createPasswordHash(password)
      : existingById.password_hash;

    await dbOrRes
      .prepare(
        `UPDATE researchers
         SET username = ?, full_name = ?, password_hash = ?, role = ?, permissions_json = ?, is_active = ?
         WHERE id = ?`
      )
      .bind(
        username,
        fullName,
        nextHash,
        role,
        permissionsJson,
        isActive,
        existingById.id
      )
      .run();

    return jsonResponse({
      ok: true,
      user: {
        id: existingById.id,
        username,
        fullName,
        role,
        permissions,
        isActive: isActive === 1,
        createdAt: existingById.created_at,
      },
    });
  }

  if (!password || password.length < 4) {
    return jsonResponse(
      { error: 'يرجى تعيين كلمة مرور لا تقل عن 4 أحرف عند إنشاء حساب جديد.' },
      400
    );
  }

  const id =
    body.id?.trim() ||
    `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  const passwordHash = await createPasswordHash(password);

  await dbOrRes
    .prepare(
      `INSERT INTO researchers (id, username, full_name, password_hash, role, permissions_json, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      username,
      fullName,
      passwordHash,
      role,
      permissionsJson,
      isActive,
      createdAt
    )
    .run();

  return jsonResponse({
    ok: true,
    user: {
      id,
      username,
      fullName,
      role,
      permissions,
      isActive: isActive === 1,
      createdAt,
    },
  });
}

export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const dbOrRes = requireDb(context.env);
  if (dbOrRes instanceof Response) return dbOrRes;

  const auth = await authenticateRequest(context.request, context.env, {
    requiredRole: 'admin',
  });
  if ('error' in auth) return auth.error;

  await ensureResearchersTable(dbOrRes);
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return jsonResponse({ error: 'معرف الحساب مفقود.' }, 400);
  }

  await dbOrRes.prepare('DELETE FROM researchers WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}

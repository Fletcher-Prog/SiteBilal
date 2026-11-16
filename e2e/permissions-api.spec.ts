import { test, expect, type APIRequestContext } from '@playwright/test';

const BASE = 'http://localhost:3001/api';
const NONE = { Authorization: '' };

async function loginAs(request: APIRequestContext, name: string, password: string) {
  const res = await request.post(`${BASE}/auth/login`, { data: { name, password }, headers: NONE });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return { user: body.user, H: { Authorization: `Bearer ${body.token}` } };
}

async function createUser(request: APIRequestContext, name: string, permissions: string[], role = 'user') {
  const old = (await (await request.get(`${BASE}/auth/users`)).json()).find((u: any) => u.name === name);
  if (old) await request.delete(`${BASE}/auth/users/${old.id}`);
  const res = await request.post(`${BASE}/auth/users`, { data: { name, password: 'pw-test-1', role, permissions } });
  expect(res.status()).toBe(201);
  return res.json();
}

test.describe('Authentification obligatoire sur l\'API', () => {
  for (const path of ['/vitrines', '/bookings', '/flux', '/dashboard', '/factures', '/contrats', '/settings', '/auth/users', '/auth/me']) {
    test(`GET ${path} sans token → 401`, async ({ request }) => {
      const res = await request.get(`${BASE}${path}`, { headers: NONE });
      expect(res.status()).toBe(401);
    });
  }

  test('POST /bookings sans token → 401 (écriture bloquée)', async ({ request }) => {
    const res = await request.post(`${BASE}/bookings`, { headers: NONE, data: { client_name: 'Intrus' } });
    expect(res.status()).toBe(401);
  });

  test('token invalide → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/vitrines`, { headers: { Authorization: 'Bearer pas-un-jwt' } });
    expect(res.status()).toBe(401);
  });

  test('GET /health est public → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/health`, { headers: NONE });
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

test.describe('Permissions par compte', () => {
  test('compte « planning » : voit le planning, pas la trésorerie ni les comptes', async ({ request }) => {
    const created = await createUser(request, 'PermPlanning', ['planning']);
    expect(created.role).toBe('user');
    expect(created.permissions).toEqual(['planning']);

    const { user, H } = await loginAs(request, 'PermPlanning', 'pw-test-1');
    expect(user.permissions).toEqual(['planning']);

    const me = await (await request.get(`${BASE}/auth/me`, { headers: H })).json();
    expect(me.permissions).toEqual(['planning']);

    expect((await request.get(`${BASE}/bookings`, { headers: H })).status()).toBe(200);
    expect((await request.get(`${BASE}/vitrines`, { headers: H })).status()).toBe(200);
    expect((await request.get(`${BASE}/settings`, { headers: H })).status()).toBe(200);
    expect((await request.get(`${BASE}/flux`, { headers: H })).status()).toBe(403);
    expect((await request.get(`${BASE}/dashboard`, { headers: H })).status()).toBe(403);
    expect((await request.get(`${BASE}/ventes`, { headers: H })).status()).toBe(403);
    expect((await request.get(`${BASE}/auth/users`, { headers: H })).status()).toBe(403);
    expect((await request.post(`${BASE}/vitrines`, { headers: H, data: { serial: 'NOPE' } })).status()).toBe(403);
    expect((await request.put(`${BASE}/settings`, { headers: H, data: { company_nom: 'Pirate' } })).status()).toBe(403);

    // Il peut créer puis supprimer une réservation
    const v = (await (await request.get(`${BASE}/vitrines`, { headers: H })).json())[0];
    const bk = await request.post(`${BASE}/bookings`, { headers: H, data: { vitrine_id: v.id, client_name: 'Perm Planning Client', start_date: '2031-02-01', duration_months: 1, montant: 300 } });
    expect(bk.status()).toBe(201);
    const booking = await bk.json();
    expect(booking.created_at).toBeTruthy();
    expect((await request.delete(`${BASE}/bookings/${booking.id}`, { headers: H })).status()).toBe(200);

    // L'admin ajoute la trésorerie : effet immédiat, sans reconnexion
    const upd = await request.patch(`${BASE}/auth/users/${created.id}`, { data: { permissions: ['planning', 'tresorerie'] } });
    expect(upd.status()).toBe(200);
    expect((await upd.json()).permissions).toEqual(['planning', 'tresorerie']);
    expect((await request.get(`${BASE}/flux`, { headers: H })).status()).toBe(200);

    // Tableau de bord sans trésorerie : les montants des associés ne sont pas envoyés
    await request.patch(`${BASE}/auth/users/${created.id}`, { data: { permissions: ['dashboard'] } });
    const dash = await (await request.get(`${BASE}/dashboard`, { headers: H })).json();
    expect(dash.tresorerie_bilel).toBeUndefined();
    expect(dash.dernieres_operations).toBeUndefined();
    expect(dash.impayes).toBeDefined();

    // Compte désactivé → token refusé
    await request.patch(`${BASE}/auth/users/${created.id}`, { data: { active: 0 } });
    expect((await request.get(`${BASE}/bookings`, { headers: H })).status()).toBe(401);
    expect((await request.post(`${BASE}/auth/login`, { headers: NONE, data: { name: 'PermPlanning', password: 'pw-test-1' } })).status()).toBe(403);

    await request.delete(`${BASE}/auth/users/${created.id}`);
  });

  test('compte « comptes » sans admin : ne peut ni créer d\'admin ni donner un accès qu\'il n\'a pas', async ({ request }) => {
    const mgr = await createUser(request, 'PermManager', ['comptes', 'planning']);
    const { H } = await loginAs(request, 'PermManager', 'pw-test-1');

    expect((await request.get(`${BASE}/auth/users`, { headers: H })).status()).toBe(200);
    expect((await request.post(`${BASE}/auth/users`, { headers: H, data: { name: 'PermEvilAdmin', password: 'x', role: 'admin' } })).status()).toBe(403);
    expect((await request.post(`${BASE}/auth/users`, { headers: H, data: { name: 'PermEvil', password: 'x', role: 'user', permissions: ['tresorerie'] } })).status()).toBe(403);

    const ok = await request.post(`${BASE}/auth/users`, { headers: H, data: { name: 'PermChild', password: 'x', role: 'user', permissions: ['planning'] } });
    expect(ok.status()).toBe(201);
    const child = await ok.json();

    const admins = (await (await request.get(`${BASE}/auth/users`)).json()).filter((u: any) => u.role === 'admin');
    expect((await request.patch(`${BASE}/auth/users/${admins[0].id}`, { headers: H, data: { active: 0 } })).status()).toBe(403);
    expect((await request.delete(`${BASE}/auth/users/${admins[0].id}`, { headers: H })).status()).toBe(403);

    expect((await request.delete(`${BASE}/auth/users/${child.id}`, { headers: H })).status()).toBe(200);
    await request.delete(`${BASE}/auth/users/${mgr.id}`);
  });

  test('garde-fous admin : pas d\'auto-suppression ni d\'auto-désactivation', async ({ request }) => {
    const me = await (await request.get(`${BASE}/auth/me`)).json();
    expect(me.role).toBe('admin');
    expect((await request.delete(`${BASE}/auth/users/${me.id}`)).status()).toBe(400);
    expect((await request.patch(`${BASE}/auth/users/${me.id}`, { data: { active: 0 } })).status()).toBe(400);
    expect((await request.patch(`${BASE}/auth/users/${me.id}`, { data: { role: 'user' } })).status()).toBe(400);
  });

  test('validation : permissions invalides → 400, compte inconnu → 404', async ({ request }) => {
    const u = await createUser(request, 'PermValid', ['planning', 'inconnu' as any]);
    expect(u.permissions).toEqual(['planning']);
    expect((await request.patch(`${BASE}/auth/users/${u.id}`, { data: { permissions: 'planning' } })).status()).toBe(400);
    expect((await request.post(`${BASE}/auth/users`, { data: { name: 'PermBad', password: 'x', role: 'user', permissions: 'tout' } })).status()).toBe(400);
    expect((await request.post(`${BASE}/auth/users`, { data: { name: 'PermNoPwd' } })).status()).toBe(400);
    expect((await request.patch(`${BASE}/auth/users/999999`, { data: { active: 1 } })).status()).toBe(404);
    expect((await request.delete(`${BASE}/auth/users/999999`)).status()).toBe(404);
    await request.delete(`${BASE}/auth/users/${u.id}`);
  });
});

test.describe('GET /bookings/:id/details', () => {
  test('renvoie la réservation, la vitrine, les contrats et factures liés', async ({ request }) => {
    const v = (await (await request.get(`${BASE}/vitrines`)).json())[0];
    const b = await (await request.post(`${BASE}/bookings`, {
      data: { vitrine_id: v.id, client_name: 'Detail E2E Traiteur', start_date: '2031-05-10', date_fin: '2031-05-22', type_duree: 'courte', duree_jours: 12, duration_months: 1, montant: 420, qui: 'Oussama', tel_client: '0611223344' },
    })).json();
    const c = await (await request.post(`${BASE}/contrats`, {
      data: { client: 'Detail E2E Traiteur', vitrine_id: v.id, date_debut: '2031-05-10', date_fin: '2031-05-22', montant_fixe: 420, caution: 800 },
    })).json();
    // Contrat à montant fixe → une seule facture auto-générée, au montant fixe
    const auto = await (await request.get(`${BASE}/factures?contrat_id=${c.id}`)).json();
    expect(auto).toHaveLength(1);
    expect(auto[0].montant).toBe(420);
    expect(auto[0].periode).toBe('2031-05');
    const f1 = auto[0];

    const res = await request.get(`${BASE}/bookings/${b.id}/details`);
    expect(res.status()).toBe(200);
    const d = await res.json();
    expect(d.booking.client_name).toBe('Detail E2E Traiteur');
    expect(d.booking.created_at).toBeTruthy();
    expect(d.booking.date_debut).toBe('2031-05-10');
    expect(d.booking.date_fin_calculee).toBe('2031-05-22');
    expect(d.booking.duree_jours_reels).toBe(12);
    expect(d.vitrine.id).toBe(v.id);
    expect(d.contrats.map((x: any) => x.id)).toContain(c.id);
    expect(d.factures.map((x: any) => x.id)).toContain(f1.id);
    expect(d.totaux.factures).toBeGreaterThanOrEqual(420);
    expect(d.totaux.impaye).toBeGreaterThanOrEqual(420);

    await request.put(`${BASE}/factures/${f1.id}/payer`, { data: {} });
    const d2 = await (await request.get(`${BASE}/bookings/${b.id}/details`)).json();
    expect(d2.totaux.paye).toBeGreaterThanOrEqual(420);

    // Nettoyage (y compris le flux créé par le paiement)
    const flux = await (await request.get(`${BASE}/flux`)).json();
    for (const x of flux) if (String(x.commentaire || '').includes('Detail E2E Traiteur')) await request.delete(`${BASE}/flux/${x.id}`);
    for (const x of await (await request.get(`${BASE}/factures?contrat_id=${c.id}`)).json()) await request.delete(`${BASE}/factures/${x.id}`);
    await request.delete(`${BASE}/contrats/${c.id}`);
    await request.delete(`${BASE}/bookings/${b.id}`);
  });

  test('réservation inconnue → 404', async ({ request }) => {
    expect((await request.get(`${BASE}/bookings/999999/details`)).status()).toBe(404);
  });

  test('sans token → 401', async ({ request }) => {
    expect((await request.get(`${BASE}/bookings/1/details`, { headers: NONE })).status()).toBe(401);
  });
});

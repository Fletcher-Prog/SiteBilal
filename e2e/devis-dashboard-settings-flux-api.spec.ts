import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001/api';

// --- Devis Location ---
test.describe('Devis-location API', () => {
  let devisId: number;

  test('POST /devis-location — create', async ({ request }) => {
    const res = await request.post(`${BASE}/devis-location`, {
      data: { client: 'Devis E2E', vitrine_id: 1, montant: 300, caution: 800, date_debut: '2026-05-01', date_fin: '2026-11-01', duree: 6 },
    });
    expect(res.status()).toBe(201);
    const d = await res.json();
    expect(d.numero).toBeTruthy();
    expect(d.client).toBe('Devis E2E');
    devisId = d.id;
  });

  test('GET /devis-location — list', async ({ request }) => {
    const res = await request.get(`${BASE}/devis-location`);
    expect(res.ok()).toBeTruthy();
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('GET /devis-location/:id — single', async ({ request }) => {
    const res = await request.get(`${BASE}/devis-location/${devisId}`);
    expect(res.ok()).toBeTruthy();
  });

  test('GET /devis-location/999999 — 404', async ({ request }) => {
    const res = await request.get(`${BASE}/devis-location/999999`);
    expect(res.status()).toBe(404);
  });

  test('PUT /devis-location/:id — update', async ({ request }) => {
    const res = await request.put(`${BASE}/devis-location/${devisId}`, { data: { montant: 350 } });
    expect(res.ok()).toBeTruthy();
  });

  test('DELETE /devis-location/:id — remove', async ({ request }) => {
    const res = await request.delete(`${BASE}/devis-location/${devisId}`);
    expect(res.ok()).toBeTruthy();
  });

  test('DELETE /devis-location/999999 — 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/devis-location/999999`);
    expect(res.status()).toBe(404);
  });
});

// --- Dashboard ---
test.describe('Dashboard API', () => {
  test('GET /dashboard — full payload', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard`);
    expect(res.ok()).toBeTruthy();
    const d = await res.json();
    expect(d).toHaveProperty('impayes');
    expect(d).toHaveProperty('ca_location');
    expect(d).toHaveProperty('vitrines_vacantes');
    expect(d).toHaveProperty('alertes');
    expect(d).toHaveProperty('repartition_par_lieu');
    expect(d.impayes).toHaveProperty('count');
    expect(d.impayes).toHaveProperty('total');
    expect(d.impayes).toHaveProperty('detail');
  });

  test('GET /dashboard?from=&to= — date filtered', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard?from=2026-01-01&to=2026-12-31`);
    expect(res.ok()).toBeTruthy();
    const d = await res.json();
    expect(d.impayes).toHaveProperty('count');
  });
});

// --- Settings ---
test.describe('Settings API', () => {
  test('GET /settings — returns object or array', async ({ request }) => {
    const res = await request.get(`${BASE}/settings`);
    expect(res.ok()).toBeTruthy();
    const s = await res.json();
    expect(typeof s).toBe('object');
  });

  test('PUT /settings — save and read back', async ({ request }) => {
    const res = await request.put(`${BASE}/settings`, { data: { e2e_test_key: 'e2e_value' } });
    expect(res.ok()).toBeTruthy();
    // read back
    const get = await (await request.get(`${BASE}/settings`)).json();
    const val = Array.isArray(get) ? get.find((s: any) => (s.cle || s.key) === 'e2e_test_key') : get;
    expect(val).toBeTruthy();
  });
});

// --- Flux ---
test.describe('Flux API', () => {
  let fluxId: number;

  test('POST /flux — create', async ({ request }) => {
    const res = await request.post(`${BASE}/flux`, {
      data: { type_flux: 'location', montant: 500, qui: 'Bilel', client: 'Flux E2E', mois: '2026-03' },
    });
    expect(res.status()).toBe(201);
    const f = await res.json();
    expect(f.qui).toBe('Bilel');
    fluxId = f.id;
  });

  test('GET /flux — list', async ({ request }) => {
    const res = await request.get(`${BASE}/flux`);
    expect(res.ok()).toBeTruthy();
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('GET /flux/stats — statistics', async ({ request }) => {
    const res = await request.get(`${BASE}/flux/stats`);
    expect(res.ok()).toBeTruthy();
    const s = await res.json();
    expect(s).toHaveProperty('parMois');
    expect(s).toHaveProperty('parType');
    expect(s).toHaveProperty('total');
  });

  test('GET /flux/stats?mois= — filtered', async ({ request }) => {
    const res = await request.get(`${BASE}/flux/stats?mois=2026-03`);
    expect(res.ok()).toBeTruthy();
  });

  test('PUT /flux/:id — update', async ({ request }) => {
    const res = await request.put(`${BASE}/flux/${fluxId}`, { data: { montant: 600 } });
    expect(res.ok()).toBeTruthy();
  });

  test('DELETE /flux/:id — remove', async ({ request }) => {
    const res = await request.delete(`${BASE}/flux/${fluxId}`);
    expect(res.ok()).toBeTruthy();
  });

  test('DELETE /flux/999999 — 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/flux/999999`);
    expect(res.status()).toBe(404);
  });
});

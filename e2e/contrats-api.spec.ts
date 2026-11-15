import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001/api';

test.describe('Contrats API', () => {
  let contratId: number;

  test('POST /contrats — create', async ({ request }) => {
    const res = await request.post(`${BASE}/contrats`, {
      data: { client: 'Contrat E2E Client', vitrine_id: 1, duree: 6, montant: 350, caution: 1000, conditions: 'Test E2E', date_debut: '2026-01-01', date_fin: '2026-07-01', qui: 'Oussama' },
    });
    expect(res.status()).toBe(201);
    const c = await res.json();
    expect(c.client).toBe('Contrat E2E Client');
    contratId = c.id;
  });

  test('GET /contrats — list', async ({ request }) => {
    const res = await request.get(`${BASE}/contrats`);
    expect(res.ok()).toBeTruthy();
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('GET /contrats/:id — single', async ({ request }) => {
    const list = await (await request.get(`${BASE}/contrats`)).json();
    const id = list[0].id;
    const res = await request.get(`${BASE}/contrats/${id}`);
    expect(res.ok()).toBeTruthy();
    const c = await res.json();
    expect(c.id).toBe(id);
  });

  test('GET /contrats/999999 — 404', async ({ request }) => {
    const res = await request.get(`${BASE}/contrats/999999`);
    expect(res.status()).toBe(404);
  });

  test('PUT /contrats/:id — update', async ({ request }) => {
    const list = await (await request.get(`${BASE}/contrats`)).json();
    const c = list.find((x: any) => x.client === 'Contrat E2E Client') || list[0];
    const res = await request.put(`${BASE}/contrats/${c.id}`, { data: { montant: 400 } });
    expect(res.ok()).toBeTruthy();
  });

  test('DELETE /contrats/:id — remove test contrat', async ({ request }) => {
    const list = await (await request.get(`${BASE}/contrats`)).json();
    const c = list.find((x: any) => x.client === 'Contrat E2E Client');
    if (c) {
      const res = await request.delete(`${BASE}/contrats/${c.id}`);
      expect(res.ok()).toBeTruthy();
    }
  });

  test('DELETE /contrats/999999 — 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/contrats/999999`);
    expect(res.status()).toBe(404);
  });
});

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001/api';

test.describe('Vitrines API', () => {
  let createdId: number;

  test('POST /vitrines — create', async ({ request }) => {
    const res = await request.post(`${BASE}/vitrines`, {
      data: { serial: 'TEST-V-001', model: 'Test Vitrine 2m', prix_achat: 3000, prix_reparation: 200, fonctionnelle: 1 },
    });
    expect(res.status()).toBe(201);
    const v = await res.json();
    expect(v.serial).toBe('TEST-V-001');
    createdId = v.id;
  });

  test('GET /vitrines — list', async ({ request }) => {
    const res = await request.get(`${BASE}/vitrines`);
    expect(res.ok()).toBeTruthy();
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('GET /vitrines/:id — single', async ({ request }) => {
    const list = await (await request.get(`${BASE}/vitrines`)).json();
    const id = list[0].id;
    const res = await request.get(`${BASE}/vitrines/${id}`);
    expect(res.ok()).toBeTruthy();
    const v = await res.json();
    expect(v.id).toBe(id);
  });

  test('GET /vitrines/999999 — 404', async ({ request }) => {
    const res = await request.get(`${BASE}/vitrines/999999`);
    expect(res.status()).toBe(404);
  });

  test('PUT /vitrines/:id — update', async ({ request }) => {
    const list = await (await request.get(`${BASE}/vitrines`)).json();
    const v = list.find((x: any) => x.serial === 'TEST-V-001') || list[0];
    const res = await request.put(`${BASE}/vitrines/${v.id}`, { data: { model: 'Updated Model' } });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.model).toBe('Updated Model');
  });

  test('PUT /vitrines/:id/status — toggle fonctionnelle', async ({ request }) => {
    const list = await (await request.get(`${BASE}/vitrines`)).json();
    const v = list[0];
    const res = await request.put(`${BASE}/vitrines/${v.id}/status`, { data: { fonctionnelle: 0 } });
    expect(res.ok()).toBeTruthy();
    // restore
    await request.put(`${BASE}/vitrines/${v.id}/status`, { data: { fonctionnelle: 1 } });
  });

  test('PUT /vitrines/:id/nfc — set tag', async ({ request }) => {
    const list = await (await request.get(`${BASE}/vitrines`)).json();
    const v = list[0];
    const res = await request.put(`${BASE}/vitrines/${v.id}/nfc`, { data: { nfc_tag: 'NFC-TEST-123' } });
    expect(res.ok()).toBeTruthy();
  });

  test('DELETE /vitrines/:id — remove test vitrine', async ({ request }) => {
    const list = await (await request.get(`${BASE}/vitrines`)).json();
    const v = list.find((x: any) => x.serial === 'TEST-V-001');
    if (v) {
      const res = await request.delete(`${BASE}/vitrines/${v.id}`);
      expect(res.ok()).toBeTruthy();
    }
  });

  test('DELETE /vitrines/999999 — 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/vitrines/999999`);
    expect(res.status()).toBe(404);
  });
});

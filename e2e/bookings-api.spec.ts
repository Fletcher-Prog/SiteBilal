import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001/api';

test.describe('Bookings API', () => {
  let bookingId: number;
  let vitrineId: number;

  test.beforeAll(async ({ request }) => {
    // ensure at least one vitrine exists
    const vList = await (await request.get(`${BASE}/vitrines`)).json();
    if (vList.length > 0) { vitrineId = vList[0].id; return; }
    const v = await (await request.post(`${BASE}/vitrines`, { data: { serial: 'BK-TEST', model: 'Booking Test', prix_achat: 1000 } })).json();
    vitrineId = v.id;
  });

  test('POST /bookings — create', async ({ request }) => {
    const res = await request.post(`${BASE}/bookings`, {
      data: { vitrine_id: vitrineId, client_name: 'Client Booking E2E', start_date: '2026-03-01', duration_months: 3, montant: 500, type_duree: 'longue', qui: 'Bilel' },
    });
    expect(res.status()).toBe(201);
    const b = await res.json();
    expect(b.client_name).toBe('Client Booking E2E');
    bookingId = b.id;
  });

  test('GET /bookings — list', async ({ request }) => {
    const res = await request.get(`${BASE}/bookings`);
    expect(res.ok()).toBeTruthy();
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('POST /bookings/check-conflict — no conflict', async ({ request }) => {
    const res = await request.post(`${BASE}/bookings/check-conflict`, {
      data: { vitrine_id: vitrineId, start_date: '2027-01-01', duration_months: 1 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('conflict');
  });

  test('PUT /bookings/:id — update', async ({ request }) => {
    const list = await (await request.get(`${BASE}/bookings`)).json();
    const b = list.find((x: any) => x.client_name === 'Client Booking E2E') || list[0];
    const res = await request.put(`${BASE}/bookings/${b.id}`, { data: { montant: 600 } });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(Number(updated.montant)).toBe(600);
  });

  test('DELETE /bookings/:id — remove', async ({ request }) => {
    const list = await (await request.get(`${BASE}/bookings`)).json();
    const b = list.find((x: any) => x.client_name === 'Client Booking E2E');
    if (b) {
      const res = await request.delete(`${BASE}/bookings/${b.id}`);
      expect(res.ok()).toBeTruthy();
    }
  });

  test('DELETE /bookings/999999 — 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/bookings/999999`);
    expect(res.status()).toBe(404);
  });
});

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001/api';

// Generic CRUD test factory for all simple CRUD resources
function crudSuite(resource: string, createData: Record<string, any>, updateData: Record<string, any>) {
  test.describe(`${resource} API (CRUD)`, () => {
    let createdId: number;

    test(`POST /${resource} — create`, async ({ request }) => {
      const res = await request.post(`${BASE}/${resource}`, { data: createData });
      expect(res.status()).toBe(201);
      const item = await res.json();
      expect(item.id).toBeTruthy();
      createdId = item.id;
    });

    test(`GET /${resource} — list`, async ({ request }) => {
      const res = await request.get(`${BASE}/${resource}`);
      expect(res.ok()).toBeTruthy();
      const list = await res.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    test(`PUT /${resource}/:id — update`, async ({ request }) => {
      const list = await (await request.get(`${BASE}/${resource}`)).json();
      const id = list[list.length - 1].id;
      const res = await request.put(`${BASE}/${resource}/${id}`, { data: updateData });
      expect(res.ok()).toBeTruthy();
    });

    test(`DELETE /${resource}/:id — remove`, async ({ request }) => {
      const list = await (await request.get(`${BASE}/${resource}`)).json();
      const item = list.find((x: any) => JSON.stringify(x).includes(Object.values(createData)[0] as string));
      if (item) {
        const res = await request.delete(`${BASE}/${resource}/${item.id}`);
        expect(res.ok()).toBeTruthy();
      }
    });

    test(`DELETE /${resource}/999999 — 404`, async ({ request }) => {
      const res = await request.delete(`${BASE}/${resource}/999999`);
      expect(res.status()).toBe(404);
    });
  });
}

// --- All generic CRUD resources ---

crudSuite('clients', { nom: 'Test Client E2E', tel: '0612345678', email: 'e2e@test.fr', adresse: '1 Rue Test' }, { tel: '0699999999' });
crudSuite('lieux', { nom: 'Lieu Test E2E', type: 'entrepôt', note: 'test' }, { note: 'updated' });
crudSuite('actions', { titre: 'Action Test E2E', fait: 0, commentaire: 'test' }, { fait: 1 });
crudSuite('ventes', { vitrine_id: 1, prix_achat: 2000, prix_vente: 3000, frais: 100, commentaire: 'vente test', date_vente: '2026-01-15' }, { commentaire: 'updated' });
crudSuite('frigoristes', { nom: 'Frigo Test E2E', tel: '0611111111', zone: 'IDF' }, { zone: 'Sud' });
crudSuite('interventions', { vitrine_id: 1, date: '2026-01-15', type: 'préventive', notes: 'test interv', cout: 150 }, { notes: 'updated' });
crudSuite('prospection', { client: 'Prospect Test E2E', contact: '0622222222', notes: 'rdv', statut: 'nouveau' }, { statut: 'converti' });

// --- Actions toggle ---
test.describe('Actions toggle', () => {
  test('PUT /actions/:id/toggle', async ({ request }) => {
    const create = await request.post(`${BASE}/actions`, { data: { titre: 'Toggle Test', fait: 0 } });
    const action = await create.json();
    const res = await request.put(`${BASE}/actions/${action.id}/toggle`);
    expect(res.ok()).toBeTruthy();
    // cleanup
    await request.delete(`${BASE}/actions/${action.id}`);
  });
});

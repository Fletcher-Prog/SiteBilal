import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001/api';

test.describe('Factures API', () => {
  test('full lifecycle: create → get → update → payer → impayee → delete', async ({ request }) => {
    // Setup: create contrat
    const contratRes = await request.post(`${BASE}/contrats`, {
      data: { client: 'Facture Lifecycle E2E', vitrine_id: 1, duree: 3, montant: 200, caution: 500, date_debut: '2026-04-01', date_fin: '2026-07-01', qui: 'Bilel' },
    });
    expect(contratRes.status()).toBe(201);
    const contrat = await contratRes.json();

    // POST - create facture
    const createRes = await request.post(`${BASE}/factures`, {
      data: { contrat_id: contrat.id, periode: '2099-01', montant: 200, client: 'Facture Lifecycle E2E', vitrine_id: 1, statut: 'emise' },
    });
    if (!createRes.ok()) console.log('Facture creation error:', await createRes.json());
    expect(createRes.status()).toBe(201);
    const facture = await createRes.json();
    expect(facture.numero).toBeTruthy();
    expect(facture.client).toBe('Facture Lifecycle E2E');

    // GET /:id - single
    const getRes = await request.get(`${BASE}/factures/${facture.id}`);
    expect(getRes.ok()).toBeTruthy();
    const fetched = await getRes.json();
    expect(fetched.id).toBe(facture.id);

    // PUT - update
    const updateRes = await request.put(`${BASE}/factures/${facture.id}`, { data: { montant: 250 } });
    expect(updateRes.ok()).toBeTruthy();

    // PUT /payer - mark paid + check flux creation
    const fluxBefore = await (await request.get(`${BASE}/flux`)).json();
    const payerRes = await request.put(`${BASE}/factures/${facture.id}/payer`, { data: {} });
    expect(payerRes.ok()).toBeTruthy();
    const paid = await payerRes.json();
    expect(paid.statut).toBe('payee');

    const fluxAfter = await (await request.get(`${BASE}/flux`)).json();
    expect(fluxAfter.length).toBeGreaterThan(fluxBefore.length);
    const newFlux = fluxAfter.find((fl: any) => fl.commentaire?.includes('payée') && fl.commentaire?.includes('Facture Lifecycle E2E'));
    expect(newFlux).toBeTruthy();
    expect(newFlux.qui).toBe('Bilel');

    // PUT /impayee - mark unpaid
    const impayeeRes = await request.put(`${BASE}/factures/${facture.id}/impayee`, { data: {} });
    expect(impayeeRes.ok()).toBeTruthy();
    const unpaid = await impayeeRes.json();
    expect(unpaid.statut).toBe('emise');

    // DELETE
    const delRes = await request.delete(`${BASE}/factures/${facture.id}`);
    expect(delRes.ok()).toBeTruthy();

    // Cleanup flux
    for (const f of fluxAfter) {
      if (f.commentaire?.includes('Facture Lifecycle E2E')) await request.delete(`${BASE}/flux/${f.id}`);
    }
    await request.delete(`${BASE}/contrats/${contrat.id}`);
  });

  test('GET /factures — list all', async ({ request }) => {
    const res = await request.get(`${BASE}/factures`);
    expect(res.ok()).toBeTruthy();
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
  });

  test('GET /factures?contrat_id= — filter', async ({ request }) => {
    const res = await request.get(`${BASE}/factures?contrat_id=1`);
    expect(res.ok()).toBeTruthy();
  });

  test('GET /factures/999999 — 404', async ({ request }) => {
    const res = await request.get(`${BASE}/factures/999999`);
    expect(res.status()).toBe(404);
  });

  test('DELETE /factures/999999 — 404', async ({ request }) => {
    const res = await request.delete(`${BASE}/factures/999999`);
    expect(res.status()).toBe(404);
  });

  test('POST /factures/regenerate — batch generation', async ({ request }) => {
    const res = await request.post(`${BASE}/factures/regenerate`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('created');
    expect(typeof body.created).toBe('number');
  });
});

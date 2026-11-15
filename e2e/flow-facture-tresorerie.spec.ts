import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001/api';

test.describe('Flow: Contrat → Factures → Paiement → Trésorerie', () => {
  let contratId: number;
  let factureId: number;

  test('1. Create contrat assigned to Oussama', async ({ request }) => {
    const res = await request.post(`${BASE}/contrats`, {
      data: {
        client: 'Flow E2E SAS', vitrine_id: 1, duree: 3, montant: 450,
        caution: 1500, date_debut: '2026-06-01', date_fin: '2026-09-01',
        qui: 'Oussama', conditions: 'Test flow E2E',
      },
    });
    expect(res.status()).toBe(201);
    contratId = (await res.json()).id;
  });

  test('2. Regenerate factures → creates monthly invoices', async ({ request }) => {
    await request.post(`${BASE}/factures/regenerate`);
    const factures = await (await request.get(`${BASE}/factures?contrat_id=${contratId}`)).json();
    expect(factures.length).toBeGreaterThanOrEqual(1);
    // Each facture should inherit qui=Oussama
    for (const f of factures) {
      expect(f.statut).toMatch(/emise|generee/);
      expect(f.client).toBe('Flow E2E SAS');
    }
    factureId = factures[0].id;
  });

  test('3. Dashboard shows facture in impayés', async ({ request }) => {
    const dash = await (await request.get(`${BASE}/dashboard`)).json();
    const detail = dash.impayes.detail;
    const found = detail.find((d: any) => d.client_name === 'Flow E2E SAS');
    expect(found).toBeTruthy();
    expect(found.source).toBe('facture');
  });

  test('4. Mark facture paid → creates flux entry', async ({ request }) => {
    const fluxBefore = await (await request.get(`${BASE}/flux`)).json();
    const res = await request.put(`${BASE}/factures/${factureId}/payer`, { data: {} });
    expect(res.ok()).toBeTruthy();
    const paid = await res.json();
    expect(paid.statut).toBe('payee');

    const fluxAfter = await (await request.get(`${BASE}/flux`)).json();
    expect(fluxAfter.length).toBeGreaterThan(fluxBefore.length);

    // Find the new flux entry
    const newFlux = fluxAfter.find((f: any) =>
      f.commentaire?.includes('Flow E2E SAS') && f.commentaire?.includes('payée')
    );
    expect(newFlux).toBeTruthy();
    expect(newFlux.qui).toBe('Oussama');
    expect(Number(newFlux.montant)).toBe(450);
    expect(newFlux.type_flux).toBe('location');
  });

  test('5. Dashboard impayés no longer shows paid facture', async ({ request }) => {
    const dash = await (await request.get(`${BASE}/dashboard`)).json();
    const paidInDetail = dash.impayes.detail.find(
      (d: any) => d.client_name === 'Flow E2E SAS' && d.id === factureId
    );
    expect(paidInDetail).toBeFalsy();
  });

  test('6. Mark facture unpaid → shows again in impayés', async ({ request }) => {
    await request.put(`${BASE}/factures/${factureId}/impayee`, { data: {} });
    const dash = await (await request.get(`${BASE}/dashboard`)).json();
    const found = dash.impayes.detail.find(
      (d: any) => d.client_name === 'Flow E2E SAS' && d.source === 'facture'
    );
    expect(found).toBeTruthy();
  });

  test('7. Cleanup', async ({ request }) => {
    const factures = await (await request.get(`${BASE}/factures?contrat_id=${contratId}`)).json();
    for (const f of factures) await request.delete(`${BASE}/factures/${f.id}`);
    await request.delete(`${BASE}/contrats/${contratId}`);
    // Clean flux entries
    const allFlux = await (await request.get(`${BASE}/flux`)).json();
    for (const f of allFlux) {
      if (f.commentaire?.includes('Flow E2E SAS')) await request.delete(`${BASE}/flux/${f.id}`);
    }
  });
});

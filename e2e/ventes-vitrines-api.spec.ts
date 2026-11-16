import { test, expect, type APIRequestContext } from '@playwright/test';

const BASE = 'http://localhost:3001/api';

async function newVitrine(request: APIRequestContext, serial: string) {
  for (const v of await (await request.get(`${BASE}/vitrines?q=${serial}`)).json()) {
    if (v.vente_id) await request.delete(`${BASE}/ventes/${v.vente_id}`);
    await request.delete(`${BASE}/vitrines/${v.id}`);
  }
  const res = await request.post(`${BASE}/vitrines`, { data: { serial, model: 'Vitrine Vente Test 2m', prix_achat: 1500, prix_reparation: 120, date_achat: '2025-02-10', fonctionnelle: 1 } });
  expect(res.status()).toBe(201);
  return res.json();
}

test.describe('Vente de vitrine → statut « vendue »', () => {
  test('cycle complet : vendre, statut, filtre, double vente refusée, annulation', async ({ request }) => {
    const v = await newVitrine(request, 'VT-API-01');
    let d = await (await request.get(`${BASE}/vitrines/${v.id}`)).json();
    expect(d.vendue).toBe(0);
    expect(d.vente_id).toBeNull();

    const res = await request.post(`${BASE}/ventes`, { data: { vitrine_id: v.id, prix_achat: 1500, frais: 120, date_achat: '2025-02-10', prix_vente: 2400, date_vente: '2026-11-16', commentaire: 'Boucherie Martin' } });
    expect(res.status()).toBe(201);
    const vente = await res.json();
    expect(vente.date_achat).toBe('2025-02-10');

    d = await (await request.get(`${BASE}/vitrines/${v.id}`)).json();
    expect(d.vendue).toBe(1);
    expect(d.vente_id).toBe(vente.id);
    expect(d.vente_prix).toBe(2400);
    expect(d.vente_date).toBe('2026-11-16');
    expect(d.vente_date_achat).toBe('2025-02-10');

    const sold = await (await request.get(`${BASE}/vitrines?vendue=1`)).json();
    expect(sold.map((x: any) => x.id)).toContain(v.id);
    const parc = await (await request.get(`${BASE}/vitrines?vendue=0`)).json();
    expect(parc.map((x: any) => x.id)).not.toContain(v.id);
    // La vitrine reste dans la liste complète
    expect((await (await request.get(`${BASE}/vitrines`)).json()).map((x: any) => x.id)).toContain(v.id);

    // Une vitrine vendue n'est plus « vacante » sur le tableau de bord
    const dash = await (await request.get(`${BASE}/dashboard`)).json();
    expect(dash.vitrines_vacantes.map((x: any) => x.id)).not.toContain(v.id);

    // Double vente refusée (création et rattachement)
    expect((await request.post(`${BASE}/ventes`, { data: { vitrine_id: v.id, prix_vente: 10 } })).status()).toBe(409);
    const orphan = await (await request.post(`${BASE}/ventes`, { data: { vitrine_id: null, prix_vente: 1900, commentaire: 'Vente sans fiche test' } })).json();
    expect((await request.put(`${BASE}/ventes/${orphan.id}`, { data: { vitrine_id: v.id } })).status()).toBe(409);
    // Modifier sa propre vente reste possible
    expect((await request.put(`${BASE}/ventes/${vente.id}`, { data: { vitrine_id: v.id, prix_vente: 2450 } })).status()).toBe(200);
    expect((await (await request.get(`${BASE}/vitrines/${v.id}`)).json()).vente_prix).toBe(2450);

    // Annulation de la vente → la vitrine redevient disponible
    expect((await request.delete(`${BASE}/ventes/${vente.id}`)).status()).toBe(200);
    d = await (await request.get(`${BASE}/vitrines/${v.id}`)).json();
    expect(d.vendue).toBe(0);

    await request.delete(`${BASE}/ventes/${orphan.id}`);
    await request.delete(`${BASE}/vitrines/${v.id}`);
  });

  test('rattacher une vente sans fiche à une vitrine la marque vendue', async ({ request }) => {
    const v = await newVitrine(request, 'VT-API-02');
    const orphan = await (await request.post(`${BASE}/ventes`, { data: { vitrine_id: null, prix_vente: 2200, prix_achat: 1400, frais: 450, commentaire: 'Vitrine Portugais test' } })).json();
    expect((await request.put(`${BASE}/ventes/${orphan.id}`, { data: { vitrine_id: v.id } })).status()).toBe(200);
    expect((await (await request.get(`${BASE}/vitrines/${v.id}`)).json()).vendue).toBe(1);
    await request.delete(`${BASE}/ventes/${orphan.id}`);
    await request.delete(`${BASE}/vitrines/${v.id}`);
  });

  test('sans le droit « ventes » : impossible de vendre (403), mais le statut vendue reste visible', async ({ request }) => {
    const v = await newVitrine(request, 'VT-API-03');
    const vente = await (await request.post(`${BASE}/ventes`, { data: { vitrine_id: v.id, prix_vente: 2000 } })).json();
    const users = await (await request.get(`${BASE}/auth/users`)).json();
    const old = users.find((u: any) => u.name === 'VenteSansDroit');
    if (old) await request.delete(`${BASE}/auth/users/${old.id}`);
    const u = await (await request.post(`${BASE}/auth/users`, { data: { name: 'VenteSansDroit', password: 'pw-v-1', role: 'user', permissions: ['vitrines'] } })).json();
    const { token } = await (await request.post(`${BASE}/auth/login`, { data: { name: 'VenteSansDroit', password: 'pw-v-1' }, headers: { Authorization: '' } })).json();
    const H = { Authorization: `Bearer ${token}` };

    expect((await request.post(`${BASE}/ventes`, { headers: H, data: { vitrine_id: null, prix_vente: 1 } })).status()).toBe(403);
    expect((await request.delete(`${BASE}/ventes/${vente.id}`, { headers: H })).status()).toBe(403);
    expect((await (await request.get(`${BASE}/vitrines/${v.id}`, { headers: H })).json()).vendue).toBe(1);

    await request.delete(`${BASE}/auth/users/${u.id}`);
    await request.delete(`${BASE}/ventes/${vente.id}`);
    await request.delete(`${BASE}/vitrines/${v.id}`);
  });

  test('vitrine inconnue → 404', async ({ request }) => {
    expect((await request.get(`${BASE}/vitrines/999999`)).status()).toBe(404);
  });
});

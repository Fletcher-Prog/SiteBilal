import { test, expect, type APIRequestContext } from '@playwright/test';
import { login, BASE, AUTH } from './helpers';

const API = `${BASE}/api`;
const thisMonth = () => new Date().toISOString().slice(0, 8) + '01';

async function makeBooking(request: APIRequestContext, client: string) {
  const v = (await (await request.get(`${API}/vitrines`, { headers: AUTH })).json())[0];
  const old = (await (await request.get(`${API}/bookings`, { headers: AUTH })).json()).filter((b: any) => b.client_name === client);
  for (const b of old) await request.delete(`${API}/bookings/${b.id}`, { headers: AUTH });
  const conflicts = await (await request.post(`${API}/bookings/check-conflict`, { headers: AUTH, data: { vitrine_id: v.id, start_date: thisMonth(), duration_months: 2 } })).json();
  const vitrines = await (await request.get(`${API}/vitrines`, { headers: AUTH })).json();
  // Choisit une vitrine libre ce mois-ci pour éviter le conflit de dates
  let vid = v.id;
  if (conflicts.conflict) {
    for (const x of vitrines) {
      const c = await (await request.post(`${API}/bookings/check-conflict`, { headers: AUTH, data: { vitrine_id: x.id, start_date: thisMonth(), duration_months: 2 } })).json();
      if (!c.conflict) { vid = x.id; break; }
    }
  }
  const res = await request.post(`${API}/bookings`, { headers: AUTH, data: { vitrine_id: vid, client_name: client, start_date: thisMonth(), duration_months: 2, montant: 650, qui: 'Bilel', tel_client: '0612345678', type_duree: 'longue', etat: 'impaye' } });
  expect(res.status()).toBe(201);
  return res.json();
}

test.describe('Planning — même vue sur téléphone + fiche réservation', () => {
  test('mobile : Gantt affiché, tap sur une réservation → toutes les infos, puis Modifier', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const b = await makeBooking(page.request, 'Mobile Gantt E2E');
    await login(page);
    await page.goto(`${BASE}/planning`);

    const gantt = page.getByTestId('gantt');
    await expect(gantt).toBeVisible();
    await expect(page.getByTestId('planning-cards')).toHaveCount(0);
    // Pas de débordement horizontal de la page : seul le Gantt défile
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole('button', { name: 'Réservation Mobile Gantt E2E' }).click();
    const detail = page.getByTestId('booking-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('Mobile Gantt E2E');
    await expect(detail).toContainText('Réservée le');
    await expect(detail).toContainText('Début');
    await expect(detail).toContainText('Fin');
    await expect(detail).toContainText('650');
    await expect(detail).toContainText('0612345678');
    await expect(detail).toContainText(/Factures liées/);
    await expect(detail).toContainText(/Contrats liés/);

    await detail.getByRole('button', { name: 'Modifier' }).click();
    await expect(page.getByRole('dialog', { name: 'Modifier la réservation' })).toBeVisible();

    await page.request.delete(`${API}/bookings/${b.id}`, { headers: AUTH });
  });

  test('desktop : clic sur le nom de la vitrine → fiche de sa réservation', async ({ page }) => {
    const b = await makeBooking(page.request, 'Desktop Vitrine E2E');
    await login(page);
    await page.goto(`${BASE}/planning`);
    const row = page.getByTestId('gantt-vitrine').filter({ hasText: (await (await page.request.get(`${API}/vitrines`, { headers: AUTH })).json()).find((v: any) => v.id === b.vitrine_id).serial });
    await row.first().click();
    const detail = page.getByTestId('booking-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText(/Client/);
    await expect(detail).toContainText(/Prix/);
    await page.request.delete(`${API}/bookings/${b.id}`, { headers: AUTH });
  });
});

test.describe('Gestion des accès par compte', () => {
  test('admin crée un compte limité, modifie ses accès ; le compte ne voit que ses onglets', async ({ page }) => {
    const NAME = 'E2E Accès';
    const prev = (await (await page.request.get(`${API}/auth/users`, { headers: AUTH })).json()).find((u: any) => u.name === NAME);
    if (prev) await page.request.delete(`${API}/auth/users/${prev.id}`, { headers: AUTH });

    await login(page);
    await page.goto(`${BASE}/parametres`);
    const comptes = page.getByTestId('comptes');
    await expect(comptes).toBeVisible();
    await comptes.getByRole('button', { name: 'Ajouter un compte' }).click();
    await comptes.locator('input[name="name"]').fill(NAME);
    await comptes.locator('input[name="email"]').fill('acces.e2e@vitritrack.fr');
    await comptes.locator('input[name="password"]').fill('pw-e2e-1');
    await expect(comptes.locator('input[name="perm-planning"]')).toBeChecked();
    await comptes.locator('input[name="perm-contrats"]').check();
    await comptes.getByRole('button', { name: 'Créer' }).click();

    const row = page.getByTestId(`compte-${NAME}`);
    await expect(row).toContainText('Planning');
    await expect(row).toContainText('Contrats & Factures');

    await row.getByRole('button', { name: 'Accès', exact: true }).click();
    await row.locator('input[name="perm-contrats"]').uncheck();
    await row.getByRole('button', { name: 'Enregistrer les accès' }).click();
    await expect(row).not.toContainText('Contrats & Factures');
    await expect(row).toContainText('Planning');

    // Connexion avec le compte limité
    await page.evaluate(() => localStorage.clear());
    await login(page, NAME, 'pw-e2e-1');
    await page.goto(`${BASE}/`);
    await expect(page).toHaveURL(/\/planning$/);
    const sidebar = page.locator('aside nav');
    await expect(sidebar).toContainText('Planning');
    await expect(sidebar).not.toContainText('Trésorerie');
    await expect(sidebar).not.toContainText('Paramètres');
    await page.goto(`${BASE}/tresorerie`);
    await expect(page).toHaveURL(/\/planning$/);
    await page.goto(`${BASE}/parametres`);
    await expect(page).toHaveURL(/\/planning$/);

    const u = (await (await page.request.get(`${API}/auth/users`, { headers: AUTH })).json()).find((x: any) => x.name === NAME);
    await page.request.delete(`${API}/auth/users/${u.id}`, { headers: AUTH });
  });
});

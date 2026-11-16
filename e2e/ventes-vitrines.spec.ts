import { test, expect } from '@playwright/test';
import { login, BASE, AUTH } from './helpers';

const API = `${BASE}/api`;

test.describe('Vendre une vitrine depuis sa fiche', () => {
  test('téléphone : bouton en bas → modale pré-remplie → vendue, visible dans le filtre « Vendues », puis annulation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const H = { headers: AUTH };
    for (const v of await (await page.request.get(`${API}/vitrines?q=VT-E2E-01`, H)).json()) {
      if (v.vente_id) await page.request.delete(`${API}/ventes/${v.vente_id}`, H);
      await page.request.delete(`${API}/vitrines/${v.id}`, H);
    }
    const v = await (await page.request.post(`${API}/vitrines`, { ...H, data: { serial: 'VT-E2E-01', model: 'Vitrine Bombée 1m50', prix_achat: 1500, prix_reparation: 120, date_achat: '2025-02-10', fonctionnelle: 1 } })).json();

    await login(page);
    await page.goto(`${BASE}/vitrines/${v.id}`);
    const bloc = page.getByTestId('bloc-vente');
    await bloc.scrollIntoViewIfNeeded();
    await expect(bloc).toContainText("n'est pas vendue");
    await bloc.getByRole('button', { name: 'Vendre cette vitrine' }).click();

    const form = page.getByTestId('vente-form');
    await expect(form).toContainText('VT-E2E-01');
    await expect(form.locator('input[name="prix_achat"]')).toHaveValue('1500');
    await expect(form.locator('input[name="date_achat"]')).toHaveValue('2025-02-10');
    await expect(form.locator('input[name="frais"]')).toHaveValue('120');
    // Les infos pré-remplies restent modifiables
    await form.locator('input[name="frais"]').fill('100');
    await form.locator('input[name="prix_vente"]').fill('2400');
    await form.locator('input[name="date_vente"]').fill('2026-11-16');
    await form.locator('textarea[name="commentaire"]').fill('Boucherie Martin — Créteil');
    await expect(page.getByTestId('vente-marge')).toContainText('800');
    await form.getByRole('button', { name: 'Valider la vente' }).click();

    await expect(page.locator('h1')).toContainText('Vendue');
    await expect(bloc).toContainText(/2\s400/);
    await expect(bloc).toContainText('16/11/2026');
    await expect(bloc).toContainText('Boucherie Martin');

    // La vitrine reste dans la liste, marquée vendue, et apparaît dans le filtre « Vendues »
    await page.goto(`${BASE}/vitrines`);
    const row = page.locator('tr', { hasText: 'VT-E2E-01' });
    await expect(row).toContainText('Vendue');
    await page.getByLabel('Filtrer par état').selectOption('vendue');
    await expect(page).toHaveURL(/etat=vendue/);
    await expect(row).toBeVisible();
    await expect(page.getByTestId('kpi-ventes')).toBeVisible();
    await page.getByLabel('Filtrer par état').selectOption('parc');
    await expect(row).toHaveCount(0);

    // Annuler la vente depuis la fiche
    await page.goto(`${BASE}/vitrines/${v.id}`);
    await bloc.getByRole('button', { name: 'Modifier la vente' }).click();
    await page.getByRole('button', { name: 'Annuler la vente' }).click();
    await page.getByRole('button', { name: "Confirmer l'annulation" }).click();
    await expect(bloc).toContainText("n'est pas vendue");
    await expect(page.locator('h1')).not.toContainText('Vendue');

    await page.request.delete(`${API}/vitrines/${v.id}`, H);
  });

  test('ventes sans fiche : visibles dans le filtre « Vendues » et rattachables', async ({ page }) => {
    const H = { headers: AUTH };
    const s = await (await page.request.post(`${API}/ventes`, { ...H, data: { vitrine_id: null, prix_vente: 1900, prix_achat: 0, frais: 0, commentaire: 'Vitrine poissonnier E2E' } })).json();
    await login(page);
    await page.goto(`${BASE}/vitrines?etat=vendue`);
    const bloc = page.getByTestId('ventes-sans-fiche');
    await expect(bloc).toContainText('Vitrine poissonnier E2E');
    await bloc.locator('li', { hasText: 'Vitrine poissonnier E2E' }).getByRole('button', { name: 'Modifier' }).click();
    await expect(page.getByTestId('vente-form').locator('select[name="vitrine_id"]')).toBeVisible();
    await page.getByTestId('vente-form').locator('textarea[name="commentaire"]').fill('Vitrine poissonnier E2E (modifiée)');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(bloc).toContainText('(modifiée)');
    await page.request.delete(`${API}/ventes/${s.id}`, H);
  });
});

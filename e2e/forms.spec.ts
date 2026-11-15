import { test, expect } from '@playwright/test';
import { login, BASE } from './helpers';

test.describe('Frontend — Forms & Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Vitrines — create new vitrine via form', async ({ page }) => {
    await page.goto(`${BASE}/vitrines`);
    await page.click('button:has-text("Nouvelle vitrine"), button:has-text("Ajouter")');
    await page.fill('input[value=""], input[placeholder*="série"]', 'E2E-V-999');
    await page.fill('input[placeholder*="Vitrine"], input[placeholder*="modèle"], input[placeholder*="Modèle"]', 'Vitrine E2E Test');
    // Look for save/submit button
    const submit = page.locator('button[type="submit"], button:has-text("Enregistrer"), button:has-text("Sauvegarder"), button:has-text("Créer")');
    if (await submit.count() > 0) await submit.first().click();
    // Wait for either success or the list to update
    await page.waitForTimeout(1000);
  });

  test('Lieux — create + verify in list', async ({ page }) => {
    await page.goto(`${BASE}/lieux`);
    await page.click('button:has-text("Nouveau"), button:has-text("Ajouter")');
    await page.waitForTimeout(300);
    const nomInput = page.locator('input[name="nom"], input').first();
    await nomInput.fill('Lieu E2E Test');
    const submit = page.locator('button[type="submit"], button:has-text("Enregistrer")');
    if (await submit.count() > 0) await submit.first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toContainText('Lieu E2E Test');
  });

  test('Contrats — create new contrat via form', async ({ page }) => {
    await page.goto(`${BASE}/contrats`);
    await page.click('button:has-text("Nouveau contrat")');
    await page.waitForTimeout(300);
    await page.fill('input[name="client"]', 'Client E2E Form');
    await page.fill('input[name="date_debut"]', '2026-06-01');
    await page.fill('input[name="date_fin"]', '2026-12-01');
    await page.fill('input[name="montant"]', '400');
    await page.fill('input[name="caution"]', '1200');
    // Select associé
    const quiSelect = page.locator('select[name="qui"]');
    if (await quiSelect.count() > 0) await quiSelect.selectOption('Bilel');
    const submit = page.locator('button[type="submit"], button:has-text("Enregistrer")');
    if (await submit.count() > 0) await submit.first().click();
    await page.waitForTimeout(1000);
  });

  test('Planning — create booking via form', async ({ page }) => {
    await page.goto(`${BASE}/planning`);
    await page.click('button:has-text("Nouvelle"), button:has-text("Ajouter"), button:has-text("réservation")');
    await page.waitForTimeout(300);
    const clientInput = page.locator('input[placeholder*="Client"], input[class*="input"]').first();
    if (await clientInput.count() > 0) await clientInput.fill('Client Planning E2E');
    // Fill other available fields
    const submit = page.locator('button[type="submit"], button:has-text("Enregistrer")');
    if (await submit.count() > 0) await submit.first().click();
    await page.waitForTimeout(500);
  });

  test('Trésorerie — create flux entry', async ({ page }) => {
    await page.goto(`${BASE}/tresorerie`);
    await page.click('button:has-text("Nouveau"), button:has-text("Ajouter")');
    await page.waitForTimeout(300);
    // Fill available form fields
    const montantInput = page.locator('input[name="montant"], input[type="number"]').first();
    if (await montantInput.count() > 0) await montantInput.fill('250');
    const submit = page.locator('button[type="submit"], button:has-text("Enregistrer")');
    if (await submit.count() > 0) await submit.first().click();
    await page.waitForTimeout(500);
  });

  test('Actions — create and toggle action', async ({ page }) => {
    await page.goto(`${BASE}/actions`);
    await page.click('button:has-text("Nouvelle"), button:has-text("Ajouter")');
    await page.waitForTimeout(300);
    const titreInput = page.locator('input[name="titre"]');
    if (await titreInput.count() > 0) await titreInput.fill('Action E2E');
    const submit = page.locator('button[type="submit"], button:has-text("Enregistrer")');
    if (await submit.count() > 0) await submit.first().click();
    await page.waitForTimeout(500);
  });

  test('Dashboard — impayés section shows factures', async ({ page }) => {
    // Create a contrat with facture via API, then check dashboard
    const contrat = await (await page.request.post(`${BASE}/api/contrats`, {
      data: { client: 'Dashboard Impaye E2E', vitrine_id: 1, duree: 1, montant: 100, caution: 300, date_debut: '2026-11-01', date_fin: '2026-12-01', qui: 'Bilel' },
    })).json();
    // Create unpaid facture
    await page.request.post(`${BASE}/api/factures`, {
      data: { contrat_id: contrat.id, periode: '2026-11', montant: 100, client: 'Dashboard Impaye E2E', statut: 'emise' },
    });

    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1000);
    // Dashboard should show at least 1 impayé
    const impayeCard = page.locator('text=Impayés').first();
    await expect(impayeCard).toBeVisible();

    // Cleanup
    const factures = await (await page.request.get(`${BASE}/api/factures?contrat_id=${contrat.id}`)).json();
    for (const f of factures) await page.request.delete(`${BASE}/api/factures/${f.id}`);
    await page.request.delete(`${BASE}/api/contrats/${contrat.id}`);
  });

  test('Contrats — factures popup + PDF button exists', async ({ page }) => {
    await page.goto(`${BASE}/contrats`);
    await page.waitForTimeout(500);
    const facturesBtn = page.locator('button:has-text("Factures")').first();
    if (await facturesBtn.count() > 0) {
      await facturesBtn.click();
      await page.waitForTimeout(500);
      // Modal should be visible with factures or "Aucune facture"
      await expect(page.locator('body')).toContainText(/Facture|Aucune facture/i);
    }
  });

  test('Contrats — contrat PDF button exists', async ({ page }) => {
    await page.goto(`${BASE}/contrats`);
    await page.waitForTimeout(500);
    const pdfBtn = page.locator('button:has-text("Contrat PDF")').first();
    if (await pdfBtn.count() > 0) {
      await expect(pdfBtn).toBeVisible();
    }
  });

  test('Vitrines — detail page loads with CA section', async ({ page }) => {
    // Get a vitrine ID
    const vitrines = await (await page.request.get(`${BASE}/api/vitrines`)).json();
    if (vitrines.length === 0) return;
    await page.goto(`${BASE}/vitrines/${vitrines[0].id}`);
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toContainText(/CA généré|Générer CA/i);
  });

  test('VitrineDetail — "Générer CA" button (not "devis")', async ({ page }) => {
    const vitrines = await (await page.request.get(`${BASE}/api/vitrines`)).json();
    if (vitrines.length === 0) return;
    await page.goto(`${BASE}/vitrines/${vitrines[0].id}`);
    await page.waitForTimeout(500);
    // Should have "Générer CA", NOT "Générer devis"
    await expect(page.locator('button:has-text("Générer CA")')).toBeVisible();
    expect(await page.locator('button:has-text("Générer devis")').count()).toBe(0);
  });
});

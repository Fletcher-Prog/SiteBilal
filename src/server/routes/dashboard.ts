import { Router } from 'express';

export default function(db: any) {
  const router = Router();

  router.get('/', (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const from = String(req.query.from || '2000-01-01');
    const to = String(req.query.to || '2099-12-31');
    const hasDateFilter = req.query.from || req.query.to;
    const one = (sql: string, ...p: any[]) => db.prepare(sql).get(...p);
    const all = (sql: string, ...p: any[]) => db.prepare(sql).all(...p);

    // --- Impayés ---
    // With date filter: show what was unpaid AS OF that date range
    // A booking is unpaid at date X if: not paid, or paid AFTER X (date_paiement > to)
    // A facture is unpaid at date X if: not paid, or paid AFTER X (date_paiement > to)
    const impayes_bookings = hasDateFilter
      ? all(`SELECT b.id, 'booking' AS source, b.client_name, b.vitrine_id, b.montant, b.start_date AS date_ref, b.duration_months, b.tel_client, b.type_duree, v.model AS vitrine_model
             FROM bookings b LEFT JOIN vitrines v ON v.id = b.vitrine_id
             WHERE b.start_date >= ? AND b.start_date <= ?
               AND b.etat != 'annulee'
               AND (b.etat != 'paye' OR b.date_paiement > ?)
             ORDER BY b.start_date DESC`, from, to, to)
      : all(`SELECT b.id, 'booking' AS source, b.client_name, b.vitrine_id, b.montant, b.start_date AS date_ref, b.duration_months, b.tel_client, b.type_duree, v.model AS vitrine_model
             FROM bookings b LEFT JOIN vitrines v ON v.id = b.vitrine_id
             WHERE (b.etat IS NULL OR b.etat NOT IN ('paye','annulee'))
             ORDER BY b.start_date DESC`);

    const impayes_factures = hasDateFilter
      ? all(`SELECT f.id, 'facture' AS source, f.client AS client_name, f.vitrine_id, f.montant, f.date_emission AS date_ref, f.periode, NULL AS duration_months, f.tel_client, NULL AS type_duree, v.model AS vitrine_model
             FROM factures f LEFT JOIN vitrines v ON v.id = f.vitrine_id
             WHERE f.date_emission >= ? AND f.date_emission <= ?
               AND (f.statut != 'payee' OR f.date_paiement > ?)
             ORDER BY f.date_emission DESC`, from, to, to)
      : all(`SELECT f.id, 'facture' AS source, f.client AS client_name, f.vitrine_id, f.montant, f.date_emission AS date_ref, f.periode, NULL AS duration_months, f.tel_client, NULL AS type_duree, v.model AS vitrine_model
             FROM factures f LEFT JOIN vitrines v ON v.id = f.vitrine_id
             WHERE (f.statut IS NULL OR f.statut NOT IN ('payee'))
             ORDER BY f.date_emission DESC`);

    const impayes_detail = [...impayes_bookings, ...impayes_factures];

    // --- CA ---
    const dateFilter = `start_date >= ? AND start_date <= ?`;
    const ca_longue = one(`SELECT COALESCE(SUM(montant),0) AS s FROM bookings WHERE type_duree='longue' AND etat='paye' AND (date_paiement IS NULL OR date_paiement <= ?) AND ${dateFilter}`, to, from, to);
    const ca_courte = one(`SELECT COALESCE(SUM(montant),0) AS s FROM bookings WHERE type_duree='courte' AND etat='paye' AND (date_paiement IS NULL OR date_paiement <= ?) AND ${dateFilter}`, to, from, to);
    const ca_booking = one(`SELECT COALESCE(SUM(montant),0) AS s FROM bookings WHERE ${dateFilter}`, from, to).s;
    const ca_factures = one(`SELECT COALESCE(SUM(montant),0) AS s FROM factures WHERE statut = 'payee' AND (date_paiement IS NULL OR date_paiement <= ?) AND date_emission >= ? AND date_emission <= ?`, to, from, to).s;
    const ca_location = { total: ca_booking + ca_factures, objectif: 70000 };

    // --- Trésorerie ---
    const treso = (qui: string) => ({
      qui,
      total: one(`SELECT COALESCE(SUM(montant),0) AS s FROM flux WHERE LOWER(qui) = ? AND mois >= ? AND mois <= ?`, qui.toLowerCase(), from.slice(0, 7), to.slice(0, 7)).s,
      operations: all(`SELECT * FROM flux WHERE LOWER(qui) = ? AND mois >= ? AND mois <= ? ORDER BY id DESC`, qui.toLowerCase(), from.slice(0, 7), to.slice(0, 7)),
    });

    // --- Vitrines vacantes ---
    const vitrines_vacantes = all(
      `SELECT * FROM vitrines v WHERE NOT EXISTS (SELECT 1 FROM ventes s WHERE s.vitrine_id = v.id) AND NOT EXISTS (
         SELECT 1 FROM bookings b WHERE b.vitrine_id = v.id AND b.etat IS NOT 'annulee'
           AND b.start_date <= ? AND date(b.start_date, '+' || COALESCE(b.duration_months,1) || ' months') > ?)`, to, from);
    const valeur_parc = one('SELECT COALESCE(SUM(prix_achat),0) AS s FROM vitrines v WHERE NOT EXISTS (SELECT 1 FROM ventes s WHERE s.vitrine_id = v.id)').s;

    // --- Prochaines réservations (from TODAY, not from filter) ---
    const prochaines_reservations = all(
      `SELECT b.*, v.model AS vitrine_model FROM bookings b LEFT JOIN vitrines v ON v.id = b.vitrine_id
       WHERE b.start_date >= ? AND (b.etat IS NULL OR b.etat NOT IN ('annulee','termine'))
       ORDER BY b.start_date ASC LIMIT 5`, today);

    // --- Dernières opérations ---
    const dernieres_operations = all(`SELECT * FROM flux WHERE mois >= ? AND mois <= ? ORDER BY id DESC LIMIT 10`, from.slice(0, 7), to.slice(0, 7));

    // --- Répartition par lieu ---
    const repartition_par_lieu = all(
      `SELECT l.id AS lieu_id, l.nom AS lieu, COUNT(v.id) AS count
       FROM lieux l LEFT JOIN vitrines v ON v.lieu_id = l.id GROUP BY l.id, l.nom`);

    // --- Alertes ---
    const alertes = [
      ...all('SELECT * FROM vitrines WHERE fonctionnelle = 0').map((v: any) => ({ type: 'vitrine_non_fonctionnelle', vitrine: v })),
      ...all(`SELECT * FROM bookings WHERE date(start_date, '+' || COALESCE(duration_months,1) || ' months') < ? AND (etat IS NULL OR etat NOT IN ('paye','annulee','termine'))`, today)
        .map((b: any) => ({ type: 'booking_en_retard', booking: b })),
    ];

    const seesTreso = ((req as any).user?.perms || []).includes('tresorerie');
    res.json({
      impayes: { count: impayes_detail.length, total: impayes_detail.reduce((a: number, r: any) => a + (Number(r.montant) || 0), 0), detail: impayes_detail },
      ca_location, ca_longue: ca_longue.s, ca_courte: ca_courte.s,
      ...(seesTreso ? { tresorerie_bilel: treso('Bilel'), tresorerie_oussama: treso('Oussama'), dernieres_operations } : {}),
      vitrines_vacantes, valeur_parc, prochaines_reservations,
      repartition_par_lieu, alertes,
    });
  });

  return router;
}

import { Router } from 'express';

export default function(db: any) {
  const router = Router();

  router.get('/', (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const one = (sql: string, ...p: any[]) => db.prepare(sql).get(...p);
    const all = (sql: string, ...p: any[]) => db.prepare(sql).all(...p);

    const impayes_count = one(`SELECT COUNT(*) AS n FROM bookings WHERE etat IS NULL OR etat NOT IN ('paye','annulee')`);
    const impayes_total = one(`SELECT COALESCE(SUM(montant),0) AS s FROM bookings WHERE etat IS NULL OR etat NOT IN ('paye','annulee')`);
    const impayes_detail = all(`SELECT b.id, b.client_name, b.vitrine_id, b.montant, b.start_date, b.duration_months, b.tel_client, b.type_duree, v.model AS vitrine_model FROM bookings b LEFT JOIN vitrines v ON v.id = b.vitrine_id WHERE b.etat IS NULL OR b.etat NOT IN ('paye','annulee') ORDER BY b.start_date DESC`);
    const ca_longue = one(`SELECT COALESCE(SUM(montant),0) AS s FROM bookings WHERE type_duree='longue' AND etat='paye'`);
    const ca_courte = one(`SELECT COALESCE(SUM(montant),0) AS s FROM bookings WHERE type_duree='courte' AND etat='paye'`);
    const ca_location = { total: one('SELECT COALESCE(SUM(montant),0) AS s FROM bookings').s, objectif: 70000 };
    const treso = (qui: string) => ({
      qui,
      total: one(`SELECT COALESCE(SUM(montant),0) AS s FROM flux WHERE LOWER(qui) = ?`, qui.toLowerCase()).s,
      operations: all(`SELECT * FROM flux WHERE LOWER(qui) = ? ORDER BY id DESC`, qui.toLowerCase()),
    });
    const vitrines_vacantes = all(
      `SELECT * FROM vitrines v WHERE NOT EXISTS (
         SELECT 1 FROM bookings b WHERE b.vitrine_id = v.id AND b.etat IS NOT 'annulee'
           AND b.start_date <= ? AND date(b.start_date, '+' || COALESCE(b.duration_months,1) || ' months') > ?)`, today, today);
    const valeur_parc = one('SELECT COALESCE(SUM(prix_achat),0) AS s FROM vitrines').s;
    const prochaines_reservations = all('SELECT * FROM bookings WHERE start_date >= ? ORDER BY start_date ASC LIMIT 5', today);
    const dernieres_operations = all('SELECT * FROM flux ORDER BY id DESC LIMIT 10');
    const repartition_par_lieu = all(
      `SELECT l.id AS lieu_id, l.nom AS lieu, COUNT(v.id) AS count
       FROM lieux l LEFT JOIN vitrines v ON v.lieu_id = l.id GROUP BY l.id, l.nom`);
    const alertes = [
      ...all('SELECT * FROM vitrines WHERE fonctionnelle = 0').map((v: any) => ({ type: 'vitrine_non_fonctionnelle', vitrine: v })),
      ...all(`SELECT * FROM bookings WHERE date(start_date, '+' || COALESCE(duration_months,1) || ' months') < ? AND (etat IS NULL OR etat NOT IN ('paye','annulee','termine'))`, today)
        .map((b: any) => ({ type: 'booking_en_retard', booking: b })),
    ];

    res.json({
      impayes: { count: impayes_count.n, total: impayes_total.s, detail: impayes_detail },
      ca_location, ca_longue: ca_longue.s, ca_courte: ca_courte.s,
      tresorerie_bilel: treso('Bilel'),
      tresorerie_oussama: treso('Oussama'),
      vitrines_vacantes, valeur_parc, prochaines_reservations,
      dernieres_operations, repartition_par_lieu, alertes,
    });
  });

  return router;
}

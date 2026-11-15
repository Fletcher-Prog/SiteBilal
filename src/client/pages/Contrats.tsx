import { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { useList, PageHeader, Status, Modal, Field, FormActions, useSave, eur, num, inputCls, btnPrimary, btnGhost, btnDanger, card } from '../components/ui.js';
import { btnSecondary } from './Vitrines.js';

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const fmtMonth = (m: string) => { const [y, mo] = m.split('-'); return `${MONTHS[Number(mo) - 1]} ${y}`; };
const fmtDate = (s: string) => { if (!s) return '—'; const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('fr-FR'); };

/* ── PDF helpers ── */

function htmlPdf(title: string, body: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Arial',sans-serif;font-size:11pt;color:#111;padding:2cm;max-width:21cm;margin:auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5em;border-bottom:2px solid #1e3a5f;padding-bottom:1em}
.company{color:#1e3a5f}.company h1{font-size:18pt;font-weight:bold;letter-spacing:1px}.company p{font-size:9pt;margin-top:2px}
.doc-info{text-align:right}.doc-info .doc-type{font-size:16pt;font-weight:bold;color:#1e3a5f}.doc-info p{font-size:9pt}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:1em;margin:1.2em 0;border:1px solid #ddd;padding:0.8em;border-radius:4px}
.parties h3{font-size:10pt;font-weight:bold;text-transform:uppercase;color:#1e3a5f;margin-bottom:4px}
.parties p{font-size:9pt;margin:1px 0}
.section{margin:1em 0}
.section h2{font-size:11pt;font-weight:bold;background:#1e3a5f;color:#fff;padding:4px 8px;margin-bottom:0.5em}
.section p,.section li{font-size:9.5pt;line-height:1.5;margin:2px 0}
table{width:100%;border-collapse:collapse;margin:0.8em 0}
th{background:#1e3a5f;color:#fff;padding:6px 8px;font-size:9.5pt;text-align:left}
td{padding:5px 8px;font-size:9.5pt;border-bottom:1px solid #eee}
.total-row td{font-weight:bold;background:#f0f4f8}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:2em;margin-top:2em}
.signatures .sig-box{border:1px solid #ccc;border-radius:4px;padding:0.8em;min-height:80px}
.signatures h4{font-size:9pt;font-weight:bold;margin-bottom:4px}
.signatures p{font-size:8.5pt;color:#555}
ul.contract-list{padding-left:1.5em;margin:0.3em 0}ul.contract-list li{font-size:9.5pt;line-height:1.5;margin:2px 0}
@media print{body{padding:0.5cm 1cm}.header{margin-bottom:1em}}
</style></head><body>${body}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}

function htmlPdfFull(title: string, fullHtml: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(fullHtml);
  w.document.title = title;
  w.document.close();
  setTimeout(() => w.print(), 300);
}

function applyTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

function exportContratPdf(c: any, settings: Record<string, string>) {
  const tplContrat = settings['template_contrat_html'];
  if (tplContrat) {
    const vars: Record<string, string> = {
      numero: c.numero || String(c.id || ''), client: c.client_nom || c.client || '',
      adresse_client: c.adresse_client || '', tel_client: c.tel_client || '', email_client: c.email_client || '',
      marque: c.marque || '', modele: c.modele || c.vitrine_nom || '', serial_vitrine: c.serial_vitrine || '',
      nb_vitrines: String(c.nb_vitrines || 1), equipements: c.equipements || '',
      date_debut: fmtDate(c.date_debut), date_fin: fmtDate(c.date_fin), duree: String(c.duree || ''),
      montant: eur(c.montant), caution: eur(c.caution),
      jour_paiement: String(c.jour_paiement || 1), mode_paiement: c.mode_paiement || 'virement bancaire',
      option_achat_prix: c.option_achat_prix ? eur(c.option_achat_prix) : '', conditions: c.conditions || '',
      company_nom: settings.company_nom || 'OB LOCATION', company_adresse: settings.company_adresse || '',
      company_siret: settings.company_siret || '', company_iban: settings.company_iban || '',
      company_bic: settings.company_bic || '', signataire: settings.company_signataire || '',
      lieu_signature: settings.company_lieu_signature || '', date_contrat: fmtDate(new Date().toISOString().slice(0, 10)),
    };
    htmlPdfFull(`Contrat de location – ${c.client_nom || c.client}`, applyTemplate(tplContrat, vars));
    return;
  }
  const co = settings.company_nom || settings.nom?.replace(/"/g, '') || 'OB LOCATION';
  const coAdr = settings.company_adresse || settings.adresse?.replace(/"/g, '') || '';
  const coSiret = settings.company_siret || settings.siret?.replace(/"/g, '') || '';
  const coTel = settings.company_tel || settings.tel?.replace(/"/g, '') || '';
  const coEmail = settings.company_email || settings.email?.replace(/"/g, '') || '';
  const coVille = settings.company_ville || 'Paris';
  const iban = settings.company_iban || '';
  const bic = settings.company_bic || '';
  const nb = c.nb_vitrines || 1;
  const totalMensuel = ((c.montant || 0) * nb).toFixed(2).replace('.', ',') + ' €';

  const body = `
<div class="header">
  <div class="company"><h1>${esc(co)}</h1><p>${esc(coAdr)}</p><p>SIRET : ${esc(coSiret)}</p><p>Tél : ${esc(coTel)} · ${esc(coEmail)}</p></div>
  <div class="doc-info"><div class="doc-type">CONTRAT DE LOCATION</div><p><strong>Réf. :</strong> ${esc(c.numero || c.id)}</p><p><strong>Date :</strong> ${fmtDate(c.date_debut || new Date().toISOString().slice(0, 10))}</p></div>
</div>
<p style="font-size:9pt;margin:0.5em 0"><strong>Entre les soussignés :</strong></p>
<div class="parties">
  <div><h3>Bailleur</h3><p><strong>${esc(co)}</strong></p><p>${esc(coAdr)}</p><p>Tél : ${esc(coTel)}</p><p>Email : ${esc(coEmail)}</p><p>SIRET : ${esc(coSiret)}</p><p>Ci-après dénommé « le Bailleur »</p></div>
  <div><h3>Locataire</h3><p><strong>${esc(c.client_nom || c.client)}</strong></p><p>${esc(c.adresse_client || '')}</p><p>Tél : ${esc(c.tel_client || '')}</p>${c.email_client ? `<p>Email : ${esc(c.email_client)}</p>` : ''}<p>Ci-après dénommé « le Locataire »</p></div>
</div>
<p style="font-size:9.5pt;font-weight:bold;text-align:center;margin:0.5em 0">IL A ÉTÉ CONVENU CE QUI SUIT :</p>

<div class="section"><h2>Article 1 – Objet du contrat</h2>
<p>Le Bailleur met à la disposition du Locataire, à titre de location, les vitrines réfrigérées suivantes :</p>
<table><tr><th>Marque</th><th>Modèle</th><th>N° Série</th><th>Nombre</th><th>Équipements</th></tr>
<tr><td>${esc(c.marque || '—')}</td><td>${esc(c.modele || c.vitrine_nom || '—')}</td><td>${esc(c.serial_vitrine || '—')}</td><td>${esc(nb)}</td><td>${esc(c.equipements || '—')}</td></tr></table></div>

<div class="section"><h2>Article 2 – Durée de la location</h2>
<p>La location prend effet à compter du <strong>${fmtDate(c.date_debut)}</strong> et se poursuivra pour une durée déterminée de <strong>${esc(c.duree || '—')} mois</strong>.</p>
<p>Elle pourra être résiliée par l'une ou l'autre des parties sous réserve d'un préavis de <strong>90 jours</strong> sans motif nécessaire.</p></div>

<div class="section"><h2>Article 3 – Montant et modalités de paiement du loyer</h2>
<p>Le loyer mensuel est fixé à <strong>${eur(c.montant)}</strong> par vitrine réfrigérée, soit un total de <strong>${totalMensuel}</strong> par mois.</p>
<p>Le paiement du loyer est exigible le <strong>${esc(c.jour_paiement || 1)}</strong> de chaque mois et sera effectué par <strong>${esc(c.mode_paiement || 'virement bancaire')}</strong>.</p>
${iban ? `<p>IBAN : <strong>${esc(iban)}</strong> · BIC : <strong>${esc(bic)}</strong></p>` : ''}</div>

<div class="section"><h2>Article 4 – Caution</h2>
<p>Le Locataire verse au Bailleur un chèque de caution de <strong>${eur(c.caution)}</strong>, correspondant à un pourcentage de la valeur des biens.</p>
<p>Ce chèque sera restitué au Locataire ou détruit dans un délai de 10 jours maximum après la restitution des vitrines réfrigérées en bon état.</p></div>

<div class="section"><h2>Article 5 – Pénalités de retard</h2>
<p>En cas de retard de paiement du loyer, des pénalités de retard calculées au taux de <strong>5 % par semaine de retard</strong> seront appliquées, à compter des 7 jours suivant la date d'exigibilité du loyer.</p></div>

<div class="section"><h2>Article 6 – Obligations du Bailleur</h2>
<ul class="contract-list">
  <li>Mettre à disposition les vitrines réfrigérées en bon état de fonctionnement.</li>
  <li>Assurer la maintenance régulière des équipements.</li>
  <li>En cas de panne non réparable, remplacer par des équipements équivalents dans un délai de 15 jours.</li>
</ul></div>

<div class="section"><h2>Article 6 bis – Clause de maintenance</h2>
<p>Le Bailleur garantit le bon fonctionnement pendant <strong>2 mois</strong>. Au-delà, l'entretien est à la charge du Locataire.</p>
<p>Un forfait de maintenance optionnel est disponible : <strong>70 € TTC / vitrine / mois</strong>.</p>
${c.maintenance_forfait ? '<p><strong>Le Locataire a souscrit au forfait de maintenance.</strong></p>' : ''}</div>

<div class="section"><h2>Article 7 – Obligations du Locataire</h2>
<ul class="contract-list">
  <li>Utiliser les vitrines conformément à leur usage prévu.</li>
  <li>Maintenir les équipements en bon état de fonctionnement.</li>
  <li>Ne pas sous-louer sans l'accord écrit du Bailleur.</li>
  <li>Restituer les vitrines en bon état à la fin du contrat.</li>
</ul></div>

<div class="section"><h2>Article 8 – État des lieux</h2>
<p>Un état des lieux contradictoire sera établi lors de la mise à disposition et à la restitution des vitrines réfrigérées.</p></div>

<div class="section"><h2>Article 9 – Assurance</h2>
<p>Le Locataire s'engage à souscrire une assurance couvrant les risques liés à l'utilisation des vitrines réfrigérées.</p></div>

<div class="section"><h2>Article 9 bis – Non-restitution</h2>
<p>En cas de non-restitution, le Locataire sera redevable d'une indemnité de <strong>5% du prix d'achat neuf par semaine de retard</strong>.</p></div>

${c.hors_idf ? `<div class="section"><h2>Article 10 – Exploitation hors Île-de-France</h2>
<ul class="contract-list"><li>Dépôt de garantie augmenté à <strong>2 200 € / vitrine</strong>.</li><li>Deux premiers mois de loyer payés d'avance.</li></ul></div>` : ''}

<div class="section"><h2>Article ${c.hors_idf ? '11' : '10'} – Résiliation du contrat</h2>
<p>Le Bailleur pourra résilier le contrat en cas de non-paiement après <strong>20 jours</strong> de mise en demeure.</p></div>

${c.option_achat_prix ? `<div class="section"><h2>Option d'achat</h2><p>Prix de rachat : <strong>${eur(c.option_achat_prix)} / vitrine</strong>.</p></div>` : ''}

<div class="section"><h2>Loi applicable</h2>
<p>Le présent contrat est régi par la loi française. Compétence : tribunaux de <strong>${esc(coVille)}</strong>.</p></div>

${c.conditions ? `<div class="section"><h2>Conditions particulières</h2><p>${esc(c.conditions)}</p></div>` : ''}

<p style="font-size:9pt;text-align:center;margin:1.5em 0"><strong>Fait en deux exemplaires, à __________, le __________</strong></p>
<div class="signatures">
  <div class="sig-box"><h4>Signature du Bailleur</h4><p>${esc(co)}</p><p><br><br>Signature :</p></div>
  <div class="sig-box"><h4>Signature du Locataire</h4><p>${esc(c.client_nom || c.client)}</p><p>Lu et approuvé :<br><br>Signature :</p></div>
</div>

<div style="page-break-before:always"></div>
<h2 style="font-size:13pt;font-weight:bold;text-align:center;margin:1em 0;border-bottom:2px solid #1e3a5f;padding-bottom:0.5em">ANNEXE 1 – BARÈME DE MAINTENANCE</h2>
<div class="section"><h2>Forfait mensuel : 70 € TTC / vitrine / mois</h2>
<ul class="contract-list"><li>1 visite préventive / trimestre</li><li>Vérification technique complète</li><li>Nettoyage technique et réglages</li><li>Main-d'œuvre réparations courantes</li><li>Pièces d'usure courante</li></ul></div>
<div class="section"><h2>Tarifs hors forfait</h2>
<ul class="contract-list"><li>Déplacement + diagnostic : 60 € TTC</li><li>Main-d'œuvre : 90 € TTC / heure</li><li>Pièces : prix fournisseur + 15%</li><li>Urgence (sous 24h) : + 60 € TTC</li></ul></div>

<div style="page-break-before:always"></div>
<h2 style="font-size:13pt;font-weight:bold;text-align:center;margin:1em 0;border-bottom:2px solid #1e3a5f;padding-bottom:0.5em">ANNEXE 2 – PRIX PAR ÉLÉMENT DÉTÉRIORÉ</h2>
<table>
  <tr><th>Élément</th><th style="text-align:right">Tarif TTC</th></tr>
  <tr><td>Une vitre</td><td style="text-align:right">300 €</td></tr>
  <tr><td>Un plexiglas</td><td style="text-align:right">90 €</td></tr>
  <tr><td>Une roue</td><td style="text-align:right">30 €</td></tr>
  <tr><td>Un plateau</td><td style="text-align:right">150 €</td></tr>
  <tr><td>Un pied</td><td style="text-align:right">80 €</td></tr>
  <tr><td>Un câblage</td><td style="text-align:right">20 €</td></tr>
  <tr><td>Un luminaire</td><td style="text-align:right">30 €</td></tr>
</table>`;

  htmlPdf(`Contrat de location – ${c.client_nom || c.client}`, body);
}

function printFacturePdf(f: any, settings: Record<string, string>) {
  const tplFacture = settings['template_facture_html'];
  if (tplFacture) {
    const vars: Record<string, string> = {
      numero: f.numero || '', client: f.client || '', adresse_client: f.adresse_client || '',
      tel_client: f.tel_client || '', periode: f.periode ? fmtMonth(f.periode) : '',
      montant: eur(f.montant), tva: String(f.tva || settings.tva || 0),
      date_emission: fmtDate(f.date_emission || new Date().toISOString().slice(0, 10)),
      marque: f.marque || '', modele: f.modele || f.vitrine_model || '',
      serial_vitrine: f.serial_vitrine || f.vitrine_serial || '',
      company_nom: settings.company_nom || settings.nom?.replace(/"/g, '') || 'OB LOCATION',
      company_adresse: settings.company_adresse || settings.adresse?.replace(/"/g, '') || '',
      company_siret: settings.company_siret || settings.siret?.replace(/"/g, '') || '',
      company_tel: settings.company_tel || settings.tel?.replace(/"/g, '') || '',
      company_email: settings.company_email || settings.email?.replace(/"/g, '') || '',
      company_iban: settings.company_iban || '', company_bic: settings.company_bic || '',
    };
    htmlPdfFull(`Facture ${f.numero} – ${f.client}`, applyTemplate(tplFacture, vars));
    return;
  }
  const co = settings.company_nom || settings.nom?.replace(/"/g, '') || 'OB LOCATION';
  const coAdr = settings.company_adresse || settings.adresse?.replace(/"/g, '') || '';
  const coSiret = settings.company_siret || settings.siret?.replace(/"/g, '') || '';
  const coTel = settings.company_tel || settings.tel?.replace(/"/g, '') || '';
  const coEmail = settings.company_email || settings.email?.replace(/"/g, '') || '';
  const iban = settings.company_iban || '';
  const bic = settings.company_bic || '';
  const tvaExonere = settings.company_tva_exonere === '1';
  const tvaRate = Number(settings.tva) || 0;
  const ht = Number(f.montant) || 0;
  const tvaAmt = ht * tvaRate / 100;
  const ttc = ht + tvaAmt;

  const body = `
<div class="header">
  <div class="company"><h1>${esc(co)}</h1><p>${esc(coAdr)}</p><p>SIRET : ${esc(coSiret)}</p><p>Tél : ${esc(coTel)} · ${esc(coEmail)}</p></div>
  <div class="doc-info"><div class="doc-type">FACTURE</div><p><strong>N° :</strong> ${esc(f.numero || f.id)}</p><p><strong>Date :</strong> ${fmtDate(f.date_emission || new Date().toISOString().slice(0, 10))}</p></div>
</div>
<div class="parties">
  <div><h3>Émetteur</h3><p><strong>${esc(co)}</strong></p><p>${esc(coAdr)}</p><p>SIRET : ${esc(coSiret)}</p></div>
  <div><h3>Facturer à</h3><p><strong>${esc(f.client)}</strong></p><p>${esc(f.adresse_client || '')}</p><p>Tél : ${esc(f.tel_client || '')}</p></div>
</div>
<table>
  <tr><th>Désignation</th><th>Marque / Modèle</th><th>N° Série</th><th>Période</th><th>Montant HT</th></tr>
  <tr><td>Location vitrine réfrigérée</td><td>${esc(f.marque || '')} ${esc(f.modele || f.vitrine_model || '')}</td><td>${esc(f.serial_vitrine || f.vitrine_serial || '')}</td><td>${f.periode ? esc(fmtMonth(f.periode)) : ''}</td><td>${eur(ht)}</td></tr>
</table>
<table style="max-width:300px;margin-left:auto">
  <tr><td>Total HT</td><td style="text-align:right">${eur(ht)}</td></tr>
  ${tvaExonere
    ? '<tr><td colspan="2" style="font-size:8.5pt;color:#555">TVA non applicable – Art. 293B du CGI</td></tr><tr class="total-row"><td>Total TTC</td><td style="text-align:right">' + eur(ht) + '</td></tr>'
    : tvaRate ? '<tr><td>TVA (' + tvaRate + '%)</td><td style="text-align:right">' + eur(tvaAmt) + '</td></tr><tr class="total-row"><td>Total TTC</td><td style="text-align:right">' + eur(ttc) + '</td></tr>' : '<tr class="total-row"><td>Total</td><td style="text-align:right">' + eur(ht) + '</td></tr>'
  }
</table>
${iban ? `<div class="section"><h2>Règlement</h2><p>IBAN : <strong>${esc(iban)}</strong> · BIC : <strong>${esc(bic)}</strong></p></div>` : ''}
<div style="margin-top:2em;border-top:1px solid #ddd;padding-top:1em">
  <p style="font-size:9pt;font-weight:bold;margin-bottom:0.4em">Mentions légales</p>
  <p style="font-size:8.5pt;color:#555">La vitrine louée reste la propriété exclusive de ${esc(co)}.</p>
  <p style="font-size:8.5pt;color:#555">Tout retard de paiement prolongé entraînera des frais de recouvrement.</p>
  <p style="font-size:8.5pt;color:#555;text-align:center;margin-top:0.5em">Facture payable à réception${tvaExonere ? ' · TVA non applicable – Art. 293B du CGI' : ''}</p>
</div>`;

  htmlPdf(`Facture ${f.numero || f.id} – ${f.client}`, body);
}

/* ── Component ── */

export default function Contrats() {
  const { data, loading, error, reload, setError } = useList('/contrats');
  const vit = useList('/vitrines');
  const cli = useList('/clients');
  const [edit, setEdit] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [factureFor, setFactureFor] = useState<any | null>(null);
  const [factures, setFactures] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const { save, saving, error: saveErr } = useSave('/contrats', () => { setEdit(null); setDetail(null); reload(); });

  useEffect(() => {
    api.get('/settings').then((r: any) => {
      if (typeof r === 'object' && !Array.isArray(r)) setSettings(r);
      else if (Array.isArray(r)) {
        const o: Record<string, string> = {};
        r.forEach((s: any) => (o[s.cle ?? s.key] = s.valeur ?? s.value ?? ''));
        setSettings(o);
      }
    }).catch(() => {});
  }, []);

  const client = (c: any) => c.client_nom || c.client || '—';
  const vitrine = (c: any) => {
    const v = vit.data.find((x: any) => x.id === c.vitrine_id);
    return v ? `${v.serial} — ${v.model}` : c.vitrine_nom || (c.vitrine_id ? `Vitrine #${c.vitrine_id}` : '—');
  };

  const openFacture = async (c: any) => {
    setFactureFor(c);
    try { setFactures(await api.get(`/factures?contrat_id=${c.id}`)); } catch { setFactures([]); }
  };
  const toggleFactureStatus = async (f: any) => {
    const endpoint = f.statut === 'payee' ? `/factures/${f.id}/impayee` : `/factures/${f.id}/payer`;
    await api.put(endpoint, {});
    if (factureFor) openFacture(factureFor);
  };

  const remove = async (c: any) => {
    if (!window.confirm('Supprimer ce contrat ?')) return;
    try { await api.delete(`/contrats/${c.id}`); setDetail(null); reload(); } catch (e: any) { setError(e.message); }
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const date_debut = f.get('date_debut') as string || null;
    const date_fin = f.get('date_fin') as string || null;
    let duree = num(String(f.get('duree')));
    if (date_debut && date_fin && !duree) {
      const d1 = new Date(date_debut), d2 = new Date(date_fin);
      duree = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    }
    save(edit.id, {
      client: f.get('client'), vitrine_id: num(String(f.get('vitrine_id') || '')), duree,
      montant: num(String(f.get('montant'))), caution: num(String(f.get('caution'))), conditions: f.get('conditions'),
      date_debut, date_fin, qui: f.get('qui') || null,
    });
  };

  return (
    <div>
      <PageHeader title="Contrats" action={<button className={btnPrimary} onClick={() => setEdit({})}>+ Nouveau contrat</button>} />
      <Status loading={loading} error={error} />
      {!loading && data.length === 0 && !error && <p className="text-slate-500">Aucun contrat.</p>}
      {data.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>{['Client', 'Vitrine', 'Début', 'Fin', 'Mensuel', 'Caution', 'Associé', ''].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetail(c)}>
                  <td className="px-3 py-2 font-medium">{client(c)}</td>
                  <td className="px-3 py-2">{vitrine(c)}</td>
                  <td className="px-3 py-2">{c.date_debut || '—'}</td>
                  <td className="px-3 py-2">{c.date_fin || '—'}</td>
                  <td className="px-3 py-2">{eur(c.montant)}</td>
                  <td className="px-3 py-2">{eur(c.caution)}</td>
                  <td className="px-3 py-2">{c.qui || '—'}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <button className={btnGhost} onClick={() => exportContratPdf(c, settings)}>Contrat PDF</button>{' '}
                    <button className={btnGhost} onClick={() => openFacture(c)}>Factures</button>{' '}
                    <button className={btnGhost} onClick={() => setEdit(c)}>Modifier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detail && !edit && (
        <Modal title={`Contrat — ${client(detail)}`} onClose={() => setDetail(null)}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Client</dt><dd>{client(detail)}</dd>
            <dt className="text-slate-500">Vitrine</dt><dd>{vitrine(detail)}</dd>
            <dt className="text-slate-500">Début</dt><dd>{detail.date_debut || '—'}</dd>
            <dt className="text-slate-500">Fin</dt><dd>{detail.date_fin || '—'}</dd>
            <dt className="text-slate-500">Durée</dt><dd>{detail.duree != null ? `${detail.duree} mois` : '—'}</dd>
            <dt className="text-slate-500">Montant mensuel</dt><dd>{eur(detail.montant)}</dd>
            <dt className="text-slate-500">Caution</dt><dd>{eur(detail.caution)}</dd>
            <dt className="text-slate-500 col-span-2">Conditions</dt>
            <dd className="col-span-2 whitespace-pre-wrap">{detail.conditions || '—'}</dd>
          </dl>
          <div className="flex justify-end gap-2 mt-5">
            <button className={btnDanger} onClick={() => remove(detail)}>Supprimer</button>
            <button className={btnGhost} onClick={() => exportContratPdf(detail, settings)}>Contrat PDF</button>
            <button className={btnSecondary} onClick={() => { setDetail(null); openFacture(detail); }}>Voir factures</button>
            <button className={btnPrimary} onClick={() => setEdit(detail)}>Modifier</button>
          </div>
        </Modal>
      )}
      {edit && (
        <Modal title={edit.id ? 'Modifier le contrat' : 'Nouveau contrat'} onClose={() => setEdit(null)}>
          <form onSubmit={submit}>
            <Field label="Client">
              <input name="client" required defaultValue={edit.client ?? edit.client_nom ?? ''} className={inputCls} list="client-list" placeholder="Saisir ou choisir un client" />
              <datalist id="client-list">{cli.data.map((c: any) => <option key={c.id} value={c.nom} />)}</datalist>
            </Field>
            <Field label="Vitrine">
              <select name="vitrine_id" defaultValue={edit.vitrine_id ?? ''} className={inputCls}>
                <option value="">—</option>
                {vit.data.map((x: any) => <option key={x.id} value={x.id}>{x.nom || x.serial || x.model || `#${x.id}`}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date début *"><input name="date_debut" type="date" required defaultValue={edit.date_debut ?? ''} className={inputCls} /></Field>
              <Field label="Date fin *"><input name="date_fin" type="date" required defaultValue={edit.date_fin ?? ''} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Durée (mois)"><input name="duree" type="number" min={0} defaultValue={edit.duree ?? ''} className={inputCls} placeholder="Auto si dates" /></Field>
              <Field label="Montant mensuel (€)"><input name="montant" type="number" step="any" defaultValue={edit.montant ?? ''} className={inputCls} /></Field>
              <Field label="Caution (€)"><input name="caution" type="number" step="any" defaultValue={edit.caution ?? ''} className={inputCls} /></Field>
            </div>
            <Field label="Associé (trésorerie)">
              <select name="qui" defaultValue={edit.qui ?? ''} className={inputCls}>
                <option value="">— Non assigné —</option>
                <option value="Bilel">Bilel</option>
                <option value="Oussama">Oussama</option>
              </select>
            </Field>
            <Field label="Conditions"><textarea name="conditions" rows={3} defaultValue={edit.conditions ?? ''} className={inputCls} /></Field>
            <FormActions saving={saving} error={saveErr} onCancel={() => setEdit(null)} />
          </form>
        </Modal>
      )}
      {factureFor && (
        <Modal title={`Factures — ${client(factureFor)}`} onClose={() => setFactureFor(null)}>
          {factures.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune facture générée pour ce contrat.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {factures.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{f.periode ? fmtMonth(f.periode) : fmtDate(f.date_emission)}</span>
                    <span className="ml-2 text-slate-500">{eur(f.montant)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${f.statut === 'payee' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {f.statut === 'payee' ? 'Payée' : 'En attente'}
                    </span>
                    <button className={btnGhost} onClick={() => toggleFactureStatus(f)}>{f.statut === 'payee' ? 'Marquer impayée' : 'Marquer payée'}</button>
                    <button className={btnGhost} onClick={() => printFacturePdf(f, settings)}>PDF</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
            <p className="text-sm text-slate-600">{factures.length} facture(s) · Total : <strong>{eur(factures.reduce((s: number, f: any) => s + (Number(f.montant) || 0), 0))}</strong></p>
            <button className={btnSecondary} onClick={() => setFactureFor(null)}>Fermer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

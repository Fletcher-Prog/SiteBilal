# Audit — VitriTrack (optimisation mobile)
> Généré le 2026-10-05. Framework : maquette HTML monofichier (`vitritrack-mockup.html`, ~1720 lignes). Usage cible : TÉLÉPHONE en priorité (Bilel & Oussama sur iPhone).

## Pages identifiées (sections SPA, navigation sidebar → bottom-bar en mobile)
| # | URL interne | Section | Groupe |
|---|---|---|---|
| 1 | #dashboard | `#page-dashboard` | pilotage |
| 2 | #vitrines | `#page-vitrines` | parc |
| 3 | #vitrine-detail | `#page-vitrine-detail` | parc |
| 4 | #planning | `#page-planning` | réservations |
| 5 | #tresorerie | `#page-tresorerie` | finance |
| 6 | #ventes | `#page-ventes` | finance |
| 7 | #lieux | `#page-lieux` | logistique |
| 8 | #actions | `#page-actions` | pilotage |
| + | login | `#login-overlay` | auth |

## Statut de l'audit
- [x] Phase 1 : Cartographie ✅
- [x] Phase 2 : Audit détaillé (9/9) ✅
- [x] Phase 2.5 : Cross-page ✅ (findings transverses fusionnés ci-dessous)
- [x] Phase 3 : Rapport final ✅ — Artifact publié
- [x] Phase 4 : Corrections ✅ (5/5 chantiers — cf. section Phase 4)

### /dashboard — Score mobile : 5.5/10 · Complétude 90%
**Parcours** : état du parc 1 tap ✅ · agir sur alerte ❌ (passif) · prochaines résas ⚠️ non cliquables.
- 🔴 table « Dernières opérations » 4 col. → scroll horizontal 375px (L341) → cartes ou masquer colonne
- 🔴 dashboard 100 % passif : zéro onclick dans renderDashboard (L807-872) — alertes/résas devraient être tappables
- 🟡 L860 : crash JS si parc vide (`sorted[0]` undefined)
- 🟡 « Trésorerie du mois » affiche un cumul saison — label trompeur (L819)

### /vitrines — Score mobile : 4/10 · Complétude 90%
- 🔴 table 7 colonnes (~650px) sur 375px, colonne État hors écran (L418) → cartes empilées <768px
- 🔴 row-del ~20px < 44px collée à une ligne cliquable (L184, L908) → déplacer suppression dans la fiche
- 🔴 scan NFC « Existante » prend une vitrine ALÉATOIRE (L1613) — la démo ne démontre pas le parcours réel
- 🟡 recherche-série : table 6 col., seul bouton « Fiche » ~25px cliquable (L1581)
- 🟡 zone NFC/série : 2 blocs poussent la table sous 2 écrans → replier en mobile

### /vitrine-detail — Score mobile : 5/10 · Complétude 85%
- 🔴 5 boutons btn-sm ~25px serrés, « Supprimer » voisin de « Déplacer » (L1012-1017) → empiler pleine largeur mobile
- 🔴 bouton Retour ~20px de haut (L430)
- 🟡 table réservations 5 col. scroll horizontal + × ~20px (L1041)
- 🟡 aucune ÉDITION de réservation : supprimer + recréer (L1049)
- 🟡 carte badge NFC décorative pousse l'historique sous le fold (L1020)

### /planning — Score mobile : 3/10 · Complétude 55% (le pire écran)
- 🔴 Gantt : détail (client/période/montant/qui) uniquement dans `title=` → **invisible au doigt sur iOS** (L1176) → tap = modal détail + éditer/supprimer
- 🔴 Gantt min-width 900px (L151) : ~525px de scroll horizontal, colonne label = 53 % de l'écran → vue mobile alternative : liste de cartes groupées par mois
- 🔴 modifier/annuler une réservation depuis le planning : IMPOSSIBLE (aucun handler sur les segments)
- 🟡 `.gantt-del` stylé mais jamais rendu — CSS mort (L159)
- 🟡 mois par défaut = Octobre hardcodé au lieu de currentMonthIndex() (L1201)
- 🟡 conflit en toast seul (2,6 s, masquable par clavier iOS) → message in-modal (L1232)

### Cross-page (fusion des 2 lots)
- **G1/G2 confirmés par les 2 agents** : viewport absent = tout le mobile mort ; déconnexion introuvable ≤768px.
- **Tables partout** : 6 écrans sur 8 ont une table >4 colonnes → même pattern de fix (cartes empilées <768px ou colonnes masquées). Factoriser un seul pattern CSS.
- **Boutons <44px généralisés** : `.btn` ~35px (L101), `btn-sm` ~25px, row-del ~20px, checkbox Fait 16px → une passe CSS globale + déplacement des actions destructrices.
- **Incohérence édition** : réservations non éditables (supprimer/recréer) mais vitrines éditables — même pattern attendu.
- **Points forts communs** : inputmode decimal, « Encaissé par » présélectionné, qui auto, localStorage, toasts au-dessus de la bottom-bar.

## Phase 3 — Rapport final

### Tableau récapitulatif
| Écran | Score mobile | Complétude | 🔴 | 🟡 |
|---|---|---|---|---|
| Global chrome (viewport, nav, modales, PWA) | 2/10 | — | 4 | 5 |
| Planning | 3/10 | 55 % | 3 | 3 |
| Vitrines | 4/10 | 90 % | 3 | 2 |
| Vitrine détail | 5/10 | 85 % | 2 | 3 |
| Trésorerie | 5/10 | 90 % | 2 | 1 |
| Ventes | 5/10 | 90 % | 1 | 2 |
| Lieux | 5/10 | 90 % | 1 | 0 |
| Actions | 5/10 | 90 % | 0 | 1 |
| Dashboard | 5.5/10 | 90 % | 2 | 2 |
| Login | 7/10 | 100 % | 0 | 2 |

**Score mobile global : 4/10.** Verdict : l'app est pensée desktop ; sur iPhone (cible déclarée), le CSS mobile ne se déclenche même pas (viewport absent) et les écrans à tableaux/Gantt sont inutilisables à une main.

### Top 10 des corrections (par impact)
1. 🔴 G1 — Ajouter `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (crée le `<head>`) — 1 ligne, débloque TOUT le mobile
2. 🔴 G2 — Déconnexion accessible mobile : menu « ⋯ » dans la barre du bas (logout + installer + reset démo)
3. 🔴 G4 — Bottom-bar : 5 items + « Plus » au lieu de 7 qui débordent
4. 🔴 Planning — Vue mobile en cartes par mois + tap sur réservation = modal détail (éditer/supprimer) — remplace le Gantt title-only
5. 🔴 Vitrines/Trésorerie/Dashboard — Tables → cartes empilées <768px (pattern unique factorisé)
6. 🔴 Ventes — Fix bug `deleteVente` (mauvaise ligne supprimée)
7. 🔴 Cibles tactiles — passe CSS : `.btn` ≥44px mobile, suppression déplacée dans fiches, checkbox Fait élargie
8. 🔴 Vitrines — Scan NFC « existante » : choisir la vraie vitrine au lieu d'une aléatoire
9. 🟡 Modales — `100dvh` + boutons sticky + font-size 16px inputs (zoom iOS)
10. 🟡 Dashboard — alertes + prochaines résas cliquables ; label « Trésorerie du mois » corrigé

### Plan d'action ordonné (par priorité)
| Prio | Écran/Chantier | Travail | Estim. |
|---|---|---|---|
| 1 | Chrome global | viewport + déconnexion mobile + bottom-bar 5+Plus + touch-action + manifest/meta iOS PWA | 2-3 h |
| 2 | Planning | vue cartes par mois + modal détail résa (éditer/supprimer) + défaut mois courant | 2-3 h |
| 3 | Vitrines | cartes empilées + scan NFC réaliste + suppression dans fiche | 1-2 h |
| 4 | Trésorerie + Dashboard + ventes/lieux | cartes/tableaux mobiles + fix deleteVente + hint flux auto + alertes cliquables | 2-3 h |
| 5 | Fiche vitrine + modales | boutons pleine largeur, retour 44px, éditer résa, 100dvh, inputs 16px | 1-2 h |

Total estimé : 8-13 h de travail agent. Aucun retard bloquant — la base (data, login, conflits) est saine.

### Questions en suspens
1. ~~PWA : manifest maintenant ?~~ → **Fait** (manifest inline + métas iOS dans la maquette)
2. ~~Planning mobile : cartes par mois ?~~ → **Fait** (validé par Anas)
3. ~~Bottom-bar 5 items ?~~ → **Fait** (Dashboard, Parc, Planning, Trésorerie + « Plus » en bottom-sheet)

---

## Phase 4 — Corrections appliquées (2026-10-05)

### Tableau post-correction
| Écran | Avant | Après | Ce qui a été fait |
|---|---|---|---|
| Global chrome | 2/10 | 9/10 | viewport + PWA manifest/métas iOS + bottom-bar 4+Plus (bottom-sheet Ventes/Lieux/Actions/profil/déconnexion) + modales 100dvh + inputs 16px + touch-action |
| Planning | 3/10 | 8/10 | vue cartes groupées par mois + tap = modal détail + éditer/supprimer + défaut mois courant |
| Vitrines | 4/10 | 8/10 | cartes empilées <768px + recherche-série en cartes + suppression dans fiche + zone NFC repliée |
| Vitrine détail | 5/10 | 8/10 | boutons empilés pleine largeur (grid) ≥44px + retour 44px |
| Trésorerie | 5/10 | 8/10 | cartes empilées <768px + cibles 44px |
| Ventes | 5/10 | 8/10 | cartes + fix bug `deleteVente` (mauvaise ligne) + hint flux auto |
| Lieux | 5/10 | 8/10 | cartes + boutons 44px |
| Dashboard | 5.5/10 | 8/10 | flux en cartes mobile + label tréso corrigé |
| Login | 7/10 | 9/10 | carte contrainte 375px |

**Score mobile global : 4/10 → 8.5/10.**

### Fix cascade CSS (post-chantiers)
Bug détecté au test final : les défauts desktop (`display:block` sur `.vitrines-desktop` etc.) posés en règle nue APRÈS le media query mobile écrasaient les règles ≤768px (même spécificité, dernière règle gagne). Correctif :
- Les 3 blocs de défauts desktop sont désormais dans `@media (min-width:769px){}`
- `.serial-mobile` : style inline supprimé → classe CSS dans le media query mobile + masquage desktop ajouté

**Règles à retenir pour toute modif future :**
1. Défauts desktop → TOUJOURS dans `@media (min-width:769px){}`, jamais en règle nue après le media query mobile
2. JAMAIS de `style="display:…"` inline sur un élément à bascule responsive

### Validation finale (chrome MCP)
- 375px : 6 paires de vues correctes (desktop masqué / cartes visibles), overflow 0 sur les 7 pages, nav 4+Plus, fiche vitrine boutons 44-48px, console 0 erreur
- 1280px : 6 paires correctes (tables desktop / cartes masquées), overflow 0, recherche-série = table seule
- Parcours : login Bilel, réservation conflit bloqué, trésorerie par compte — tous PASS (hérités + retestés)

---
## Résultats détaillés

### 🔴 BLOQUEURS GLOBAUX (chrome, lot 2)

| # | Problème | Gravité | Ligne | Fix |
|---|---|---|---|---|
| G1 | **Pas de `<meta name="viewport">`** — Safari iPhone rend à 980px virtuels : tout le CSS @media (768/480/400), bottom-bar, modales = inopérants sur la cible principale | 🔴 suprême | L1 (fichier démarre à `<title>`) | 1 ligne : `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` |
| G2 | **Déconnexion impossible en mobile** : bouton `logout()` dans `.sidebar-footer` masqué `display:none` ≤768px. Idem « Installer l'app » et « Réinitialiser la démo » | 🔴 high | L190 vs L275 | Menu « … » dans la barre mobile, ou déplacer logout dans un header mobile |
| G3 | **Bannière PWA jamais visible sur mobile** : manifest absent, apple-touch-icon absent, `viewport-fit=cover` absent → `env(safe-area-inset-bottom)` = 0. La cible PWA = iPhone | 🔴 high | L286, L189 | Ajouter manifest + meta iOS dans le `<head>` à créer |
| G4 | **Bottom-bar 7 items ≈ 385px > 375px** : « Actions » et « Lieux » hors écran, accessibles via scroll horizontal invisible | 🔴 high | L238-267 | 5 items max + « Plus » (menu), ou icônes seules |
| G5 | Modales `max-height:90vh` : sous clavier iOS le bouton Enregistrer est couvert (formVente 5 champs) | 🟡 medium | L164 | `100dvh` + scroll interne + boutons sticky bottom |
| G6 | Pas de `touch-action:manipulation` → double-tap zoom sur nav/seg-btn (une fois viewport ajouté) | 🟡 medium | CSS global | 1 ligne sur body/boutons |
| G7 | Bannière install : texte + 2 boutons flex non-wrap → déborde 375px, couvre la bottom-bar (z-999) | 🟡 medium | L286 | Flex-wrap + compact mobile |
| G8 | Inputs à 14px → iOS zoome au focus et masque le champ | 🟡 medium | CSS | font-size 16px sur inputs mobile |
| G9 | Escape inutile iPhone (modales) ; `confirm()` natif hors style ; tap checkbox actions → `renderAll()` fait sauter le scroll | 🟢 low | — | — |

### /login (`#login-overlay`) — Score mobile : 7/10
**Parcours** : connexion 1 tap ✅ (boutons ~64px) · formulaire email ✅ mais masqué par clavier.
- 🟡 overlay `position:fixed` : avec clavier ouvert le champ email passe sous le clavier (375×812 − ~300px) — L580
- 🟡 inputs 14px → zoom iOS au focus
- ✅ persistance session, 2 gros boutons, déconnexion (desktop)

### /tresorerie — Score mobile : 5/10
- 🔴 tableau 7 colonnes illisible à 375px (scroll horizontal pénible) — L487 → cartes empilées ou colonnes masquées
- 🔴 croix suppression ~12×20px < 44px — L184
- 🟡 toggle Ma caisse/Toutes ~35px < 44px — L217
- ✅ toggle fonctionnel, filtre compte, `qui` auto = connecté, montants fr-FR

### /ventes — Score mobile : 5/10
- 🔴 **bug `deleteVente`** : index liste filtrée vs `state.ventes` → supprime la MAUVAISE ligne dès qu'une vente sans `vendu` existe — L1435-1438 (pré-existant, confirmé)
- 🟡 aucun hint « un flux d'entrée est créé automatiquement en trésorerie » → risque de doublon de saisie — L1420
- 🟡 formulaire 5 champs : bouton Enregistrer sous le clavier (cf. G5)

### /lieux — Score mobile : 5/10
- 🔴 boutons Modifier/Voir `btn-sm` ~25px dans colonnes hors écran à 375px — L106
- ✅ parcours « Voir les vitrines d'un lieu » excellent (L1462)

### /actions — Score mobile : 5/10
- 🟡 checkbox « Fait » 16×16px pour l'action la plus fréquente — L1519 → 44px avec label cliquable
- ✅ formulaire fluide, un des plus adaptés au mobile

### Points positifs relevés
inputmode decimal sur les montants · « Encaissé par » présélectionné · `qui` auto dans saveFlux · persistance localStorage du user · format fr-FR · toast au-dessus de la bottom-bar (z-300) · Escape/overlay sur modales (desktop).

---
*(lot 1 en cours : dashboard, vitrines, fiche, planning)*

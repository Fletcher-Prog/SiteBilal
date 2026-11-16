export const PERMISSIONS: { key: string; label: string; path: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord', path: '/' },
  { key: 'vitrines', label: 'Parc vitrines', path: '/vitrines' },
  { key: 'planning', label: 'Planning', path: '/planning' },
  { key: 'contrats', label: 'Contrats & Factures', path: '/contrats' },
  { key: 'tresorerie', label: 'Trésorerie', path: '/tresorerie' },
  { key: 'ventes', label: 'Vendre des vitrines', path: '/vitrines' },
  { key: 'lieux', label: 'Lieux de stockage', path: '/lieux' },
  { key: 'actions', label: 'Actions', path: '/actions' },
  { key: 'parametres', label: 'Paramètres (entreprise, templates)', path: '/parametres' },
  { key: 'comptes', label: 'Gestion des comptes', path: '/parametres' },
];

export const hasPerm = (user: any, perm: string) =>
  !!user && (user.role === 'admin' || (Array.isArray(user.permissions) && user.permissions.includes(perm)));

export const canSeeParametres = (user: any) => hasPerm(user, 'parametres') || hasPerm(user, 'comptes');

export const firstAllowedPath = (user: any) => PERMISSIONS.find((p) => hasPerm(user, p.key))?.path ?? null;

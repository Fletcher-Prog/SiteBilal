import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const SECRET = process.env.JWT_SECRET || 'vitritrack-secret';

export const PERMISSIONS = ['dashboard', 'vitrines', 'planning', 'contrats', 'tresorerie', 'ventes', 'lieux', 'actions', 'parametres', 'comptes'] as const;

export function cleanPermissions(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  return [...new Set(input.filter((p): p is string => typeof p === 'string' && (PERMISSIONS as readonly string[]).includes(p)))];
}

export function permissionsOf(u: any): string[] {
  if (u?.role === 'admin') return [...PERMISSIONS];
  try { return cleanPermissions(JSON.parse(u?.permissions || '[]')) || []; } catch { return []; }
}

export function publicUser(u: any) {
  return { id: u.id, name: u.name, email: u.email ?? '', role: u.role, active: u.active ?? 1, permissions: permissionsOf(u) };
}

type Rule = { read: string[] | '*'; write: string[] };
// Un accès en lecture '*' = tout utilisateur connecté (données de référence utilisées par plusieurs écrans).
const RULES: Record<string, Rule> = {
  vitrines: { read: '*', write: ['vitrines'] },
  interventions: { read: '*', write: ['vitrines'] },
  frigoristes: { read: '*', write: ['vitrines'] },
  lieux: { read: '*', write: ['lieux'] },
  bookings: { read: '*', write: ['planning', 'dashboard'] },
  clients: { read: '*', write: ['contrats'] },
  settings: { read: '*', write: ['parametres'] },
  contrats: { read: ['contrats', 'planning'], write: ['contrats'] },
  factures: { read: ['contrats', 'planning', 'dashboard'], write: ['contrats', 'dashboard'] },
  'devis-location': { read: ['contrats', 'vitrines'], write: ['contrats', 'vitrines'] },
  prospection: { read: ['contrats'], write: ['contrats'] },
  flux: { read: ['tresorerie'], write: ['tresorerie'] },
  ventes: { read: ['ventes'], write: ['ventes'] },
  actions: { read: ['actions'], write: ['actions'] },
  dashboard: { read: ['dashboard'], write: ['dashboard'] },
};

const PUBLIC = new Set(['/auth/login', '/health']);

export function authGuard(db: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (PUBLIC.has(req.path)) return next();
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
    if (!token) return res.status(401).json({ error: 'Authentification requise' });
    let payload: any;
    try { payload = jwt.verify(token, SECRET); } catch { return res.status(401).json({ error: 'Session expirée, reconnectez-vous' }); }
    const user = db.prepare('SELECT id, name, email, role, active, permissions FROM users WHERE name = ?').get(payload?.name);
    if (!user || user.active === 0) return res.status(401).json({ error: 'Compte introuvable ou désactivé' });
    const perms = permissionsOf(user);
    (req as any).user = { ...user, perms };

    const seg = req.path.split('/')[1] || '';
    if (seg === 'auth') {
      if (req.path.startsWith('/auth/users') && !perms.includes('comptes')) return res.status(403).json({ error: 'Accès refusé : gestion des comptes' });
      return next();
    }
    const rule = RULES[seg];
    if (!rule) return next();
    const need = req.method === 'GET' ? rule.read : rule.write;
    if (need === '*' || need.some((p) => perms.includes(p))) return next();
    res.status(403).json({ error: 'Accès refusé' });
  };
}

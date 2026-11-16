import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { SECRET, cleanPermissions, permissionsOf, publicUser } from '../auth.js';

export default function(db: any) {
  const router = Router();
  const getUser = (id: any) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const activeAdmins = () => db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active != 0").get().n as number;

  // Un non-admin (avec la permission « comptes ») ne peut ni toucher un admin, ni créer un admin, ni donner des droits qu'il n'a pas.
  const escalation = (actor: any, targetRole: string, perms: string[] | null, target?: any) => {
    if (actor.role === 'admin') return null;
    if (target?.role === 'admin') return 'Seul un administrateur peut modifier un administrateur';
    if (targetRole === 'admin') return 'Seul un administrateur peut créer un administrateur';
    if (perms && perms.some((p) => !actor.perms.includes(p))) return 'Vous ne pouvez pas donner un accès que vous n\'avez pas';
    return null;
  };

  router.post('/login', (req, res) => {
    const { name, password } = req.body || {};
    if (!name || !password) return res.status(400).json({ error: 'name et password requis' });
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
    if (!user || user.password !== password) return res.status(401).json({ error: 'Identifiants invalides' });
    if (user.active === 0) return res.status(403).json({ error: 'Compte désactivé' });
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: publicUser(user) });
  });

  router.get('/users', (_req, res) => {
    res.json(db.prepare('SELECT id, name, email, role, active, permissions FROM users ORDER BY id').all().map(publicUser));
  });

  router.post('/users', (req, res) => {
    const actor = (req as any).user;
    const { name, email, password } = req.body || {};
    if (!name || !password) return res.status(400).json({ error: 'Nom et mot de passe requis' });
    const role = req.body.role === 'user' ? 'user' : 'admin';
    const perms = role === 'user' ? cleanPermissions(req.body.permissions ?? []) : [];
    if (perms === null) return res.status(400).json({ error: 'permissions doit être une liste' });
    const denied = escalation(actor, role, perms);
    if (denied) return res.status(403).json({ error: denied });
    if (db.prepare('SELECT 1 FROM users WHERE name = ?').get(name)) return res.status(409).json({ error: 'Ce nom existe déjà' });
    const r = db.prepare('INSERT INTO users (name, email, password, role, permissions, active) VALUES (?, ?, ?, ?, ?, 1)')
      .run(String(name).trim(), email || '', password, role, JSON.stringify(perms));
    res.status(201).json(publicUser(getUser(r.lastInsertRowid)));
  });

  router.patch('/users/:id', (req, res) => {
    const actor = (req as any).user;
    const target = getUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'Compte introuvable' });
    const b = req.body || {};
    const role = b.role === undefined ? target.role : (b.role === 'user' ? 'user' : 'admin');
    let perms: string[] | null = null;
    if (b.permissions !== undefined) {
      perms = cleanPermissions(b.permissions);
      if (perms === null) return res.status(400).json({ error: 'permissions doit être une liste' });
    }
    const denied = escalation(actor, role, perms, target);
    if (denied) return res.status(403).json({ error: denied });
    const isSelf = target.id === actor.id;
    const active = b.active === undefined ? target.active : (b.active ? 1 : 0);
    if (isSelf && (active === 0 || role !== target.role)) return res.status(400).json({ error: 'Vous ne pouvez pas désactiver ou rétrograder votre propre compte' });
    const losesAdmin = target.role === 'admin' && target.active !== 0 && (role !== 'admin' || active === 0);
    if (losesAdmin && activeAdmins() <= 1) return res.status(400).json({ error: 'Il doit rester au moins un administrateur actif' });
    const nextPerms = role === 'admin' ? [] : (perms ?? permissionsOf(target));
    db.prepare('UPDATE users SET role = ?, active = ?, permissions = ? WHERE id = ?').run(role, active, JSON.stringify(nextPerms), target.id);
    res.json(publicUser(getUser(target.id)));
  });

  router.delete('/users/:id', (req, res) => {
    const actor = (req as any).user;
    const target = getUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'Compte introuvable' });
    if (target.id === actor.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    const denied = escalation(actor, target.role, null, target);
    if (denied) return res.status(403).json({ error: denied });
    if (target.role === 'admin' && target.active !== 0 && activeAdmins() <= 1) return res.status(400).json({ error: 'Il doit rester au moins un administrateur actif' });
    db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
    res.json({ ok: true });
  });

  router.post('/logout', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    res.json(publicUser((req as any).user));
  });

  return router;
}

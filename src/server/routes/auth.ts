import { Router } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = 'vitritrack-secret';

export default function(db: any) {
  const router = Router();

  router.post('/login', (req, res) => {
    const { name, password } = req.body || {};
    if (!name || !password) return res.status(400).json({ error: 'name et password requis' });
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name);
    if (!user || user.password !== password) return res.status(401).json({ error: 'Identifiants invalides' });
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  });

  router.post('/logout', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : h;
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    try {
      const p: any = jwt.verify(token, SECRET);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(p.id);
      if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
      res.json({ id: user.id, name: user.name, role: user.role });
    } catch {
      res.status(401).json({ error: 'Token invalide' });
    }
  });

  return router;
}

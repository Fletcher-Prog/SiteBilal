import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import db from './db.js';
import authRoutes from './routes/auth.js';
import vitrinesRoutes from './routes/vitrines.js';
import bookingsRoutes from './routes/bookings.js';
import fluxRoutes from './routes/flux.js';
import ventesRoutes from './routes/ventes.js';
import lieuxRoutes from './routes/lieux.js';
import actionsRoutes from './routes/actions.js';
import contratsRoutes from './routes/contrats.js';
import frigoristesRoutes from './routes/frigoristes.js';
import interventionsRoutes from './routes/interventions.js';
import prospectionRoutes from './routes/prospection.js';
import settingsRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes(db));
app.use('/api/vitrines', vitrinesRoutes(db));
app.use('/api/bookings', bookingsRoutes(db));
app.use('/api/flux', fluxRoutes(db));
app.use('/api/ventes', ventesRoutes(db));
app.use('/api/lieux', lieuxRoutes(db));
app.use('/api/actions', actionsRoutes(db));
app.use('/api/contrats', contratsRoutes(db));
app.use('/api/frigoristes', frigoristesRoutes(db));
app.use('/api/interventions', interventionsRoutes(db));
app.use('/api/prospection', prospectionRoutes(db));
app.use('/api/settings', settingsRoutes(db));
app.use('/api/dashboard', dashboardRoutes(db));

// In production, serve built frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`VitriTrack API on http://localhost:${PORT}`));

// ============================================================
// Cafetería Aroma - Servidor principal (Express)
// ============================================================
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const app = express();

// ── Middleware ───────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || '*').split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Permitir sin origin (Postman, curl) y orígenes listados
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan('[:date[clf]] :method :url :status :response-time ms'));

// ── Rutas ────────────────────────────────────────────────────
const publicRoutes  = require('./routes/public');
const clientRoutes  = require('./routes/client');
const cashierRoutes = require('./routes/cashier');
const adminRoutes   = require('./routes/admin');

app.use('/api', publicRoutes);
app.use('/api', clientRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Aroma API', timestamp: new Date().toISOString() });
});

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Manejador global de errores ───────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR GLOBAL]', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

// ── Iniciar servidor ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n☕  Aroma API escuchando en puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

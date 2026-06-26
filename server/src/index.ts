import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { runMigrations } from './database/migrate';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { startDailyNotificationJob } from './jobs/daily-notifications';

const app = express();

// Security
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.set('trust proxy', 1);

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados pedidos. Tente mais tarde.' },
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config.env });
});

// API routes
app.use('/api/v1', routes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Init
runMigrations();
startDailyNotificationJob();

app.listen(config.port, () => {
  logger.info(`MAIOMBE server running on port ${config.port} [${config.env}]`);
});

export default app;

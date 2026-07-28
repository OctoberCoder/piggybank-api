import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { db } from './db/client.js';
import { authRoutes } from './routes/auth.js';
import { familyRoutes } from './routes/families.js';
import { walletRoutes } from './routes/wallets.js';
import { transactionRoutes } from './routes/transactions.js';
import { allowanceRoutes } from './routes/allowance.js';
import { loanRoutes } from './routes/loans.js';
import { goalRoutes } from './routes/goals.js';
import { requestRoutes } from './routes/requests.js';
import { categoryRoutes } from './routes/categories.js';
import { lessonRoutes } from './routes/lessons.js';
import { insightRoutes } from './routes/insights.js';
import { notificationRoutes } from './routes/notifications.js';
import { backupRoutes } from './routes/backup.js';
import { errorHandler } from './middleware/error-handler.js';

const app = Fastify({ logger: true });

await app.register(cors);

// Register routes
await app.register(authRoutes, { prefix: '/auth' });
await app.register(familyRoutes, { prefix: '/families' });
await app.register(walletRoutes, { prefix: '/wallets' });
await app.register(transactionRoutes, { prefix: '/wallets' });
await app.register(allowanceRoutes, { prefix: '/wallets' });
await app.register(loanRoutes, { prefix: '/wallets' });
await app.register(goalRoutes, { prefix: '/wallets' });
await app.register(requestRoutes, { prefix: '/wallets' });
await app.register(categoryRoutes, { prefix: '/families' });
await app.register(lessonRoutes, { prefix: '/families' });
await app.register(insightRoutes, { prefix: '/wallets' });
await app.register(notificationRoutes, { prefix: '/notifications' });
await app.register(backupRoutes, { prefix: '/families' });

app.setErrorHandler(errorHandler);

// Health check
app.get('/health', async () => ({ status: 'ok' }));

try {
  await app.listen({ port: config.server.port, host: config.server.host });
  console.log(`Server running on http://${config.server.host}:${config.server.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

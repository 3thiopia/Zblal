import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { ADDIS_ABABA_SUBCITIES, isValidSubcityLocation } from './src/config/locations.ts';
import { formatServicePrice, getServiceTier } from './src/config/popoConfig.ts';
import { createRegistration, getRegistrationsByUserId } from './src/db/registrations.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { optionalAuth, requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  formatEthiopianFullPhone,
  isValidEthiopianLocalDigits,
  normalizeEthiopianLocalDigits,
} from './src/utils/phone.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '100kb' }));

function generateReferenceNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `POPO-${yyyy}${mm}${dd}-${suffix}`;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await getOrCreateUser(
      req.user!.uid,
      req.user!.email || ''
    );
    res.json({ user: userRecord });
  } catch (error: unknown) {
    console.error('Failed to sync user:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    res.status(500).json({ error: message });
  }
});

app.get('/api/registrations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await getOrCreateUser(
      req.user!.uid,
      req.user!.email || ''
    );
    const items = await getRegistrationsByUserId(userRecord.id);
    res.json({ registrations: items });
  } catch (error: unknown) {
    console.error('Failed to fetch registrations:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch registrations';
    res.status(500).json({ error: message });
  }
});

app.post('/api/registrations', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    const customerName =
      typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const rawPhone =
      typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    const subcity =
      typeof body.subcity === 'string' ? body.subcity.trim() : '';
    const specificLocation =
      typeof body.specificLocation === 'string'
        ? body.specificLocation.trim()
        : '';
    const servicePriority =
      typeof body.servicePriority === 'string'
        ? body.servicePriority.trim()
        : '';
    const idempotencyKey =
      typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim().length > 0
        ? body.idempotencyKey.trim().slice(0, 128)
        : undefined;

    if (customerName.length < 2 || customerName.length > 120) {
      return res.status(400).json({
        error: 'Please enter your full name (at least 2 characters).',
      });
    }

    const localDigits = normalizeEthiopianLocalDigits(rawPhone);
    if (!isValidEthiopianLocalDigits(localDigits)) {
      return res.status(400).json({
        error: 'Please enter a valid Ethiopian mobile number (+251 followed by 9 digits starting with 9 or 7).',
      });
    }

    const subcityExists = ADDIS_ABABA_SUBCITIES.some((s) => s.name === subcity);
    if (!subcityExists) {
      return res.status(400).json({
        error: 'Please select a valid Addis Ababa subcity.',
      });
    }

    if (!isValidSubcityLocation(subcity, specificLocation)) {
      return res.status(400).json({
        error: 'Please select a valid location within the chosen subcity.',
      });
    }

    const tier = getServiceTier(servicePriority);
    if (!tier) {
      return res.status(400).json({
        error: 'Please select a service priority (Standard, Premium, or Super Fast).',
      });
    }

    let userId: number | null = null;
    if (req.user) {
      const userRecord = await getOrCreateUser(
        req.user.uid,
        req.user.email || ''
      );
      userId = userRecord.id;
    }

    const created = await createRegistration({
      referenceNumber: generateReferenceNumber(),
      idempotencyKey,
      userId,
      customerName,
      phoneNumber: formatEthiopianFullPhone(localDigits),
      subcity,
      specificLocation,
      servicePriority: tier.label,
      servicePrice: formatServicePrice(tier),
      servicePriceEtb: tier.priceEtb,
      estimatedTimeframe: tier.timeframe,
    });

    return res.status(201).json({
      registration: {
        referenceNumber: created.referenceNumber,
        customerName: created.customerName,
        phoneNumber: created.phoneNumber,
        subcity: created.subcity,
        specificLocation: created.specificLocation,
        servicePriority: created.servicePriority,
        servicePrice: created.servicePrice,
        estimatedTimeframe: created.estimatedTimeframe,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error('Failed to create registration:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to complete registration. Please try again.';
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  const distDir = path.resolve(__dirname, 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && fs.existsSync(distDir));

  if (isProd) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`POPO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

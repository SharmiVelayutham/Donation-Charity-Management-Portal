import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import authRoutes from './routes/auth.routes';
import donationRoutes from './routes/donation.routes';
import contributionRoutes from './routes/contribution.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import analyticsRoutes from './routes/analytics.routes';
import trackingRoutes from './routes/tracking.routes';
import ngoDashboardRoutes from './routes/ngo-dashboard.routes';
import ngoDashboardCompleteRoutes from './routes/ngo-dashboard-complete.routes';
import donorDashboardRoutes from './routes/donor-dashboard.routes';
import adminAuthRoutes from './routes/admin-auth.routes';
import adminDashboardRoutes from './routes/admin-dashboard.routes';
import pickupManagementRoutes from './routes/pickup-management.routes';
import paymentManagementRoutes from './routes/payment-management.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/ngo/donations', ngoDashboardRoutes); // NGO donation management
app.use('/api/ngo/dashboard', ngoDashboardCompleteRoutes); // NGO complete dashboard
app.use('/api/donor/dashboard', donorDashboardRoutes); // Donor dashboard

// Pickup management routes
app.use('/api', pickupManagementRoutes);

// Payment management routes
app.use('/api', paymentManagementRoutes);

// Admin-only routes (separate from regular auth)
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);

app.use(errorHandler);

export default app;


import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import authRoutes from './routes/auth.routes';
import donationRoutes from './routes/donation.routes';
// Temporarily disabled - missing model files
// import contributionRoutes from './routes/contribution.routes';
// import leaderboardRoutes from './routes/leaderboard.routes';
// import analyticsRoutes from './routes/analytics.routes';
// import trackingRoutes from './routes/tracking.routes';
import ngoDashboardRoutes from './routes/ngo-dashboard.routes';
import ngoDashboardCompleteRoutes from './routes/ngo-dashboard-complete.routes';
import donorDashboardRoutes from './routes/donor-dashboard.routes';
import adminAuthRoutes from './routes/admin-auth.routes';
import adminDashboardRoutes from './routes/admin-dashboard.routes';
import adminDonorsRoutes from './routes/admin-donors.routes';
import emailTemplatesRoutes from './routes/email-templates.routes';
import donationRequestRoutes from './routes/donation-request.routes';
import dashboardStatsRoutes from './routes/dashboard-stats.routes';
import notificationRoutes from './routes/notification.routes';
// MySQL-based routes
import userRoutes from './routes/user.routes';
import contributionsMysqlRoutes, { contributionsRouter } from './routes/contributions-mysql.routes';
import pickupsMysqlRoutes from './routes/pickups-mysql.routes';
import { query } from './config/mysql';
import { sendSuccess } from './utils/response';
// Temporarily disabled - missing model files
// import pickupManagementRoutes from './routes/pickup-management.routes';
// import paymentManagementRoutes from './routes/payment-management.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Test endpoint to verify route registration
app.get('/api/test-routes', (_req, res) => {
  res.json({ 
    message: 'Routes test endpoint',
    routes: {
      'donation-requests': '/api/donation-requests',
      'ngo-dashboard': '/api/ngo/dashboard',
      'donor-dashboard': '/api/donor/dashboard'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/donations', donationRoutes);
// MySQL-based routes
// Leaderboard routes - Inline registration
console.log('🔍 [DEBUG] Reached leaderboard registration section');
console.log('📋 [LEADERBOARD] Registering leaderboard routes...');
console.log('📋 [LEADERBOARD] express object:', typeof express);
console.log('📋 [LEADERBOARD] express.Router:', typeof express.Router);
const leaderboardRouter = express.Router();
console.log('📋 [LEADERBOARD] Router created:', leaderboardRouter);
leaderboardRouter.get('/test', (req, res) => {
  res.json({ message: 'Leaderboard test route works!', path: req.path });
});
leaderboardRouter.get('/', async (req, res) => {
  try {
    const { type = 'donors', sortBy = 'count', period = 'all' } = req.query;
    
    let dateFilter: Date | null = null;
    const now = new Date();
    if (period === 'monthly') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek;
      dateFilter = new Date(now.setDate(diff));
      dateFilter.setHours(0, 0, 0, 0);
    }

    if (type === 'donors') {
      // Rank donors by received funds only (ACCEPTED status contributions)
      // Only count contributions with ACCEPTED/COMPLETED status (received funds)
      let sql = `
        SELECT 
          d.id as donor_id,
          d.name as donor_name,
          d.email as donor_email,
          COUNT(DISTINCT c.id) + COUNT(DISTINCT CASE WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' THEN drc.id END) as total_contributions,
          COALESCE(SUM(CASE 
            WHEN c.status = 'COMPLETED' AND dr.donation_category = 'FUNDS' THEN dr.quantity_or_amount 
            ELSE 0 
          END), 0) +
          COALESCE(SUM(CASE 
            WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' AND dr_new.donation_type IN ('FUNDS', 'MONEY') 
            THEN drc.quantity_or_amount 
            ELSE 0 
          END), 0) as total_amount,
          SUM(CASE WHEN c.status = 'COMPLETED' THEN 1 ELSE 0 END) +
          SUM(CASE WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' THEN 1 ELSE 0 END) as completed_contributions,
          GREATEST(COALESCE(MAX(c.created_at), '1970-01-01'), COALESCE(MAX(drc.created_at), '1970-01-01')) as last_contribution_date
        FROM donors d
        LEFT JOIN contributions c ON d.id = c.donor_id AND c.status = 'COMPLETED'
        LEFT JOIN donations dr ON c.donation_id = dr.id
        LEFT JOIN donation_request_contributions drc ON d.id = drc.donor_id
        LEFT JOIN donation_requests dr_new ON drc.request_id = dr_new.id
      `;
      const params: any[] = [];
      const whereConditions: string[] = [
        '(c.status = \'COMPLETED\' OR UPPER(TRIM(COALESCE(drc.status, \'\'))) = \'ACCEPTED\')'
      ];
      if (dateFilter) {
        whereConditions.push('(c.created_at >= ? OR drc.created_at >= ?)');
        params.push(dateFilter);
        params.push(dateFilter);
      }
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
      sql += `
        GROUP BY d.id, d.name, d.email
        HAVING total_amount > 0
        ORDER BY ${sortBy === 'amount' ? 'total_amount DESC, total_contributions DESC' : 'total_contributions DESC, total_amount DESC'}
        LIMIT 100
      `;
      const leaderboard = await query<any>(sql, params);
      const rankedLeaderboard = leaderboard.map((donor: any, index: number) => ({
        rank: index + 1,
        donorId: donor.donor_id,
        donorName: donor.donor_name,
        donorEmail: donor.donor_email,
        totalContributions: parseInt(donor.total_contributions) || 0,
        totalAmount: parseFloat(donor.total_amount) || 0,
        completedContributions: parseInt(donor.completed_contributions) || 0,
        lastContributionDate: donor.last_contribution_date,
      }));
      return sendSuccess(res, {
        type: 'donors',
        sortBy,
        period,
        leaderboard: rankedLeaderboard,
      }, 'Leaderboard fetched successfully');
    } else if (type === 'ngos') {
      // Rank NGOs by received funds only (ACCEPTED status contributions)
      // Only count contributions with ACCEPTED/COMPLETED status (received funds)
      let sql = `
        SELECT 
          u.id as ngo_id,
          u.name as ngo_name,
          u.email as ngo_email,
          u.contact_info as ngo_contact_info,
          COUNT(DISTINCT d.id) + COUNT(DISTINCT dr.id) as total_donations,
          COALESCE(SUM(CASE 
            WHEN d.status = 'COMPLETED' AND d.donation_category = 'FUNDS' THEN d.quantity_or_amount 
            ELSE 0 
          END), 0) +
          COALESCE(SUM(CASE 
            WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' AND dr.donation_type IN ('FUNDS', 'MONEY') 
            THEN drc.quantity_or_amount 
            ELSE 0 
          END), 0) as total_amount,
          SUM(CASE WHEN d.status = 'COMPLETED' THEN 1 ELSE 0 END) +
          SUM(CASE WHEN UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED' THEN 1 ELSE 0 END) as completed_donations,
          SUM(CASE WHEN d.priority = 'URGENT' THEN 1 ELSE 0 END) as urgent_donations
        FROM users u
        LEFT JOIN donations d ON u.id = d.ngo_id AND d.status = 'COMPLETED'
        LEFT JOIN donation_requests dr ON u.id = dr.ngo_id
        LEFT JOIN donation_request_contributions drc ON dr.id = drc.request_id
        WHERE u.role = 'NGO'
          AND (d.status = 'COMPLETED' OR UPPER(TRIM(COALESCE(drc.status, ''))) = 'ACCEPTED')
      `;
      const params: any[] = [];
      if (dateFilter) {
        sql += ` AND (d.created_at >= ? OR dr.created_at >= ?)`;
        params.push(dateFilter);
        params.push(dateFilter);
      }
      sql += `
        GROUP BY u.id, u.name, u.email, u.contact_info
        HAVING total_amount > 0
        ORDER BY ${sortBy === 'amount' ? 'total_amount DESC, total_donations DESC' : 'total_donations DESC, total_amount DESC'}
        LIMIT 100
      `;
      const leaderboard = await query<any>(sql, params);
      const rankedLeaderboard = leaderboard.map((ngo: any, index: number) => ({
        rank: index + 1,
        ngoId: ngo.ngo_id,
        ngoName: ngo.ngo_name,
        ngoEmail: ngo.ngo_email,
        contactInfo: ngo.ngo_contact_info,
        totalDonations: parseInt(ngo.total_donations) || 0,
        totalAmount: parseFloat(ngo.total_amount) || 0,
        completedDonations: parseInt(ngo.completed_donations) || 0,
        urgentDonations: parseInt(ngo.urgent_donations) || 0,
      }));
      return sendSuccess(res, {
        type: 'ngos',
        sortBy,
        period,
        leaderboard: rankedLeaderboard,
      }, 'Leaderboard fetched successfully');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "donors" or "ngos"',
      });
    }
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch leaderboard',
    });
  }
});
app.use('/api/leaderboard', leaderboardRouter);
console.log('✅ [LEADERBOARD] Leaderboard routes registered at /api/leaderboard');

app.use('/api', contributionsMysqlRoutes); // POST /api/donations/:id/contribute
app.use('/api/contributions', contributionsRouter); // GET /api/contributions/my, GET /api/contributions/ngo/:ngoId
app.use('/api/pickups', pickupsMysqlRoutes);
// Temporarily disabled - missing model files
// app.use('/api/leaderboard', leaderboardRoutes); // Old MongoDB version
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/tracking', trackingRoutes);
app.use('/api/ngo/donations', ngoDashboardRoutes); // NGO donation management
console.log('📋 Registering NGO dashboard complete routes at /api/ngo/dashboard');
app.use('/api/ngo/dashboard', ngoDashboardCompleteRoutes); // NGO complete dashboard
console.log('✅ NGO dashboard complete routes registered at /api/ngo/dashboard');
app.use('/api/donor/dashboard', donorDashboardRoutes); // Donor dashboard
// Donation requests routes
console.log('📋 Registering donation-requests routes...');
app.use('/api/donation-requests', donationRequestRoutes); // Donation requests (NGO creates, Donors view)
console.log('✅ Donation-requests routes registered at /api/donation-requests');

// Dashboard statistics routes (real-time stats)
console.log('📋 Registering dashboard-stats routes...');
app.use('/api', dashboardStatsRoutes); // Dashboard stats for NGO and Donor
console.log('✅ Dashboard-stats routes registered');

// Notification routes
console.log('📋 Registering notification routes...');
app.use('/api/notifications', notificationRoutes);
console.log('✅ Notification routes registered at /api/notifications');

// Temporarily disabled - missing model files
// Pickup management routes
// app.use('/api', pickupManagementRoutes);

// Payment management routes
// app.use('/api', paymentManagementRoutes);

// Admin-only routes (separate from regular auth)
console.log('📋 [APP] Registering admin routes...');
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin', adminDonorsRoutes);
app.use('/api/admin/email-templates', emailTemplatesRoutes);
console.log('✅ [APP] Admin routes registered:');
console.log('   - /api/admin/auth');
console.log('   - /api/admin/dashboard');
console.log('   - /api/admin (analytics, donors, contributions)');
console.log('   - /api/admin/email-templates');

app.use(errorHandler);

export default app;


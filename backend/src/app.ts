import helpRoutes from './routes/help.routes';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { initLogger } from './utils/logger';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import donationRoutes from './routes/donation.routes';





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
import blogRoutes from './routes/blog.routes';
import sliderRoutes from './routes/slider.routes';
import platformStatsRoutes from './routes/platform-stats.routes';

import userRoutes from './routes/user.routes';
import contributionsMysqlRoutes, { contributionsRouter } from './routes/contributions-mysql.routes';
import pickupsMysqlRoutes from './routes/pickups-mysql.routes';
import { query } from './config/mysql';
import { sendSuccess } from './utils/response';



import { errorHandler } from './middleware/error.middleware';

initLogger();
const app = express();

const FRONTEND_URL = env.frontendUrl;
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", FRONTEND_URL],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: [FRONTEND_URL],
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
const enableHttpLogs = env.enableHttpLogs || env.nodeEnv === 'development';
if (enableHttpLogs) {
  app.use(morgan('dev'));
}
app.use('/api/help', helpRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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


const leaderboardRouter = express.Router();
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

app.use('/api', contributionsMysqlRoutes); // POST /api/donations/:id/contribute
app.use('/api/contributions', contributionsRouter); // GET /api/contributions/my, GET /api/contributions/ngo/:ngoId
app.use('/api/pickups', pickupsMysqlRoutes);




app.use('/api/ngo/donations', ngoDashboardRoutes); // NGO donation management
app.use('/api/ngo/dashboard', ngoDashboardCompleteRoutes); // NGO complete dashboard
app.use('/api/donor/dashboard', donorDashboardRoutes); // Donor dashboard

app.use('/api/donation-requests', donationRequestRoutes); // Donation requests (NGO creates, Donors view)

app.use('/api', dashboardStatsRoutes); // Dashboard stats for NGO and Donor

app.use('/api/notifications', notificationRoutes);

app.use('/api/blogs', blogRoutes);

app.use('/api/sliders', sliderRoutes);
app.use('/api/platform', platformStatsRoutes);






app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin', adminDonorsRoutes);
app.use('/api/admin/email-templates', emailTemplatesRoutes);

app.use(errorHandler);

export default app;


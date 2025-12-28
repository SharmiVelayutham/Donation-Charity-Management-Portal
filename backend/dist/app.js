"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const donation_routes_1 = __importDefault(require("./routes/donation.routes"));
const ngo_dashboard_routes_1 = __importDefault(require("./routes/ngo-dashboard.routes"));
const ngo_dashboard_complete_routes_1 = __importDefault(require("./routes/ngo-dashboard-complete.routes"));
const donor_dashboard_routes_1 = __importDefault(require("./routes/donor-dashboard.routes"));
const admin_auth_routes_1 = __importDefault(require("./routes/admin-auth.routes"));
const admin_dashboard_routes_1 = __importDefault(require("./routes/admin-dashboard.routes"));
const admin_donors_routes_1 = __importDefault(require("./routes/admin-donors.routes"));
const email_templates_routes_1 = __importDefault(require("./routes/email-templates.routes"));
const donation_request_routes_1 = __importDefault(require("./routes/donation-request.routes"));
const dashboard_stats_routes_1 = __importDefault(require("./routes/dashboard-stats.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const blog_routes_1 = __importDefault(require("./routes/blog.routes"));
const slider_routes_1 = __importDefault(require("./routes/slider.routes"));
const platform_stats_routes_1 = __importDefault(require("./routes/platform-stats.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const contributions_mysql_routes_1 = __importStar(require("./routes/contributions-mysql.routes"));
const pickups_mysql_routes_1 = __importDefault(require("./routes/pickups-mysql.routes"));
const mysql_1 = require("./config/mysql");
const response_1 = require("./utils/response");
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "http://localhost:4000", "http://localhost:4200"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: ['http://localhost:4200', 'http://localhost:4000'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
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
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/donations', donation_routes_1.default);
const leaderboardRouter = express_1.default.Router();
leaderboardRouter.get('/test', (req, res) => {
    res.json({ message: 'Leaderboard test route works!', path: req.path });
});
leaderboardRouter.get('/', async (req, res) => {
    try {
        const { type = 'donors', sortBy = 'count', period = 'all' } = req.query;
        let dateFilter = null;
        const now = new Date();
        if (period === 'monthly') {
            dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        else if (period === 'weekly') {
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
            const params = [];
            const whereConditions = [
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
            const leaderboard = await (0, mysql_1.query)(sql, params);
            const rankedLeaderboard = leaderboard.map((donor, index) => ({
                rank: index + 1,
                donorId: donor.donor_id,
                donorName: donor.donor_name,
                donorEmail: donor.donor_email,
                totalContributions: parseInt(donor.total_contributions) || 0,
                totalAmount: parseFloat(donor.total_amount) || 0,
                completedContributions: parseInt(donor.completed_contributions) || 0,
                lastContributionDate: donor.last_contribution_date,
            }));
            return (0, response_1.sendSuccess)(res, {
                type: 'donors',
                sortBy,
                period,
                leaderboard: rankedLeaderboard,
            }, 'Leaderboard fetched successfully');
        }
        else if (type === 'ngos') {
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
            const params = [];
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
            const leaderboard = await (0, mysql_1.query)(sql, params);
            const rankedLeaderboard = leaderboard.map((ngo, index) => ({
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
            return (0, response_1.sendSuccess)(res, {
                type: 'ngos',
                sortBy,
                period,
                leaderboard: rankedLeaderboard,
            }, 'Leaderboard fetched successfully');
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Invalid type. Must be "donors" or "ngos"',
            });
        }
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch leaderboard',
        });
    }
});
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api', contributions_mysql_routes_1.default); // POST /api/donations/:id/contribute
app.use('/api/contributions', contributions_mysql_routes_1.contributionsRouter); // GET /api/contributions/my, GET /api/contributions/ngo/:ngoId
app.use('/api/pickups', pickups_mysql_routes_1.default);
app.use('/api/ngo/donations', ngo_dashboard_routes_1.default); // NGO donation management
app.use('/api/ngo/dashboard', ngo_dashboard_complete_routes_1.default); // NGO complete dashboard
app.use('/api/donor/dashboard', donor_dashboard_routes_1.default); // Donor dashboard
app.use('/api/donation-requests', donation_request_routes_1.default); // Donation requests (NGO creates, Donors view)
app.use('/api', dashboard_stats_routes_1.default); // Dashboard stats for NGO and Donor
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/blogs', blog_routes_1.default);
app.use('/api/sliders', slider_routes_1.default);
app.use('/api/platform', platform_stats_routes_1.default);
app.use('/api/admin/auth', admin_auth_routes_1.default);
app.use('/api/admin/dashboard', admin_dashboard_routes_1.default);
app.use('/api/admin', admin_donors_routes_1.default);
app.use('/api/admin/email-templates', email_templates_routes_1.default);
app.use(error_middleware_1.errorHandler);
exports.default = app;

"use strict";
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
// Temporarily disabled - missing model files
// import contributionRoutes from './routes/contribution.routes';
// import leaderboardRoutes from './routes/leaderboard.routes';
// import analyticsRoutes from './routes/analytics.routes';
// import trackingRoutes from './routes/tracking.routes';
const ngo_dashboard_routes_1 = __importDefault(require("./routes/ngo-dashboard.routes"));
const ngo_dashboard_complete_routes_1 = __importDefault(require("./routes/ngo-dashboard-complete.routes"));
const donor_dashboard_routes_1 = __importDefault(require("./routes/donor-dashboard.routes"));
const admin_auth_routes_1 = __importDefault(require("./routes/admin-auth.routes"));
const admin_dashboard_routes_1 = __importDefault(require("./routes/admin-dashboard.routes"));
const donation_request_routes_1 = __importDefault(require("./routes/donation-request.routes"));
const dashboard_stats_routes_1 = __importDefault(require("./routes/dashboard-stats.routes"));
// Temporarily disabled - missing model files
// import pickupManagementRoutes from './routes/pickup-management.routes';
// import paymentManagementRoutes from './routes/payment-management.routes';
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
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
app.use('/api/auth', auth_routes_1.default);
app.use('/api/donations', donation_routes_1.default);
// Temporarily disabled - missing model files
// app.use('/api/contributions', contributionRoutes);
// app.use('/api/leaderboard', leaderboardRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/tracking', trackingRoutes);
app.use('/api/ngo/donations', ngo_dashboard_routes_1.default); // NGO donation management
console.log('📋 Registering NGO dashboard complete routes at /api/ngo/dashboard');
app.use('/api/ngo/dashboard', ngo_dashboard_complete_routes_1.default); // NGO complete dashboard
console.log('✅ NGO dashboard complete routes registered at /api/ngo/dashboard');
app.use('/api/donor/dashboard', donor_dashboard_routes_1.default); // Donor dashboard
// Donation requests routes
console.log('📋 Registering donation-requests routes...');
app.use('/api/donation-requests', donation_request_routes_1.default); // Donation requests (NGO creates, Donors view)
console.log('✅ Donation-requests routes registered at /api/donation-requests');
// Dashboard statistics routes (real-time stats)
console.log('📋 Registering dashboard-stats routes...');
app.use('/api', dashboard_stats_routes_1.default); // Dashboard stats for NGO and Donor
console.log('✅ Dashboard-stats routes registered');
// Temporarily disabled - missing model files
// Pickup management routes
// app.use('/api', pickupManagementRoutes);
// Payment management routes
// app.use('/api', paymentManagementRoutes);
// Admin-only routes (separate from regular auth)
app.use('/api/admin/auth', admin_auth_routes_1.default);
app.use('/api/admin/dashboard', admin_dashboard_routes_1.default);
app.use(error_middleware_1.errorHandler);
exports.default = app;

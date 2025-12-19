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
const contribution_routes_1 = __importDefault(require("./routes/contribution.routes"));
const leaderboard_routes_1 = __importDefault(require("./routes/leaderboard.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const tracking_routes_1 = __importDefault(require("./routes/tracking.routes"));
const ngo_dashboard_routes_1 = __importDefault(require("./routes/ngo-dashboard.routes"));
const ngo_dashboard_complete_routes_1 = __importDefault(require("./routes/ngo-dashboard-complete.routes"));
const donor_dashboard_routes_1 = __importDefault(require("./routes/donor-dashboard.routes"));
const admin_auth_routes_1 = __importDefault(require("./routes/admin-auth.routes"));
const admin_dashboard_routes_1 = __importDefault(require("./routes/admin-dashboard.routes"));
const pickup_management_routes_1 = __importDefault(require("./routes/pickup-management.routes"));
const payment_management_routes_1 = __importDefault(require("./routes/payment-management.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/donations', donation_routes_1.default);
app.use('/api/contributions', contribution_routes_1.default);
app.use('/api/leaderboard', leaderboard_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/tracking', tracking_routes_1.default);
app.use('/api/ngo/donations', ngo_dashboard_routes_1.default); // NGO donation management
app.use('/api/ngo/dashboard', ngo_dashboard_complete_routes_1.default); // NGO complete dashboard
app.use('/api/donor/dashboard', donor_dashboard_routes_1.default); // Donor dashboard
// Pickup management routes
app.use('/api', pickup_management_routes_1.default);
// Payment management routes
app.use('/api', payment_management_routes_1.default);
// Admin-only routes (separate from regular auth)
app.use('/api/admin/auth', admin_auth_routes_1.default);
app.use('/api/admin/dashboard', admin_dashboard_routes_1.default);
app.use(error_middleware_1.errorHandler);
exports.default = app;

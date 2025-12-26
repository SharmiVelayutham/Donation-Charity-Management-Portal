"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ngo_dashboard_controller_1 = require("../controllers/ngo-dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
// Setup multer for image uploads
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
// All routes require NGO authentication
router.use(auth_middleware_1.authenticate);
router.use((0, role_middleware_1.requireRole)(['NGO']));
/**
 * NGO Admin Dashboard Routes
 * All routes are prefixed with /api/ngo/donations
 */
// Create donation request
router.post('/', upload.array('images', 5), ngo_dashboard_controller_1.createNgoDonation);
// Get all donations created by logged-in NGO
router.get('/', ngo_dashboard_controller_1.getNgoDonations);
// Get donation details (only own donation)
router.get('/:id', ngo_dashboard_controller_1.getNgoDonationById);
// Update donation request
router.put('/:id', upload.array('images', 5), ngo_dashboard_controller_1.updateNgoDonation);
// Update priority only
router.patch('/:id/priority', ngo_dashboard_controller_1.updateNgoDonationPriority);
// Cancel donation request
router.delete('/:id', ngo_dashboard_controller_1.cancelNgoDonation);
exports.default = router;

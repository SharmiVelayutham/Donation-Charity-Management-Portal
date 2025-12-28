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
router.use(auth_middleware_1.authenticate);
router.use((0, role_middleware_1.requireRole)(['NGO']));
router.post('/', upload.array('images', 5), ngo_dashboard_controller_1.createNgoDonation);
router.get('/', ngo_dashboard_controller_1.getNgoDonations);
router.get('/details', ngo_dashboard_controller_1.getNgoDonationDetails);
router.put('/:id/status', ngo_dashboard_controller_1.updateDonationRequestContributionStatus);
router.get('/:id', ngo_dashboard_controller_1.getNgoDonationById);
router.put('/:id', upload.array('images', 5), ngo_dashboard_controller_1.updateNgoDonation);
router.patch('/:id/priority', ngo_dashboard_controller_1.updateNgoDonationPriority);
router.delete('/:id', ngo_dashboard_controller_1.cancelNgoDonation);
exports.default = router;

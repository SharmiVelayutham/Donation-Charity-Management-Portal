"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const donation_controller_1 = require("../controllers/donation.controller");
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
router.post('/', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), upload.array('images', 5), donation_controller_1.createDonation);
router.get('/my', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO']), donation_controller_1.getMyDonations);
router.get('/', donation_controller_1.getDonations);
router.get('/nearby', donation_controller_1.getNearbyDonations); // Must be before /:id
router.get('/:id', donation_controller_1.getDonationById);
router.put('/:id', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO', 'ADMIN']), upload.array('images', 5), donation_controller_1.updateDonation);
router.put('/:id/cancel', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO', 'ADMIN']), donation_controller_1.cancelDonation);
router.delete('/:id', auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(['NGO', 'ADMIN']), donation_controller_1.deleteDonation);
exports.default = router;

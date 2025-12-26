"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_templates_controller_1 = require("../controllers/email-templates.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// All routes require ADMIN authentication
router.use(auth_middleware_1.authenticate);
router.use((0, role_middleware_1.requireRole)(['ADMIN']));
/**
 * Email Templates Routes
 * All routes are prefixed with /api/admin/email-templates
 */
// Get template
router.get('/:templateType', email_templates_controller_1.getEmailTemplate);
// Update template
router.put('/:templateType', email_templates_controller_1.updateEmailTemplate);
// Restore default template
router.post('/:templateType/restore-default', email_templates_controller_1.restoreDefaultTemplate);
exports.default = router;

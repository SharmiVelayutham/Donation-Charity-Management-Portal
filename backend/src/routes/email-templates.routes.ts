import { Router } from 'express';
import {
  getEmailTemplate,
  updateEmailTemplate,
  restoreDefaultTemplate,
} from '../controllers/email-templates.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require ADMIN authentication
router.use(authenticate);
router.use(requireRole(['ADMIN']));

/**
 * Email Templates Routes
 * All routes are prefixed with /api/admin/email-templates
 */

// Get template
router.get('/:templateType', getEmailTemplate);

// Update template
router.put('/:templateType', updateEmailTemplate);

// Restore default template
router.post('/:templateType/restore-default', restoreDefaultTemplate);

export default router;


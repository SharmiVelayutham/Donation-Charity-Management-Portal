import { Router } from 'express';
import {
  getEmailTemplate,
  updateEmailTemplate,
  restoreDefaultTemplate,
} from '../controllers/email-templates.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);
router.use(requireRole(['ADMIN']));
router.get('/:templateType', getEmailTemplate);
router.put('/:templateType', updateEmailTemplate);
router.post('/:templateType/restore-default', restoreDefaultTemplate);

export default router;


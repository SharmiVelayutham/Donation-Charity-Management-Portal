import { Router } from 'express';
import {
  confirmPayment,
  getNgoPayments,
  getNgoPaymentDetails,
  verifyNgoPayment,
  verifyOrgPayment,
  getAllOrgPayments,
} from '../controllers/payment-management.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
router.post('/payments/confirm', authenticate, requireRole(['DONOR']), confirmPayment);
router.get('/ngo/payments', authenticate, requireRole(['NGO']), getNgoPayments);
router.get('/ngo/payments/:id', authenticate, requireRole(['NGO']), getNgoPaymentDetails);
router.patch('/ngo/payments/:id/verify', authenticate, requireRole(['NGO']), verifyNgoPayment);
router.get('/org/payments', authenticate, requireRole(['ADMIN']), getAllOrgPayments);
router.patch('/org/payments/:id/verify', authenticate, requireRole(['ADMIN']), verifyOrgPayment);

export default router;


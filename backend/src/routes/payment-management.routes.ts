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

/**
 * Payment Management Routes
 */

// Donor payment confirmation
router.post('/payments/confirm', authenticate, requireRole(['DONOR']), confirmPayment);

// NGO payment management
router.get('/ngo/payments', authenticate, requireRole(['NGO']), getNgoPayments);
router.get('/ngo/payments/:id', authenticate, requireRole(['NGO']), getNgoPaymentDetails);
router.patch('/ngo/payments/:id/verify', authenticate, requireRole(['NGO']), verifyNgoPayment);

// Organization Admin payment management
router.get('/org/payments', authenticate, requireRole(['ADMIN']), getAllOrgPayments);
router.patch('/org/payments/:id/verify', authenticate, requireRole(['ADMIN']), verifyOrgPayment);

export default router;


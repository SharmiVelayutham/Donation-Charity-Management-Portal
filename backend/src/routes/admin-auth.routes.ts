import { Router } from 'express';
import { adminLogin, adminRegister, adminVerifyOTPAndRegister } from '../controllers/admin-auth.controller';

const router = Router();
router.post('/register', adminRegister);
router.post('/verify-otp', adminVerifyOTPAndRegister);
router.post('/login', adminLogin);

export default router;

import { Router } from 'express';
import { login, register, verifyOTPAndRegister } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTPAndRegister);
router.post('/login', login);

export default router;


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_auth_controller_1 = require("../controllers/admin-auth.controller");
const router = (0, express_1.Router)();
router.post('/register', admin_auth_controller_1.adminRegister);
router.post('/verify-otp', admin_auth_controller_1.adminVerifyOTPAndRegister);
router.post('/login', admin_auth_controller_1.adminLogin);
exports.default = router;

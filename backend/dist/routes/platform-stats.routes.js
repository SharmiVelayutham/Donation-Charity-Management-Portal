"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const platform_stats_controller_1 = require("../controllers/platform-stats.controller");
const router = (0, express_1.Router)();
router.get('/stats', platform_stats_controller_1.getPlatformStats);
exports.default = router;

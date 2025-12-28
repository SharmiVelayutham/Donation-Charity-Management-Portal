"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaderboard_controller_1 = require("../controllers/leaderboard.controller");
const router = (0, express_1.Router)();
router.get('/donors', leaderboard_controller_1.getDonorLeaderboard);
router.get('/ngos', leaderboard_controller_1.getNgoLeaderboard);
exports.default = router;

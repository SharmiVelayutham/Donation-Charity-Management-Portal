"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaderboard_mysql_controller_1 = require("../controllers/leaderboard-mysql.controller");
const router = (0, express_1.Router)();
console.log('🔧 Leaderboard routes file loaded');
router.get('/test', (req, res) => {
    console.log('✅ Test route hit');
    res.json({ message: 'Leaderboard route is working!', path: req.path });
});
router.get('/', (req, res, next) => {
    console.log('📊 Leaderboard GET / route hit');
    next();
}, leaderboard_mysql_controller_1.getLeaderboard);
console.log('✅ Leaderboard routes configured');
exports.default = router;

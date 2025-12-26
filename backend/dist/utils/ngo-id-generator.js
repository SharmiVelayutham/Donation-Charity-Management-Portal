"use strict";
/**
 * NGO ID Generator
 * Generates unique NGO IDs in format: NGO-YYYY-NNNN
 * Example: NGO-2025-0001, NGO-2025-0002, etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNgoId = generateNgoId;
exports.isValidNgoId = isValidNgoId;
const mysql_1 = require("../config/mysql");
/**
 * Generate next NGO ID for the current year
 * Format: NGO-YYYY-NNNN (e.g., NGO-2025-0001)
 */
async function generateNgoId() {
    const currentYear = new Date().getFullYear();
    const prefix = `NGO-${currentYear}-`;
    const prefixLength = prefix.length;
    // Get the highest sequence number for this year
    // Extract the numeric part after the prefix (e.g., "0001" from "NGO-2025-0001")
    // Use SUBSTRING with position after the prefix (e.g., position 10 for "NGO-2025-")
    const result = await (0, mysql_1.queryOne)(`SELECT COALESCE(MAX(CAST(SUBSTRING(ngo_id, ?) AS UNSIGNED)), 0) as max_seq
     FROM users 
     WHERE ngo_id IS NOT NULL 
       AND ngo_id LIKE ? 
       AND role = 'NGO'
       AND LENGTH(ngo_id) >= ?`, [prefixLength + 1, `${prefix}%`, prefixLength + 4]);
    const nextSeq = ((result === null || result === void 0 ? void 0 : result.max_seq) || 0) + 1;
    const ngoId = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    console.log(`[NGO ID Generator] Generated NGO ID: ${ngoId} (Sequence: ${nextSeq})`);
    return ngoId;
}
/**
 * Verify NGO ID format
 */
function isValidNgoId(ngoId) {
    const pattern = /^NGO-\d{4}-\d{4}$/;
    return pattern.test(ngoId);
}

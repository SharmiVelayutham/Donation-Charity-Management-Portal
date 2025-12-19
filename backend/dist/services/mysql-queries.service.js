"use strict";
/**
 * MySQL Query Service
 * Use SQL queries to fetch data from MySQL database
 *
 * IMPORTANT: Use SQL queries, NOT MongoDB queries!
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllNgos = getAllNgos;
exports.getNgoById = getNgoById;
exports.getNgoByEmail = getNgoByEmail;
exports.getAllDonors = getAllDonors;
exports.getDonorById = getDonorById;
exports.getAllDonations = getAllDonations;
exports.getDonationsByNgoId = getDonationsByNgoId;
exports.getDonationById = getDonationById;
exports.getDonationsByStatus = getDonationsByStatus;
exports.getAllContributions = getAllContributions;
exports.getContributionsByDonationId = getContributionsByDonationId;
exports.getAllPayments = getAllPayments;
exports.getPaymentsByNgoId = getPaymentsByNgoId;
exports.getNearbyDonations = getNearbyDonations;
exports.getDonationsByCategory = getDonationsByCategory;
exports.getDonationCount = getDonationCount;
exports.getDonationsPaginated = getDonationsPaginated;
const mysql_1 = require("../config/mysql");
// =====================================================
// FETCH DATA EXAMPLES - Use SQL queries only!
// =====================================================
/**
 * Example 1: Fetch all NGOs (users)
 * SQL Query: SELECT * FROM users
 */
async function getAllNgos() {
    const sql = `SELECT * FROM users ORDER BY created_at DESC`;
    return await (0, mysql_1.query)(sql);
}
/**
 * Example 2: Fetch NGO by ID
 * SQL Query: SELECT * FROM users WHERE id = ?
 */
async function getNgoById(ngoId) {
    const sql = `SELECT * FROM users WHERE id = ?`;
    return await (0, mysql_1.queryOne)(sql, [ngoId]);
}
/**
 * Example 3: Fetch NGO by email
 * SQL Query: SELECT * FROM users WHERE email = ?
 */
async function getNgoByEmail(email) {
    const sql = `SELECT * FROM users WHERE email = ?`;
    return await (0, mysql_1.queryOne)(sql, [email.toLowerCase()]);
}
/**
 * Example 4: Fetch all donors
 * SQL Query: SELECT * FROM donors
 */
async function getAllDonors() {
    const sql = `SELECT * FROM donors ORDER BY created_at DESC`;
    return await (0, mysql_1.query)(sql);
}
/**
 * Example 5: Fetch donor by ID
 * SQL Query: SELECT * FROM donors WHERE id = ?
 */
async function getDonorById(donorId) {
    const sql = `SELECT * FROM donors WHERE id = ?`;
    return await (0, mysql_1.queryOne)(sql, [donorId]);
}
/**
 * Example 6: Fetch all donations
 * SQL Query: SELECT * FROM donations
 */
async function getAllDonations() {
    const sql = `
    SELECT 
      d.*,
      u.name AS ngo_name,
      u.email AS ngo_email
    FROM donations d
    LEFT JOIN users u ON d.ngo_id = u.id
    ORDER BY d.created_at DESC
  `;
    return await (0, mysql_1.query)(sql);
}
/**
 * Example 7: Fetch donations by NGO ID
 * SQL Query: SELECT * FROM donations WHERE ngo_id = ?
 */
async function getDonationsByNgoId(ngoId) {
    const sql = `
    SELECT 
      d.*,
      (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) AS image_count,
      (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) AS contribution_count
    FROM donations d
    WHERE d.ngo_id = ?
    ORDER BY d.created_at DESC
  `;
    return await (0, mysql_1.query)(sql, [ngoId]);
}
/**
 * Example 8: Fetch donation by ID with all details
 * SQL Query: SELECT with JOINs and subqueries
 */
async function getDonationById(donationId) {
    // Get donation with NGO info
    const sql = `
    SELECT 
      d.*,
      u.name AS ngo_name,
      u.email AS ngo_email,
      u.contact_info AS ngo_contact_info
    FROM donations d
    LEFT JOIN users u ON d.ngo_id = u.id
    WHERE d.id = ?
  `;
    const donation = await (0, mysql_1.queryOne)(sql, [donationId]);
    if (!donation)
        return null;
    // Get images
    const images = await (0, mysql_1.query)(`SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order`, [donationId]);
    donation.images = images.map(img => img.image_path);
    // Get payment details if exists
    const paymentDetails = await (0, mysql_1.queryOne)(`SELECT * FROM donation_payment_details WHERE donation_id = ?`, [donationId]);
    if (paymentDetails) {
        donation.paymentDetails = paymentDetails;
    }
    return donation;
}
/**
 * Example 9: Fetch donations by status
 * SQL Query: SELECT * FROM donations WHERE status = ?
 */
async function getDonationsByStatus(status) {
    const sql = `
    SELECT 
      d.*,
      u.name AS ngo_name,
      u.email AS ngo_email
    FROM donations d
    LEFT JOIN users u ON d.ngo_id = u.id
    WHERE d.status = ?
    ORDER BY d.created_at DESC
  `;
    return await (0, mysql_1.query)(sql, [status]);
}
/**
 * Example 10: Fetch contributions with donor and donation info
 * SQL Query: SELECT with JOINs
 */
async function getAllContributions() {
    const sql = `
    SELECT 
      c.*,
      d.name AS donor_name,
      d.email AS donor_email,
      don.donation_category,
      don.purpose,
      u.name AS ngo_name
    FROM contributions c
    LEFT JOIN donors d ON c.donor_id = d.id
    LEFT JOIN donations don ON c.donation_id = don.id
    LEFT JOIN users u ON don.ngo_id = u.id
    ORDER BY c.created_at DESC
  `;
    return await (0, mysql_1.query)(sql);
}
/**
 * Example 11: Fetch contributions by donation ID
 * SQL Query: SELECT * FROM contributions WHERE donation_id = ?
 */
async function getContributionsByDonationId(donationId) {
    const sql = `
    SELECT 
      c.*,
      d.name AS donor_name,
      d.email AS donor_email,
      d.contact_info AS donor_contact_info
    FROM contributions c
    LEFT JOIN donors d ON c.donor_id = d.id
    WHERE c.donation_id = ?
    ORDER BY c.created_at DESC
  `;
    return await (0, mysql_1.query)(sql, [donationId]);
}
/**
 * Example 12: Fetch payments
 * SQL Query: SELECT * FROM payments
 */
async function getAllPayments() {
    const sql = `
    SELECT 
      p.*,
      d.name AS donor_name,
      d.email AS donor_email,
      don.donation_category,
      don.purpose,
      u.name AS ngo_name
    FROM payments p
    LEFT JOIN donors d ON p.donor_id = d.id
    LEFT JOIN donations don ON p.donation_id = don.id
    LEFT JOIN users u ON p.ngo_id = u.id
    ORDER BY p.created_at DESC
  `;
    return await (0, mysql_1.query)(sql);
}
/**
 * Example 13: Fetch payments by NGO ID
 * SQL Query: SELECT * FROM payments WHERE ngo_id = ?
 */
async function getPaymentsByNgoId(ngoId) {
    const sql = `
    SELECT 
      p.*,
      d.name AS donor_name,
      d.email AS donor_email,
      don.donation_category,
      don.purpose
    FROM payments p
    LEFT JOIN donors d ON p.donor_id = d.id
    LEFT JOIN donations don ON p.donation_id = don.id
    WHERE p.ngo_id = ?
    ORDER BY p.created_at DESC
  `;
    return await (0, mysql_1.query)(sql, [ngoId]);
}
/**
 * Example 14: Fetch nearby donations (using coordinates)
 * SQL Query: SELECT with distance calculation
 */
async function getNearbyDonations(latitude, longitude, radiusKm = 10) {
    const sql = `
    SELECT 
      d.*,
      u.name AS ngo_name,
      (
        6371 * acos(
          cos(radians(?)) * cos(radians(d.location_latitude)) *
          cos(radians(d.location_longitude) - radians(?)) +
          sin(radians(?)) * sin(radians(d.location_latitude))
        )
      ) AS distance_km
    FROM donations d
    LEFT JOIN users u ON d.ngo_id = u.id
    WHERE d.location_latitude IS NOT NULL
      AND d.location_longitude IS NOT NULL
      AND d.status IN ('PENDING', 'CONFIRMED')
    HAVING distance_km <= ?
    ORDER BY distance_km ASC
    LIMIT 50
  `;
    return await (0, mysql_1.query)(sql, [latitude, longitude, latitude, radiusKm]);
}
/**
 * Example 15: Search donations by category
 * SQL Query: SELECT * FROM donations WHERE donation_category = ?
 */
async function getDonationsByCategory(category) {
    const sql = `
    SELECT 
      d.*,
      u.name AS ngo_name,
      u.email AS ngo_email
    FROM donations d
    LEFT JOIN users u ON d.ngo_id = u.id
    WHERE d.donation_category = ?
    ORDER BY d.created_at DESC
  `;
    return await (0, mysql_1.query)(sql, [category]);
}
/**
 * Example 16: Count records
 * SQL Query: SELECT COUNT(*) FROM table
 */
async function getDonationCount() {
    const sql = `SELECT COUNT(*) as count FROM donations`;
    const result = await (0, mysql_1.queryOne)(sql);
    return (result === null || result === void 0 ? void 0 : result.count) || 0;
}
/**
 * Example 17: Fetch with pagination
 * SQL Query: SELECT ... LIMIT ? OFFSET ?
 */
async function getDonationsPaginated(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const sql = `
    SELECT 
      d.*,
      u.name AS ngo_name,
      u.email AS ngo_email
    FROM donations d
    LEFT JOIN users u ON d.ngo_id = u.id
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
  `;
    return await (0, mysql_1.query)(sql, [limit, offset]);
}
// =====================================================
// HOW TO USE IN CONTROLLERS:
// =====================================================
/*
import { getAllDonations, getDonationById } from '../services/mysql-queries.service';

// In your controller:
export const getDonations = async (req: Request, res: Response) => {
  try {
    const donations = await getAllDonations(); // SQL query, not MongoDB!
    return res.json({ success: true, data: donations });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
*/

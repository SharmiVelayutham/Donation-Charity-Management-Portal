"use strict";
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
async function getAllNgos() {
    const sql = `SELECT * FROM users ORDER BY created_at DESC`;
    return await (0, mysql_1.query)(sql);
}
async function getNgoById(ngoId) {
    const sql = `SELECT * FROM users WHERE id = ?`;
    return await (0, mysql_1.queryOne)(sql, [ngoId]);
}
async function getNgoByEmail(email) {
    const sql = `SELECT * FROM users WHERE email = ?`;
    return await (0, mysql_1.queryOne)(sql, [email.toLowerCase()]);
}
async function getAllDonors() {
    const sql = `SELECT * FROM donors ORDER BY created_at DESC`;
    return await (0, mysql_1.query)(sql);
}
async function getDonorById(donorId) {
    const sql = `SELECT * FROM donors WHERE id = ?`;
    return await (0, mysql_1.queryOne)(sql, [donorId]);
}
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
async function getDonationById(donationId) {
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
    const images = await (0, mysql_1.query)(`SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order`, [donationId]);
    donation.images = images.map(img => img.image_path);
    const paymentDetails = await (0, mysql_1.queryOne)(`SELECT * FROM donation_payment_details WHERE donation_id = ?`, [donationId]);
    if (paymentDetails) {
        donation.paymentDetails = paymentDetails;
    }
    return donation;
}
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
async function getDonationCount() {
    const sql = `SELECT COUNT(*) as count FROM donations`;
    const result = await (0, mysql_1.queryOne)(sql);
    return (result === null || result === void 0 ? void 0 : result.count) || 0;
}
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

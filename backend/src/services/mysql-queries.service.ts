/**
 * MySQL Query Service
 * Use SQL queries to fetch data from MySQL database
 * 
 * IMPORTANT: Use SQL queries, NOT MongoDB queries!
 */

import { query, queryOne, insert, update } from '../config/mysql';

// =====================================================
// FETCH DATA EXAMPLES - Use SQL queries only!
// =====================================================

/**
 * Example 1: Fetch all NGOs (users)
 * SQL Query: SELECT * FROM users
 */
export async function getAllNgos() {
  const sql = `SELECT * FROM users ORDER BY created_at DESC`;
  return await query(sql);
}

/**
 * Example 2: Fetch NGO by ID
 * SQL Query: SELECT * FROM users WHERE id = ?
 */
export async function getNgoById(ngoId: number) {
  const sql = `SELECT * FROM users WHERE id = ?`;
  return await queryOne(sql, [ngoId]);
}

/**
 * Example 3: Fetch NGO by email
 * SQL Query: SELECT * FROM users WHERE email = ?
 */
export async function getNgoByEmail(email: string) {
  const sql = `SELECT * FROM users WHERE email = ?`;
  return await queryOne(sql, [email.toLowerCase()]);
}

/**
 * Example 4: Fetch all donors
 * SQL Query: SELECT * FROM donors
 */
export async function getAllDonors() {
  const sql = `SELECT * FROM donors ORDER BY created_at DESC`;
  return await query(sql);
}

/**
 * Example 5: Fetch donor by ID
 * SQL Query: SELECT * FROM donors WHERE id = ?
 */
export async function getDonorById(donorId: number) {
  const sql = `SELECT * FROM donors WHERE id = ?`;
  return await queryOne(sql, [donorId]);
}

/**
 * Example 6: Fetch all donations
 * SQL Query: SELECT * FROM donations
 */
export async function getAllDonations() {
  const sql = `
    SELECT 
      d.*,
      u.name AS ngo_name,
      u.email AS ngo_email
    FROM donations d
    LEFT JOIN users u ON d.ngo_id = u.id
    ORDER BY d.created_at DESC
  `;
  return await query(sql);
}

/**
 * Example 7: Fetch donations by NGO ID
 * SQL Query: SELECT * FROM donations WHERE ngo_id = ?
 */
export async function getDonationsByNgoId(ngoId: number) {
  const sql = `
    SELECT 
      d.*,
      (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) AS image_count,
      (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) AS contribution_count
    FROM donations d
    WHERE d.ngo_id = ?
    ORDER BY d.created_at DESC
  `;
  return await query(sql, [ngoId]);
}

/**
 * Example 8: Fetch donation by ID with all details
 * SQL Query: SELECT with JOINs and subqueries
 */
export async function getDonationById(donationId: number) {
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
  const donation = await queryOne(sql, [donationId]);
  
  if (!donation) return null;
  
  // Get images
  const images = await query<{ image_path: string }>(
    `SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order`,
    [donationId]
  );
  (donation as any).images = images.map(img => img.image_path);
  
  // Get payment details if exists
  const paymentDetails = await queryOne(
    `SELECT * FROM donation_payment_details WHERE donation_id = ?`,
    [donationId]
  );
  if (paymentDetails) {
    (donation as any).paymentDetails = paymentDetails;
  }
  
  return donation;
}

/**
 * Example 9: Fetch donations by status
 * SQL Query: SELECT * FROM donations WHERE status = ?
 */
export async function getDonationsByStatus(status: string) {
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
  return await query(sql, [status]);
}

/**
 * Example 10: Fetch contributions with donor and donation info
 * SQL Query: SELECT with JOINs
 */
export async function getAllContributions() {
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
  return await query(sql);
}

/**
 * Example 11: Fetch contributions by donation ID
 * SQL Query: SELECT * FROM contributions WHERE donation_id = ?
 */
export async function getContributionsByDonationId(donationId: number) {
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
  return await query(sql, [donationId]);
}

/**
 * Example 12: Fetch payments
 * SQL Query: SELECT * FROM payments
 */
export async function getAllPayments() {
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
  return await query(sql);
}

/**
 * Example 13: Fetch payments by NGO ID
 * SQL Query: SELECT * FROM payments WHERE ngo_id = ?
 */
export async function getPaymentsByNgoId(ngoId: number) {
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
  return await query(sql, [ngoId]);
}

/**
 * Example 14: Fetch nearby donations (using coordinates)
 * SQL Query: SELECT with distance calculation
 */
export async function getNearbyDonations(latitude: number, longitude: number, radiusKm: number = 10) {
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
  return await query(sql, [latitude, longitude, latitude, radiusKm]);
}

/**
 * Example 15: Search donations by category
 * SQL Query: SELECT * FROM donations WHERE donation_category = ?
 */
export async function getDonationsByCategory(category: string) {
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
  return await query(sql, [category]);
}

/**
 * Example 16: Count records
 * SQL Query: SELECT COUNT(*) FROM table
 */
export async function getDonationCount() {
  const sql = `SELECT COUNT(*) as count FROM donations`;
  const result = await queryOne<{ count: number }>(sql);
  return result?.count || 0;
}

/**
 * Example 17: Fetch with pagination
 * SQL Query: SELECT ... LIMIT ? OFFSET ?
 */
export async function getDonationsPaginated(page: number = 1, limit: number = 10) {
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
  return await query(sql, [limit, offset]);
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



import { query, queryOne, insert, update } from '../config/mysql';
export async function getAllNgos() {
  const sql = `SELECT * FROM users ORDER BY created_at DESC`;
  return await query(sql);
}
export async function getNgoById(ngoId: number) {
  const sql = `SELECT * FROM users WHERE id = ?`;
  return await queryOne(sql, [ngoId]);
}
export async function getNgoByEmail(email: string) {
  const sql = `SELECT * FROM users WHERE email = ?`;
  return await queryOne(sql, [email.toLowerCase()]);
}
export async function getAllDonors() {
  const sql = `SELECT * FROM donors ORDER BY created_at DESC`;
  return await query(sql);
}
export async function getDonorById(donorId: number) {
  const sql = `SELECT * FROM donors WHERE id = ?`;
  return await queryOne(sql, [donorId]);
}
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
export async function getDonationById(donationId: number) {
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
  const images = await query<{ image_path: string }>(
    `SELECT image_path FROM donation_images WHERE donation_id = ? ORDER BY image_order`,
    [donationId]
  );
  (donation as any).images = images.map(img => img.image_path);
  const paymentDetails = await queryOne(
    `SELECT * FROM donation_payment_details WHERE donation_id = ?`,
    [donationId]
  );
  if (paymentDetails) {
    (donation as any).paymentDetails = paymentDetails;
  }
  
  return donation;
}
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
export async function getDonationCount() {
  const sql = `SELECT COUNT(*) as count FROM donations`;
  const result = await queryOne<{ count: number }>(sql);
  return result?.count || 0;
}
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
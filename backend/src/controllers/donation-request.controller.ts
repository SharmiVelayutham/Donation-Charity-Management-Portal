import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, insert, update } from '../config/mysql';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'donation-requests');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'request-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Valid donation types
const VALID_DONATION_TYPES = ['FOOD', 'FUNDS', 'CLOTHES', 'MEDICINE', 'BOOKS', 'TOYS', 'OTHER'] as const;
type DonationType = typeof VALID_DONATION_TYPES[number];

/**
 * Create donation request (NGO)
 * POST /api/donation-requests
 */
export const createDonationRequest = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    
    // Get NGO profile details
    const ngoProfile = await queryOne<any>(
      'SELECT id, name, address, city, state, pincode FROM users WHERE id = ? AND role = "NGO"',
      [ngoId]
    );

    if (!ngoProfile) {
      return res.status(404).json({ success: false, message: 'NGO profile not found' });
    }

    const { 
      donationType, 
      quantityOrAmount, 
      description,
      bankAccountNumber,
      bankName,
      ifscCode,
      accountHolderName
    } = req.body;

    // Validation
    if (!donationType || !quantityOrAmount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: donationType, quantityOrAmount' 
      });
    }

    // Validate donation type
    const normalizedType = (donationType as string).toUpperCase() as DonationType;
    if (!VALID_DONATION_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid donation type. Valid types: ${VALID_DONATION_TYPES.join(', ')}`,
      });
    }

    // Validate quantity/amount
    const quantity = Number(quantityOrAmount);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity/Amount must be greater than 0' 
      });
    }

    // Build NGO address string
    const ngoAddressParts = [
      ngoProfile.address,
      ngoProfile.city,
      ngoProfile.state,
      ngoProfile.pincode
    ].filter(Boolean);
    const ngoAddress = ngoAddressParts.join(', ');

    // Insert donation request
    const requestId = await insert(
      `INSERT INTO donation_requests (
        ngo_id, ngo_name, ngo_address, donation_type, 
        quantity_or_amount, description, 
        bank_account_number, bank_name, ifsc_code, account_holder_name,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ngoId,
        ngoProfile.name,
        ngoAddress,
        normalizedType,
        quantity,
        description || null,
        bankAccountNumber || null,
        bankName || null,
        ifscCode || null,
        accountHolderName || null,
        'ACTIVE'
      ]
    );

    // Handle image uploads
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await insert(
          'INSERT INTO donation_request_images (request_id, image_path, image_order) VALUES (?, ?, ?)',
          [requestId, files[i].path, i]
        );
      }
    }

    // Fetch created request with images
    const createdRequest = await queryOne<any>(
      'SELECT * FROM donation_requests WHERE id = ?',
      [requestId]
    );

    const images = await query<any>(
      'SELECT image_path FROM donation_request_images WHERE request_id = ? ORDER BY image_order',
      [requestId]
    );

    const requestWithDetails = {
      ...createdRequest,
      images: images.map((img: any) => img.image_path),
    };

    return sendSuccess(res, requestWithDetails, 'Donation request created successfully', 201);
  } catch (error: any) {
    console.error('Error creating donation request:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create donation request',
    });
  }
};

/**
 * Get all ACTIVE donation requests (for donors to view)
 * GET /api/donation-requests
 */
export const getActiveDonationRequests = async (req: any, res: Response) => {
  try {
    const { donationType } = req.query;

    let sql = `
      SELECT dr.*,
        u.email as ngo_email,
        u.contact_info as ngo_contact_info,
        u.phone_number as ngo_phone
      FROM donation_requests dr
      INNER JOIN users u ON dr.ngo_id = u.id
      WHERE dr.status = 'ACTIVE'
    `;
    const params: any[] = [];

    if (donationType) {
      sql += ' AND dr.donation_type = ?';
      params.push(donationType.toUpperCase());
    }

    sql += ' ORDER BY dr.created_at DESC';

    const requests = await query<any>(sql, params);

    // Get images for each request
    const requestsWithImages = await Promise.all(
      requests.map(async (request: any) => {
        const images = await query<any>(
          'SELECT image_path FROM donation_request_images WHERE request_id = ? ORDER BY image_order',
          [request.id]
        );
        return {
          ...request,
          images: images.map((img: any) => img.image_path),
        };
      })
    );

    return sendSuccess(res, requestsWithImages, 'Active donation requests fetched');
  } catch (error: any) {
    console.error('Error fetching donation requests:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donation requests',
    });
  }
};

/**
 * Get donation request by ID
 * GET /api/donation-requests/:id
 */
export const getDonationRequestById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid request id' });
    }

    const request = await queryOne<any>(
      `SELECT dr.*,
        u.email as ngo_email,
        u.contact_info as ngo_contact_info,
        u.phone_number as ngo_phone
      FROM donation_requests dr
      INNER JOIN users u ON dr.ngo_id = u.id
      WHERE dr.id = ?`,
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Donation request not found' });
    }

    // Get images
    const images = await query<any>(
      'SELECT image_path FROM donation_request_images WHERE request_id = ? ORDER BY image_order',
      [requestId]
    );

    const requestWithDetails = {
      ...request,
      images: images.map((img: any) => img.image_path),
    };

    return sendSuccess(res, requestWithDetails, 'Donation request fetched');
  } catch (error: any) {
    console.error('Error fetching donation request:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donation request',
    });
  }
};

/**
 * Get all donation requests for logged-in NGO
 * GET /api/donation-requests/my-requests
 */
export const getMyDonationRequests = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const { status } = req.query;

    let sql = `
      SELECT dr.*
      FROM donation_requests dr
      WHERE dr.ngo_id = ?
    `;
    const params: any[] = [ngoId];

    if (status) {
      sql += ' AND dr.status = ?';
      params.push(typeof status === 'string' ? status.toUpperCase() : String(status).toUpperCase());
    }

    sql += ' ORDER BY dr.created_at DESC';

    const requests = await query<any>(sql, params);

    // Get images for each request
    const requestsWithImages = await Promise.all(
      requests.map(async (request: any) => {
        const images = await query<any>(
          'SELECT image_path FROM donation_request_images WHERE request_id = ? ORDER BY image_order',
          [request.id]
        );
        return {
          ...request,
          images: images.map((img: any) => img.image_path),
        };
      })
    );

    return sendSuccess(res, requestsWithImages, 'My donation requests fetched');
  } catch (error: any) {
    console.error('Error fetching my donation requests:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch donation requests',
    });
  }
};

/**
 * Donor submits donation to a donation request
 * POST /api/donation-requests/:id/contribute
 */
export const contributeToDonationRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);
    const donorId = parseInt(req.user!.id);

    if (isNaN(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid request id' });
    }

    const { quantityOrAmount, pickupLocation, pickupDate, pickupTime, notes } = req.body;

    // Validation
    if (!quantityOrAmount || !pickupLocation || !pickupDate || !pickupTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: quantityOrAmount, pickupLocation, pickupDate, pickupTime'
      });
    }

    // Validate quantity/amount
    const quantity = Number(quantityOrAmount);
    if (Number.isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity/Amount must be greater than 0'
      });
    }

    // Validate pickup date/time
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
    if (isNaN(pickupDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pickup date/time format'
      });
    }

    if (pickupDateTime.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Pickup date/time must be in the future'
      });
    }

    // Check if request exists and is active
    const request = await queryOne<any>(
      'SELECT * FROM donation_requests WHERE id = ?',
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Donation request not found' });
    }

    if (request.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot contribute to a closed donation request'
      });
    }

    // Check if donor already contributed to this request
    const existingContribution = await queryOne<any>(
      'SELECT id FROM donation_request_contributions WHERE request_id = ? AND donor_id = ?',
      [requestId, donorId]
    );

    if (existingContribution) {
      return res.status(409).json({
        success: false,
        message: 'You have already contributed to this donation request'
      });
    }

    // Insert contribution
    const contributionId = await insert(
      `INSERT INTO donation_request_contributions (
        request_id, donor_id, quantity_or_amount, pickup_location,
        pickup_date, pickup_time, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        donorId,
        quantity,
        pickupLocation.trim(),
        pickupDate,
        pickupTime,
        notes || null,
        'PENDING'
      ]
    );

    // Handle image uploads
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await insert(
          'INSERT INTO donation_request_contribution_images (contribution_id, image_path, image_order) VALUES (?, ?, ?)',
          [contributionId, files[i].path, i]
        );
      }
    }

    // Fetch created contribution with images
    const contribution = await queryOne<any>(
      `SELECT drc.*,
        d.name as donor_name,
        d.email as donor_email,
        dr.ngo_name,
        dr.ngo_address,
        dr.donation_type
      FROM donation_request_contributions drc
      INNER JOIN donors d ON drc.donor_id = d.id
      INNER JOIN donation_requests dr ON drc.request_id = dr.id
      WHERE drc.id = ?`,
      [contributionId]
    );

    const images = await query<any>(
      'SELECT image_path FROM donation_request_contribution_images WHERE contribution_id = ? ORDER BY image_order',
      [contributionId]
    );

    const contributionWithDetails = {
      ...contribution,
      images: images.map((img: any) => img.image_path),
    };

    return sendSuccess(res, contributionWithDetails, 'Donation submitted successfully', 201);
  } catch (error: any) {
    console.error('Error submitting donation:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit donation',
    });
  }
};

/**
 * Update donation request status (NGO can close their request)
 * PUT /api/donation-requests/:id/status
 */
export const updateDonationRequestStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);
    const ngoId = parseInt(req.user!.id);
    const { status } = req.body;

    const statusStr = typeof status === 'string' ? status : String(status);
    if (!statusStr || !['ACTIVE', 'CLOSED'].includes(statusStr.toUpperCase())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be ACTIVE or CLOSED' 
      });
    }

    // Verify ownership
    const request = await queryOne<any>(
      'SELECT * FROM donation_requests WHERE id = ?',
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Donation request not found' });
    }

    if (request.ngo_id !== ngoId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Update status
    await update(
      'UPDATE donation_requests SET status = ? WHERE id = ?',
      [statusStr.toUpperCase(), requestId]
    );

    const updated = await queryOne<any>(
      'SELECT * FROM donation_requests WHERE id = ?',
      [requestId]
    );

    return sendSuccess(res, updated, 'Donation request status updated');
  } catch (error: any) {
    console.error('Error updating donation request status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update donation request status',
    });
  }
};


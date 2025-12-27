import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { query, queryOne, insert, update } from '../config/mysql';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for slider image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'sliders');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'slider-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

/**
 * Get all active sliders (Public)
 * GET /api/sliders
 */
export const getAllSliders = async (req: AuthRequest, res: Response) => {
  try {
    const sliders = await query<any>(
      `SELECT * FROM sliders 
       WHERE is_active = TRUE 
       ORDER BY display_order ASC, created_at DESC`
    );

    return sendSuccess(res, sliders, 'Sliders retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching sliders:', error);
    return sendError(res, error.message || 'Failed to fetch sliders', 500);
  }
};

/**
 * Get all sliders including inactive (Admin only)
 * GET /api/sliders/all
 */
export const getAllSlidersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const sliders = await query<any>(
      `SELECT * FROM sliders 
       ORDER BY display_order ASC, created_at DESC`
    );

    return sendSuccess(res, sliders, 'Sliders retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching sliders:', error);
    return sendError(res, error.message || 'Failed to fetch sliders', 500);
  }
};

/**
 * Create slider (Admin only)
 * POST /api/sliders
 */
export const createSlider = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = parseInt(req.user!.id);
    
    // Verify user is Admin
    const admin = await queryOne<any>(
      'SELECT id FROM admins WHERE id = ?',
      [adminId]
    );

    if (!admin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only admins can create sliders' 
      });
    }

    const { title, tagline, description, button1_text, button1_link, button2_text, button2_link, display_order } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }

    // Get image URL if uploaded
    const imageUrl = req.file 
      ? `/uploads/sliders/${req.file.filename}` 
      : null;

    if (!imageUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Image is required' 
      });
    }

    // Insert slider
    const insertId = await insert(
      `INSERT INTO sliders (title, tagline, description, image_url, button1_text, button1_link, button2_text, button2_link, display_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        tagline || null,
        description || null,
        imageUrl,
        button1_text || null,
        button1_link || null,
        button2_text || null,
        button2_link || null,
        display_order || 0,
        adminId
      ]
    );

    // Get created slider
    const slider = await queryOne<any>(
      'SELECT * FROM sliders WHERE id = ?',
      [insertId]
    );

    return sendSuccess(res, slider, 'Slider created successfully', 201);
  } catch (error: any) {
    console.error('Error creating slider:', error);
    return sendError(res, error.message || 'Failed to create slider', 500);
  }
};

/**
 * Update slider (Admin only)
 * PUT /api/sliders/:id
 */
export const updateSlider = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = parseInt(req.user!.id);
    const sliderId = parseInt(req.params.id);

    // Check if slider exists
    const existingSlider = await queryOne<any>(
      'SELECT * FROM sliders WHERE id = ?',
      [sliderId]
    );

    if (!existingSlider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Slider not found' 
      });
    }

    const { title, tagline, description, button1_text, button1_link, button2_text, button2_link, display_order, is_active } = req.body;

    // Get image URL if uploaded (keep existing if no new image)
    const imageUrl = req.file 
      ? `/uploads/sliders/${req.file.filename}` 
      : existingSlider.image_url;

    // Update slider
    await update(
      `UPDATE sliders 
       SET title = ?, tagline = ?, description = ?, image_url = ?, 
           button1_text = ?, button1_link = ?, button2_text = ?, button2_link = ?,
           display_order = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title || existingSlider.title,
        tagline !== undefined ? tagline : existingSlider.tagline,
        description !== undefined ? description : existingSlider.description,
        imageUrl,
        button1_text !== undefined ? button1_text : existingSlider.button1_text,
        button1_link !== undefined ? button1_link : existingSlider.button1_link,
        button2_text !== undefined ? button2_text : existingSlider.button2_text,
        button2_link !== undefined ? button2_link : existingSlider.button2_link,
        display_order !== undefined ? display_order : existingSlider.display_order,
        is_active !== undefined ? is_active : existingSlider.is_active,
        sliderId
      ]
    );

    // Get updated slider
    const slider = await queryOne<any>(
      'SELECT * FROM sliders WHERE id = ?',
      [sliderId]
    );

    return sendSuccess(res, slider, 'Slider updated successfully');
  } catch (error: any) {
    console.error('Error updating slider:', error);
    return sendError(res, error.message || 'Failed to update slider', 500);
  }
};

/**
 * Delete slider (Admin only)
 * DELETE /api/sliders/:id
 */
export const deleteSlider = async (req: AuthRequest, res: Response) => {
  try {
    const sliderId = parseInt(req.params.id);

    // Check if slider exists
    const existingSlider = await queryOne<any>(
      'SELECT * FROM sliders WHERE id = ?',
      [sliderId]
    );

    if (!existingSlider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Slider not found' 
      });
    }

    // Delete slider
    await update(
      'DELETE FROM sliders WHERE id = ?',
      [sliderId]
    );

    return sendSuccess(res, null, 'Slider deleted successfully');
  } catch (error: any) {
    console.error('Error deleting slider:', error);
    return sendError(res, error.message || 'Failed to delete slider', 500);
  }
};


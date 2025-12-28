"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSlider = exports.updateSlider = exports.createSlider = exports.getAllSlidersAdmin = exports.getAllSliders = exports.upload = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'sliders');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'slider-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});
const getAllSliders = async (req, res) => {
    try {
        const sliders = await (0, mysql_1.query)(`SELECT * FROM sliders 
       WHERE is_active = TRUE 
       ORDER BY display_order ASC, created_at DESC`);
        return (0, response_1.sendSuccess)(res, sliders, 'Sliders retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching sliders:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch sliders', 500);
    }
};
exports.getAllSliders = getAllSliders;
const getAllSlidersAdmin = async (req, res) => {
    try {
        const sliders = await (0, mysql_1.query)(`SELECT * FROM sliders 
       ORDER BY display_order ASC, created_at DESC`);
        return (0, response_1.sendSuccess)(res, sliders, 'Sliders retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching sliders:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch sliders', 500);
    }
};
exports.getAllSlidersAdmin = getAllSlidersAdmin;
const createSlider = async (req, res) => {
    try {
        const adminId = parseInt(req.user.id);
        const admin = await (0, mysql_1.queryOne)('SELECT id FROM admins WHERE id = ?', [adminId]);
        if (!admin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can create sliders'
            });
        }
        const { title, tagline, description, button1_text, button1_link, button2_text, button2_link, display_order } = req.body;
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }
        const imageUrl = req.file
            ? `/uploads/sliders/${req.file.filename}`
            : null;
        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'Image is required'
            });
        }
        const insertId = await (0, mysql_1.insert)(`INSERT INTO sliders (title, tagline, description, image_url, button1_text, button1_link, button2_text, button2_link, display_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
        ]);
        const slider = await (0, mysql_1.queryOne)('SELECT * FROM sliders WHERE id = ?', [insertId]);
        return (0, response_1.sendSuccess)(res, slider, 'Slider created successfully', 201);
    }
    catch (error) {
        console.error('Error creating slider:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to create slider', 500);
    }
};
exports.createSlider = createSlider;
const updateSlider = async (req, res) => {
    try {
        const adminId = parseInt(req.user.id);
        const sliderId = parseInt(req.params.id);
        const existingSlider = await (0, mysql_1.queryOne)('SELECT * FROM sliders WHERE id = ?', [sliderId]);
        if (!existingSlider) {
            return res.status(404).json({
                success: false,
                message: 'Slider not found'
            });
        }
        const { title, tagline, description, button1_text, button1_link, button2_text, button2_link, display_order, is_active } = req.body;
        const imageUrl = req.file
            ? `/uploads/sliders/${req.file.filename}`
            : existingSlider.image_url;
        await (0, mysql_1.update)(`UPDATE sliders 
       SET title = ?, tagline = ?, description = ?, image_url = ?, 
           button1_text = ?, button1_link = ?, button2_text = ?, button2_link = ?,
           display_order = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`, [
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
        ]);
        const slider = await (0, mysql_1.queryOne)('SELECT * FROM sliders WHERE id = ?', [sliderId]);
        return (0, response_1.sendSuccess)(res, slider, 'Slider updated successfully');
    }
    catch (error) {
        console.error('Error updating slider:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to update slider', 500);
    }
};
exports.updateSlider = updateSlider;
const deleteSlider = async (req, res) => {
    try {
        const sliderId = parseInt(req.params.id);
        const existingSlider = await (0, mysql_1.queryOne)('SELECT * FROM sliders WHERE id = ?', [sliderId]);
        if (!existingSlider) {
            return res.status(404).json({
                success: false,
                message: 'Slider not found'
            });
        }
        await (0, mysql_1.update)('DELETE FROM sliders WHERE id = ?', [sliderId]);
        return (0, response_1.sendSuccess)(res, null, 'Slider deleted successfully');
    }
    catch (error) {
        console.error('Error deleting slider:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to delete slider', 500);
    }
};
exports.deleteSlider = deleteSlider;

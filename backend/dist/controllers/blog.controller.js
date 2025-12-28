"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlog = exports.updateBlog = exports.getMyBlogs = exports.getBlogById = exports.getAllBlogs = exports.createBlog = exports.upload = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'blogs');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'blog-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
const createBlog = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        const ngo = await (0, mysql_1.queryOne)('SELECT id, name FROM users WHERE id = ? AND role = "NGO"', [ngoId]);
        if (!ngo) {
            return res.status(403).json({
                success: false,
                message: 'Only NGOs can create blogs'
            });
        }
        const { title, content, category } = req.body;
        if (!title || !content || !category) {
            return res.status(400).json({
                success: false,
                message: 'Title, content, and category are required'
            });
        }
        const excerpt = content.length > 150
            ? content.substring(0, 150) + '...'
            : content;
        const imageUrl = req.file
            ? `/uploads/blogs/${req.file.filename}`
            : null;
        const insertId = await (0, mysql_1.insert)(`INSERT INTO blogs (title, content, image_url, category, author_ngo_id, excerpt)
       VALUES (?, ?, ?, ?, ?, ?)`, [title, content, imageUrl || null, category, ngoId, excerpt]);
        if (!insertId) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create blog'
            });
        }
        const blog = await (0, mysql_1.queryOne)(`SELECT 
        b.*,
        u.name as author_name,
        u.ngo_id as author_ngo_id_display
       FROM blogs b
       JOIN users u ON b.author_ngo_id = u.id
       WHERE b.id = ?`, [insertId]);
        return (0, response_1.sendSuccess)(res, blog, 'Blog created successfully', 201);
    }
    catch (error) {
        console.error('Error creating blog:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to create blog', 500);
    }
};
exports.createBlog = createBlog;
const getAllBlogs = async (req, res) => {
    try {
        const { category, search } = req.query;
        let sql = `
      SELECT 
        b.*,
        u.name as author_name,
        u.ngo_id as author_ngo_id_display
      FROM blogs b
      JOIN users u ON b.author_ngo_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (category) {
            sql += ' AND b.category = ?';
            params.push(category);
        }
        if (search) {
            sql += ' AND (b.title LIKE ? OR b.content LIKE ? OR b.excerpt LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        sql += ' ORDER BY b.created_at DESC';
        const blogs = await (0, mysql_1.query)(sql, params);
        const categoryCounts = await (0, mysql_1.query)(`SELECT category, COUNT(*) as count 
       FROM blogs 
       GROUP BY category 
       ORDER BY category`);
        return (0, response_1.sendSuccess)(res, {
            blogs,
            categoryCounts
        }, 'Blogs retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching blogs:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch blogs', 500);
    }
};
exports.getAllBlogs = getAllBlogs;
const getBlogById = async (req, res) => {
    try {
        const blogId = parseInt(req.params.id);
        const blog = await (0, mysql_1.queryOne)(`SELECT 
        b.*,
        u.name as author_name,
        u.ngo_id as author_ngo_id_display
       FROM blogs b
       JOIN users u ON b.author_ngo_id = u.id
       WHERE b.id = ?`, [blogId]);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }
        const relatedBlogs = await (0, mysql_1.query)(`SELECT 
        b.id,
        b.title,
        b.image_url,
        b.created_at,
        u.name as author_name
       FROM blogs b
       JOIN users u ON b.author_ngo_id = u.id
       WHERE b.category = ? AND b.id != ?
       ORDER BY b.created_at DESC
       LIMIT 4`, [blog.category, blogId]);
        return (0, response_1.sendSuccess)(res, {
            blog,
            relatedBlogs
        }, 'Blog retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching blog:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch blog', 500);
    }
};
exports.getBlogById = getBlogById;
const getMyBlogs = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        const blogs = await (0, mysql_1.query)(`SELECT * FROM blogs 
       WHERE author_ngo_id = ? 
       ORDER BY created_at DESC`, [ngoId]);
        return (0, response_1.sendSuccess)(res, blogs, 'Blogs retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching my blogs:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to fetch blogs', 500);
    }
};
exports.getMyBlogs = getMyBlogs;
const updateBlog = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        const blogId = parseInt(req.params.id);
        const existingBlog = await (0, mysql_1.queryOne)('SELECT * FROM blogs WHERE id = ? AND author_ngo_id = ?', [blogId, ngoId]);
        if (!existingBlog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found or you do not have permission to edit it'
            });
        }
        const { title, content, category } = req.body;
        if (!title || !content || !category) {
            return res.status(400).json({
                success: false,
                message: 'Title, content, and category are required'
            });
        }
        const excerpt = content.length > 150
            ? content.substring(0, 150) + '...'
            : content;
        const imageUrl = req.file
            ? `/uploads/blogs/${req.file.filename}`
            : existingBlog.image_url;
        await (0, mysql_1.update)(`UPDATE blogs 
       SET title = ?, content = ?, image_url = ?, category = ?, excerpt = ?, updated_at = NOW()
       WHERE id = ? AND author_ngo_id = ?`, [title, content, imageUrl || null, category, excerpt, blogId, ngoId]);
        const blog = await (0, mysql_1.queryOne)(`SELECT 
        b.*,
        u.name as author_name,
        u.ngo_id as author_ngo_id_display
       FROM blogs b
       JOIN users u ON b.author_ngo_id = u.id
       WHERE b.id = ?`, [blogId]);
        return (0, response_1.sendSuccess)(res, blog, 'Blog updated successfully');
    }
    catch (error) {
        console.error('Error updating blog:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to update blog', 500);
    }
};
exports.updateBlog = updateBlog;
const deleteBlog = async (req, res) => {
    try {
        const ngoId = parseInt(req.user.id);
        const blogId = parseInt(req.params.id);
        const existingBlog = await (0, mysql_1.queryOne)('SELECT * FROM blogs WHERE id = ? AND author_ngo_id = ?', [blogId, ngoId]);
        if (!existingBlog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found or you do not have permission to delete it'
            });
        }
        await (0, mysql_1.update)('DELETE FROM blogs WHERE id = ? AND author_ngo_id = ?', [blogId, ngoId]);
        return (0, response_1.sendSuccess)(res, null, 'Blog deleted successfully');
    }
    catch (error) {
        console.error('Error deleting blog:', error);
        return (0, response_1.sendError)(res, error.message || 'Failed to delete blog', 500);
    }
};
exports.deleteBlog = deleteBlog;

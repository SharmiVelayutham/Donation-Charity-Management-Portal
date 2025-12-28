import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { query, queryOne, insert, update } from '../config/mysql';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'blogs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
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
export const createBlog = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const ngo = await queryOne<any>(
      'SELECT id, name FROM users WHERE id = ? AND role = "NGO"',
      [ngoId]
    );

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
    const insertId = await insert(
      `INSERT INTO blogs (title, content, image_url, category, author_ngo_id, excerpt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, imageUrl || null, category, ngoId, excerpt]
    );

    if (!insertId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create blog' 
      });
    }
    const blog = await queryOne<any>(
      `SELECT 
        b.*,
        u.name as author_name,
        u.ngo_id as author_ngo_id_display
       FROM blogs b
       JOIN users u ON b.author_ngo_id = u.id
       WHERE b.id = ?`,
      [insertId]
    );

    return sendSuccess(res, blog, 'Blog created successfully', 201);
  } catch (error: any) {
    console.error('Error creating blog:', error);
    return sendError(res, error.message || 'Failed to create blog', 500);
  }
};
export const getAllBlogs = async (req: AuthRequest, res: Response) => {
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
    const params: any[] = [];
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

    const blogs = await query<any>(sql, params);
    const categoryCounts = await query<any>(
      `SELECT category, COUNT(*) as count 
       FROM blogs 
       GROUP BY category 
       ORDER BY category`
    );

    return sendSuccess(res, {
      blogs,
      categoryCounts
    }, 'Blogs retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching blogs:', error);
    return sendError(res, error.message || 'Failed to fetch blogs', 500);
  }
};
export const getBlogById = async (req: AuthRequest, res: Response) => {
  try {
    const blogId = parseInt(req.params.id);

    const blog = await queryOne<any>(
      `SELECT 
        b.*,
        u.name as author_name,
        u.ngo_id as author_ngo_id_display
       FROM blogs b
       JOIN users u ON b.author_ngo_id = u.id
       WHERE b.id = ?`,
      [blogId]
    );

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }
    const relatedBlogs = await query<any>(
      `SELECT 
        b.id,
        b.title,
        b.image_url,
        b.created_at,
        u.name as author_name
       FROM blogs b
       JOIN users u ON b.author_ngo_id = u.id
       WHERE b.category = ? AND b.id != ?
       ORDER BY b.created_at DESC
       LIMIT 4`,
      [blog.category, blogId]
    );

    return sendSuccess(res, {
      blog,
      relatedBlogs
    }, 'Blog retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching blog:', error);
    return sendError(res, error.message || 'Failed to fetch blog', 500);
  }
};
export const getMyBlogs = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);

    const blogs = await query<any>(
      `SELECT * FROM blogs 
       WHERE author_ngo_id = ? 
       ORDER BY created_at DESC`,
      [ngoId]
    );

    return sendSuccess(res, blogs, 'Blogs retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching my blogs:', error);
    return sendError(res, error.message || 'Failed to fetch blogs', 500);
  }
};
export const updateBlog = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const blogId = parseInt(req.params.id);
    const existingBlog = await queryOne<any>(
      'SELECT * FROM blogs WHERE id = ? AND author_ngo_id = ?',
      [blogId, ngoId]
    );

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
    await update(
      `UPDATE blogs 
       SET title = ?, content = ?, image_url = ?, category = ?, excerpt = ?, updated_at = NOW()
       WHERE id = ? AND author_ngo_id = ?`,
      [title, content, imageUrl || null, category, excerpt, blogId, ngoId]
    );
    const blog = await queryOne<any>(
      `SELECT 
        b.*,
        u.name as author_name,
        u.ngo_id as author_ngo_id_display
       FROM blogs b
       JOIN users u ON b.author_ngo_id = u.id
       WHERE b.id = ?`,
      [blogId]
    );

    return sendSuccess(res, blog, 'Blog updated successfully');
  } catch (error: any) {
    console.error('Error updating blog:', error);
    return sendError(res, error.message || 'Failed to update blog', 500);
  }
};
export const deleteBlog = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = parseInt(req.user!.id);
    const blogId = parseInt(req.params.id);
    const existingBlog = await queryOne<any>(
      'SELECT * FROM blogs WHERE id = ? AND author_ngo_id = ?',
      [blogId, ngoId]
    );

    if (!existingBlog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found or you do not have permission to delete it' 
      });
    }
    await update(
      'DELETE FROM blogs WHERE id = ? AND author_ngo_id = ?',
      [blogId, ngoId]
    );

    return sendSuccess(res, null, 'Blog deleted successfully');
  } catch (error: any) {
    console.error('Error deleting blog:', error);
    return sendError(res, error.message || 'Failed to delete blog', 500);
  }
};


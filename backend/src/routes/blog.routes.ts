import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  getMyBlogs,
  updateBlog,
  deleteBlog,
  upload
} from '../controllers/blog.controller';

const router = Router();

console.log('🔧 Setting up blog routes...');

// Public routes
router.get('/', getAllBlogs);
router.get('/:id', getBlogById);

// Protected routes: NGO only
router.post(
  '/',
  authenticate,
  requireRole(['NGO']),
  upload.single('image'),
  createBlog
);

router.get(
  '/my-blogs',
  authenticate,
  requireRole(['NGO']),
  getMyBlogs
);

router.put(
  '/:id',
  authenticate,
  requireRole(['NGO']),
  upload.single('image'),
  updateBlog
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['NGO']),
  deleteBlog
);

console.log('✅ Blog routes configured successfully');

export default router;


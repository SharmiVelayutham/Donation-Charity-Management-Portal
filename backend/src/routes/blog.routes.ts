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
router.get('/', getAllBlogs);
router.get('/:id', getBlogById);
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

export default router;


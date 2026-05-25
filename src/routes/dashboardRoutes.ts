import { Router, type Router as RouterType } from 'express';
import {
  exportDashboardReport,
  getActivityReport,
  getDashboardSummary,
  getSalesReport,
  getTaskReport
} from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router: RouterType = Router();

router.use(authenticate);

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Get dashboard summary KPIs
 *     description: Returns tenant-scoped CRM totals, period activity, pipeline health, task health, and recent activities.
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional start date for period metrics.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional end date for period metrics.
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
 */
router.get('/summary', getDashboardSummary);

/**
 * @swagger
 * /dashboard/sales:
 *   get:
 *     summary: Get sales analytics report
 *     description: Returns tenant-scoped sales breakdowns by status, stage, owner, source, industry, and won revenue trend.
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Sales report retrieved successfully
 */
router.get('/sales', getSalesReport);

/**
 * @swagger
 * /dashboard/tasks:
 *   get:
 *     summary: Get task analytics report
 *     description: Returns tenant-scoped task breakdowns by status, priority, type, owner, and overdue count.
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Task report retrieved successfully
 */
router.get('/tasks', getTaskReport);

/**
 * @swagger
 * /dashboard/activities:
 *   get:
 *     summary: Get activity analytics report
 *     description: Returns tenant-scoped activity counts by type, user, and time trend.
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Activity report retrieved successfully
 */
router.get('/activities', getActivityReport);

/**
 * @swagger
 * /dashboard/export:
 *   get:
 *     summary: Export a dashboard report as CSV
 *     description: Admin and sales manager endpoint. Exports tenant-scoped sales or task report rows as CSV.
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sales, tasks]
 *           default: sales
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: CSV report file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export', authorize('admin', 'sales_manager'), exportDashboardReport);

export default router;

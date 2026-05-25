/**
 * Deal management routes
 * Handles CRUD operations for deals
 */
import { Router, type Router as RouterType } from 'express';
import {
  listDeals,
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal,
  getDealActivities,
  getDealTasks,
  getDealStats,
  updateDealStage,
  bulkUpdateStage
} from '../controllers/dealController';
import { authenticate, authorize } from '../middleware/auth';

const router: RouterType = Router();

router.use(authenticate);

/**
 * @swagger
 * /deals:
 *   get:
 *     summary: List organization deals
 *     description: Returns deals scoped to the authenticated user's organization.
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: owner_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: stage_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, won, lost]
 *     responses:
 *       200:
 *         description: Deals retrieved successfully
 */
router.get('/', listDeals);

/**
 * @swagger
 * /deals/{id}:
 *   get:
 *     summary: Get deal by ID
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deal retrieved successfully
 *       404:
 *         description: Deal not found
 */
router.get('/:id', getDealById);

/**
 * @swagger
 * /deals:
 *   post:
 *     summary: Create a deal
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               value:
 *                 type: number
 *               currency:
 *                 type: string
 *               expected_close_date:
 *                 type: string
 *                 format: date-time
 *               stage_id:
 *                 type: string
 *               source:
 *                 type: string
 *               industry:
 *                 type: string
 *               company_id:
 *                 type: string
 *               contact_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Deal created successfully
 */
router.post('/', authorize('admin', 'sales_manager', 'sales_rep'), createDeal);

/**
 * @swagger
 * /deals/{id}:
 *   patch:
 *     summary: Update deal
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               value:
 *                 type: number
 *               currency:
 *                 type: string
 *               expected_close_date:
 *                 type: string
 *                 format: date-time
 *               stage_id:
 *                 type: string
 *               source:
 *                 type: string
 *               industry:
 *                 type: string
 *               company_id:
 *                 type: string
 *               contact_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deal updated successfully
 */
router.patch('/:id', authorize('admin', 'sales_manager', 'sales_rep'), updateDeal);

/**
 * @swagger
 * /deals/{id}:
 *   delete:
 *     summary: Delete deal
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deal deleted successfully
 *       403:
 *         description: Admin or sales_manager access required
 */
router.delete('/:id', authorize('admin', 'sales_manager'), deleteDeal);

/**
 * @swagger
 * /deals/{id}/activities:
 *   get:
 *     summary: Get deal activities
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activities retrieved successfully
 */
router.get('/:id/activities', getDealActivities);

/**
 * @swagger
 * /deals/{id}/tasks:
 *   get:
 *     summary: Get deal tasks
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 */
router.get('/:id/tasks', getDealTasks);

/**
 * @swagger
 * /deals/{id}/stats:
 *   get:
 *     summary: Get deal stats
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 */
router.get('/:id/stats', getDealStats);

/**
 * @swagger
 * /deals/{id}/stage:
 *   post:
 *     summary: Update deal stage
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stage_id]
 *             properties:
 *               stage_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stage updated successfully
 */
router.post('/:id/stage', authorize('admin', 'sales_manager', 'sales_rep'), updateDealStage);

/**
 * @swagger
 * /deals/bulk-stage:
 *   post:
 *     summary: Bulk update deal stage
 *     tags: [Deals]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deal_ids, stage_id]
 *             properties:
 *               deal_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               stage_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deals updated successfully
 */
router.post('/bulk-stage', authorize('admin', 'sales_manager'), bulkUpdateStage);

export default router;

/**
 * Company management routes
 * Handles CRUD operations for companies
 */
import { Router, type Router as RouterType } from 'express';
import {
  listCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyContacts,
  getCompanyDeals,
  getCompanyStats,
  exportCompanies
} from '../controllers/companyController';
import { authenticate, authorize } from '../middleware/auth';

const router: RouterType = Router();

router.use(authenticate);

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: List organization companies
 *     description: Returns companies scoped to the authenticated user's organization.
 *     tags: [Companies]
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
 *         name: owner_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 */
router.get('/', listCompanies);

/**
 * @swagger
 * /companies/export:
 *   get:
 *     summary: Export organization companies
 *     description: Exports companies scoped to the authenticated user's organization.
 *     tags: [Companies]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *     responses:
 *       200:
 *         description: File downloaded
 */
router.get('/export', authorize('admin', 'sales_manager'), exportCompanies);

/**
 * @swagger
 * /companies/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Companies]
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
 *         description: Company retrieved successfully
 *       404:
 *         description: Company not found
 */
router.get('/:id', getCompanyById);

/**
 * @swagger
 * /companies:
 *   post:
 *     summary: Create a company
 *     tags: [Companies]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               industry:
 *                 type: string
 *               website:
 *                 type: string
 *               notes:
 *                 type: string
 *               contact_person:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 */
router.post('/', authorize('admin', 'sales_manager', 'sales_rep'), createCompany);

/**
 * @swagger
 * /companies/{id}:
 *   patch:
 *     summary: Update company
 *     tags: [Companies]
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
 *               name:
 *                 type: string
 *               industry:
 *                 type: string
 *               website:
 *                 type: string
 *               notes:
 *                 type: string
 *               contact_person:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company updated successfully
 */
router.patch('/:id', authorize('admin', 'sales_manager', 'sales_rep'), updateCompany);

/**
 * @swagger
 * /companies/{id}:
 *   delete:
 *     summary: Delete company
 *     tags: [Companies]
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
 *         description: Company deleted successfully
 *       403:
 *         description: Admin or sales_manager access required
 */
router.delete('/:id', authorize('admin', 'sales_manager'), deleteCompany);

/**
 * @swagger
 * /companies/{id}/contacts:
 *   get:
 *     summary: Get company contacts
 *     tags: [Companies]
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
 *         description: Contacts retrieved successfully
 */
router.get('/:id/contacts', getCompanyContacts);

/**
 * @swagger
 * /companies/{id}/deals:
 *   get:
 *     summary: Get company deals
 *     tags: [Companies]
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
 *         description: Deals retrieved successfully
 */
router.get('/:id/deals', getCompanyDeals);

/**
 * @swagger
 * /companies/{id}/stats:
 *   get:
 *     summary: Get company stats
 *     tags: [Companies]
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
router.get('/:id/stats', getCompanyStats);

export default router;

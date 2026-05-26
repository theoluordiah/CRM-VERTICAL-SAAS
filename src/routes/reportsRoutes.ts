import { Router, type Router as RouterType } from 'express';
import {
  exportReports,
  getReports,
  getReportsContactTemperature,
  getReportsDealSourceMix,
  getReportsPipelineByStage,
  getReportsSummary
} from '../controllers/reportsController';
import { authenticate, authorize } from '../middleware/auth';

const router: RouterType = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Reports
 *     description: Simple pipeline reports
 */

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Get complete reports page data
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reports page data
 */
router.get('/', getReports);

/**
 * @swagger
 * /reports/summary:
 *   get:
 *     summary: Get report summary numbers
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report summary
 */
router.get('/summary', getReportsSummary);

/**
 * @swagger
 * /reports/pipeline-by-stage:
 *   get:
 *     summary: Get deal count and value by stage
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pipeline by stage report
 */
router.get('/pipeline-by-stage', getReportsPipelineByStage);

/**
 * @swagger
 * /reports/deal-source-mix:
 *   get:
 *     summary: Get deal source mix
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deal source mix
 */
router.get('/deal-source-mix', getReportsDealSourceMix);

/**
 * @swagger
 * /reports/contact-temperature:
 *   get:
 *     summary: Get contact temperature counts
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contact temperature report
 */
router.get('/contact-temperature', getReportsContactTemperature);

/**
 * @swagger
 * /reports/export:
 *   get:
 *     summary: Export report data as CSV
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [summary, pipeline-by-stage, deal-source-mix, contact-temperature]
 *           default: summary
 *     responses:
 *       200:
 *         description: CSV export
 */
router.get('/export', authorize('admin', 'sales_manager'), exportReports);

export default router;

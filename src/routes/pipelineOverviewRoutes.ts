import { Router, type Router as RouterType } from 'express';
import { getPipelineOverview } from '../controllers/pipelineController';
import { authenticate } from '../middleware/auth';

const router: RouterType = Router();

router.use(authenticate);

/**
 * @swagger
 * /pipeline:
 *   get:
 *     summary: Get complete pipeline board payload
 *     description: Returns the stages, deals, user profiles, and stage assignees needed by the Kanban pipeline module.
 *     tags: [Pipelines]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pipeline_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Pipeline ID. If omitted, the default organization pipeline is used.
 *     responses:
 *       200:
 *         description: Pipeline retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PipelineOverviewResponse'
 *       404:
 *         description: Pipeline not found
 */
router.get('/', getPipelineOverview);

export default router;

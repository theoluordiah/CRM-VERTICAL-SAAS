/**
 * Pipeline management routes
 * Handles CRUD operations for pipelines and stages
 */
import { Router, type Router as RouterType } from 'express';
import {
  listPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  listPipelineStages,
  getStageById,
  createStage,
  updateStage,
  deleteStage,
  getPipelineBoard,
  listStageAssignees,
  addStageAssignee,
  removeStageAssignee,
  reorderStages
} from '../controllers/pipelineController';
import { authenticate, authorize } from '../middleware/auth';

const router: RouterType = Router();

router.use(authenticate);

/**
 * @swagger
 * /pipelines:
 *   get:
 *     summary: List organization pipelines
 *     description: Returns pipelines scoped to the authenticated user's organization.
 *     tags: [Pipelines]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pipelines retrieved successfully
 */
router.get('/', listPipelines);

/**
 * @swagger
 * /pipelines/board:
 *   get:
 *     summary: Get organization pipeline board
 *     description: Returns stages and deals for a pipeline in the authenticated user's organization.
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
 *         description: Pipeline ID (optional, uses default pipeline if not provided)
 *     responses:
 *       200:
 *         description: Pipeline board retrieved successfully
 */
router.get('/board', getPipelineBoard);

/**
 * @swagger
 * /pipelines/stage-assignees:
 *   get:
 *     summary: List stage assignees
 *     description: Returns flattened stage-user assignments for a pipeline.
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
 *         description: Stage assignees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StageAssignee'
 *   post:
 *     summary: Add stage assignee
 *     description: Assigns a user to a pipeline stage. Requires admin or sales_manager.
 *     tags: [Pipelines]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stage_id:
 *                 type: string
 *               stageId:
 *                 type: string
 *                 description: Camel-case alias for stage_id.
 *               user_id:
 *                 type: string
 *               userId:
 *                 type: string
 *                 description: Camel-case alias for user_id.
 *     responses:
 *       201:
 *         description: Stage assignee added successfully
 *       403:
 *         description: Admin or sales_manager access required
 */
router.get('/stage-assignees', listStageAssignees);
router.post('/stage-assignees', authorize('admin', 'sales_manager'), addStageAssignee);

/**
 * @swagger
 * /pipelines/stage-assignees/{stageId}/{userId}:
 *   delete:
 *     summary: Remove stage assignee
 *     description: Removes a user assignment from a pipeline stage. Requires admin or sales_manager.
 *     tags: [Pipelines]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stage assignee removed successfully
 *       403:
 *         description: Admin or sales_manager access required
 */
router.delete('/stage-assignees/:stageId/:userId', authorize('admin', 'sales_manager'), removeStageAssignee);

/**
 * @swagger
 * /pipelines:
 *   post:
 *     summary: Create a pipeline
 *     tags: [Pipelines]
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
 *               description:
 *                 type: string
 *               is_default:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Pipeline created successfully
 *       403:
 *         description: Admin access required
 */
router.post('/', authorize('admin'), createPipeline);

/**
 * @swagger
 * /pipelines/{id}:
 *   patch:
 *     summary: Update pipeline
 *     tags: [Pipelines]
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
 *               description:
 *                 type: string
 *               is_default:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Pipeline updated successfully
 */
router.patch('/:id', authorize('admin'), updatePipeline);

/**
 * @swagger
 * /pipelines/{id}:
 *   delete:
 *     summary: Delete pipeline
 *     tags: [Pipelines]
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
 *         description: Pipeline deleted successfully
 *       403:
 *         description: Admin access required
 */
router.delete('/:id', authorize('admin'), deletePipeline);

/**
 * @swagger
 * /pipelines/stages/all:
 *   get:
 *     summary: List all pipeline stages
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
 *         description: Pipeline ID (optional, uses default pipeline if not provided)
 *     responses:
 *       200:
 *         description: Stages retrieved successfully
 */
router.get('/stages/all', listPipelineStages);

/**
 * @swagger
 * /pipelines/stages/{id}:
 *   get:
 *     summary: Get stage by ID
 *     tags: [Pipelines]
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
 *         description: Stage retrieved successfully
 *       404:
 *         description: Stage not found
 */
router.get('/stages/:id', getStageById);

/**
 * @swagger
 * /pipelines/stages:
 *   post:
 *     summary: Create a stage
 *     tags: [Pipelines]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, pipeline_id]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               pipeline_id:
 *                 type: string
 *               order:
 *                 type: integer
 *               is_won:
 *                 type: boolean
 *               is_lost:
 *                 type: boolean
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Stage created successfully
 *       403:
 *         description: Admin access required
 */
router.post('/stages', authorize('admin'), createStage);

/**
 * @swagger
 * /pipelines/stages/{id}:
 *   patch:
 *     summary: Update stage
 *     tags: [Pipelines]
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
 *               description:
 *                 type: string
 *               order:
 *                 type: integer
 *               is_won:
 *                 type: boolean
 *               is_lost:
 *                 type: boolean
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Stage updated successfully
 */
router.patch('/stages/:id', authorize('admin'), updateStage);

/**
 * @swagger
 * /pipelines/stages/{id}:
 *   delete:
 *     summary: Delete stage
 *     tags: [Pipelines]
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
 *         description: Stage deleted successfully
 *       403:
 *         description: Admin access required
 */
router.delete('/stages/:id', authorize('admin'), deleteStage);

/**
 * @swagger
 * /pipelines/stages/reorder:
 *   post:
 *     summary: Reorder stages
 *     tags: [Pipelines]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, order]
 *                   properties:
 *                     id:
 *                       type: string
 *                     order:
 *                       type: number
 *               stage_ids:
 *                 type: array
 *                 description: Alternative input. Order is inferred from array position.
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Stages reordered successfully
 *       403:
 *         description: Admin access required
 */
router.post('/stages/reorder', authorize('admin'), reorderStages);

/**
 * @swagger
 * /pipelines/{id}:
 *   get:
 *     summary: Get pipeline by ID
 *     tags: [Pipelines]
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
 *         description: Pipeline retrieved successfully
 *       404:
 *         description: Pipeline not found
 */
router.get('/:id', getPipelineById);

export default router;

import { Router, type Router as RouterType } from 'express';
import { generateEmailHandler } from '../controllers/emailWriterController';
import { authenticate, authorize } from '../middleware/auth';

const router: RouterType = Router();

router.use(authenticate);

/**
 * @swagger
 * /ai/email/generate:
 *   post:
 *     summary: Generate an AI email using Gemini
 *     tags: [AI Email Writer]
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
 *               contact_id:
 *                 type: string
 *                 description: Pull contact info for email context
 *               deal_id:
 *                 type: string
 *                 description: Pull deal info for email context
 *               company_id:
 *                 type: string
 *                 description: Pull company info for email context
 *               purpose:
 *                 type: string
 *                 enum: [cold_outreach, follow_up, proposal, thank_you, meeting_request, re_engagement]
 *                 default: follow_up
 *               tone:
 *                 type: string
 *                 enum: [professional, friendly, formal, casual]
 *                 default: professional
 *               length:
 *                 type: string
 *                 enum: [short, medium, detailed]
 *                 default: medium
 *                 description: Email length preference
 *               recipient_name:
 *                 type: string
 *                 description: Override recipient display name
 *               sender_name:
 *                 type: string
 *                 description: Override sender display name
 *               key_points:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Key points to include in the email
 *               custom_instructions:
 *                 type: string
 *                 description: Additional context or instructions
 *               subject:
 *                 type: string
 *                 description: Suggested subject line
 *     responses:
 *       200:
 *         description: Email generated successfully
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
 *                   type: object
 *                   properties:
 *                     subject:
 *                       type: string
 *                     body:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to generate email
 */
router.post('/email/generate', authorize('admin', 'sales_manager', 'sales_rep'), generateEmailHandler);

export default router;

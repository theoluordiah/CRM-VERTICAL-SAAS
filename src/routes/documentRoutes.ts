import { Router, type Router as RouterType } from 'express';
import { deleteDocument, downloadDocument, updateDocument } from '../controllers/documentController';
import { authenticate, authorize } from '../middleware/auth';

const router: RouterType = Router();

router.use(authenticate);

/**
 * @swagger
 * /documents/{documentId}/download:
 *   get:
 *     summary: Download a document
 *     tags: [Documents]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to the document URL
 *       400:
 *         description: Invalid document ID
 *       404:
 *         description: Document not found
 */
router.get('/:documentId/download', downloadDocument);

/**
 * @swagger
 * /documents/{documentId}:
 *   patch:
 *     summary: Edit a document
 *     tags: [Documents]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
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
 *                 maxLength: 180
 *                 description: Document display name
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *               tags:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: string
 *                   - type: string
 *                     description: Comma-separated tags
 *               folder_id:
 *                 type: string
 *                 description: Folder to move the document into
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       400:
 *         description: Invalid document or folder ID
 *       404:
 *         description: Document or folder not found
 *   delete:
 *     summary: Delete a document
 *     tags: [Documents]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       400:
 *         description: Invalid document ID
 *       404:
 *         description: Document not found
 */
router.patch('/:documentId', authorize('admin', 'sales_manager', 'sales_rep'), updateDocument);
router.delete('/:documentId', authorize('admin', 'sales_manager', 'sales_rep'), deleteDocument);

export default router;

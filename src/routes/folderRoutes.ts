import { Router, type Router as RouterType } from 'express';
import type { Request } from 'express';
import multer from 'multer';
import {
  createFolder,
  deleteFolder,
  getFolderDocuments,
  getFolders,
  updateFolder,
  uploadDocumentsToFolder
} from '../controllers/documentController';
import { authenticate, authorize } from '../middleware/auth';

type MulterOptions = NonNullable<Parameters<typeof multer>[0]>;
type FileFilterCallback = {
  (error: Error): void;
  (error: null, acceptFile: boolean): void;
};

const uploadOptions: MulterOptions = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
};

const upload = multer(uploadOptions);
const router: RouterType = Router();

router.use(authenticate);

/**
 * @swagger
 * /folders:
 *   get:
 *     summary: Get all folders
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Folders retrieved successfully
 *   post:
 *     summary: Create a folder
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 120
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Folder created successfully
 *       400:
 *         description: Folder name is required
 */
router.get('/', getFolders);
router.post('/', authorize('admin', 'sales_manager', 'sales_rep'), createFolder);

/**
 * @swagger
 * /folders/{folderId}:
 *   patch:
 *     summary: Edit a folder
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
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
 *                 maxLength: 120
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Folder updated successfully
 *       400:
 *         description: Invalid folder ID
 *       404:
 *         description: Folder not found
 *   delete:
 *     summary: Delete a folder
 *     description: Deletes the folder and all documents inside it.
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Folder deleted successfully
 *       400:
 *         description: Invalid folder ID
 *       404:
 *         description: Folder not found
 */
router.patch('/:folderId', authorize('admin', 'sales_manager', 'sales_rep'), updateFolder);
router.delete('/:folderId', authorize('admin', 'sales_manager'), deleteFolder);

/**
 * @swagger
 * /folders/{folderId}/documents:
 *   get:
 *     summary: Get documents inside a folder
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Folder documents retrieved successfully
 *       400:
 *         description: Invalid folder ID
 *       404:
 *         description: Folder not found
 *   post:
 *     summary: Upload documents into a folder
 *     description: Upload one file with `document` or multiple files with `documents`. Maximum 10 files, 25MB each.
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Documents uploaded successfully
 *       400:
 *         description: Invalid folder ID or no documents provided
 *       404:
 *         description: Folder not found
 */
router.get('/:folderId/documents', getFolderDocuments);
router.post(
  '/:folderId/documents',
  authorize('admin', 'sales_manager', 'sales_rep'),
  upload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'documents', maxCount: 10 },
    { name: 'file', maxCount: 1 }
  ]),
  uploadDocumentsToFolder
);

export default router;

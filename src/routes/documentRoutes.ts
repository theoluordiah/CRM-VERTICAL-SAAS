import { Router, type Router as RouterType } from 'express';
import type { Request } from 'express';
import multer from 'multer';
import {
  listFiles,
  getFileById,
  uploadFile,
  updateFile,
  moveFile,
  deleteFile,
  downloadFile,
  getFileStats,
  browseFolder,
  createFolder,
  listFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  getFolderFiles
} from '../controllers/documentController';
import { authenticate, authorize } from '../middleware/auth';

type MulterOptions = NonNullable<Parameters<typeof multer>[0]>;
type FileFilterCallback = {
  (error: Error): void;
  (error: null, acceptFile: boolean): void;
};

const uploadOptions: MulterOptions = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
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
 * /files:
 *   get:
 *     summary: List files
 *     tags: [Files]
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
 *         name: folder_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: contact_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: deal_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *       - in: query
 *         name: mime_type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CRMFile'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total_pages:
 *                   type: integer
 */
router.get('/', listFiles);

/**
 * @swagger
 * /files/browser:
 *   get:
 *     summary: Browse a folder's folders and files together
 *     tags: [Files]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder_id
 *         schema:
 *           type: string
 *         description: Folder to browse. Omit, use root, or use null for root.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Folder contents retrieved successfully
 */
router.get('/browser', browseFolder);

/**
 * @swagger
 * /files/stats:
 *   get:
 *     summary: Get file storage stats
 *     tags: [Files]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 */
router.get('/stats', authorize('admin'), getFileStats);

/**
 * @swagger
 * /files/folders:
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
 *               parent_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Folder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Folder'
 *   get:
 *     summary: List folders
 *     tags: [Folders]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: string
 *         description: Filter by parent folder (omit for root folders)
 *     responses:
 *       200:
 *         description: Folders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Folder'
 */
router.post('/folders', authorize('admin', 'sales_manager', 'sales_rep'), createFolder);
router.get('/folders', listFolders);

/**
 * @swagger
 * /files/folders/{id}:
 *   get:
 *     summary: Get folder by ID with file/subfolder counts
 *     tags: [Folders]
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
 *         description: Folder retrieved successfully
 *       404:
 *         description: Folder not found
 *   put:
 *     summary: Update folder (rename / move)
 *     tags: [Folders]
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
 *               parent_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Folder updated successfully
 *       404:
 *         description: Folder not found
 *   delete:
 *     summary: Delete an empty folder
 *     tags: [Folders]
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
 *         description: Folder deleted successfully
 *       400:
 *         description: Folder is not empty
 *       404:
 *         description: Folder not found
 */
router.get('/folders/:id', getFolderById);
router.put('/folders/:id', authorize('admin', 'sales_manager', 'sales_rep'), updateFolder);
router.delete('/folders/:id', authorize('admin', 'sales_manager'), deleteFolder);

/**
 * @swagger
 * /files/folders/{folderId}/files:
 *   get:
 *     summary: List files in a folder
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
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 */
router.get('/folders/:folderId/files', getFolderFiles);

/**
 * @swagger
 * /files/{id}:
 *   get:
 *     summary: Get file by ID
 *     tags: [Files]
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
 *         description: File retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CRMFile'
 *       404:
 *         description: File not found
 *   delete:
 *     summary: Delete a file (removes from Cloudinary and DB)
 *     tags: [Files]
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
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 */
router.get('/:id', getFileById);

/**
 * @swagger
 * /files/{id}:
 *   patch:
 *     summary: Update file metadata or folder placement
 *     tags: [Files]
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
 *               original_name:
 *                 type: string
 *                 description: Rename the file display name.
 *               folder_id:
 *                 type: string
 *                 nullable: true
 *                 description: Destination folder ID, null, or root.
 *               contact_id:
 *                 type: string
 *                 nullable: true
 *               deal_id:
 *                 type: string
 *                 nullable: true
 *               company_id:
 *                 type: string
 *                 nullable: true
 *               tags:
 *                 oneOf:
 *                   - type: string
 *                     description: Comma-separated tags.
 *                   - type: array
 *                     items:
 *                       type: string
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: File updated successfully
 *       400:
 *         description: Invalid file, folder, or relationship ID
 *       404:
 *         description: File or folder not found
 */
router.patch('/:id', authorize('admin', 'sales_manager', 'sales_rep'), updateFile);

/**
 * @swagger
 * /files/{id}/move:
 *   patch:
 *     summary: Move a file into a folder or back to root
 *     tags: [Files]
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
 *             required:
 *               - folder_id
 *             properties:
 *               folder_id:
 *                 type: string
 *                 nullable: true
 *                 description: Destination folder ID, null, or root.
 *     responses:
 *       200:
 *         description: File moved successfully
 *       400:
 *         description: Invalid file or folder ID
 *       404:
 *         description: File or folder not found
 */
router.patch('/:id/move', authorize('admin', 'sales_manager', 'sales_rep'), moveFile);

/**
 * @swagger
 * /files/{id}/download:
 *   get:
 *     summary: Download a file (redirects to Cloudinary URL)
 *     tags: [Files]
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
 *       302:
 *         description: Redirect to Cloudinary file URL
 *       404:
 *         description: File not found
 */
router.get('/:id/download', downloadFile);

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload a file to Cloudinary
 *     description: Uploads a tenant-scoped file. Maximum size is 25MB. Allowed MIME types include PDF, JPEG, PNG, WebP, plain text, CSV, DOCX, and XLSX.
 *     tags: [Files]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File payload. Maximum 25MB.
 *               folder_id:
 *                 type: string
 *               contact_id:
 *                 type: string
 *               deal_id:
 *                 type: string
 *               company_id:
 *                 type: string
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CRMFile'
 *       400:
 *         description: No file provided
 */
router.post('/upload', authorize('admin', 'sales_manager', 'sales_rep'), upload.single('file'), uploadFile);
router.delete('/:id', authorize('admin', 'sales_manager'), deleteFile);

export default router;

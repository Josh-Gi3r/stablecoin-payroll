import express, { Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { uploadDocument, getSignedDownloadUrl, deleteDocument, validateFile } from "../services/s3.js";
import { client } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Allowed document types
const ALLOWED_DOCUMENT_TYPES = [
  "kyc_business_registration",
  "kyc_tax_id",
  "kyc_director_id",
  "kyc_address_proof",
  "kyc_bank_statement",
  "agreement",
  "payslip",
  "other",
];

// Allowed MIME types
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

/**
 * POST /api/documents/upload
 * Upload a document to S3
 */
router.post("/upload", authMiddleware, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { documentType } = req.body;
    const file = req.file;
    const userId = req.user!.id;

    // Validate inputs
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    if (!documentType || !ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ error: `Invalid document type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(", ")}` });
    }

    // Validate file
    const validation = validateFile(file, ALLOWED_MIME_TYPES);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Upload to S3
    const { s3Key, s3Url, fileSize } = await uploadDocument(file.buffer, userId, documentType, file.originalname);

    // Store document metadata in database
    const documentId = uuidv4();
    const now = new Date().toISOString();

    await client.execute(
      `INSERT INTO documents (
        id, user_id, document_type, file_name, mime_type, file_size,
        s3_key, s3_url, upload_status, virus_scan_status, verification_status,
        uploaded_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        userId,
        documentType,
        file.originalname,
        file.mimetype,
        fileSize,
        s3Key,
        s3Url,
        "completed",
        "pending",
        "pending",
        now,
        now,
      ]
    );

    res.json({
      documentId,
      fileName: file.originalname,
      documentType,
      fileSize,
      s3Url,
      uploadStatus: "completed",
      uploadedAt: now,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

/**
 * GET /api/documents/:id
 * Retrieve document metadata
 */
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get document from database
    const result = await client.execute(
      `SELECT * FROM documents WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const doc = result.rows[0];

    res.json({
      id: doc.id,
      userId: doc.user_id,
      documentType: doc.document_type,
      fileName: doc.file_name,
      mimeType: doc.mime_type,
      fileSize: doc.file_size,
      s3Url: doc.s3_url,
      uploadStatus: doc.upload_status,
      virusScanStatus: doc.virus_scan_status,
      verificationStatus: doc.verification_status,
      verifiedAt: doc.verified_at,
      uploadedAt: doc.uploaded_at,
      updatedAt: doc.updated_at,
    });
  } catch (error) {
    console.error("Document retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve document" });
  }
});

/**
 * GET /api/documents/signed-url/:id
 * Get temporary download URL for a document
 */
router.get("/signed-url/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get document from database
    const result = await client.execute(
      `SELECT s3_key FROM documents WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const s3Key = (result.rows[0] as any).s3_key;

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await getSignedDownloadUrl(s3Key, 3600);

    // Log access for audit trail
    const auditId = uuidv4();
    const now = new Date().toISOString();
    await client.execute(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, userId, "download_document", "document", id, now]
    );

    res.json({
      signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Signed URL generation error:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get document from database
    const result = await client.execute(
      `SELECT s3_key FROM documents WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const s3Key = (result.rows[0] as any).s3_key;

    // Delete from S3
    await deleteDocument(s3Key);

    // Soft delete from database
    const now = new Date().toISOString();
    await client.execute(
      `UPDATE documents SET upload_status = ?, updated_at = ? WHERE id = ?`,
      ["deleted", now, id]
    );

    // Log deletion for audit trail
    const auditId = uuidv4();
    await client.execute(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [auditId, userId, "delete_document", "document", id, now]
    );

    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Document deletion error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

/**
 * GET /api/documents/user/:userId
 * List all documents for a user
 */
router.get("/user/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;
    const { documentType, limit = 20, offset = 0 } = req.query;

    // Authorization: user can only view their own documents
    if (userId !== currentUserId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Build query
    let query = `SELECT id, document_type, file_name, file_size, upload_status, verification_status, uploaded_at
                 FROM documents WHERE user_id = ? AND upload_status != ?`;
    const params: any[] = [userId, "deleted"];

    if (documentType) {
      query += ` AND document_type = ?`;
      params.push(documentType);
    }

    query += ` ORDER BY uploaded_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit as string) || 20, parseInt(offset as string) || 0);

    // Get documents
    const result = await client.execute(query, params);
    const documents = result.rows || [];

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM documents WHERE user_id = ? AND upload_status != ?`;
    const countParams: any[] = [userId, "deleted"];

    if (documentType) {
      countQuery += ` AND document_type = ?`;
      countParams.push(documentType);
    }

    const countResult = await client.execute(countQuery, countParams);
    const total = (countResult.rows?.[0] as any)?.count || 0;

    res.json({
      documents: documents.map((doc: any) => ({
        id: doc.id,
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        uploadStatus: doc.upload_status,
        verificationStatus: doc.verification_status,
        uploadedAt: doc.uploaded_at,
      })),
      pagination: {
        limit: parseInt(limit as string) || 20,
        offset: parseInt(offset as string) || 0,
        total,
      },
    });
  } catch (error) {
    console.error("Document listing error:", error);
    res.status(500).json({ error: "Failed to list documents" });
  }
});

/**
 * GET /api/documents/kyc/queue
 * Operator-only KYC review queue. Lists documents whose documentType is
 * KYC-flavoured and whose verificationStatus is still 'pending'. Joined
 * back to the user/employee record so the queue shows who submitted what.
 */
router.get('/kyc/queue', authMiddleware, async (req: Request, res: Response) => {
  try {
    const role = (req.user?.role ?? '').toString();
    // Operator-only: super_admin OR (hr AND tenantId === operator tenant). Client-side
    // hr roles (e.g. acme-hr) must NOT see this cross-tenant KYC queue.
    const OPERATOR_TENANT_ID = 'tnt-operator';
    const isOperatorTenant = req.user?.tenantId === OPERATOR_TENANT_ID;
    const allowed = role === 'super_admin' || (role === 'hr' && isOperatorTenant);
    if (!allowed) {
      return res.status(403).json({ error: 'Operator role required' });
    }
    const result = await client.execute(
      `SELECT d.id, d.user_id, d.document_type, d.file_name, d.mime_type, d.file_size,
              d.upload_status, d.verification_status, d.uploaded_at, d.updated_at,
              u.name as user_name, u.email as user_email, u.company as company
         FROM documents d
         LEFT JOIN users u ON u.id = d.user_id
        WHERE d.document_type LIKE 'kyc_%'
          AND d.verification_status = 'pending'
          AND d.upload_status != 'deleted'
        ORDER BY d.uploaded_at DESC`,
    );
    res.json(
      (result.rows ?? []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        company: row.company,
        documentType: row.document_type,
        fileName: row.file_name,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        uploadStatus: row.upload_status,
        verificationStatus: row.verification_status,
        uploadedAt: row.uploaded_at,
      })),
    );
  } catch (error: any) {
    console.error('KYC queue error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to load KYC queue' });
  }
});

/**
 * PATCH /api/documents/:id/verification
 * Operator-only: verify or reject a KYC document. Stamps verifiedAt, the
 * reviewer's userId, and writes an audit log row for the action.
 */
router.patch('/:id/verification', authMiddleware, async (req: Request, res: Response) => {
  try {
    const role = (req.user?.role ?? '').toString();
    if (role !== 'super_admin' && role !== 'hr') {
      return res.status(403).json({ error: 'Operator role required' });
    }
    const { status, notes } = req.body ?? {};
    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({ error: 'status must be verified | rejected' });
    }
    const reviewerId = req.user!.id;
    const now = new Date().toISOString();
    const found = await client.execute('SELECT id FROM documents WHERE id = ?', [req.params.id]);
    if (!found.rows || found.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    await client.execute(
      `UPDATE documents
          SET verification_status = ?, verified_at = ?, updated_at = ?
        WHERE id = ?`,
      [status, status === 'verified' ? now : null, now, req.params.id],
    );
    const auditId = uuidv4();
    await client.execute(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [auditId, reviewerId, `kyc_${status}`, 'document', req.params.id, JSON.stringify({ notes: notes ?? '' }), now],
    );
    res.json({ ok: true, status, verifiedAt: status === 'verified' ? now : null });
  } catch (error: any) {
    console.error('KYC verification error:', error);
    res.status(500).json({ error: error.message ?? 'Failed to update verification' });
  }
});

export default router;

import { S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "payroll-documents";
const SIGNED_URL_EXPIRATION = 3600; // 1 hour in seconds

/**
 * Upload a document to S3
 * @param file - File buffer or stream
 * @param userId - User ID for organizing documents
 * @param documentType - Type of document (e.g., 'kyc', 'agreement', 'payslip')
 * @param fileName - Original file name
 * @returns Object with S3 key and URL
 */
export async function uploadDocument(
  file: Buffer | Readable,
  userId: string,
  documentType: string,
  fileName: string
): Promise<{ s3Key: string; s3Url: string; fileSize: number }> {
  try {
    // Generate unique S3 key
    const timestamp = Date.now();
    const randomId = uuidv4().substring(0, 8);
    const fileExtension = fileName.split(".").pop() || "bin";
    const s3Key = `documents/${userId}/${documentType}/${timestamp}-${randomId}.${fileExtension}`;

    // Upload to S3
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: file,
        ContentType: getContentType(fileName),
        ServerSideEncryption: "AES256",
        Metadata: {
          userId,
          documentType,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    await upload.done();

    // Generate public URL (or signed URL for private access)
    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || "us-east-1"}.amazonaws.com/${s3Key}`;

    // Get file size from buffer
    const fileSize = Buffer.isBuffer(file) ? file.length : 0;

    return {
      s3Key,
      s3Url,
      fileSize,
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error(`Failed to upload document to S3: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get a signed URL for downloading a document
 * @param s3Key - S3 object key
 * @param expirationSeconds - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedDownloadUrl(
  s3Key: string,
  expirationSeconds: number = SIGNED_URL_EXPIRATION
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expirationSeconds,
    });

    return signedUrl;
  } catch (error) {
    console.error("Signed URL generation error:", error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Delete a document from S3
 * @param s3Key - S3 object key
 */
export async function deleteDocument(s3Key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("S3 delete error:", error);
    throw new Error(`Failed to delete document from S3: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * List all documents for a user
 * @param userId - User ID
 * @param documentType - Optional document type filter
 * @returns List of document keys
 */
export async function listUserDocuments(userId: string, documentType?: string): Promise<string[]> {
  try {
    const prefix = documentType ? `documents/${userId}/${documentType}/` : `documents/${userId}/`;

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    const keys = response.Contents?.map((obj) => obj.Key || "") || [];

    return keys.filter((key) => key.length > 0);
  } catch (error) {
    console.error("S3 list error:", error);
    throw new Error(`Failed to list documents from S3: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  return contentTypes[ext] || "application/octet-stream";
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: { size: number; mimetype: string; originalname: string },
  allowedMimeTypes: string[] = ["application/pdf", "image/jpeg", "image/png"],
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeBytes / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedMimeTypes.join(", ")}`,
    };
  }

  // Check file extension matches MIME type
  const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
  const mimeToExt: Record<string, string[]> = {
    "application/pdf": ["pdf"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
  };

  const validExts = mimeToExt[file.mimetype] || [];
  if (!validExts.includes(ext)) {
    return {
      valid: false,
      error: `File extension does not match MIME type`,
    };
  }

  return { valid: true };
}

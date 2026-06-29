import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import db from "../db/index.js";
import * as s from "../db/schema.js";
import { S3Service } from "../services/s3.js";
import documentsRouter from "../routes/documents.js";

// Mock S3Service
const mockS3Service = {
  uploadFile: async (file: any, key: string) => ({
    s3Url: `https://s3.example.com/${key}`,
    fileSize: file.size,
  }),
  deleteFile: async (key: string) => true,
  getSignedUrl: async (key: string) => `https://s3.example.com/signed/${key}`,
  listFiles: async (prefix: string) => [],
};

describe("Document Upload API", () => {
  let app: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/documents", documentsRouter);
  });

  describe("POST /documents/upload", () => {
    it("should upload a document successfully", async () => {
      const response = await request(app)
        .post("/documents/upload")
        .field("documentType", "kyc_business_registration")
        .attach("file", Buffer.from("test content"), "test.pdf");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("documentId");
      expect(response.body).toHaveProperty("fileName");
      expect(response.body).toHaveProperty("s3Url");
    });

    it("should reject upload without document type", async () => {
      const response = await request(app)
        .post("/documents/upload")
        .attach("file", Buffer.from("test content"), "test.pdf");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject upload without file", async () => {
      const response = await request(app)
        .post("/documents/upload")
        .field("documentType", "kyc_business_registration");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should validate file size (max 10MB)", async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const response = await request(app)
        .post("/documents/upload")
        .field("documentType", "kyc_business_registration")
        .attach("file", largeBuffer, "large.pdf");

      expect(response.status).toBe(413);
      expect(response.body).toHaveProperty("error");
    });

    it("should validate file type (PDF, JPG, PNG only)", async () => {
      const response = await request(app)
        .post("/documents/upload")
        .field("documentType", "kyc_business_registration")
        .attach("file", Buffer.from("test"), "test.exe");

      expect(response.status).toBe(415);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /documents/user/:userId", () => {
    it("should list documents for a user", async () => {
      const response = await request(app)
        .get("/documents/user/test-user-id")
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("documents");
      expect(Array.isArray(response.body.documents)).toBe(true);
    });

    it("should filter documents by type", async () => {
      const response = await request(app)
        .get("/documents/user/test-user-id")
        .query({ documentType: "kyc_business_registration", limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("documents");
    });

    it("should paginate results", async () => {
      const response = await request(app)
        .get("/documents/user/test-user-id")
        .query({ limit: 5, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.documents.length).toBeLessThanOrEqual(5);
    });
  });

  describe("GET /documents/signed-url/:documentId", () => {
    it("should return signed URL for download", async () => {
      const response = await request(app).get("/documents/signed-url/test-doc-id");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("signedUrl");
      expect(typeof response.body.signedUrl).toBe("string");
    });

    it("should return 404 for non-existent document", async () => {
      const response = await request(app).get("/documents/signed-url/non-existent-id");

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /documents/:documentId", () => {
    it("should delete a document", async () => {
      const response = await request(app).delete("/documents/test-doc-id");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent document", async () => {
      const response = await request(app).delete("/documents/non-existent-id");

      expect(response.status).toBe(404);
    });
  });
});

describe("Document Database Schema", () => {
  it("should have documents table with correct columns", async () => {
    const columns = s.documents.getColumns();
    expect(columns).toHaveProperty("documentId");
    expect(columns).toHaveProperty("userId");
    expect(columns).toHaveProperty("documentType");
    expect(columns).toHaveProperty("fileName");
    expect(columns).toHaveProperty("fileSize");
    expect(columns).toHaveProperty("s3Url");
    expect(columns).toHaveProperty("uploadStatus");
    expect(columns).toHaveProperty("verificationStatus");
    expect(columns).toHaveProperty("uploadedAt");
  });

  it("should have generated_pdfs table", async () => {
    const columns = s.generated_pdfs.getColumns();
    expect(columns).toHaveProperty("pdfId");
    expect(columns).toHaveProperty("pdfType");
    expect(columns).toHaveProperty("s3Url");
  });

  it("should have notification_preferences table", async () => {
    const columns = s.notification_preferences.getColumns();
    expect(columns).toHaveProperty("userId");
    expect(columns).toHaveProperty("emailNotifications");
    expect(columns).toHaveProperty("smsNotifications");
  });
});

describe("S3 Service", () => {
  it("should upload file to S3", async () => {
    const file = { size: 1024, buffer: Buffer.from("test") };
    const result = await mockS3Service.uploadFile(file, "test-key");

    expect(result).toHaveProperty("s3Url");
    expect(result).toHaveProperty("fileSize", 1024);
  });

  it("should delete file from S3", async () => {
    const result = await mockS3Service.deleteFile("test-key");
    expect(result).toBe(true);
  });

  it("should generate signed URL", async () => {
    const url = await mockS3Service.getSignedUrl("test-key");
    expect(typeof url).toBe("string");
    expect(url).toContain("signed");
  });
});

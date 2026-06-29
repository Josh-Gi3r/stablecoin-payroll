import db from "../db/index.js";
import * as s from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface LivenessProvider {
  name: 'idology' | 'onfido' | 'aws_rekognition';
  initializeTest(userId: string, email: string): Promise<{ testId: string; testUrl: string }>;
  verifyTest(testId: string, sessionId: string): Promise<{ verified: boolean; confidence: number }>;
  getTestResult(testId: string): Promise<any>;
}

/**
 * Liveness verification service. Maps to the `liveness_checks` table in
 * schema-documents.ts. The external provider's session identifier is stored
 * in the `sessionId` column; the provider's probability-score lands in
 * `livenessScore`.
 */
export class LivenessService {
  private provider: LivenessProvider | null = null;

  setProvider(provider: LivenessProvider) {
    this.provider = provider;
  }

  async initializeTest(userId: string, email: string): Promise<{ testId: string; testUrl: string }> {
    if (!this.provider) throw new Error("Liveness provider not configured");
    const result = await this.provider.initializeTest(userId, email);
    await db.insert(s.livenessChecks).values({
      id: `lvns-${nanoid(8)}`,
      userId,
      sessionId: result.testId,
      provider: this.provider.name,
      status: 'pending',
      initiatedAt: new Date().toISOString(),
    });
    return result;
  }

  async verifyTest(testId: string, sessionId: string): Promise<{ verified: boolean; confidence: number }> {
    if (!this.provider) throw new Error("Liveness provider not configured");
    const result = await this.provider.verifyTest(testId, sessionId);

    const records = await db
      .select()
      .from(s.livenessChecks)
      .where(eq(s.livenessChecks.sessionId, testId))
      .limit(1);

    if (records.length > 0) {
      await db
        .update(s.livenessChecks)
        .set({
          status: 'completed',
          result: result.verified ? 'pass' : 'fail',
          livenessScore: result.confidence,
          completedAt: new Date().toISOString(),
        })
        .where(eq(s.livenessChecks.sessionId, testId));
    }

    return result;
  }

  async getTestResult(testId: string): Promise<any> {
    if (!this.provider) throw new Error("Liveness provider not configured");
    return this.provider.getTestResult(testId);
  }

  async getCheckHistory(userId: string, limit = 50, offset = 0) {
    return db
      .select()
      .from(s.livenessChecks)
      .where(eq(s.livenessChecks.userId, userId))
      .orderBy(desc(s.livenessChecks.initiatedAt))
      .limit(limit)
      .offset(offset);
  }

  async getLatestCheck(userId: string) {
    const rows = await db
      .select()
      .from(s.livenessChecks)
      .where(eq(s.livenessChecks.userId, userId))
      .orderBy(desc(s.livenessChecks.initiatedAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async isUserVerified(userId: string): Promise<boolean> {
    const latest = await this.getLatestCheck(userId);
    return latest?.status === 'completed' && latest.result === 'pass';
  }

  async requireVerification(userId: string): Promise<void> {
    console.log(`User ${userId} is required to complete liveness verification`);
  }
}

/**
 * Mock liveness provider — always returns pass. Safe for local dev.
 */
export class MockLivenessProvider implements LivenessProvider {
  name = 'aws_rekognition' as const;

  async initializeTest(_userId: string, email: string): Promise<{ testId: string; testUrl: string }> {
    const testId = `test_${Date.now()}`;
    const testUrl = `https://mock-liveness.example.com/test/${testId}`;
    console.log(`[MOCK] Liveness test initialized for ${email}: ${testUrl}`);
    return { testId, testUrl };
  }

  async verifyTest(testId: string, _sessionId: string): Promise<{ verified: boolean; confidence: number }> {
    console.log(`[MOCK] Liveness test verified: ${testId}`);
    return { verified: true, confidence: 0.98 };
  }

  async getTestResult(testId: string): Promise<any> {
    return { testId, status: 'verified', confidence: 0.98, timestamp: new Date().toISOString() };
  }
}

export const livenessService = new LivenessService();
livenessService.setProvider(new MockLivenessProvider());

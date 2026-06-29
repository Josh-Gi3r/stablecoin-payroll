import { Router, Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import db from '../db/index.js';
import * as s from '../db/schema.js';
import { authMiddleware, requireRole, normalizeRole } from '../middleware/auth.js';
import { addSignature, generateContract, renderTemplate } from '../services/contracts.js';

const router = Router();
router.use(authMiddleware);

router.get('/templates', async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(s.contractTemplates);
    res.json(rows.filter((t) => t.active));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const role = normalizeRole(req.user!.role);
    const rows = await db.select().from(s.contracts);
    if (role === 'super_admin') return res.json(rows);
    return res.json(rows.filter((c) => c.clientId === req.user!.clientId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [contract] = await db.select().from(s.contracts).where(eq(s.contracts.id, req.params.id));
    if (!contract) return res.status(404).json({ error: 'Not found' });

    const role = normalizeRole(req.user!.role);
    if (role !== 'super_admin' && contract.clientId !== req.user!.clientId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [template] = await db
      .select()
      .from(s.contractTemplates)
      .where(eq(s.contractTemplates.id, contract.templateId));
    res.json({ contract, template });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Render the raw (signed or unsigned) contract body for preview.
router.get('/:id/preview', async (req: Request, res: Response) => {
  try {
    const [contract] = await db.select().from(s.contracts).where(eq(s.contracts.id, req.params.id));
    if (!contract) return res.status(404).json({ error: 'Not found' });
    const [template] = await db
      .select()
      .from(s.contractTemplates)
      .where(eq(s.contractTemplates.id, contract.templateId));
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const { buildContextForEmployee } = await import('../services/contracts.js');
    const ctx = contract.employeeId ? await buildContextForEmployee(contract.employeeId) : {};
    const body = renderTemplate(template.body, ctx);
    res.json({ body, contract, template });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('super_admin', 'hr', 'client_admin'), async (req: Request, res: Response) => {
  try {
    const { templateId, employeeId, variables } = req.body ?? {};
    if (!templateId || !employeeId) {
      return res.status(400).json({ error: 'templateId and employeeId are required' });
    }
    const result = await generateContract({ templateId, employeeId, extraVariables: variables });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Render a signed or draft contract as a PDF. If the contract has already been
// rendered and uploaded, returns the cached S3 URL; otherwise renders fresh,
// uploads to S3, saves the key + url on the contract row, and returns the URL.
router.post('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const [contract] = await db.select().from(s.contracts).where(eq(s.contracts.id, req.params.id));
    if (!contract) return res.status(404).json({ error: 'Not found' });

    const role = normalizeRole(req.user!.role);
    if (role !== 'super_admin' && contract.clientId !== req.user!.clientId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (contract.renderedPdfUrl && contract.status === 'signed') {
      return res.json({ url: contract.renderedPdfUrl, cached: true });
    }

    const { pdfService } = await import('../services/pdf.js');
    const pdfBuffer = await pdfService.generateContract(contract.id);

    let s3Url: string | null = null;
    let s3Key: string | null = null;
    try {
      s3Url = await pdfService.uploadPdfToS3(pdfBuffer, 'agreement', contract.id, 'contract', req.user!.id);
      // Best-effort: cache the URL on the contract row.
      await db
        .update(s.contracts)
        .set({ renderedPdfUrl: s3Url, renderedPdfS3Key: s3Key })
        .where(eq(s.contracts.id, contract.id));
    } catch (e) {
      // S3 may be unconfigured in dev — fall back to returning the buffer as base64.
      const base64 = pdfBuffer.toString('base64');
      return res.json({ url: null, base64, note: 'S3 unavailable; returning base64 payload' });
    }

    res.json({ url: s3Url, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/sign', async (req: Request, res: Response) => {
  try {
    const { party, signerName, signerEmail } = req.body ?? {};
    if (!party || !signerName || !signerEmail) {
      return res.status(400).json({ error: 'party, signerName and signerEmail are required' });
    }
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress ?? undefined;
    const result = await addSignature(req.params.id, { party, signerName, signerEmail, ip });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

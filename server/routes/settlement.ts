import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { finalSettlement } from '../services/settlement.js';

const router = Router();
router.use(authMiddleware);

// POST /api/settlement/final
// Body: { employeeId, cessationDate, initiatedBy, unusedAnnualLeaveDays,
//         noticeInLieuDays, contractualSeverance?, terminationBenefits? }
router.post(
  '/final',
  requireRole('super_admin', 'client_admin', 'hr', 'finance'),
  async (req: Request, res: Response) => {
    try {
      const {
        employeeId,
        cessationDate,
        initiatedBy = 'employer',
        unusedAnnualLeaveDays = 0,
        noticeInLieuDays = 0,
        contractualSeverance,
        terminationBenefits,
      } = req.body ?? {};

      if (!employeeId || !cessationDate) {
        return res.status(400).json({ error: 'employeeId and cessationDate are required' });
      }

      const result = await finalSettlement({
        employeeId,
        cessationDate,
        initiatedBy,
        unusedAnnualLeaveDays: Number(unusedAnnualLeaveDays) || 0,
        noticeInLieuDays: Number(noticeInLieuDays) || 0,
        contractualSeverance: contractualSeverance != null ? Number(contractualSeverance) : undefined,
        terminationBenefits: terminationBenefits != null ? Number(terminationBenefits) : undefined,
      });

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
);

export default router;

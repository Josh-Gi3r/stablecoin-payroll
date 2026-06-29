import { useState, useCallback } from "react";
import { toast } from "sonner";

interface GeneratePdfOptions {
  onProgress?: (progress: number) => void;
  autoDownload?: boolean;
}

interface PdfGenerationState {
  loading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

/**
 * Hook to generate payslip PDF
 */
export function useGeneratePayslip() {
  const [state, setState] = useState<PdfGenerationState>({
    loading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const generate = useCallback(async (payslipId: string, options: GeneratePdfOptions = {}) => {
    setState({ loading: true, progress: 0, error: null, success: false });

    try {
      options.onProgress?.(25);

      const response = await fetch(`/api/pdfs/payslip/${payslipId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      options.onProgress?.(50);

      if (!response.ok) {
        throw new Error("Failed to generate payslip PDF");
      }

      const data = await response.json();
      options.onProgress?.(75);

      if (options.autoDownload) {
        // Trigger download
        const downloadResponse = await fetch(`/api/pdfs/${data.pdfId}/download`);
        const downloadData = await downloadResponse.json();
        window.open(downloadData.signedUrl, "_blank");
      }

      options.onProgress?.(100);
      setState({ loading: false, progress: 100, error: null, success: true });
      toast.success("Payslip PDF generated successfully");

      return data;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to generate payslip PDF";
      setState({ loading: false, progress: 0, error: errorMessage, success: false });
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  return { ...state, generate };
}

/**
 * Hook to generate employment agreement PDF
 */
export function useGenerateAgreement() {
  const [state, setState] = useState<PdfGenerationState>({
    loading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const generate = useCallback(async (agreementId: string, options: GeneratePdfOptions = {}) => {
    setState({ loading: true, progress: 0, error: null, success: false });

    try {
      options.onProgress?.(25);

      const response = await fetch(`/api/pdfs/agreement/${agreementId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      options.onProgress?.(50);

      if (!response.ok) {
        throw new Error("Failed to generate agreement PDF");
      }

      const data = await response.json();
      options.onProgress?.(75);

      if (options.autoDownload) {
        const downloadResponse = await fetch(`/api/pdfs/${data.pdfId}/download`);
        const downloadData = await downloadResponse.json();
        window.open(downloadData.signedUrl, "_blank");
      }

      options.onProgress?.(100);
      setState({ loading: false, progress: 100, error: null, success: true });
      toast.success("Agreement PDF generated successfully");

      return data;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to generate agreement PDF";
      setState({ loading: false, progress: 0, error: errorMessage, success: false });
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  return { ...state, generate };
}

/**
 * Hook to generate settlement report PDF
 */
export function useGenerateSettlementReport() {
  const [state, setState] = useState<PdfGenerationState>({
    loading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const generate = useCallback(async (settlementId: string, options: GeneratePdfOptions = {}) => {
    setState({ loading: true, progress: 0, error: null, success: false });

    try {
      options.onProgress?.(25);

      const response = await fetch(`/api/pdfs/settlement/${settlementId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      options.onProgress?.(50);

      if (!response.ok) {
        throw new Error("Failed to generate settlement report PDF");
      }

      const data = await response.json();
      options.onProgress?.(75);

      if (options.autoDownload) {
        const downloadResponse = await fetch(`/api/pdfs/${data.pdfId}/download`);
        const downloadData = await downloadResponse.json();
        window.open(downloadData.signedUrl, "_blank");
      }

      options.onProgress?.(100);
      setState({ loading: false, progress: 100, error: null, success: true });
      toast.success("Settlement report PDF generated successfully");

      return data;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to generate settlement report PDF";
      setState({ loading: false, progress: 0, error: errorMessage, success: false });
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  return { ...state, generate };
}

/**
 * Hook to generate batch payslips
 */
export function useGenerateBatchPayslips() {
  const [state, setState] = useState<PdfGenerationState>({
    loading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const generate = useCallback(async (payrollRunId: string, options: GeneratePdfOptions = {}) => {
    setState({ loading: true, progress: 0, error: null, success: false });

    try {
      options.onProgress?.(25);

      const response = await fetch(`/api/pdfs/batch-payslips/${payrollRunId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      options.onProgress?.(50);

      if (!response.ok) {
        throw new Error("Failed to generate batch payslips");
      }

      const data = await response.json();
      options.onProgress?.(100);

      setState({ loading: false, progress: 100, error: null, success: true });
      toast.success(`Generated ${data.totalGenerated} payslips successfully`);

      return data;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to generate batch payslips";
      setState({ loading: false, progress: 0, error: errorMessage, success: false });
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  return { ...state, generate };
}

/**
 * Hook to download PDF
 */
export function usePdfDownload() {
  const [state, setState] = useState<PdfGenerationState>({
    loading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const download = useCallback(async (pdfId: string) => {
    setState({ loading: true, progress: 0, error: null, success: false });

    try {
      const response = await fetch(`/api/pdfs/${pdfId}/download`);

      if (!response.ok) {
        throw new Error("Failed to get PDF download link");
      }

      const data = await response.json();
      setState({ loading: false, progress: 100, error: null, success: true });

      // Open signed URL in new tab
      window.open(data.signedUrl, "_blank");
      toast.success("PDF download started");

      return data;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to download PDF";
      setState({ loading: false, progress: 0, error: errorMessage, success: false });
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  return { ...state, download };
}

/**
 * Hook to list PDFs for a user
 */
export function usePdfList() {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (userId: string, pdfType?: string, limit = 50, offset = 0) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (pdfType) {
        params.append("pdfType", pdfType);
      }

      const response = await fetch(`/api/pdfs/user/${userId}?${params}`);

      if (!response.ok) {
        throw new Error("Failed to list PDFs");
      }

      const data = await response.json();
      setPdfs(data.pdfs);
      setLoading(false);

      return data;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to list PDFs";
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  return { pdfs, loading, error, list };
}

/**
 * Hook to delete PDF
 */
export function usePdfDelete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePdf = useCallback(async (pdfId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pdfs/${pdfId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete PDF");
      }

      setLoading(false);
      toast.success("PDF deleted successfully");

      return true;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to delete PDF";
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  return { loading, error, deletePdf };
}

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UploadProgress {
  loaded: number;
  total: number;
}

interface Document {
  documentId: string;
  fileName: string;
  documentType: string;
  fileSize: number;
  s3Url: string;
  uploadStatus: string;
  uploadedAt: string;
}

interface UseDocumentUploadReturn {
  upload: (file: File, documentType: string) => Promise<Document | null>;
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

/**
 * Hook for uploading documents to S3 via the backend API
 */
export function useDocumentUpload(): UseDocumentUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, documentType: string): Promise<Document | null> => {
      try {
        setIsUploading(true);
        setError(null);
        setProgress({ loaded: 0, total: file.size });

        // Create FormData
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", documentType);

        // Upload to backend
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress({ loaded: e.loaded, total: e.total });
          }
        });

        // Return promise that resolves when upload completes
        return new Promise((resolve, reject) => {
          xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText);
                toast.success(`Document uploaded successfully: ${file.name}`);
                setIsUploading(false);
                setProgress(null);
                resolve(response);
              } catch (e) {
                const errorMsg = "Failed to parse upload response";
                setError(errorMsg);
                toast.error(errorMsg);
                setIsUploading(false);
                reject(new Error(errorMsg));
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                const errorMsg = errorResponse.error || "Upload failed";
                setError(errorMsg);
                toast.error(errorMsg);
                setIsUploading(false);
                reject(new Error(errorMsg));
              } catch (e) {
                const errorMsg = `Upload failed with status ${xhr.status}`;
                setError(errorMsg);
                toast.error(errorMsg);
                setIsUploading(false);
                reject(new Error(errorMsg));
              }
            }
          });

          xhr.addEventListener("error", () => {
            const errorMsg = "Network error during upload";
            setError(errorMsg);
            toast.error(errorMsg);
            setIsUploading(false);
            reject(new Error(errorMsg));
          });

          xhr.addEventListener("abort", () => {
            const errorMsg = "Upload cancelled";
            setError(errorMsg);
            toast.error(errorMsg);
            setIsUploading(false);
            reject(new Error(errorMsg));
          });

          xhr.open("POST", "/api/documents/upload");
          xhr.send(formData);
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        setError(errorMsg);
        toast.error(errorMsg);
        setIsUploading(false);
        return null;
      }
    },
    []
  );

  return { upload, isUploading, progress, error };
}

/**
 * Hook for fetching document list
 */
export function useDocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async (userId: string, documentType?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const query = new URLSearchParams();
      if (documentType) query.append("documentType", documentType);
      query.append("limit", "50");
      query.append("offset", "0");

      const response = await fetch(`/api/documents/user/${userId}?${query.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      setIsLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch documents";
      setError(errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
    }
  }, []);

  return { documents, isLoading, error, fetchDocuments };
}

/**
 * Hook for downloading documents
 */
export function useDocumentDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (documentId: string, fileName: string) => {
    try {
      setIsDownloading(true);
      setError(null);

      // Get signed URL
      const response = await fetch(`/api/documents/signed-url/${documentId}`);

      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.statusText}`);
      }

      const data = await response.json();
      const signedUrl = data.signedUrl;

      // Download file
      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success(`Downloaded: ${fileName}`);
      setIsDownloading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Download failed";
      setError(errorMsg);
      toast.error(errorMsg);
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading, error };
}

/**
 * Hook for deleting documents
 */
export function useDocumentDelete() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }

      toast.success("Document deleted successfully");
      setIsDeleting(false);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Delete failed";
      setError(errorMsg);
      toast.error(errorMsg);
      setIsDeleting(false);
      return false;
    }
  }, []);

  return { deleteDocument, isDeleting, error };
}

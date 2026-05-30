import { useState, useEffect } from 'react';
import { FileAttachment } from '@/hooks/useChatManager';
import { authFetch } from '@/lib/authFetch';

/**
 * Custom hook to securely fetch short-lived presigned URLs for R2 attachments.
 * Falls back to local blob URL if present (useful for immediate display during upload).
 * Returns null while loading or if not applicable.
 */
export function usePresignedUrl(file: FileAttachment | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(file?.local_url || null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    // If we already have a local blob URL, use it directly
    if (file.local_url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(file.local_url);
      return;
    }
    // If there's an s3_key, fetch a presigned URL from the backend
    if (file.s3_key) {
      let cancelled = false;
      authFetch(`/api/chat/file/${encodeURIComponent(file.s3_key)}`)
        .then((res: Response) => res.ok ? res.json() : null)
        .then((data: any) => {
          if (!cancelled && data?.url) setUrl(data.url);
        })
        .catch(() => {}); // Fail silently
      return () => { cancelled = true; };
    }
  }, [file, file?.local_url, file?.s3_key]);

  return url;
}

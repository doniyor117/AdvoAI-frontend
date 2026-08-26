'use client';

import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { SharedChatView } from '@/components/SharedChatView';
import { LoadingMark } from '@/components/LoadingMark';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type SharedChatData = { title: string; messages: any[] };

/** Standalone read-only page for a public share link — NOT the authenticated app
 *  shell (no sidebar, no input box). Fetches directly from the fully-open backend
 *  route, same-origin-safe since this page itself lives on the frontend's own
 *  domain (see CLAUDE.md's cross-origin constraint). */
export default function SharedChatPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = usePromise(params);
  const [data, setData] = useState<SharedChatData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/public/shared-chat/${encodeURIComponent(token)}`)
      .then(res => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(json => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setNotFound(true); });
    return () => { cancelled = true; };
  }, [token]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-medium text-slate-700 dark:text-slate-200">This shared chat is unavailable.</p>
        <p className="text-sm text-slate-400">The link may have been revoked, or never existed.</p>
        <Link href="/" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          Go to AdvoAI
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center">
        <LoadingMark size={48} />
      </div>
    );
  }

  return <SharedChatView title={data.title} messages={data.messages} />;
}

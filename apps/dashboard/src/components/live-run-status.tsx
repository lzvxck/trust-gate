'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { RunStatus } from '@/lib/api';

const TERMINAL: ReadonlySet<RunStatus> = new Set(['pass', 'fail', 'error']);

interface LiveRunStatusProps {
  runId: string;
  initialStatus: RunStatus;
}

/**
 * Subscribes to /api/runs/:id/stream (same-origin SSE proxy) and calls router.refresh()
 * the moment a queued/running run reaches a terminal status, so the rest of the page
 * (verdict, at-risk tests, judge scores -- all server-rendered) picks up the real data
 * without the visitor having to manually reload.
 */
export function LiveRunStatus({ runId, initialStatus }: LiveRunStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState<RunStatus>(initialStatus);

  useEffect(() => {
    if (TERMINAL.has(initialStatus)) return;

    const source = new EventSource(`/api/runs/${runId}/stream`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as { status: RunStatus };
      setStatus(data.status);
      if (TERMINAL.has(data.status)) {
        source.close();
        router.refresh();
      }
    };
    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [runId, initialStatus, router]);

  if (TERMINAL.has(status)) return null;

  return (
    <span className="flex items-center gap-1.5 text-body-sm text-muted">
      <span className="size-1.5 animate-pulse rounded-full bg-info-border" />
      Live &mdash; waiting for this run to finish&hellip;
    </span>
  );
}

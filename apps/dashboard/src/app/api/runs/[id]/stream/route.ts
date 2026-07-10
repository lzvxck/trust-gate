import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';

/**
 * Same-origin SSE proxy: the browser's native EventSource can't send an Authorization
 * header, and BACKEND_API_TOKEN must stay server-side (same boundary every other
 * lib/api.ts call already respects) -- so this route holds the session check, attaches
 * the bearer token server-side, and streams the backend's response straight through.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const upstream = await fetch(`${env.BACKEND_URL}/runs/${id}/stream`, {
    headers: { Authorization: `Bearer ${env.BACKEND_API_TOKEN}` },
  });

  if (!upstream.ok || !upstream.body) {
    return new NextResponse('Upstream error', { status: upstream.status || 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  });
}

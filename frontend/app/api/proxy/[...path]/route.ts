/**
 * Next.js API Proxy — eliminates CORS entirely.
 * All /api/proxy/* requests are forwarded server-side to the FastAPI backend.
 * Server → Server calls have no CORS restrictions.
 */
import { NextRequest, NextResponse } from 'next/server'

// Backend URL — resolved server-side (no CORS issue)
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  .trim()
  .replace(/\/+$/, '')
  .replace(/^(?!https?:\/\/)(.+)$/, (_, h) =>
    h.includes('.') ? `https://${h}` : `https://${h}.onrender.com`
  )

async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await context.params
  const path = pathSegments.join('/')
  const search = req.nextUrl.search || ''
  const url = `${BACKEND}/${path}${search}`

  // Forward all headers except host and content-length
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => {
    const lower = k.toLowerCase()
    if (lower !== 'host' && lower !== 'content-length') {
      headers[k] = v
    }
  })

  const body =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : await req.arrayBuffer()

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
    })

    const resHeaders = new Headers()
    upstream.headers.forEach((v, k) => {
      // Strip encoding headers Next will re-apply
      if (!['content-encoding', 'transfer-encoding'].includes(k.toLowerCase())) {
        resHeaders.set(k, v)
      }
    })
    // Allow browser to read response
    resHeaders.set('Access-Control-Allow-Origin', '*')

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    })
  } catch (err) {
    return NextResponse.json(
      { detail: `Backend proxy error reaching ${BACKEND}: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler

export const dynamic = 'force-dynamic'

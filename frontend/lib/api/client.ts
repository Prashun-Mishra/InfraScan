// Base client with API URL configuration and demo fallback
const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').trim().replace(/\/+$/, '')
export const API_BASE_URL =
  rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')
    ? rawApiUrl
    : rawApiUrl.includes('.')
      ? `https://${rawApiUrl}`
      : `https://${rawApiUrl}.onrender.com`

// In production (Render), route all API calls through the Next.js proxy to avoid CORS.
// In development, call the backend directly.
const isProduction = typeof window !== 'undefined'
  ? window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  : process.env.NODE_ENV === 'production'

export const API_CALL_BASE = isProduction ? '/api/proxy' : API_BASE_URL

export const IS_DEMO_MODE = false

export interface ApiResponse<T> {
  data: T
  isDemo: boolean
  message?: string
}

export function getFullMediaUrl(path?: string): string {
  if (!path) return ''
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('/samples/')
  ) {
    return path
  }
  return `${API_CALL_BASE}${path.startsWith('/') ? '' : '/'}${path}`
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  // Retrieve token if stored
  let token: string | null = null
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('infrascan_auth_token')
  }

  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData

  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(options?.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${API_CALL_BASE}${endpoint}`, {
      ...options,
      headers,
    })
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`API error (${res.status}): ${errorText || res.statusText}`)
    }
    const data = await res.json()
    return { data, isDemo: false }
  } catch (err) {
    console.warn(`API call failed for ${endpoint}:`, err)
    throw err
  }
}

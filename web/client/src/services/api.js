/**
 * ISKOLAR Consolidated Frontend API Client
 * Lead Developer: Sam Irian Villaluna
 * Organization: SYNERTECH
 *
 * Implements WCAG / RFC-compliant client request architecture:
 * - Dynamic base URL resolution (same-origin proxy in production, local/remote fallback)
 * - Safe retry strategy (idempotent GET/HEAD only; never state-changing POST/PUT)
 * - Automatic Authorization header injection
 * - Request cancellation via AbortSignal
 * - Configurable request timeouts
 * - Normalized error objects (401, 403, 429, 500s, network)
 * - Session expiration broadcast
 */

const rawApiUrl = (import.meta.env.VITE_API_URL || '').toString().trim();
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);

const isVercelOrCustom = isBrowser && (
  window.location.hostname.endsWith('.vercel.app') ||
  window.location.hostname.endsWith('iskolar.org') ||
  window.location.hostname.endsWith('iskolar.ph') ||
  window.location.hostname.endsWith('synertech.ph') ||
  window.location.hostname.endsWith('.pages.dev')
);

export function resolveApiBaseUrl() {
  if (isBrowser && !isLocalhost) {
    if (isVercelOrCustom) {
      return '';
    }
    if (rawApiUrl && !rawApiUrl.includes('localhost') && !rawApiUrl.includes('127.0.0.1')) {
      return rawApiUrl.replace(/\/+$/, '');
    }
    return 'https://iskolar-api-0xr6.onrender.com';
  }

  if (rawApiUrl && !rawApiUrl.includes('jeyem26-iskolar-capstone')) {
    return rawApiUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:4000';
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  constructor(message, { status, data = null, isNetwork = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status || (isNetwork ? 0 : 500);
    this.data = data;
    this.isNetwork = isNetwork;
    this.isUnauthorized = this.status === 401;
    this.isForbidden = this.status === 403;
    this.isNotFound = this.status === 404;
    this.isRateLimited = this.status === 429;
    this.isServerError = this.status >= 500;
  }
}

/**
 * Normalizes an API response or error into an ApiError instance.
 */
async function parseErrorResponse(res) {
  let errorData = null;
  let errorMessage = `Request failed with status ${res.status}`;
  try {
    const text = await res.text();
    if (text) {
      try {
        errorData = JSON.parse(text);
        errorMessage = errorData.message || errorData.error || errorData.msg || errorMessage;
      } catch (_) {
        errorMessage = text.length < 200 ? text : errorMessage;
      }
    }
  } catch (_) {}

  return new ApiError(errorMessage, { status: res.status, data: errorData });
}

/**
 * Dispatches an event when 401 session expiration occurs.
 */
function notifySessionExpired() {
  if (isBrowser) {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('iskolar:session-expired', {
        detail: { timestamp: Date.now(), reason: 'Session expired or invalidated' }
      }));
    } catch (_) {}
  }
}

/**
 * Core unified request dispatcher
 */
export async function apiRequest(endpoint, {
  method = 'GET',
  headers = {},
  body = null,
  token = null,
  signal = null,
  timeout = 15000,
  retries = 0,
  idempotent = null,
  isMultipart = false,
  ...customOptions
} = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const isHttpUrl = cleanEndpoint.startsWith('http://') || cleanEndpoint.startsWith('https://');

  const resolvedBase = API_BASE_URL;
  const primaryUrl = isHttpUrl
    ? cleanEndpoint
    : resolvedBase
      ? `${resolvedBase}${cleanEndpoint}`
      : cleanEndpoint;

  const resolvedToken = token || (isBrowser ? localStorage.getItem('token') : null);

  const requestHeaders = new Headers(headers);
  if (resolvedToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${resolvedToken}`);
  }

  let formattedBody = body;
  if (body && !isMultipart && !(body instanceof FormData) && typeof body === 'object') {
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }
    formattedBody = JSON.stringify(body);
  }

  const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  const maxRetries = idempotent === true || (idempotent === null && isSafeMethod) ? retries : 0;

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    let controller = null;
    let timeoutId = null;

    try {
      controller = new AbortController();
      if (timeout > 0) {
        timeoutId = setTimeout(() => controller.abort(), timeout);
      }

      // Link external signal if provided
      if (signal) {
        if (signal.aborted) {
          throw new DOMException('Request aborted by caller', 'AbortError');
        }
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      const res = await fetch(primaryUrl, {
        method,
        headers: requestHeaders,
        body: formattedBody,
        signal: controller.signal,
        ...customOptions,
      });

      if (timeoutId) clearTimeout(timeoutId);

      // Handle 401 Session Expiration
      if (res.status === 401) {
        notifySessionExpired();
        throw await parseErrorResponse(res);
      }

      // Handle other non-2xx status
      if (!res.ok) {
        // Transient 502/503/504 on idempotent GET can be retried
        if ([502, 503, 504].includes(res.status) && attempt < maxRetries) {
          attempt++;
          await new Promise((r) => setTimeout(r, 600 * attempt));
          continue;
        }
        throw await parseErrorResponse(res);
      }

      // Parse successful response
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
      return await res.text();

    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new ApiError(signal?.aborted ? 'Request cancelled' : 'Request timed out', { status: 408, isNetwork: true });
      }

      lastError = err instanceof ApiError ? err : new ApiError(err.message || 'Network error', { isNetwork: true });

      // If network failure on idempotent request, retry
      if (attempt < maxRetries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new ApiError('Unexpected network failure', { isNetwork: true });
}

export const apiClient = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
  upload: (endpoint, formData, options = {}) => apiRequest(endpoint, { ...options, method: 'POST', body: formData, isMultipart: true }),
  request: apiRequest,
  getBaseUrl: resolveApiBaseUrl,
};

export default apiClient;

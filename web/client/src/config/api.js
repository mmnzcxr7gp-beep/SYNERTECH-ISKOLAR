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
  window.location.hostname.endsWith('.pages.dev')
);

function determineApiBaseUrl() {
  // If running in a remote production browser (on Vercel, custom domain iskolar.org, etc.)
  if (isBrowser && !isLocalhost) {
    // Relative '' uses same-origin serverless proxy rewrites (zero CORS latency, instant failover)
    if (isVercelOrCustom) {
      return '';
    }
    // If a valid remote HTTPS API URL was explicitly provided
    if (rawApiUrl && !rawApiUrl.includes('localhost') && !rawApiUrl.includes('127.0.0.1') && !rawApiUrl.includes('jeyem26-iskolar-capstone')) {
      return rawApiUrl.replace(/\/+$/, '');
    }
    // Fallback directly to the live Render backend
    return 'https://iskolar-api.onrender.com';
  }

  // Running in local development mode
  if (rawApiUrl && !rawApiUrl.includes('jeyem26-iskolar-capstone')) {
    return rawApiUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:4000';
}

export const API_BASE_URL = determineApiBaseUrl();
export default API_BASE_URL;

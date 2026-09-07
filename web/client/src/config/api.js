const API_URL = import.meta.env.VITE_API_URL;

const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isVercel = isBrowser && window.location.hostname.endsWith('.vercel.app');

// On Vercel deployments, relative '' uses Vercel's server-side proxy rewrites (zero CORS, fastest response)
const FALLBACK_API_URL = isLocalhost
  ? 'http://localhost:4000'
  : (isVercel ? '' : 'https://iskolar-api.onrender.com');

export const API_BASE_URL = (API_URL && API_URL.toString().trim().length > 0 && !API_URL.includes('jeyem26-iskolar-capstone'))
  ? API_URL
  : FALLBACK_API_URL;

export default API_BASE_URL;

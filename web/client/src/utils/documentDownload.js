/**
 * Authenticated Document Download Helper for React Web Client (FINDING-002)
 * Ensures access tokens are passed ONLY in the Authorization header.
 */
export async function downloadAuthenticatedDocument({
  docId,
  baseUrl = '',
  token = null,
  filename = 'document.pdf',
  onPreview = null,
}) {
  if (!docId) {
    return { success: false, error: 'Missing document identifier', code: 'MISSING_ID' };
  }

  const authToken =
    token ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('provider_token') ||
    localStorage.getItem('admin_token');

  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const targetUrl = `${cleanBaseUrl}/api/documents/${docId}/download`;

  try {
    const res = await fetch(targetUrl, { headers });

    if (res.status === 401) {
      return { success: false, error: 'Authentication required. Please log in again.', code: 'UNAUTHORIZED', status: 401 };
    }
    if (res.status === 403) {
      return { success: false, error: 'Access denied. You do not have permission to view this document.', code: 'FORBIDDEN', status: 403 };
    }
    if (res.status === 404) {
      return { success: false, error: 'Document or physical file not found.', code: 'NOT_FOUND', status: 404 };
    }
    if (!res.ok) {
      return { success: false, error: `Failed to download document (HTTP ${res.status}).`, code: 'HTTP_ERROR', status: res.status };
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    if (typeof onPreview === 'function') {
      onPreview(objectUrl, blob);
    } else {
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // Revoke object URL after 60 seconds
    setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (_) {}
    }, 60000);

    return { success: true, objectUrl };
  } catch (err) {
    return { success: false, error: 'Network error downloading document. Please check backend connection.', code: 'NETWORK_ERROR' };
  }
}

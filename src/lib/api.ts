export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetch(input, { ...init, credentials: 'same-origin' });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('The API returned an unexpected response. Please try again.');
    const data = await response.clone().json();
    if (!response.ok || data?.success === false) {
      if (response.status === 401 && !String(input).includes('/api/auth/login')) window.dispatchEvent(new Event('devai:session-expired'));
      throw new Error(typeof data?.error === 'string' ? data.error : data?.message || `Request failed (${response.status}).`);
    }
    return response;
  } catch (error) {
    if (!String(input).includes('/api/auth/')) window.dispatchEvent(new CustomEvent('devai:api-error', { detail: error instanceof Error ? error.message : 'Unable to reach the server.' }));
    throw error;
  }
}

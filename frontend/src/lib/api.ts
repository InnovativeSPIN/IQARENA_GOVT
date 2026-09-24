
const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Ensure there's exactly one slash between the base URL and endpoint
  const base = BASE_URL.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;

  // Merge headers properly - ensure Content-Type is set for JSON requests when a body is present
  const incomingHeaders = (options.headers as Record<string, string>) || {};
  const headers: Record<string, string> = {
    ...incomingHeaders,
  };

  if (options.body && !Object.keys(headers).some(h => h.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.message || 'API error');
      // attach original response data for richer error handling
      // @ts-ignore
      err.data = data;
      throw err;
    }
    return data as T;
  } catch (error: any) {
    // Normalize network errors to a clearer message
    if (error instanceof Error) {
      const message = /failed to fetch/i.test(error.message) || /network error/i.test(error.message)
        ? `Network error: Unable to reach API at ${url}`
        : error.message;
      throw new Error(message);
    }
    throw new Error(`Unknown error contacting API at ${url}`);
  }
}


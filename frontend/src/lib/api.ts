
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

  if (options.body && !(options.body instanceof FormData) && !Object.keys(headers).some(h => h.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('token');
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      if (text.trim().toLowerCase().startsWith('<!doctype html>')) {
        throw new Error(`Server returned HTML instead of JSON. The route might not exist on the backend.`);
      }
      data = { message: text || `Server error (${response.status} ${response.statusText})` };
    }

    if (!response.ok) {
      const err = new Error(data.message || `API error (${response.status})`);
      // @ts-ignore
      err.data = data;
      throw err;
    }
    return data as T;
  } catch (error: any) {
    // Normalize network / syntax errors to a clear message
    if (error instanceof Error) {
      const isNetworkOrJsonError =
        /failed to fetch/i.test(error.message) ||
        /network error/i.test(error.message) ||
        /unexpected end of json/i.test(error.message) ||
        /unexpected token/i.test(error.message);
      const message = isNetworkOrJsonError
        ? `Network error: Unable to connect to server at ${url}`
        : error.message;
      throw new Error(message);
    }
    throw new Error(`Unknown error contacting API at ${url}`);
  }
}


/* /src/api/request.ts */

import { generateToken } from './token';
import { getNodes, getCurrentNodeId } from '~/lib/store';

/**
 * A wrapper around the native fetch API that automatically injects the
 * correct API base URL and a dynamically generated Authorization token.
 * It gracefully handles network errors by returning a synthetic error response.
 * @param endpoint The API endpoint to call (e.g., '/v1/system/information').
 * @param options The standard fetch options object.
 * @returns A promise that resolves with the fetch Response.
 */
export async function request(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const nodes = getNodes();
  const currentNodeId = getCurrentNodeId();

  if (!currentNodeId || !nodes[currentNodeId]) {
    // Return a synthetic error response instead of rejecting the promise.
    // This prevents unhandled promise rejection errors in the console.
    return new Response(JSON.stringify({ error: 'No active node configured.' }), {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const currentNode = nodes[currentNodeId];
  const { addr, token: seed } = currentNode;
  const authToken = await generateToken(seed);
  const headers = new Headers(options.headers);
  headers.set('Authorization', authToken);
  const url = new URL(endpoint, addr).toString();

  try {
    return await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    // If fetch itself fails (e.g., network error, DNS error), catch it
    // and return a synthetic 503 Service Unavailable response.
    console.warn(`Fetch failed for endpoint: ${endpoint}`, error);
    return new Response(JSON.stringify({ error: 'Failed to fetch' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

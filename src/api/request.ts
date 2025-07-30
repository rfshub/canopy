/* /src/api/request.ts */

import { generateToken } from './token';
import { getNodes, getCurrentNodeId } from '~/lib/store';

/**
 * A wrapper around the native fetch API that automatically injects the
 * correct API base URL and a dynamically generated Authorization token.
 * * @param endpoint The API endpoint to call (e.g., '/v1/system/information').
 * @param options The standard fetch options object.
 * @returns A promise that resolves with the fetch Response.
 */
export async function request(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const nodes = getNodes();
  const currentNodeId = getCurrentNodeId();

  if (!currentNodeId || !nodes[currentNodeId]) {
    // This will effectively block all API calls if no node is configured.
    // The AppProvider should redirect to /setup in this case.
    return Promise.reject(new Error('No active node configured.'));
  }

  const currentNode = nodes[currentNodeId];
  const { addr, token: seed } = currentNode;
  // Generate a fresh token for this request
  const authToken = await generateToken(seed);
  const headers = new Headers(options.headers);
  headers.set('Authorization', authToken);
  const url = new URL(endpoint, addr).toString();

  return fetch(url, {
    ...options,
    headers,
  });
}

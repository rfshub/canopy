/* /src/api/token.ts */

import { sha256 } from 'js-sha256';

/**
 * Converts a base64 string to a Uint8Array, correctly handling binary data.
 * This is a more robust method than using atob() directly, which can corrupt
 * binary data by misinterpreting it as text.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a time-sensitive authentication token based on a shared seed.
 * @param base64Seed The base64 encoded seed string provided by the user.
 * @returns A promise that resolves to the Bearer token string.
 */
export async function generateToken(base64Seed: string): Promise<string> {
  try {
    // Decode the seed using the robust binary-safe method
    const seedBytes = base64ToUint8Array(base64Seed);
    const SEED_SIZE = 64;
    const TOKEN_COUNT = 6;
    const timeWindow = Math.floor(Date.now() / 1000 / 20);
    const timeWindowBytes = new ArrayBuffer(8);
    new DataView(timeWindowBytes).setBigInt64(0, BigInt(timeWindow), false);
    const codes: string[] = [];

    // Generate 6 codes based on the time window
    for (let i = 0; i < TOKEN_COUNT; i++) {
      const seedChunk = seedBytes.slice(i * SEED_SIZE, (i + 1) * SEED_SIZE);
      const dataToHash = new Uint8Array(seedChunk.length + 8);
      dataToHash.set(seedChunk);
      dataToHash.set(new Uint8Array(timeWindowBytes), seedChunk.length);
      const hashBuffer = sha256.arrayBuffer(dataToHash);
      const view = new DataView(hashBuffer);
      const number = view.getUint32(0, false) % 1_000_000;
      codes.push(number.toString().padStart(6, '0'));
    }

    // Combine and Base64 encode the final token
    const combined = codes.join('');
    const finalToken = btoa(combined);
    return `Bearer ${finalToken}`;
  } catch (error) {
    console.error("Failed to generate token:", error);
    // Return an invalid token format to ensure requests fail
    return 'Bearer invalid-token';
  }
}

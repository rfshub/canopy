/* /src/api/token.ts */

// --- Helper to convert ArrayBuffer to Hex ---
function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a time-sensitive authentication token based on a shared seed.
 * This logic mirrors the Rust backend's token computation.
 * @param base64Seed The base64 encoded seed string provided by the user.
 * @returns A promise that resolves to the Bearer token string.
 */
export async function generateToken(base64Seed: string): Promise<string> {
  try {
    const decodedString = atob(base64Seed);
    const seedBytes = new Uint8Array(decodedString.length).map((_, i) => decodedString.charCodeAt(i));
    const SEED_SIZE = 64;
    const TOKEN_COUNT = 6;
    const timeWindow = Math.floor(Date.now() / 1000 / 15);
    const timeWindowBytes = new ArrayBuffer(8);
    new DataView(timeWindowBytes).setBigInt64(0, BigInt(timeWindow), false); // Big-endian
    const codes: string[] = [];
    for (let i = 0; i < TOKEN_COUNT; i++) {
      const seedChunk = seedBytes.slice(i * SEED_SIZE, (i + 1) * SEED_SIZE);
      const dataToHash = new Uint8Array(seedChunk.length + 8);
      dataToHash.set(seedChunk);
      dataToHash.set(new Uint8Array(timeWindowBytes), seedChunk.length);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataToHash);
      const view = new DataView(hashBuffer);
      const number = view.getUint32(0, false) % 1_000_000; // Big-endian
      codes.push(number.toString().padStart(6, '0'));
    }

    const combined = codes.join('');
    const finalToken = btoa(combined);
    return `Bearer ${finalToken}`;
  } catch (error) {
    console.error("Failed to generate token:", error);
    // Return an invalid token format to ensure requests fail
    return 'Bearer invalid-token';
  }
}

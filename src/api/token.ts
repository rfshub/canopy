/* /src/api/token.ts */

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

    // Generate 6 codes based on the time window
    for (let i = 0; i < TOKEN_COUNT; i++) {
      const seedChunk = seedBytes.slice(i * SEED_SIZE, (i + 1) * SEED_SIZE);
      
      const dataToHash = new Uint8Array(seedChunk.length + 8);
      dataToHash.set(seedChunk);
      dataToHash.set(new Uint8Array(timeWindowBytes), seedChunk.length);

      // Compute SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataToHash);
      
      // Extract number and format it
      const view = new DataView(hashBuffer);
      const number = view.getUint32(0, false) % 1_000_000; // Big-endian
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

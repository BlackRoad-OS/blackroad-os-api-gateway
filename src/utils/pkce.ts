/**
 * PKCE (Proof Key for Code Exchange) utilities — RFC 7636
 */

import crypto from 'crypto';

/** Constant-time string comparison to prevent timing attacks */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/** Verify a PKCE code_verifier against the stored code_challenge */
export function verifyPKCE(codeVerifier: string, codeChallenge: string, method: 'S256' | 'plain'): boolean {
  if (method === 'plain') {
    return safeCompare(codeVerifier, codeChallenge);
  }
  // S256: BASE64URL(SHA256(ASCII(code_verifier)))
  const digest = crypto.createHash('sha256').update(codeVerifier, 'ascii').digest();
  const derived = digest.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return safeCompare(derived, codeChallenge);
}

/** Generate a cryptographically random code_verifier */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** Derive the S256 code_challenge from a code_verifier */
export function deriveCodeChallenge(codeVerifier: string): string {
  const digest = crypto.createHash('sha256').update(codeVerifier, 'ascii').digest();
  return digest.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

import crypto from 'node:crypto';
import { SECRETS } from './env.ts';

export function computeHmacSha256Hex(
  payload: string | Buffer,
  secret: string,
): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function signGitHubWebhook(
  payload: string | Buffer,
  secret: string = SECRETS.githubWebhook,
): string {
  return `sha256=${computeHmacSha256Hex(payload, secret)}`;
}

export function signGatewayEvent(
  payload: string | Buffer,
  secret: string = SECRETS.gatewayEvent,
): string {
  return `sha256=${computeHmacSha256Hex(payload, secret)}`;
}

export function verifyHmacSha256(
  payload: string | Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  if (typeof signatureHeader !== 'string' || signatureHeader.length === 0) {
    return false;
  }

  const normalized = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;

  if (!/^[0-9a-f]{64}$/i.test(normalized)) {
    return false;
  }

  const expectedHex = computeHmacSha256Hex(payload, secret);
  const actualBuf = Buffer.from(normalized.toLowerCase(), 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

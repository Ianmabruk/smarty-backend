#!/usr/bin/env node
/**
 * Build time check for the API base URL.
 *
 * A production build that cannot reach the API is worse than a failed build,
 * so Netlify runs this before `vite build`:
 *
 *   npm run check:config -- --strict
 *
 * `--strict` additionally rejects local addresses (localhost / 127.0.0.1),
 * which must never be baked into a deployed bundle.
 */

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const allowLocal = args.includes('--allow-local');

const raw = (process.env.VITE_API_BASE_URL || '').trim();

function fail(message) {
  console.error(`\n[api-config] ${message}\n`);
  process.exit(1);
}

if (!raw) {
  fail(
    'VITE_API_BASE_URL is not set.\n' +
      '  Set it in the Netlify environment variables to the deployed API origin,\n' +
      '  for example https://your-render-service.onrender.com/api\n' +
      '  (adding or changing it requires a new Netlify deploy).',
  );
}

let parsed;
try {
  parsed = new URL(raw);
} catch {
  fail(`VITE_API_BASE_URL is not a valid URL: ${raw}`);
}

if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
  fail(`VITE_API_BASE_URL must use http or https: ${raw}`);
}

const hostname = parsed.hostname.toLowerCase();
const isLocal =
  ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname) ||
  hostname.endsWith('.localhost');

if (isLocal && !allowLocal) {
  fail(
    `VITE_API_BASE_URL points at the local machine (${parsed.origin}).\n` +
      '  A deployed site cannot reach the backend that way.\n' +
      '  Point it at the deployed Render API origin.',
  );
}

if (strict && parsed.protocol !== 'https:') {
  fail(`VITE_API_BASE_URL must use HTTPS in production: ${raw}`);
}

console.log(`[api-config] VITE_API_BASE_URL = ${parsed.origin} (ok)`);

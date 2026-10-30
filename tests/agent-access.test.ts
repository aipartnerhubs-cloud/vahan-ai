import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAgentAllowlistConfigured,
  isAllowedAgentEmail,
  isProductionDeployment,
} from '../lib/agent-access.ts';

async function withEnvironment(
  values: Record<string, string | undefined>,
  run: () => void | Promise<void>
) {
  const keys = Object.keys(values);
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('production fails closed when the approved-agent allowlist is missing', async () => {
  await withEnvironment({
    NODE_ENV: 'production',
    VERCEL_ENV: undefined,
    ALLOWED_AGENT_EMAILS: undefined,
  }, () => {
    assert.equal(isProductionDeployment(), true);
    assert.equal(isAgentAllowlistConfigured(), false);
    assert.equal(isAllowedAgentEmail('agent@example.com'), false);
  });
});

test('production allowlist comparison ignores case and spaces', async () => {
  await withEnvironment({
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    ALLOWED_AGENT_EMAILS: ' agent@example.com, RM@example.com ',
  }, () => {
    assert.equal(isAllowedAgentEmail('AGENT@example.com'), true);
    assert.equal(isAllowedAgentEmail('other@example.com'), false);
    assert.equal(isAllowedAgentEmail(null), false);
  });
});

test('preview allows a provisioned Supabase user when no production allowlist is needed', async () => {
  await withEnvironment({
    NODE_ENV: 'production',
    VERCEL_ENV: 'preview',
    ALLOWED_AGENT_EMAILS: undefined,
  }, () => {
    assert.equal(isProductionDeployment(), false);
    assert.equal(isAllowedAgentEmail('preview-user@example.com'), true);
  });
});

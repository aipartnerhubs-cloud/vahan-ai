import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAgentAllowlistConfigured,
  isAllowedAgentEmail,
  isProductionDeployment,
} from '../lib/agent-access.ts';

test('production access fails closed when the agent allowlist is missing', () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    allowlist: process.env.ALLOWED_AGENT_EMAILS,
  };

  process.env.NODE_ENV = 'production';
  delete process.env.VERCEL_ENV;
  delete process.env.ALLOWED_AGENT_EMAILS;

  try {
    assert.equal(isProductionDeployment(), true);
    assert.equal(isAgentAllowlistConfigured(), false);
    assert.equal(isAllowedAgentEmail('agent@example.com'), false);
  } finally {
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous.vercelEnv;
    if (previous.allowlist === undefined) delete process.env.ALLOWED_AGENT_EMAILS;
    else process.env.ALLOWED_AGENT_EMAILS = previous.allowlist;
  }
});

test('production email allowlist is case-insensitive and rejects unknown users', () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    allowlist: process.env.ALLOWED_AGENT_EMAILS,
  };

  process.env.NODE_ENV = 'production';
  process.env.VERCEL_ENV = 'production';
  process.env.ALLOWED_AGENT_EMAILS = 'agent@example.com, rm@example.com ';

  try {
    assert.equal(isAllowedAgentEmail('AGENT@example.com'), true);
    assert.equal(isAllowedAgentEmail('other@example.com'), false);
    assert.equal(isAllowedAgentEmail(null), false);
  } finally {
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous.vercelEnv;
    if (previous.allowlist === undefined) delete process.env.ALLOWED_AGENT_EMAILS;
    else process.env.ALLOWED_AGENT_EMAILS = previous.allowlist;
  }
});

test('preview environments may use provisioned Supabase users without a production allowlist', () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    allowlist: process.env.ALLOWED_AGENT_EMAILS,
  };

  process.env.NODE_ENV = 'production';
  process.env.VERCEL_ENV = 'preview';
  delete process.env.ALLOWED_AGENT_EMAILS;

  try {
    assert.equal(isProductionDeployment(), false);
    assert.equal(isAllowedAgentEmail('preview-user@example.com'), true);
  } finally {
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous.vercelEnv;
    if (previous.allowlist === undefined) delete process.env.ALLOWED_AGENT_EMAILS;
    else process.env.ALLOWED_AGENT_EMAILS = previous.allowlist;
  }
});

const allowedAgentEmails = () =>
  (process.env.ALLOWED_AGENT_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export function isProductionDeployment(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')
  );
}

export function isAgentAllowlistConfigured(): boolean {
  return allowedAgentEmails().length > 0;
}

export function isAllowedAgentEmail(email: string | undefined | null): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  const allowlist = allowedAgentEmails();

  if (!allowlist.length) {
    // Fail closed in production. Outside production, an explicit list—if set—
    // still restricts access; otherwise a provisioned Supabase account is enough.
    return !isProductionDeployment();
  }

  return Boolean(normalizedEmail && allowlist.includes(normalizedEmail));
}

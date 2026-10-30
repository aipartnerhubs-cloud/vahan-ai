export function isProductionDeployment(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')
  );
}

function allowedEmails(): string[] {
  return (process.env.ALLOWED_AGENT_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAgentAllowlistConfigured(): boolean {
  return allowedEmails().length > 0;
}

export function isAllowedAgentEmail(email: string | null | undefined): boolean {
  const allowlist = allowedEmails();
  if (!allowlist.length) {
    return !isProductionDeployment();
  }

  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && allowlist.includes(normalized));
}

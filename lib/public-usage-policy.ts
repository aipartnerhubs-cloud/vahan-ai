// Preview test branch: the five-check daily quota is intentionally disabled.
// Keep a short-window guard to prevent rapid automated bursts.
export const PUBLIC_PARTNER_BURST_LIMIT = 3;
export const PUBLIC_PARTNER_BURST_WINDOW = '5 m';

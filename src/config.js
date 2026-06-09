// ============================================================================
// APP CONFIG
// ----------------------------------------------------------------------------
// Sign-in is Google-only; Imperial status is verified at onboarding via the
// student SHORTCODE (not the email domain — Imperial students sign in with a
// personal Google account, since Imperial email is Microsoft-based).
//
// ALLOWED_EMAIL_DOMAINS is kept null (any Google email is fine); the shortcode
// is the real gate.
// ============================================================================

export const ALLOWED_EMAIL_DOMAINS = null;

// Imperial shortcode: 1+ letters then 2+ digits (e.g. AG3824). The last two
// digits are the join year — we can't verify the rest, but we require the year
// to be 2020–2025. Returns { ok, code, year } or { ok:false, error }.
export function validateShortcode(raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter your Imperial shortcode.' };
  // Generic error on purpose — don't reveal the format/rules, so someone without a
  // real Imperial shortcode can't reverse-engineer one that passes.
  const GENERIC = { ok: false, error: 'That doesn’t look like a valid Imperial shortcode.' };
  if (!/^[A-Z]+[0-9]{2,}$/.test(code)) return GENERIC;
  const last2 = Number(code.slice(-2));
  if (last2 < 20 || last2 > 25) return GENERIC;
  return { ok: true, code, year: 2000 + last2 };
}

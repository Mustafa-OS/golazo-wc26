// ============================================================================
// APP CONFIG
// ----------------------------------------------------------------------------
// Audience gate. Set ALLOWED_EMAIL_DOMAIN to a domain to restrict who can sign
// up (e.g. '@imperial.ac.uk' for Imperial-only), or to null to open the app to
// ANY email. This single flag is the only change to go Imperial-only <-> open.
//
// Note: this is a friendly client-side check. To *enforce* it (so nobody can
// fake an address), enable Firebase email verification and gate on verified —
// a post-launch hardening step.
// ============================================================================

export const ALLOWED_EMAIL_DOMAIN = '@imperial.ac.uk';

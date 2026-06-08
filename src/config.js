// ============================================================================
// APP CONFIG
// ----------------------------------------------------------------------------
// Audience gate. List the email domains allowed to sign up (Imperial uses both
// the long and short forms), or set to null to open the app to ANY email. This
// is the only change to go Imperial-only <-> open.
//
// Note: this is a friendly client-side check. To *enforce* it server-side you'd
// gate on a verified email — a deliberate non-goal for now (kept low-friction).
// ============================================================================

export const ALLOWED_EMAIL_DOMAINS = ['@imperial.ac.uk', '@ic.ac.uk'];

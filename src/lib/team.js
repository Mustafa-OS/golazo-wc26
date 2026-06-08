// ============================================================================
// TEAM DISPLAY HELPERS
// ----------------------------------------------------------------------------
// Mock data uses emoji flags + 3-letter codes ('ENG'); the live API gives logo
// URLs + numeric team ids (16). These normalise both for display.
// ============================================================================

export function isLogoUrl(flag) {
  return typeof flag === 'string' && /^https?:\/\//.test(flag);
}

// A short, readable code for a team badge / rail.
export function teamShort(name, code) {
  if (typeof code === 'string' && /[A-Za-z]/.test(code)) return code.toUpperCase().slice(0, 3);
  const n = (name || '').trim();
  const w = n.split(/\s+/).filter(Boolean);
  if (w.length >= 2) return (w[0][0] + w[1].slice(0, 2)).toUpperCase(); // "South Africa" -> SAF
  return (n.slice(0, 3) || '???').toUpperCase();                        // "Mexico" -> MEX
}

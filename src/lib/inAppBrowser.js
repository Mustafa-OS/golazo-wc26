// ============================================================================
// IN-APP BROWSER DETECTION
// ----------------------------------------------------------------------------
// In-app browsers (WhatsApp, Instagram, Facebook, …) either block Google OAuth
// outright or break the redirect flow: their storage is partitioned, so the
// redirect fallback of signInWithPopup loses its state and you get the
// "missing initial state" error. We detect them so the sign-in screen can tell
// people to open the link in their real browser, where Google sign-in works.
//
// Detection is best-effort by user-agent. False positives are harmless — the
// banner is guidance, not a block; the normal "Continue with Google" button
// stays available underneath.
// ============================================================================

export function inAppBrowser() {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent || '';
  const named = [
    [/WhatsApp/i, 'WhatsApp'],
    [/Instagram/i, 'Instagram'],
    [/\bFBAN\b|\bFBAV\b|FB_IAB|FBIOS|Messenger/i, 'Facebook'],
    [/\bLine\//i, 'LINE'],
    [/Snapchat/i, 'Snapchat'],
    [/TikTok|musical_ly|BytedanceWebview/i, 'TikTok'],
    [/LinkedInApp/i, 'LinkedIn'],
    [/\bTwitter\b/i, 'X'],
    [/Pinterest/i, 'Pinterest'],
  ];
  for (const [re, name] of named) if (re.test(ua)) return name;
  // Generic Android embedded WebView. Chrome Custom Tabs (which work fine for
  // OAuth) do NOT contain "wv", so this only catches true in-app webviews.
  if (/Android/i.test(ua) && /;\s*wv\)/.test(ua)) return 'in-app';
  return '';
}

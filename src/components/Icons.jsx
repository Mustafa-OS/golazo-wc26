import React from 'react';

// Minimal line icons (inherit color via currentColor). Used for nav + UI so the
// app reads clean instead of emoji-heavy.
const Svg = ({ children, size = 22, ...p }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);

export const IconHome = (p) => (<Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></Svg>);
export const IconBall = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5l4.3 3.1-1.6 5h-5.4l-1.6-5z" /><path d="M12 3v4.5M5 11l3.3 1M19 11l-3.3 1M8 19l1.3-3M16 19l-1.3-3" /></Svg>);
export const IconTrophy = (p) => (<Svg {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5M17 6h2.5v1.5A3 3 0 0 1 16.5 10.5" /><path d="M12 13v3M8.5 20h7M10 20v-2h4v2" /></Svg>);
export const IconUsers = (p) => (<Svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 5.8M17 14.5a5.5 5.5 0 0 1 3.5 5" /></Svg>);
export const IconUser = (p) => (<Svg {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /></Svg>);
export const IconInfo = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.6h.01" /></Svg>);
export const IconLock = (p) => (<Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>);
// Filled star — marks the headline / "popular" players in a match.
export const IconStar = (p) => (<Svg fill="currentColor" stroke="none" {...p}><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></Svg>);
export const IconSun = (p) => (<Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>);
export const IconMoon = (p) => (<Svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Svg>);

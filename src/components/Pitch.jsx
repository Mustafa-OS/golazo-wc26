import React from 'react';

// Faint full-pitch markings behind the app (touchlines, halfway, centre circle,
// penalty + 6-yard boxes, penalty spots, D-arcs, corner arcs). Fixed to the
// centred app column, low-opacity lime — atmospheric, not distracting.
export default function Pitch() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 mx-auto h-full max-w-md"
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="#C6FF3E"
      strokeOpacity="0.06"
      strokeWidth="2"
    >
      {/* touchlines + halfway + centre */}
      <rect x="16" y="16" width="368" height="768" rx="4" />
      <line x1="16" y1="400" x2="384" y2="400" />
      <circle cx="200" cy="400" r="62" />
      <circle cx="200" cy="400" r="3.5" fill="#C6FF3E" fillOpacity="0.1" stroke="none" />

      {/* top box */}
      <rect x="96" y="16" width="208" height="104" />
      <rect x="148" y="16" width="104" height="46" />
      <circle cx="200" cy="92" r="3.5" fill="#C6FF3E" fillOpacity="0.1" stroke="none" />
      <path d="M150 120 A 56 56 0 0 0 250 120" />

      {/* bottom box */}
      <rect x="96" y="680" width="208" height="104" />
      <rect x="148" y="738" width="104" height="46" />
      <circle cx="200" cy="708" r="3.5" fill="#C6FF3E" fillOpacity="0.1" stroke="none" />
      <path d="M150 680 A 56 56 0 0 1 250 680" />

      {/* corner arcs */}
      <path d="M16 28 A 12 12 0 0 0 28 16" />
      <path d="M372 16 A 12 12 0 0 0 384 28" />
      <path d="M16 772 A 12 12 0 0 1 28 784" />
      <path d="M384 772 A 12 12 0 0 1 372 784" />
    </svg>
  );
}

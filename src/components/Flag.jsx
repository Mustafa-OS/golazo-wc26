import React, { useState } from 'react';
import { isLogoUrl, teamShort } from '../lib/team.js';

// Renders a team flag: emoji (mock data) or logo image (live API). If a live
// logo fails to load (some teams 404), it falls back to a short-code chip so the
// flag is never just blank.
export default function Flag({ team, size = 'h-4 w-4' }) {
  const [err, setErr] = useState(false);
  if (isLogoUrl(team.flag) && !err) {
    return (
      <img
        src={team.flag}
        alt=""
        onError={() => setErr(true)}
        className={`${size} shrink-0 rounded-sm object-contain`}
      />
    );
  }
  if (isLogoUrl(team.flag)) {
    return (
      <span className={`inline-flex ${size} shrink-0 items-center justify-center rounded-sm bg-panel2 text-[8px] font-extrabold leading-none text-mist`}>
        {teamShort(team.name, team.code)}
      </span>
    );
  }
  return <span className="shrink-0">{team.flag}</span>;
}

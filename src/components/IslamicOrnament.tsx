import React from 'react';

export const IslamicDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-3 my-2 ${className}`} aria-hidden="true">
    <span className="h-px flex-1 bg-[#E6E0D4]" />
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className="text-[#854D0E]/55 shrink-0"
    >
      <polygon
        points="12,2 14.8,9.2 22,12 14.8,14.8 12,22 9.2,14.8 2,12 9.2,9.2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        transform="rotate(45 12 12)"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" fillOpacity="0.4" />
    </svg>
    <span className="h-px flex-1 bg-[#E6E0D4]" />
  </div>
);

export const CornerArabesque: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="68"
    height="68"
    viewBox="0 0 68 68"
    fill="none"
    aria-hidden="true"
    className={`pointer-events-none select-none ${className}`}
  >
    <g stroke="currentColor" strokeWidth="0.9">
      <polygon points="34,4 42,26 64,34 42,42 34,64 26,42 4,34 26,26" />
      <rect x="16" y="16" width="36" height="36" transform="rotate(45 34 34)" />
      <circle cx="34" cy="34" r="7" />
    </g>
  </svg>
);

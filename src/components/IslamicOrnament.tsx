import React from 'react';

export const IslamicDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`islamic-ornament-el flex items-center justify-center gap-3 my-2 ${className}`} aria-hidden="true">
    <span className="h-px flex-1 bg-[#E6E0D4]" />
    <svg
      width="24"
      height="24"
      viewBox="0 0 100 100"
      fill="none"
      className="text-[#854D0E]/45 shrink-0"
    >
      <polygon
        points="34.7,13 65.3,13 87,34.7 87,65.3 65.3,87 34.7,87 13,65.3 13,34.7"
        stroke="currentColor"
        strokeWidth="4.2"
      />
      <polygon
        points="40.1,26 59.9,26 74,40.1 74,59.9 59.9,74 40.1,74 26,59.9 26,40.1"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <circle cx="50" cy="50" r="6" fill="currentColor" fillOpacity="0.35" />
    </svg>
    <span className="h-px flex-1 bg-[#E6E0D4]" />
  </div>
);

export const CornerArabesque: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    width="88"
    height="88"
    viewBox="0 0 100 100"
    fill="none"
    aria-hidden="true"
    className={`islamic-ornament-el pointer-events-none select-none ${className}`}
  >
    <g stroke="currentColor" strokeWidth="0.9">
      <polygon points="34.7,13 65.3,13 87,34.7 87,65.3 65.3,87 34.7,87 13,65.3 13,34.7" />
      <polygon points="40.1,26 59.9,26 74,40.1 74,59.9 59.9,74 40.1,74 26,59.9 26,40.1" />
      <polygon points="45,38 55,38 62,45 62,55 55,62 45,62 38,55 38,45" />
    </g>
  </svg>
);

export const OctagonalHalo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    aria-hidden="true"
    className={`islamic-ornament-el pointer-events-none select-none ${className}`}
  >
    <g stroke="currentColor" strokeWidth="0.55">
      <polygon points="32.4,7.5 67.6,7.5 92.5,32.4 92.5,67.6 67.6,92.5 32.4,92.5 7.5,67.6 7.5,32.4" />
      <polygon points="36.2,16.8 63.8,16.8 83.2,36.2 83.2,63.8 63.8,83.2 36.2,83.2 16.8,63.8 16.8,36.2" />
      <polygon points="40.1,26 59.9,26 74,40.1 74,59.9 59.9,74 40.1,74 26,59.9 26,40.1" />
    </g>
  </svg>
);



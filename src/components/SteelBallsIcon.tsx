import React from 'react';

export const SteelBallsIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="headerSteelGrad" cx="38%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#e2e8f0" />
          <stop offset="70%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </radialGradient>
      </defs>

      {/* Left Sphere */}
      <circle cx="175" cy="256" r="115" fill="url(#headerSteelGrad)" stroke="#0f172a" strokeWidth="12" />
      <ellipse cx="145" cy="210" rx="30" ry="20" fill="#ffffff" opacity="0.9" transform="rotate(-25 145 210)" />

      {/* Right Sphere */}
      <circle cx="337" cy="256" r="115" fill="url(#headerSteelGrad)" stroke="#0f172a" strokeWidth="12" />
      <ellipse cx="307" cy="210" rx="30" ry="20" fill="#ffffff" opacity="0.9" transform="rotate(-25 307 210)" />
    </svg>
  );
};

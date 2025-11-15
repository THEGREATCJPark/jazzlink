import React from 'react';

interface IconProps {
  className?: string;
  filled?: boolean;
}

const LeaderIcon: React.FC<IconProps> = ({ className, filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Crown */}
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M8 4l-1.5 3h11L16 4l-4 3-4-3z"
      fill={filled ? "currentColor" : "none"}
    />
    {/* Head */}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 12a3 3 0 100-6 3 3 0 000 6z"
      fill={filled ? "currentColor" : "none"}
    />
    {/* Body */}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.6 14.8A6 6 0 0012 13a6 6 0 00-5.6 1.8A9 9 0 003 21h18a9 9 0 00-3.4-6.2z"
      fill={filled ? "currentColor" : "none"}
    />
  </svg>
);

export default LeaderIcon;
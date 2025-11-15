import React from 'react';

interface IconProps {
  className?: string;
  filled?: boolean;
}

const LeaderIcon: React.FC<IconProps> = ({ className, filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 16l-2-11 5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
  </svg>
);

export default LeaderIcon;

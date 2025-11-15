import React from 'react';

interface IconProps {
  className?: string;
  filled?: boolean;
}

const LeaderIcon: React.FC<IconProps> = ({ className, filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <path d="M2 13l3-8 4 3 3-5 3 5 4-3 3 8H2z" fill={filled ? "currentColor" : "none"}/>
    <path d="M2 18h20" />
  </svg>
);

export default LeaderIcon;

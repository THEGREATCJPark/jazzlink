import React from 'react';

interface IconProps {
  className?: string;
  filled?: boolean;
}

const LeaderIcon: React.FC<IconProps> = ({ className, filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    {/* Crown */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l2-3 2 3-2 2-2-2z" fill={filled ? 'currentColor' : 'none'} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5l2-3 2 3-2 2-2-2z" fill={filled ? 'currentColor' : 'none'} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11l-2-3-2 3 2 2 2-2z" fill={filled ? 'currentColor' : 'none'} />
    
    {/* Person */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default LeaderIcon;
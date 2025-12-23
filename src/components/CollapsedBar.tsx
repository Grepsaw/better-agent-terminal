import React from 'react';

interface CollapsedBarProps {
  position: 'right' | 'bottom';
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export const CollapsedBar: React.FC<CollapsedBarProps> = ({
  position,
  icon,
  label,
  onClick,
}) => {
  return (
    <div
      className={`collapsed-bar collapsed-bar-${position}`}
      onClick={onClick}
      title={label}
    >
      <div className="collapsed-bar-icon">{icon}</div>
      {position === 'bottom' && (
        <span className="collapsed-bar-label">{label}</span>
      )}
    </div>
  );
};

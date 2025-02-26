import React from 'react';

interface TwoColumnLayoutProps {
  leftColumn: React.ReactNode;
  rightColumn: React.ReactNode;
}

const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
  leftColumn,
  rightColumn
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {leftColumn}
      {rightColumn}
    </div>
  );
};

export default TwoColumnLayout; 
import React from 'react';
import PageHeaderText from './PageHeaderText';
import PageHeaderSubText from './PageHeaderSubText';
import PageHeaderIcon from './PageHeaderIcon';
import PageHeaderInfoBox from './PageHeaderInfoBox';
import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  infoBoxes?: React.ReactNode[];
  bgColor?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  icon, 
  iconColor, 
  infoBoxes,
  bgColor
}) => {
  return (
    <div className="w-full mb-6 h-24">
      <div className={clsx(
        "flex items-stretch justify-between rounded-xl w-full shadow-md shadow-black/20 bg-opacity-100 h-full",
        bgColor
      )}>
        {/* pl-4 default but if icon is present, add pl-6 */}
        <div className={clsx(
          "flex items-center bg-transparent",
          icon ? 'pl-4' : 'pl-6'
        )}>
          {icon && <PageHeaderIcon icon={icon} iconColor={iconColor} />}
          <div className="py-4 pr-4">
            <PageHeaderText>{title}</PageHeaderText>
            <PageHeaderSubText>{subtitle ? subtitle : '...'}</PageHeaderSubText>
          </div>
        </div>
        <div className="flex items-center px-4 space-x-4 bg-transparent">
          {infoBoxes?.map((box, index) => (
            <PageHeaderInfoBox
              key={index}
              className="bg-transparent"
            >
              {box}
            </PageHeaderInfoBox>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageHeader; 
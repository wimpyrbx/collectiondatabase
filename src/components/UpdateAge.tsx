import React from 'react';
import { timeAgo } from '@/utils/dateUtils';
import { Tooltip } from '@/components/tooltip/Tooltip';

interface UpdateAgeProps {
  date?: string | Date | number;
  secondsAgo?: number;
  showElement?: 'text' | 'bar' | 'both';
  className?: string;
  tooltip?: string;
}

const getColorForMinutes = (minutes: number): string => {

  // 0-20 minutes: green to yellow transition
  if (minutes <= 20) {
    const progress = minutes / 20;
    const r = Math.round(0 + (255 - 0) * progress);
    const g = 255;
    const b = Math.round(0 + (0 - 0) * progress);
    return `rgb(${r}, ${g}, ${b})`;
  } 
  // 20-40 minutes: yellow to orange transition
  else if (minutes <= 40) {
    const progress = (minutes - 20) / 20;
    const r = 255;
    const g = Math.round(255 + (165 - 255) * progress);
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  } 
  // 40-60 minutes: orange to red transition
  else {
    const progress = Math.min(1, (minutes - 40) / 20);
    const r = 255;
    const g = Math.round(165 - (165 * progress));
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  }
};

export const UpdateAge: React.FC<UpdateAgeProps> = ({ date, secondsAgo, showElement = 'bar', className = '' }) => {
  const [currentTime, setCurrentTime] = React.useState(() => new Date());
  
  // Calculate minutes ago either from secondsAgo or date
  const minutesAgo = secondsAgo !== undefined 
    ? secondsAgo / 60 
    : date 
      ? (currentTime.getTime() - new Date(date).getTime()) / (1000 * 60)
      : 0;

  React.useEffect(() => {
    // Only set up interval if we're using date-based calculation
    if (date && minutesAgo <= 60) {
      // Update the time display every 30 seconds
      const tickInterval = setInterval(() => {
        setCurrentTime(new Date());
      }, 30000); // 30 seconds

      return () => clearInterval(tickInterval);
    }
  }, [minutesAgo, date]);

  const width = minutesAgo <= 60 ? Math.max(0, 100 - (minutesAgo * 100) / 60) : 0;
  const backgroundColor = getColorForMinutes(Math.min(60, minutesAgo));

  const containerClasses = showElement === 'bar' 
    ? `relative min-h-[1.25rem] ${className}` 
    : `relative flex items-center justify-center min-w-[100px] min-h-[1.25rem] ${className}`;

  return (
    // we need to add tooltip if enabled
      <div className={containerClasses}>
        {/* Hidden timestamp for filtering */}
      {date && (
        <span className="hidden" data-timestamp={new Date(date).toISOString()}>
          {new Date(date).toISOString()}
        </span>
      )}
      
      {(showElement === 'bar' || showElement === 'both') && (
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            width: `${width}%`,
            backgroundColor
          }}
        />
      )}
      {(showElement === 'text' || showElement === 'both') && (
        <span className="relative z-10 text-gray-400 text-center">
          {secondsAgo !== undefined 
            ? timeAgo(new Date(Date.now() - secondsAgo * 1000))
            : date 
              ? timeAgo(date)
              : '-'
          }
        </span>
      )}
    </div>
  );
};
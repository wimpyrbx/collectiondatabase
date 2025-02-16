import React, { useEffect } from 'react';
import { timeAgo } from '@/utils/dateUtils';
import { Tooltip } from '@/components/tooltip/Tooltip';
import { useQueryClient } from '@tanstack/react-query';

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
    const progress = minutes / 20;  // normalize to 0-1 for first 20 minutes
    const r = Math.round(0 + (255 - 0) * progress);
    const g = 255;
    const b = Math.round(0 + (0 - 0) * progress);
    return `rgb(${r}, ${g}, ${b})`;
  } 
  // 20-40 minutes: yellow to orange transition
  else if (minutes <= 40) {
    const progress = (minutes - 20) / 20;  // normalize to 0-1 for second 20 minutes
    const r = 255;
    const g = Math.round(255 + (165 - 255) * progress);
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  } 
  // 40-60 minutes: orange to red transition
  else {
    const progress = Math.min(1, (minutes - 40) / 20);  // normalize to 0-1 for final 20 minutes
    const r = 255;
    const g = Math.round(165 - (165 * progress));
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  }
};

export const UpdateAge: React.FC<UpdateAgeProps> = ({ date, secondsAgo: initialSecondsAgo, showElement = 'bar', className = '' }) => {
  const [currentTime, setCurrentTime] = React.useState(() => new Date());
  const [tooltipOpen, setTooltipOpen] = React.useState(false);
  const [localSecondsAgo, setLocalSecondsAgo] = React.useState(initialSecondsAgo);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Update localSecondsAgo when initialSecondsAgo changes (e.g., after a save)
  React.useEffect(() => {
    if (initialSecondsAgo !== undefined) {
      setLocalSecondsAgo(initialSecondsAgo);
      setCurrentTime(new Date());
    }
  }, [initialSecondsAgo]);
  
  // Set up interval for updates
  React.useEffect(() => {
    if (!date && initialSecondsAgo === undefined) return;

    const updateAge = () => {
      const now = new Date();
      setCurrentTime(now);
      setLocalSecondsAgo(prev => prev !== undefined ? prev + 5 : prev);
      window.dispatchEvent(new Event('age-column-update'));
    };

    // Initial update
    updateAge();
    const interval = setInterval(updateAge, 5000);
    return () => clearInterval(interval);
  }, [date, initialSecondsAgo]);

  // Calculate minutes ago either from secondsAgo or date
  const minutesAgo = React.useMemo(() => 
    localSecondsAgo !== undefined 
      ? localSecondsAgo / 60 
      : date 
        ? (currentTime.getTime() - new Date(date).getTime()) / (1000 * 60)
        : 0
  , [date, localSecondsAgo, currentTime]);

  // Memoize values that depend on time to prevent unnecessary recalculations
  const { width, backgroundColor, tooltipText, showTooltip } = React.useMemo(() => {
    const width = Math.max(0, 100 - ((minutesAgo * 100) / 60)); // 60 minutes total
    const backgroundColor = getColorForMinutes(Math.min(60, minutesAgo)); // Cap at 60 minutes
    const isRecent = minutesAgo < 60; // Less than 60 minutes
    const tooltipText = isRecent ? (
      localSecondsAgo !== undefined 
        ? timeAgo(new Date(Date.now() - localSecondsAgo * 1000))
        : date 
          ? timeAgo(new Date(date))
          : '-'
    ) : '';

    return { width, backgroundColor, tooltipText, showTooltip: isRecent };
  }, [minutesAgo, date, localSecondsAgo, currentTime]);

  const containerClasses = showElement === 'bar' 
    ? `relative min-h-[1.25rem] ${className}` 
    : `relative flex items-center justify-center min-w-[100px] min-h-[1.25rem] ${className}`;

  return (
    <div 
      ref={containerRef}
      className={containerClasses}
      onMouseEnter={() => showTooltip && setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
    >
      {/* Hidden timestamp for filtering */}
      {date && (
        <span className="hidden" data-timestamp={new Date(date).toISOString()}>
          {new Date(date).toISOString()}
        </span>
      )}
      
      {(showElement === 'bar' || showElement === 'both') && (
        <div
          key={`${width}-${backgroundColor}`}
          className="absolute inset-0 transition-colors duration-500"
          style={{
            width: `${width}%`,
            backgroundColor,
            opacity: width > 0 ? 1 : 0,
            transition: 'width 500ms ease-in-out, background-color 500ms ease-in-out, opacity 500ms ease-in-out'
          }}
        />
      )}
      {(showElement === 'text' || showElement === 'both') && (
        <span className="relative z-10 text-gray-400 text-center">
          {tooltipText}
        </span>
      )}

      {showTooltip && (
        <Tooltip
          text={tooltipText}
          isOpen={tooltipOpen}
          elementRef={containerRef}
          style="minimal"
          size="xs"
          placement="top"
        />
      )}
    </div>
  );
};
import toast, { Toast, ToastPosition } from 'react-hot-toast';
import { FaCheck, FaTimes, FaExclamationTriangle, FaInfo, FaTag } from 'react-icons/fa';
import React from 'react';
import clsx from 'clsx';

// Define notification style types
export type NotificationStyle = 'minimal' | 'modern' | 'glass';

// Define notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'add' | 'remove';

// Define notification positions
export type NotificationPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'center';

// Define notification options
interface NotificationOptions {
  style?: NotificationStyle;
  position?: NotificationPosition;
  duration?: number;
  icon?: React.ReactNode;
}

// Map notification types to icons
const notificationIcons: Record<NotificationType, React.ReactNode> = {
  success: <FaCheck className="w-5 h-5" />,
  error: <FaTimes className="w-5 h-5" />,
  warning: <FaExclamationTriangle className="w-5 h-5" />,
  info: <FaInfo className="w-5 h-5" />,
  add: <FaCheck className="w-5 h-5" />,
  remove: <FaTimes className="w-5 h-5" />
};

// Map notification types to colors
const notificationColors: Record<NotificationType, { bg: string; text: string; icon: string }> = {
  success: { bg: 'bg-green-700', text: 'text-green-50', icon: 'text-green-100' },
  error: { bg: 'bg-red-500', text: 'text-red-50', icon: 'text-red-100' },
  warning: { bg: 'bg-yellow-500', text: 'text-yellow-50', icon: 'text-yellow-100' },
  info: { bg: 'bg-blue-500', text: 'text-blue-50', icon: 'text-blue-100' },
  add: { bg: 'bg-green-500', text: 'text-green-50', icon: 'text-green-100' },
  remove: { bg: 'bg-orange-500', text: 'text-orange-50', icon: 'text-orange-100' }
};

// Map positions to toast positions
const positionMap: Record<NotificationPosition, ToastPosition> = {
  'top-left': 'top-left',
  'top-center': 'top-center',
  'top-right': 'top-right',
  'bottom-left': 'bottom-left',
  'bottom-center': 'bottom-center',
  'bottom-right': 'bottom-right',
  'center': 'top-center'
};

// Style generators for different notification styles
const notificationStyles = {
  modern: (t: Toast, type: NotificationType) => ({
    className: clsx(
      'flex items-center gap-3 px-4 py-3 shadow-lg rounded-lg mx-4',
      'max-w-md w-full md:w-auto md:min-w-[300px]',
      notificationColors[type].bg,
      notificationColors[type].text,
      'border border-transparent'
    )
  }),
  glass: (t: Toast, type: NotificationType) => ({
    className: clsx(
      'flex items-center gap-3 px-4 py-3 shadow-lg rounded-lg',
      notificationColors[type].bg,
      notificationColors[type].text
    )
  }),
  minimal: (t: Toast, type: NotificationType) => ({
    className: clsx(
      'flex items-center gap-3 px-4 py-3 shadow-lg rounded-lg',
      'bg-gray-900/80 backdrop-blur-sm',
      'border border-gray-700/50',
      'text-gray-100'
    )
  })
};

// Create notification content component
const NotificationContent: React.FC<{
  message: string;
  type: NotificationType;
  style: NotificationStyle;
  icon?: React.ReactNode;
}> = ({ message, type, style, icon }) => {
  const defaultIcon = notificationIcons[type];
  
  return (
    <>
      <span className={clsx(
        style === 'minimal' ? notificationColors[type].icon : 'text-gray-100',
        'shrink-0'
      )}>
        {icon || defaultIcon}
      </span>
      <p className="modern text-sm font-medium">{message}</p>
    </>
  );
};

// Main notification function
export const notify = (
  type: NotificationType,
  content: string | React.ReactNode,
  options: { duration?: number } = {}
) => {
  toast.custom(
    t => (
      <div className={clsx(
        NotificationPreset[type].bg,
        "text-white px-4 py-3 rounded-lg flex items-center gap-3",
        "mx-4 max-w-md shadow-lg",
        "animate-[slide-in-from-top_0.3s_ease-out]",
        "data-[state=closed]:animate-[slide-out-to-top_0.3s_ease-out]",
        "transition-opacity duration-300",
        t.visible ? 'opacity-100' : 'opacity-0'
      )}>
        {NotificationPreset[type].icon}
        <span className="flex-1 text-sm">{content}</span>
      </div>
    ),
    { 
      position: 'top-center',
      duration: options.duration || 2000 
    }
  );
};

// Helper functions for different notification types
export const notifySuccess = (message: string) => notify('success', message);
export const notifyError = (message: string) => notify('error', message);
export const notifyWarning = (message: string) => notify('warning', message);
export const notifyInfo = (message: string) => notify('info', message);

// Promise helper - shows loading state and success/error based on promise resolution
export const notifyPromise = async <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  },
  options?: NotificationOptions
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      style: {
        minWidth: '250px',
        backgroundColor: '#1f2937',
        color: '#f3f4f6',
        borderRadius: '0.5rem',
        border: '1px solid rgba(75, 85, 99, 0.5)',
      },
      position: options?.position ? positionMap[options.position] : 'bottom-right',
    }
  );
};

// Add tag action notification component
const TagActionNotification: React.FC<{
  title: string;
  variant?: string;
  tag: TagWithRelationships;
  action: 'add' | 'remove';
}> = ({ title, variant, tag, action }) => (
  <div className="flex items-start gap-3">
    {/* Tag Icon/Image */}
    <div className="shrink-0">
      {tag.display_type === 'icon' && tag.display_value ? (
        React.createElement((Icons as any)[tag.display_value], {
          className: "w-5 h-5 text-current"
        })
      ) : tag.display_type === 'image' && tag.display_value ? (
        <img src={tag.display_value} alt={tag.name} className="w-5 h-5" />
      ) : (
        <FaTag className="w-5 h-5" />
      )}
    </div>

    {/* Content */}
    <div className="flex-1">
      <div className="text-sm font-medium">
        {title}
        {variant && <span className="text-gray-400 ml-1">({variant})</span>}
      </div>
      <div className="text-sm">
        <span className="capitalize">{action}ed</span>{' '}
        <span className="font-semibold text-gray-200">{tag.name}</span> tag
      </div>
    </div>
  </div>
);

// Unified notification configuration
const DEFAULT_POSITION: NotificationPosition = 'top-center';
const DEFAULT_DURATION = 2000;

export const notifyTagAction = (
  item: { title: string; variant?: string },
  tag: TagWithRelationships,
  action: 'add' | 'remove'
) => {
  notify(
    action,
    <TagActionNotification 
      title={item.title}
      variant={item.variant}
      tag={tag}
      action={action}
    />,
    undefined,
    DEFAULT_DURATION
  );
};

const NotificationPreset: Record<NotificationType, { bg: string; icon: React.ReactNode }> = {
  success: { bg: 'bg-green-500', icon: <FaCheck /> },
  error: { bg: 'bg-red-500', icon: <FaTimes /> },
  warning: { bg: 'bg-yellow-500', icon: <FaExclamationTriangle /> },
  info: { bg: 'bg-blue-500', icon: <FaInfo /> },
  add: { bg: 'bg-green-500', icon: <FaTag /> },
  remove: { bg: 'bg-orange-500', icon: <FaTag /> }
}; 
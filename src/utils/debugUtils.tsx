import React, { useEffect, useState } from 'react';

// Debug configuration
const DEBUG_CONFIG = {
    enabled: process.env.NODE_ENV === 'development',
    categories: {
        cache: true,
        changes: true,
        api: true,
        components: false
    }
} as const;

type DebugCategory = keyof typeof DEBUG_CONFIG.categories;

/**
 * Debug logger that only logs when debugging is enabled
 */
export const debugLog = (category: DebugCategory, message: string, data?: any) => {
    if (!DEBUG_CONFIG.enabled || !DEBUG_CONFIG.categories[category]) return;

    const emoji = {
        cache: '💾',
        changes: '🔄',
        api: '🌐',
        components: '🧩'
    }[category];

    console.log(
        `${emoji} [${category.toUpperCase()}] ${message}`,
        data ? data : ''
    );
};

interface DebugOutputProps {
    category: DebugCategory;
    message: string;
    data?: any;
    className?: string;
}

/**
 * React component for displaying debug information in the UI
 */
export const DebugOutput: React.FC<DebugOutputProps> = ({ 
    category, 
    message, 
    data, 
    className = '' 
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(DEBUG_CONFIG.enabled && DEBUG_CONFIG.categories[category]);
    }, [category]);

    if (!isVisible) return null;

    return (
        <div className={`text-xs text-gray-400 ${className}`}>
            <span className="font-mono">[{category.toUpperCase()}]</span> {message}
            {data && (
                <pre className="mt-1 text-[10px] text-gray-500">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    );
};

/**
 * Hook to check if debugging is enabled for a category
 */
export const useDebug = (category: DebugCategory) => {
    return DEBUG_CONFIG.enabled && DEBUG_CONFIG.categories[category];
}; 
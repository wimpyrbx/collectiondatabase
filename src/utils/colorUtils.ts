/**
 * Extracts color information from a Tailwind color class
 * @param colorClass e.g. 'bg-blue-500/75'
 * @returns Object with color parts or null if no match
 */
export const extractColorInfo = (colorClass: string) => {
  // match bg-blue-500/75 or bg-blue-500/75/50 while capturing the slash part
  const match = colorClass.match(/(?:bg|border|text)-([a-z]+)-(\d+)(\/\d+)?/);
  if (!match) return null;

  // Destructure the matched parts and ensure we remove the leading slash from opacity
  const [_, colorName, colorLevel, rawOpacity = ''] = match;
  const opacity = rawOpacity.replace('/', ''); // remove the "/" if it exists
  
  return {
    colorName,
    colorLevel: parseInt(colorLevel, 10),
    opacity
  };
};

/**
 * Generates a border color class based on background color
 * Always reduces color level by 200 (min 50) and maintains opacity
 */
export const getBorderColorFromBg = (bgColor: string, borderColor?: string, borderOpacity?: number) => {
  if (!bgColor) return '';
  if (borderColor) return `border ${borderColor}`;

  const colorInfo = extractColorInfo(bgColor);
  if (!colorInfo) return `border ${bgColor.replace('bg-', 'border-')}`;

  const { colorName, colorLevel, opacity } = colorInfo;
  const newColorLevel = Math.max(colorLevel - 200, 50);
  const newOpacity = borderOpacity ? borderOpacity : opacity; // if borderOpacity is supplied, replace or add it
  return `border border-${colorName}-${newColorLevel}/${newOpacity}`;
};

/**
 * Generates a hover background color class based on background color
 * Always reduces color level by 200 (min 50) and maintains opacity
 */
export const getHoverBgColor = (bgColor: string) => {
  if (!bgColor) return '';

  const colorInfo = extractColorInfo(bgColor);
  if (!colorInfo) return '';

  const { colorName, colorLevel, opacity } = colorInfo;
  const newColorLevel = Math.max(colorLevel - 200, 50);
  return `hover:bg-${colorName}-${newColorLevel}${opacity}`;
};

export const getTextColorForBg = (bgColor: string): string => {
  const colorInfo = extractColorInfo(bgColor);
  if (!colorInfo) return 'text-gray-200'; // Default

  const { colorName, colorLevel } = colorInfo;

  // If the color level is below 500, use the darker variant (800) else return false
  if (colorLevel < 500) {
    return `text-${colorName}-600`;
  } else {
    return '';
  }
};

// New function to get icon color based on background
export const getIconColorForBg = (bgColor: string): string => {
  const colorInfo = extractColorInfo(bgColor);
  if (!colorInfo) return 'text-gray-300'; // Default

  const { colorName, colorLevel } = colorInfo;

  // If the color level is below 500, use the lighter variant (500) else return false 
  if (colorLevel < 500) {
    return `text-${colorName}-600`;
  } else {
    return '';
  }
}; 

import React from 'react';
import regionsData from '@/data/regions.json'; // Import the JSON file

export interface RegionRatingValue {
  region: string;
  ratingSystem?: string; // Optional
  rating?: string; // Optional
}

interface RegionRatingSelectorProps {
  value: RegionRatingValue;
  onChange: (value: RegionRatingValue) => void;
  className?: string;
}

const RegionRatingSelector: React.FC<RegionRatingSelectorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  // Helper function to get rating systems for a region
  const getRatingSystemsForRegion = (regionName: string) => {
    const region = regionsData.regions.find((r) => r.name === regionName);
    return region ? region.rating_systems : [];
  };

  // Helper function to get ratings for a rating system
  const getRatingsForSystem = (ratingSystemName: string) => {
    for (const region of regionsData.regions) {
      const system = region.rating_systems.find((s) => s.name === ratingSystemName);
      if (system) {
        return system.ratings;
      }
    }
    return [];
  };

  const handleRegionChange = (newRegion: string) => {
    // Only update the region, let useEffect handle rating system selection
    onChange({
      ...value,
      region: newRegion,
      rating: undefined // Clear rating but keep rating system
    });
  };

  const handleRatingSystemChange = (newRatingSystem: string) => {
    // Clear rating when rating system changes
    onChange({
      ...value,
      ratingSystem: newRatingSystem,
      rating: undefined
    });
  };

  // Get available rating systems for current region
  const availableRatingSystems = React.useMemo(() => {
    return value.region ? getRatingSystemsForRegion(value.region) : [];
  }, [value.region]);

  // If there's only one rating system for the region, auto-select it
  React.useEffect(() => {
    if (value.region && availableRatingSystems.length === 1 && !value.ratingSystem) {
      handleRatingSystemChange(availableRatingSystems[0].name);
    }
  }, [value.region, availableRatingSystems, value.ratingSystem]);

  // Get available ratings for current rating system
  const availableRatings = React.useMemo(() => {
    return value.ratingSystem ? getRatingsForSystem(value.ratingSystem) : [];
  }, [value.ratingSystem]);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-400 mb-2">
        Region & Rating
      </label>
      <div className="grid grid-cols-3 gap-2">
        {/* Region Selector */}
        <select
          value={value.region}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="w-full p-2 text-sm border border-gray-700 rounded-lg bg-gray-900 text-gray-300"
        >
          <option value="">Region</option>
          {regionsData.regions.map((region) => (
            <option key={region.id} value={region.name}>
              {region.display_name}
            </option>
          ))}
        </select>

        {/* Rating System Selector */}
        <select
          value={value.ratingSystem || ''}
          onChange={(e) => handleRatingSystemChange(e.target.value)}
          disabled={!value.region}
          className="w-full p-2 text-sm border border-gray-700 rounded-lg bg-gray-900 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Rating System</option>
          {availableRatingSystems.map((system) => (
            <option key={system.id} value={system.name}>
              {system.display_name}
            </option>
          ))}
        </select>

        {/* Rating Selector */}
        <select
          value={value.rating || ''}
          onChange={(e) => onChange({ ...value, rating: e.target.value })}
          disabled={!value.ratingSystem}
          className="w-full p-2 text-sm border border-gray-700 rounded-lg bg-gray-900 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Rating</option>
          {availableRatings.map((rating) => (
            <option key={rating.id} value={rating.name}>
              {rating.display_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default RegionRatingSelector;
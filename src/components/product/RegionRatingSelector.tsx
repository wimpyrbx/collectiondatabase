import React from 'react';
import regionsData from '@/data/regions.json'; // Import the JSON file
import FormElement from '@/components/formelement/FormElement';
import { FaGlobe } from 'react-icons/fa';

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
    // If None is selected or empty value, clear everything
    if (!newRegion) {
      onChange({
        region: '',
        ratingSystem: undefined,
        rating: undefined
      });
      return;
    }

    // Otherwise update region and clear dependent fields
    onChange({
      ...value,
      region: newRegion,
      ratingSystem: undefined,
      rating: undefined
    });
  };

  const handleRatingSystemChange = (newRatingSystem: string) => {
    // If None is selected or empty value, clear rating
    if (!newRatingSystem) {
      onChange({
        ...value,
        ratingSystem: undefined,
        rating: undefined
      });
      return;
    }

    // Otherwise update rating system and clear rating
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

  // Get available ratings for current rating system
  const availableRatings = React.useMemo(() => {
    return value.ratingSystem ? getRatingsForSystem(value.ratingSystem) : [];
  }, [value.ratingSystem]);

  // Auto-select first rating when rating system changes and there are available ratings
  React.useEffect(() => {
    if (value.ratingSystem && availableRatings.length > 0 && !value.rating) {
      onChange({
        ...value,
        rating: availableRatings[0].name
      });
    }
  }, [value.ratingSystem, availableRatings, value.rating]);

  // Convert data to options format
  const regionOptions = [
    { value: '', label: 'None' },
    ...regionsData.regions.map(region => ({
      value: region.name,
      label: region.display_name
    }))
  ];

  const ratingSystemOptions = [
    { value: '', label: 'None' },
    ...availableRatingSystems.map(system => ({
      value: system.name,
      label: system.display_name
    }))
  ];

  const ratingOptions = availableRatings.map(rating => ({
    value: rating.name,
    label: rating.display_name
  }));

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-300 mb-0.5">
        <FaGlobe className="text-cyan-400" />
        <span>Region & Rating</span>
      </div>
      <div className="grid grid-cols-[2fr_4fr_1fr] gap-2 items-start">
        <FormElement
          elementType="listsingle"
          options={regionOptions}
          selectedOptions={value.region}
          truncate={true}
          onValueChange={(val) => handleRegionChange(val.toString())}
          placeholder="Select Region..."
          className={`transition-opacity duration-200 ${!value.region ? 'opacity-50 focus-within:opacity-100 hover:opacity-100' : ''}`}
        />
        <FormElement
          elementType="listsingle"
          options={ratingSystemOptions}
          selectedOptions={value.ratingSystem || ''}
          truncate={true}
          onValueChange={(val) => handleRatingSystemChange(val.toString())}
          placeholder="Select System..."
          disabled={!value.region}
          className={`transition-opacity duration-200 ${!value.ratingSystem ? 'opacity-50 focus-within:opacity-100 hover:opacity-100' : ''}`}
        />
        <FormElement
          elementType="listsingle"
          options={ratingOptions}
          selectedOptions={value.rating || ''}
          truncate={true}
          onValueChange={(val) => onChange({ ...value, rating: val.toString() })}
          placeholder="None"
          disabled={!value.ratingSystem}
          className={`transition-opacity duration-200 ${!value.rating ? 'opacity-50 focus-within:opacity-100 hover:opacity-100' : ''}`}
        />
      </div>
    </div>
  );
};

export default RegionRatingSelector;
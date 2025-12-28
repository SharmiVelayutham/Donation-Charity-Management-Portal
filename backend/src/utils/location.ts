
export interface LocationInput {
  address?: string;
  latitude?: number;
  longitude?: number;
  useCurrentLocation?: boolean;
}

export interface LocationOutput {
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  useCurrentLocation: boolean;
}
export const isValidLatitude = (lat: number): boolean => {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
};
export const isValidLongitude = (lng: number): boolean => {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;
};
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return isValidLatitude(lat) && isValidLongitude(lng);
};
export const normalizeLocation = (location: string | LocationInput): LocationOutput => {
  if (typeof location === 'string') {
    return {
      address: location.trim(),
      useCurrentLocation: false,
    };
  }
  const { address, latitude, longitude, useCurrentLocation } = location;
  if (latitude !== undefined || longitude !== undefined) {
    if (latitude === undefined || longitude === undefined) {
      throw new Error('Both latitude and longitude must be provided together');
    }

    if (!isValidCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180');
    }

    const normalized: LocationOutput = {
      address: (address && typeof address === 'string') ? address.trim() : '',
      useCurrentLocation: useCurrentLocation === true,
      coordinates: {
        latitude,
        longitude,
      },
    };

    return normalized;
  }
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    if (useCurrentLocation === true) {
      return {
        address: 'Current Location',
        useCurrentLocation: true,
      };
    }
    throw new Error('Address or coordinates are required');
  }

  const normalized: LocationOutput = {
    address: address.trim(),
    useCurrentLocation: useCurrentLocation === true,
  };

  return normalized;
};
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  if (!isValidCoordinates(lat1, lng1) || !isValidCoordinates(lat2, lng2)) {
    throw new Error('Invalid coordinates provided');
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};
export const isValidTimezone = (timezone: string): boolean => {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/;
  return timezoneRegex.test(timezone.trim());
};
export const getTimezoneFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }

  return null;
};
export const formatLocation = (location: LocationOutput): string => {
  let formatted = location.address;
  
  if (location.coordinates) {
    formatted += ` (${location.coordinates.latitude.toFixed(6)}, ${location.coordinates.longitude.toFixed(6)})`;
  }
  
  if (location.useCurrentLocation) {
    formatted += ' [Current Location]';
  }
  
  return formatted;
};


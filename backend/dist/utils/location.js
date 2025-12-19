"use strict";
/**
 * Location utility functions for handling geolocation, coordinates, and validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLocation = exports.getTimezoneFromCoordinates = exports.isValidTimezone = exports.calculateDistance = exports.normalizeLocation = exports.isValidCoordinates = exports.isValidLongitude = exports.isValidLatitude = void 0;
/**
 * Validate latitude (-90 to 90)
 */
const isValidLatitude = (lat) => {
    return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
};
exports.isValidLatitude = isValidLatitude;
/**
 * Validate longitude (-180 to 180)
 */
const isValidLongitude = (lng) => {
    return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;
};
exports.isValidLongitude = isValidLongitude;
/**
 * Validate coordinates
 */
const isValidCoordinates = (lat, lng) => {
    return (0, exports.isValidLatitude)(lat) && (0, exports.isValidLongitude)(lng);
};
exports.isValidCoordinates = isValidCoordinates;
/**
 * Normalize and validate location input
 * Supports both address string and coordinates
 */
const normalizeLocation = (location) => {
    // If it's a string (backward compatibility), treat as address only
    if (typeof location === 'string') {
        return {
            address: location.trim(),
            useCurrentLocation: false,
        };
    }
    // If it's an object, validate and normalize
    const { address, latitude, longitude, useCurrentLocation } = location;
    // If coordinates are provided, validate and return (address optional)
    if (latitude !== undefined || longitude !== undefined) {
        if (latitude === undefined || longitude === undefined) {
            throw new Error('Both latitude and longitude must be provided together');
        }
        if (!(0, exports.isValidCoordinates)(latitude, longitude)) {
            throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180');
        }
        const normalized = {
            address: (address && typeof address === 'string') ? address.trim() : '',
            useCurrentLocation: useCurrentLocation === true,
            coordinates: {
                latitude,
                longitude,
            },
        };
        return normalized;
    }
    // If coordinates not provided, require an address unless useCurrentLocation is true
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
        if (useCurrentLocation === true) {
            // No address but caller requested using current location - allow and set placeholder
            return {
                address: 'Current Location',
                useCurrentLocation: true,
            };
        }
        throw new Error('Address or coordinates are required');
    }
    const normalized = {
        address: address.trim(),
        useCurrentLocation: useCurrentLocation === true,
    };
    return normalized;
};
exports.normalizeLocation = normalizeLocation;
/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    if (!(0, exports.isValidCoordinates)(lat1, lng1) || !(0, exports.isValidCoordinates)(lat2, lng2)) {
        throw new Error('Invalid coordinates provided');
    }
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
};
exports.calculateDistance = calculateDistance;
/**
 * Convert degrees to radians
 */
const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
};
/**
 * Validate timezone string (basic check for IANA timezone format)
 */
const isValidTimezone = (timezone) => {
    if (!timezone || typeof timezone !== 'string') {
        return false;
    }
    // Basic IANA timezone format validation
    // Examples: America/New_York, Europe/London, Asia/Kolkata, UTC
    const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/;
    return timezoneRegex.test(timezone.trim());
};
exports.isValidTimezone = isValidTimezone;
/**
 * Get timezone from coordinates (simplified - in production, use a geocoding service)
 * This is a basic implementation - for production, use libraries like node-geocoder
 */
const getTimezoneFromCoordinates = async (latitude, longitude) => {
    if (!(0, exports.isValidCoordinates)(latitude, longitude)) {
        return null;
    }
    // In a real application, you would use a service like:
    // - Google Time Zone API
    // - TimeZoneDB API
    // - GeoNames API
    // For now, return null and let the client provide timezone
    return null;
};
exports.getTimezoneFromCoordinates = getTimezoneFromCoordinates;
/**
 * Format location for display
 */
const formatLocation = (location) => {
    let formatted = location.address;
    if (location.coordinates) {
        formatted += ` (${location.coordinates.latitude.toFixed(6)}, ${location.coordinates.longitude.toFixed(6)})`;
    }
    if (location.useCurrentLocation) {
        formatted += ' [Current Location]';
    }
    return formatted;
};
exports.formatLocation = formatLocation;

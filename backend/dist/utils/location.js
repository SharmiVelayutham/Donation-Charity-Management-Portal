"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLocation = exports.getTimezoneFromCoordinates = exports.isValidTimezone = exports.calculateDistance = exports.normalizeLocation = exports.isValidCoordinates = exports.isValidLongitude = exports.isValidLatitude = void 0;
const isValidLatitude = (lat) => {
    return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
};
exports.isValidLatitude = isValidLatitude;
const isValidLongitude = (lng) => {
    return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;
};
exports.isValidLongitude = isValidLongitude;
const isValidCoordinates = (lat, lng) => {
    return (0, exports.isValidLatitude)(lat) && (0, exports.isValidLongitude)(lng);
};
exports.isValidCoordinates = isValidCoordinates;
const normalizeLocation = (location) => {
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
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
        if (useCurrentLocation === true) {
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
const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
};
const isValidTimezone = (timezone) => {
    if (!timezone || typeof timezone !== 'string') {
        return false;
    }
    const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/;
    return timezoneRegex.test(timezone.trim());
};
exports.isValidTimezone = isValidTimezone;
const getTimezoneFromCoordinates = async (latitude, longitude) => {
    if (!(0, exports.isValidCoordinates)(latitude, longitude)) {
        return null;
    }
    return null;
};
exports.getTimezoneFromCoordinates = getTimezoneFromCoordinates;
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

/**
 * JSPM Campus Lost & Found - Official Campus Locations
 * 
 * Centralized, shared source of truth for all campus location options.
 * Used across Report Lost, Report Found, Dashboard filters, Search, and Validation.
 */

export const CAMPUS_LOCATIONS = [
  'Main Building',
  'Central Library',
  'Godawari Building',
  'Kaveri Building',
  'Ganga Building',
  'Narmada Building',
  'BSP Block-A',
  'BSP Block-B',
  'Foodcourt',
  'Cafeteria',
  'Open Theatre',
  'Boys Parking',
  'Girls Parking',
  'Cricket Ground',
  'Workshop',
] as const;

export type CampusLocation = (typeof CAMPUS_LOCATIONS)[number];

export const CAMPUS_LOCATION_PLACEHOLDER = 'Select campus location';

/**
 * Validates whether a given string is one of the 15 official project campus locations.
 */
export function isValidCampusLocation(loc: unknown): loc is CampusLocation {
  return typeof loc === 'string' && (CAMPUS_LOCATIONS as readonly string[]).includes(loc);
}

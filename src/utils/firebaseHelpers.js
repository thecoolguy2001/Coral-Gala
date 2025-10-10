/**
 * Sanitizes fish data for Firebase storage
 * Removes undefined values and converts Three.js objects to plain arrays
 */
export const sanitizeFishData = (fish) => {
  const sanitized = {};

  // Go through each property and handle appropriately
  Object.keys(fish).forEach(key => {
    const value = fish[key];

    // Skip undefined values and Three.js objects
    if (value === undefined || key === 'ref') {
      return;
    }

    // Handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Handle Three.js Vector3 objects
      if (value.toArray && typeof value.toArray === 'function') {
        sanitized[key] = value.toArray();
        return;
      }

      // Handle nested objects recursively
      const nestedSanitized = {};
      Object.keys(value).forEach(nestedKey => {
        const nestedValue = value[nestedKey];
        if (nestedValue !== undefined) {
          nestedSanitized[nestedKey] = nestedValue;
        }
      });
      sanitized[key] = nestedSanitized;
    } else {
      // Handle primitive values and arrays
      sanitized[key] = value;
    }
  });

  return sanitized;
};

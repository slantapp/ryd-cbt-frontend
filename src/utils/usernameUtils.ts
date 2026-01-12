/**
 * Generates a username from first name and last name
 * Format: firstname.lastname (lowercase, with dot separator)
 * 
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Generated username string (lowercase)
 */
export const generateUsername = (firstName: string, lastName: string): string => {
  if (!firstName || !lastName) return '';
  
  // Normalize: trim whitespace, convert to lowercase, remove special characters except spaces
  // Then replace spaces and special characters with nothing, keeping only letters
  const normalize = (name: string): string => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
      .replace(/\s+/g, '') // Remove all spaces
      .replace(/[^a-z0-9]/g, ''); // Final cleanup - only letters and numbers
  };
  
  const normalizedFirst = normalize(firstName);
  const normalizedLast = normalize(lastName);
  
  if (!normalizedFirst || !normalizedLast) return '';
  
  // Format: firstname.lastname (always lowercase)
  return `${normalizedFirst}.${normalizedLast}`;
};


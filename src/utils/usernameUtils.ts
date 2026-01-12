/**
 * Generates a username from first name and last name
 * Format: first 3 letters of firstName + first 3 letters of lastName + 2 random numbers
 * 
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Generated username string
 */
export const generateUsername = (firstName: string, lastName: string): string => {
  if (!firstName || !lastName) return '';
  
  // Normalize: lowercase, remove special characters, keep only letters
  const normalize = (name: string): string => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, ''); // Remove all non-letter characters
  };
  
  const normalizedFirst = normalize(firstName);
  const normalizedLast = normalize(lastName);
  
  if (!normalizedFirst || !normalizedLast) return '';
  
  // Get first 3 letters of first name (pad with first letter if less than 3)
  let firstPart = normalizedFirst.substring(0, 3);
  if (firstPart.length < 3 && normalizedFirst.length > 0) {
    const padChar = normalizedFirst[0];
    firstPart = firstPart.padEnd(3, padChar);
  }
  
  // Get first 3 letters of last name (pad with first letter if less than 3)
  let lastPart = normalizedLast.substring(0, 3);
  if (lastPart.length < 3 && normalizedLast.length > 0) {
    const padChar = normalizedLast[0];
    lastPart = lastPart.padEnd(3, padChar);
  }
  
  // Generate 2 random numbers (00-99)
  const randomNumbers = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${firstPart}${lastPart}${randomNumbers}`;
};


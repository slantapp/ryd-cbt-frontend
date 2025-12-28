/**
 * Utility functions for applying theme colors
 */

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
};

const lighten = (hex: string, percent: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * percent));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * percent));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * percent));
  return rgbToHex(r, g, b);
};

const darken = (hex: string, percent: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - percent)));
  const g = Math.max(0, Math.round(rgb.g * (1 - percent)));
  const b = Math.max(0, Math.round(rgb.b * (1 - percent)));
  return rgbToHex(r, g, b);
};

export interface ThemeData {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  logoUrl?: string;
  bannerUrl?: string;
}

/**
 * Applies theme colors to CSS custom properties on the document root
 */
export const applyTheme = (themeData: ThemeData) => {
  const primaryColor = themeData.primaryColor || '#aa468e';
  
  // Generate primary color shades
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', primaryColor);
  root.style.setProperty('--theme-primary-50', lighten(primaryColor, 0.95));
  root.style.setProperty('--theme-primary-100', lighten(primaryColor, 0.9));
  root.style.setProperty('--theme-primary-200', lighten(primaryColor, 0.75));
  root.style.setProperty('--theme-primary-300', lighten(primaryColor, 0.5));
  root.style.setProperty('--theme-primary-400', lighten(primaryColor, 0.25));
  root.style.setProperty('--theme-primary-500', primaryColor);
  root.style.setProperty('--theme-primary-600', darken(primaryColor, 0.15));
  root.style.setProperty('--theme-primary-700', darken(primaryColor, 0.3));
  root.style.setProperty('--theme-primary-800', darken(primaryColor, 0.45));
  root.style.setProperty('--theme-primary-900', darken(primaryColor, 0.6));
  
  if (themeData.secondaryColor) {
    root.style.setProperty('--theme-secondary', themeData.secondaryColor);
  }
  if (themeData.accentColor) {
    root.style.setProperty('--theme-accent', themeData.accentColor);
  }
  if (themeData.backgroundColor) {
    root.style.setProperty('--theme-background', themeData.backgroundColor);
  }
  if (themeData.textColor) {
    root.style.setProperty('--theme-text', themeData.textColor);
  }
};


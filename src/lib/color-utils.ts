/**
 * Color Blending Utilities
 *
 * Utilities for converting and blending colors for Deck.gl visualization.
 * Handles color conversion between hex and RGB formats, and provides
 * smooth color interpolation for team color blending.
 */

/**
 * RGB color type - array format for Deck.gl
 */
export type RGBAColor = [number, number, number, number];

/**
 * Team colors configuration
 */
export interface TeamColors {
  teamA: string; // Hex color (e.g., "#FF0000")
  teamB: string; // Hex color (e.g., "#0000FF")
}

/**
 * Convert hex color string to RGB array
 *
 * @param hex - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns RGB array [r, g, b] with values 0-255
 *
 * @example
 * hexToRgb("#FF0000") // [255, 0, 0]
 * hexToRgb("#00FF00") // [0, 255, 0]
 */
export function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Validate hex format
  if (cleanHex.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}. Expected format: #RRGGBB`);
  }

  // Parse RGB components
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Validate parsed values
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error(`Invalid hex color: ${hex}. Could not parse RGB values.`);
  }

  return [r, g, b];
}

/**
 * Convert RGB array to hex color string
 *
 * @param rgb - RGB array [r, g, b] with values 0-255
 * @returns Hex color string (e.g., "#FF0000")
 *
 * @example
 * rgbToHex([255, 0, 0]) // "#FF0000"
 * rgbToHex([0, 255, 0]) // "#00FF00"
 */
export function rgbToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;

  // Clamp values to 0-255 range
  const clampedR = Math.max(0, Math.min(255, Math.round(r)));
  const clampedG = Math.max(0, Math.min(255, Math.round(g)));
  const clampedB = Math.max(0, Math.min(255, Math.round(b)));

  // Convert to hex with padding
  const hexR = clampedR.toString(16).padStart(2, '0');
  const hexG = clampedG.toString(16).padStart(2, '0');
  const hexB = clampedB.toString(16).padStart(2, '0');

  return `#${hexR}${hexG}${hexB}`.toUpperCase();
}

/**
 * Blend two colors based on a ratio
 *
 * Performs linear interpolation between two colors.
 * Returns color in Deck.gl RGBA format [r, g, b, alpha].
 *
 * @param color1 - First color (hex string)
 * @param color2 - Second color (hex string)
 * @param ratio - Blend ratio (0 = pure color1, 1 = pure color2)
 * @param alpha - Optional alpha/opacity value (0-255, default: 255)
 * @returns RGBA array for Deck.gl [r, g, b, alpha]
 *
 * @example
 * // Pure red (team A)
 * blendColors("#FF0000", "#0000FF", 0) // [255, 0, 0, 255]
 *
 * // Pure blue (team B)
 * blendColors("#FF0000", "#0000FF", 1) // [0, 0, 255, 255]
 *
 * // Equal mix (purple)
 * blendColors("#FF0000", "#0000FF", 0.5) // [127, 0, 127, 255]
 *
 * // 75% team B, with transparency
 * blendColors("#FF0000", "#0000FF", 0.75, 200) // [63, 0, 191, 200]
 */
export function blendColors(
  color1: string,
  color2: string,
  ratio: number,
  alpha: number = 255
): RGBAColor {
  // Clamp ratio to 0-1 range
  const clampedRatio = Math.max(0, Math.min(1, ratio));

  // Convert colors to RGB
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  // Perform linear interpolation
  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * clampedRatio);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * clampedRatio);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * clampedRatio);

  // Clamp alpha to 0-255 range
  const clampedAlpha = Math.max(0, Math.min(255, Math.round(alpha)));

  return [r, g, b, clampedAlpha];
}

/**
 * Calculate team color based on vote distribution
 *
 * Determines the dominant team and blend ratio from vote counts.
 * Returns appropriate color for visualization.
 *
 * @param teamACount - Number of votes for team A
 * @param teamBCount - Number of votes for team B
 * @param teamColors - Team color configuration
 * @param alpha - Optional alpha/opacity value (0-255, default: 255)
 * @returns RGBA array for Deck.gl
 *
 * @example
 * const colors = { teamA: "#FF0000", teamB: "#0000FF" };
 *
 * // Team A dominant (80% of votes)
 * getTeamColor(80, 20, colors) // Red-ish color
 *
 * // Equal votes
 * getTeamColor(50, 50, colors) // Purple (50/50 mix)
 *
 * // Team B dominant (75% of votes)
 * getTeamColor(25, 75, colors) // Blue-ish color
 */
export function getTeamColor(
  teamACount: number,
  teamBCount: number,
  teamColors: TeamColors,
  alpha: number = 255
): RGBAColor {
  const totalVotes = teamACount + teamBCount;

  // Handle edge case: no votes
  if (totalVotes === 0) {
    // Return neutral gray
    return [128, 128, 128, alpha];
  }

  // Calculate ratio (0 = all team A, 1 = all team B)
  const teamBRatio = teamBCount / totalVotes;

  // Blend colors
  return blendColors(teamColors.teamA, teamColors.teamB, teamBRatio, alpha);
}

/**
 * Calculate color intensity based on vote count
 *
 * Maps vote count to an opacity/intensity value.
 * More votes = more intense color.
 *
 * @param voteCount - Total number of votes
 * @param minOpacity - Minimum opacity (0-1, default: 0.3)
 * @param maxOpacity - Maximum opacity (0-1, default: 1.0)
 * @param threshold - Vote count for max opacity (default: 100)
 * @returns Opacity value (0-1)
 *
 * @example
 * calculateIntensity(0)    // 0.3 (min opacity)
 * calculateIntensity(50)   // 0.65 (50% of max)
 * calculateIntensity(100)  // 1.0 (max opacity)
 * calculateIntensity(200)  // 1.0 (capped at max)
 */
export function calculateIntensity(
  voteCount: number,
  minOpacity: number = 0.3,
  maxOpacity: number = 1.0,
  threshold: number = 100
): number {
  if (voteCount <= 0) return minOpacity;
  if (voteCount >= threshold) return maxOpacity;

  // Linear interpolation between min and max
  const ratio = voteCount / threshold;
  return minOpacity + (maxOpacity - minOpacity) * ratio;
}

/**
 * Default team colors (can be overridden)
 */
export const DEFAULT_TEAM_COLORS: TeamColors = {
  teamA: '#FF4444', // Red
  teamB: '#4444FF', // Blue
};

/**
 * Preset color schemes for different match themes
 */
export const COLOR_SCHEMES = {
  classic: {
    teamA: '#FF4444', // Red
    teamB: '#4444FF', // Blue
  },
  fire_ice: {
    teamA: '#FF6B00', // Orange (fire)
    teamB: '#00D9FF', // Cyan (ice)
  },
  nature: {
    teamA: '#00C853', // Green
    teamB: '#8B4513', // Brown
  },
  neon: {
    teamA: '#FF00FF', // Magenta
    teamB: '#00FFFF', // Cyan
  },
  sunset: {
    teamA: '#FF6F61', // Coral
    teamB: '#6B5B95', // Purple
  },
} as const;

export type ColorScheme = keyof typeof COLOR_SCHEMES;

/**
 * Get color scheme by name
 *
 * @param scheme - Color scheme name
 * @returns Team colors configuration
 */
export function getColorScheme(scheme: ColorScheme): TeamColors {
  return COLOR_SCHEMES[scheme];
}

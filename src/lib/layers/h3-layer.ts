/**
 * H3 Hexagon Layer Configuration
 *
 * Configures Deck.gl H3HexagonLayer for rendering vote data with team colors.
 * Handles color blending, transitions, and performance optimizations.
 */

import { H3HexagonLayer } from '@deck.gl/geo-layers';
import type { H3VoteData } from './data-transformer';
import { getTeamColor, type TeamColors, calculateIntensity } from '@/lib/color-utils';

/**
 * H3 layer configuration options
 */
export interface H3LayerOptions {
  /** Unique layer ID */
  id?: string;

  /** Team color configuration */
  teamColors: TeamColors;

  /** Base opacity (0-1, default: 0.6) */
  opacity?: number;

  /** Enable 3D extrusion based on vote count (default: false) */
  extruded?: boolean;

  /** Extrusion multiplier for 3D height (default: 10) */
  elevationScale?: number;

  /** Show wireframe outline (default: false) */
  wireframe?: boolean;

  /** Enable picking for hover/click (default: true) */
  pickable?: boolean;

  /** Color transition duration in ms (default: 500) */
  transitionDuration?: number;

  /** Minimum opacity for low-vote hexagons (0-1, default: 0.3) */
  minOpacity?: number;

  /** Maximum opacity for high-vote hexagons (0-1, default: 1.0) */
  maxOpacity?: number;

  /** Vote threshold for maximum opacity (default: 100) */
  opacityThreshold?: number;

  /** Auto-adjust opacity based on vote count (default: true) */
  dynamicOpacity?: boolean;

  /** Highlight color for hover (default: [255, 255, 255, 100]) */
  highlightColor?: [number, number, number, number];
}

/**
 * Create H3 hexagon layer with team colors
 *
 * Renders H3 hexagons with colors blended based on team vote distribution.
 * Supports smooth transitions when data updates.
 *
 * @param data - H3 vote data to visualize
 * @param options - Layer configuration options
 * @returns Configured H3HexagonLayer instance
 *
 * @example
 * // Basic usage
 * const layer = createH3Layer(voteData, {
 *   teamColors: { teamA: "#FF0000", teamB: "#0000FF" }
 * });
 *
 * @example
 * // With 3D extrusion
 * const layer = createH3Layer(voteData, {
 *   teamColors: { teamA: "#FF0000", teamB: "#0000FF" },
 *   extruded: true,
 *   elevationScale: 20
 * });
 *
 * @example
 * // High performance mode (no dynamic opacity)
 * const layer = createH3Layer(voteData, {
 *   teamColors: { teamA: "#FF0000", teamB: "#0000FF" },
 *   dynamicOpacity: false,
 *   transitionDuration: 300
 * });
 */
export function createH3Layer(
  data: H3VoteData[],
  options: H3LayerOptions
): H3HexagonLayer<H3VoteData> {
  const {
    id = 'h3-hexagon-layer',
    teamColors,
    opacity = 0.6,
    extruded = false,
    elevationScale = 10,
    wireframe = false,
    pickable = true,
    transitionDuration = 500,
    minOpacity = 0.3,
    maxOpacity = 1.0,
    opacityThreshold = 100,
    dynamicOpacity = true,
    highlightColor = [255, 255, 255, 100],
  } = options;

  return new H3HexagonLayer<H3VoteData>({
    id,
    data,

    // Hexagon properties
    pickable,
    wireframe,
    filled: true,
    extruded,
    elevationScale,

    // Get H3 index from data
    getHexagon: (d: H3VoteData) => d.h3Index,

    // Calculate fill color based on team dominance
    getFillColor: (d: H3VoteData) => {
      // Calculate base color from team votes
      const baseColor = getTeamColor(
        d.teamACount,
        d.teamBCount,
        teamColors,
        255 // Full alpha in RGBA
      );

      // Apply dynamic opacity if enabled
      if (dynamicOpacity) {
        const intensityMultiplier = calculateIntensity(
          d.voteCount,
          minOpacity,
          maxOpacity,
          opacityThreshold
        );

        // Adjust alpha channel based on vote count
        return [
          baseColor[0],
          baseColor[1],
          baseColor[2],
          Math.round(baseColor[3] * intensityMultiplier),
        ] as [number, number, number, number];
      }

      return baseColor;
    },

    // Elevation for 3D mode (based on vote count)
    getElevation: (d: H3VoteData) => {
      if (!extruded) return 0;
      // Scale elevation by vote count (logarithmic for better visual range)
      return Math.log10(d.voteCount + 1) * 100;
    },

    // Line color for wireframe (same as fill, slightly lighter)
    getLineColor: (d: H3VoteData) => {
      const fillColor = getTeamColor(d.teamACount, d.teamBCount, teamColors, 255);
      // Lighten by 20% for wireframe
      return [
        Math.min(255, fillColor[0] + 50),
        Math.min(255, fillColor[1] + 50),
        Math.min(255, fillColor[2] + 50),
        200,
      ] as [number, number, number, number];
    },

    // Line width for wireframe
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 2,

    // Global opacity
    opacity,

    // Smooth transitions on data updates
    transitions: {
      getFillColor: {
        duration: transitionDuration,
        easing: (t: number) => t, // Linear easing
      },
      getElevation: {
        duration: transitionDuration,
        easing: (t: number) => t,
      },
    },

    // Update triggers - layer will re-render when these change
    updateTriggers: {
      getFillColor: [
        data,
        teamColors.teamA,
        teamColors.teamB,
        dynamicOpacity,
        minOpacity,
        maxOpacity,
        opacityThreshold,
      ],
      getElevation: [data, extruded, elevationScale],
      getLineColor: [teamColors.teamA, teamColors.teamB],
    },

    // Highlight on hover
    autoHighlight: true,
    highlightColor,

    // Performance optimizations
    // Only update when needed
    modelMatrix: undefined,

    // Use instancing for better performance
    instanced: true,

    // For better performance with many hexagons
    _subLayerProps: {
      'hexagon-cell': {
        type: H3HexagonLayer,
        // Disable depth test for better performance (2D only)
        parameters: {
          depthTest: extruded,
          depthMask: extruded,
        },
      },
    },
  });
}

/**
 * Create H3 layer with preset configuration
 *
 * Convenience function for common use cases.
 *
 * @param data - H3 vote data
 * @param teamColors - Team colors
 * @param preset - Preset configuration name
 * @returns Configured layer
 */
export function createH3LayerPreset(
  data: H3VoteData[],
  teamColors: TeamColors,
  preset: 'default' | '3d' | 'performance' | 'high-detail' = 'default'
): H3HexagonLayer<H3VoteData> {
  const presets: Record<typeof preset, Partial<H3LayerOptions>> = {
    default: {
      extruded: false,
      wireframe: false,
      opacity: 0.6,
      transitionDuration: 500,
      dynamicOpacity: true,
    },
    '3d': {
      extruded: true,
      elevationScale: 20,
      wireframe: true,
      opacity: 0.7,
      transitionDuration: 600,
      dynamicOpacity: true,
    },
    performance: {
      extruded: false,
      wireframe: false,
      opacity: 0.6,
      transitionDuration: 300,
      dynamicOpacity: false, // Disable for better performance
    },
    'high-detail': {
      extruded: false,
      wireframe: true,
      opacity: 0.8,
      transitionDuration: 700,
      dynamicOpacity: true,
      minOpacity: 0.4,
      maxOpacity: 0.95,
    },
  };

  return createH3Layer(data, {
    teamColors,
    ...presets[preset],
  });
}

/**
 * Update layer with new data
 *
 * Helper to update an existing layer with new vote data.
 * Maintains smooth transitions.
 *
 * @param existingLayer - Current layer instance
 * @param newData - Updated vote data
 * @returns New layer instance with updated data
 */
export function updateH3LayerData(
  _existingLayer: H3HexagonLayer<H3VoteData>,
  newData: H3VoteData[]
): H3VoteData[] {
  // Simply return the new data - the consuming code will create a new layer
  // This is a helper function to maintain the API but Deck.gl handles immutable updates
  return newData;
}

/**
 * Create overlay layer for highlighting specific hexagons
 *
 * Renders a subset of hexagons with different styling.
 * Useful for highlighting user's location, top hotspots, etc.
 *
 * @param data - Hexagons to highlight
 * @param color - Highlight color
 * @param options - Additional options
 * @returns Configured highlight layer
 *
 * @example
 * // Highlight user's hexagon
 * const highlightLayer = createHighlightLayer(
 *   [userHexagon],
 *   [255, 255, 0, 200], // Yellow
 *   { wireframe: true }
 * );
 */
export function createHighlightLayer(
  data: H3VoteData[],
  color: [number, number, number, number],
  options: Partial<H3LayerOptions> = {}
): H3HexagonLayer<H3VoteData> {
  const lineColor: [number, number, number, number] = [
    Math.min(255, color[0] + 50),
    Math.min(255, color[1] + 50),
    Math.min(255, color[2] + 50),
    255,
  ];

  return new H3HexagonLayer<H3VoteData>({
    id: options.id || 'h3-highlight-layer',
    data,
    pickable: false,
    wireframe: options.wireframe ?? true,
    filled: true,
    extruded: false,

    getHexagon: (d: H3VoteData) => d.h3Index,
    getFillColor: () => color,
    getLineColor: () => lineColor,

    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 3,
    opacity: 1,

    // No transitions for highlight layer (immediate response)
    transitions: undefined,
  });
}

/**
 * Layer IDs for managing multiple layers
 */
export const LAYER_IDS = {
  MAIN: 'h3-hexagon-layer',
  HIGHLIGHT: 'h3-highlight-layer',
  USER_LOCATION: 'h3-user-location-layer',
  HOTSPOTS: 'h3-hotspots-layer',
} as const;

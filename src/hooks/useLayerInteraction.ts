/**
 * Layer Interaction Hook
 *
 * Manages hover and click interactions with Deck.gl layers.
 * Provides debouncing and state management for performance.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PickingInfo } from '@deck.gl/core';
import type { H3VoteData } from '@/lib/layers/data-transformer';

/**
 * Interaction state
 */
export interface InteractionState {
  /** Currently hovered hexagon data */
  hoveredObject: H3VoteData | null;

  /** Hover position [x, y] in screen coordinates */
  hoverPosition: [number, number] | null;

  /** Currently clicked hexagon data */
  clickedObject: H3VoteData | null;

  /** Whether user is hovering over a hexagon */
  isHovering: boolean;
}

/**
 * Interaction callbacks
 */
export interface InteractionCallbacks {
  /** Called when hover state changes */
  onHoverChange?: (object: H3VoteData | null, position: [number, number] | null) => void | undefined;

  /** Called when hexagon is clicked */
  onClickHexagon?: (object: H3VoteData, position: [number, number]) => void | undefined;

  /** Called when clicked outside any hexagon */
  onClickOutside?: (() => void) | undefined;
}

/**
 * Hook options
 */
export interface UseLayerInteractionOptions extends InteractionCallbacks {
  /** Debounce delay for hover events in ms (default: 50) */
  debounceDelay?: number;

  /** Enable click interactions (default: true) */
  enableClick?: boolean;

  /** Enable hover interactions (default: true) */
  enableHover?: boolean;
}

/**
 * Hook return value
 */
export interface LayerInteractionResult {
  /** Current interaction state */
  state: InteractionState;

  /** Hover event handler for Deck.gl */
  handleHover: (info: PickingInfo<H3VoteData>) => void;

  /** Click event handler for Deck.gl */
  handleClick: (info: PickingInfo<H3VoteData>) => void;

  /** Manually set hovered object */
  setHoveredObject: (object: H3VoteData | null, position?: [number, number] | null) => void;

  /** Manually set clicked object */
  setClickedObject: (object: H3VoteData | null) => void;

  /** Clear all interactions */
  clearInteractions: () => void;
}

/**
 * Use layer interaction hook
 *
 * Manages hover and click interactions with hexagon layers.
 * Provides debouncing for performance and state management.
 *
 * @param options - Configuration options and callbacks
 * @returns Interaction state and handlers
 *
 * @example
 * const { state, handleHover, handleClick } = useLayerInteraction({
 *   onHoverChange: (object, position) => {
 *     setTooltip({ data: object, position });
 *   },
 *   onClickHexagon: (object) => {
 *     console.log('Clicked hexagon:', object.h3Index);
 *   },
 *   debounceDelay: 50
 * });
 *
 * // In DeckGLOverlay
 * <DeckGLOverlay
 *   map={map}
 *   layers={layers}
 *   onHover={handleHover}
 *   onClick={handleClick}
 * />
 */
export function useLayerInteraction(
  options: UseLayerInteractionOptions = {}
): LayerInteractionResult {
  const {
    debounceDelay = 50,
    enableClick = true,
    enableHover = true,
    onHoverChange,
    onClickHexagon,
    onClickOutside,
  } = options;

  // State
  const [state, setState] = useState<InteractionState>({
    hoveredObject: null,
    hoverPosition: null,
    clickedObject: null,
    isHovering: false,
  });

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Previous hover object ref (for comparison)
  const prevHoverObjectRef = useRef<H3VoteData | null>(null);

  /**
   * Handle hover event from Deck.gl
   */
  const handleHover = useCallback(
    (info: PickingInfo<H3VoteData>) => {
      if (!enableHover) return;

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce hover events for performance
      debounceTimerRef.current = setTimeout(() => {
        const object = info.object || null;
        const position: [number, number] | null = info.x !== undefined && info.y !== undefined
          ? [info.x, info.y]
          : null;

        // Check if object actually changed
        const objectChanged = object?.h3Index !== prevHoverObjectRef.current?.h3Index;

        if (objectChanged) {
          prevHoverObjectRef.current = object;

          // Update state
          setState((prev) => ({
            ...prev,
            hoveredObject: object,
            hoverPosition: position,
            isHovering: object !== null,
          }));

          // Call callback
          if (onHoverChange) {
            onHoverChange(object, position);
          }
        } else if (position) {
          // Just update position if same object
          setState((prev) => ({
            ...prev,
            hoverPosition: position,
          }));
        }
      }, debounceDelay);
    },
    [enableHover, debounceDelay, onHoverChange]
  );

  /**
   * Handle click event from Deck.gl
   */
  const handleClick = useCallback(
    (info: PickingInfo<H3VoteData>) => {
      if (!enableClick) return;

      const object = info.object || null;
      const position: [number, number] | null = info.x !== undefined && info.y !== undefined
        ? [info.x, info.y]
        : null;

      // Update state
      setState((prev) => ({
        ...prev,
        clickedObject: object,
      }));

      // Call appropriate callback
      if (object && position) {
        if (onClickHexagon) {
          onClickHexagon(object, position);
        }
      } else {
        if (onClickOutside) {
          onClickOutside();
        }
      }
    },
    [enableClick, onClickHexagon, onClickOutside]
  );

  /**
   * Manually set hovered object
   */
  const setHoveredObject = useCallback(
    (object: H3VoteData | null, position: [number, number] | null = null) => {
      setState((prev) => ({
        ...prev,
        hoveredObject: object,
        hoverPosition: position,
        isHovering: object !== null,
      }));

      prevHoverObjectRef.current = object;

      if (onHoverChange) {
        onHoverChange(object, position);
      }
    },
    [onHoverChange]
  );

  /**
   * Manually set clicked object
   */
  const setClickedObject = useCallback((object: H3VoteData | null) => {
    setState((prev) => ({
      ...prev,
      clickedObject: object,
    }));
  }, []);

  /**
   * Clear all interactions
   */
  const clearInteractions = useCallback(() => {
    setState({
      hoveredObject: null,
      hoverPosition: null,
      clickedObject: null,
      isHovering: false,
    });

    prevHoverObjectRef.current = null;

    if (onHoverChange) {
      onHoverChange(null, null);
    }
  }, [onHoverChange]);

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    state,
    handleHover,
    handleClick,
    setHoveredObject,
    setClickedObject,
    clearInteractions,
  };
}

/**
 * Simple hover hook
 *
 * Simplified version that only tracks hover state.
 *
 * @example
 * const { hoveredObject, hoverPosition, handleHover } = useHover();
 */
export function useHover(debounceDelay: number = 50) {
  const { state, handleHover } = useLayerInteraction({
    debounceDelay,
    enableClick: false,
    enableHover: true,
  });

  return {
    hoveredObject: state.hoveredObject,
    hoverPosition: state.hoverPosition,
    isHovering: state.isHovering,
    handleHover,
  };
}

/**
 * Simple click hook
 *
 * Simplified version that only tracks click state.
 *
 * @example
 * const { clickedObject, handleClick, clearClick } = useClick({
 *   onClick: (object) => console.log('Clicked:', object.h3Index)
 * });
 */
export function useClick(options: {
  onClick?: (object: H3VoteData) => void;
  onClickOutside?: () => void;
} = {}) {
  const interactionOptions: UseLayerInteractionOptions = {
    enableClick: true,
    enableHover: false,
  };

  if (options.onClick) {
    interactionOptions.onClickHexagon = (obj, _pos) => options.onClick!(obj);
  }

  if (options.onClickOutside) {
    interactionOptions.onClickOutside = options.onClickOutside;
  }

  const { state, handleClick, setClickedObject } = useLayerInteraction(interactionOptions);

  const clearClick = useCallback(() => {
    setClickedObject(null);
  }, [setClickedObject]);

  return {
    clickedObject: state.clickedObject,
    handleClick,
    clearClick,
  };
}

/**
 * Combined hover and click hook with tooltip integration
 *
 * @example
 * const interaction = useHexagonInteraction({
 *   onHover: (data, pos) => setTooltip({ data, pos }),
 *   onClick: (data) => showDetails(data)
 * });
 */
export function useHexagonInteraction(options: {
  onHover?: (data: H3VoteData | null, position: [number, number] | null) => void;
  onClick?: (data: H3VoteData) => void;
  onClickOutside?: () => void;
  debounceDelay?: number;
} = {}) {
  const interactionOptions: UseLayerInteractionOptions = {
    debounceDelay: options.debounceDelay ?? 50,
    enableHover: true,
    enableClick: true,
  };

  if (options.onHover) {
    interactionOptions.onHoverChange = options.onHover;
  }

  if (options.onClick) {
    interactionOptions.onClickHexagon = (obj, _pos) => options.onClick!(obj);
  }

  if (options.onClickOutside) {
    interactionOptions.onClickOutside = options.onClickOutside;
  }

  return useLayerInteraction(interactionOptions);
}

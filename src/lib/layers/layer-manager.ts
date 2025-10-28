/**
 * Layer Manager
 *
 * Manages multiple Deck.gl layers on the map.
 * Handles adding, removing, updating, and organizing layers.
 */

import type { Layer } from '@deck.gl/core';

/**
 * Layer metadata for tracking
 */
export interface LayerMetadata {
  /** Layer ID */
  id: string;

  /** Layer instance */
  layer: Layer;

  /** Layer type/category */
  type?: string | undefined;

  /** Whether layer is visible */
  visible: boolean;

  /** Layer z-index (render order) */
  zIndex?: number | undefined;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Layer update result
 */
export interface LayerUpdateResult {
  success: boolean;
  layerId: string;
  message?: string;
}

/**
 * LayerManager class for managing Deck.gl layers
 *
 * Provides a centralized way to manage multiple layers with
 * lifecycle management and state tracking.
 */
export class LayerManager {
  private layers: Map<string, LayerMetadata>;
  private updateCallback?: (layers: Layer[]) => void;

  constructor() {
    this.layers = new Map();
  }

  /**
   * Set callback function to trigger when layers change
   *
   * @param callback - Function to call with updated layer array
   *
   * @example
   * layerManager.setUpdateCallback((layers) => {
   *   deckOverlay.setProps({ layers });
   * });
   */
  setUpdateCallback(callback: (layers: Layer[]) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Add a new layer
   *
   * @param layer - Deck.gl layer instance
   * @param options - Optional metadata
   * @returns Success status
   *
   * @example
   * const layer = createH3Layer(data, options);
   * layerManager.addLayer(layer, { type: 'hexagon', zIndex: 1 });
   */
  addLayer(
    layer: Layer,
    options: {
      type?: string;
      visible?: boolean;
      zIndex?: number;
    } = {}
  ): LayerUpdateResult {
    const layerId = layer.id;

    // Check if layer already exists
    if (this.layers.has(layerId)) {
      return {
        success: false,
        layerId,
        message: `Layer with ID '${layerId}' already exists`,
      };
    }

    // Create metadata
    const metadata: LayerMetadata = {
      id: layerId,
      layer,
      type: options.type ?? undefined,
      visible: options.visible ?? true,
      zIndex: options.zIndex ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to map
    this.layers.set(layerId, metadata);

    // Trigger update
    this.triggerUpdate();

    return {
      success: true,
      layerId,
      message: `Layer '${layerId}' added successfully`,
    };
  }

  /**
   * Remove a layer by ID
   *
   * @param layerId - Layer ID to remove
   * @returns Success status
   *
   * @example
   * layerManager.removeLayer('h3-hexagon-layer');
   */
  removeLayer(layerId: string): LayerUpdateResult {
    if (!this.layers.has(layerId)) {
      return {
        success: false,
        layerId,
        message: `Layer '${layerId}' not found`,
      };
    }

    this.layers.delete(layerId);
    this.triggerUpdate();

    return {
      success: true,
      layerId,
      message: `Layer '${layerId}' removed successfully`,
    };
  }

  /**
   * Update an existing layer
   *
   * Replaces the layer instance while preserving metadata.
   *
   * @param layerId - Layer ID to update
   * @param newLayer - New layer instance
   * @returns Success status
   *
   * @example
   * const updatedLayer = createH3Layer(newData, options);
   * layerManager.updateLayer('h3-hexagon-layer', updatedLayer);
   */
  updateLayer(layerId: string, newLayer: Layer): LayerUpdateResult {
    const metadata = this.layers.get(layerId);

    if (!metadata) {
      return {
        success: false,
        layerId,
        message: `Layer '${layerId}' not found`,
      };
    }

    // Update layer instance and timestamp
    metadata.layer = newLayer;
    metadata.updatedAt = new Date();

    this.triggerUpdate();

    return {
      success: true,
      layerId,
      message: `Layer '${layerId}' updated successfully`,
    };
  }

  /**
   * Update layer properties
   *
   * Updates only specific properties of a layer.
   *
   * @param layerId - Layer ID
   * @param props - Properties to update
   * @returns Success status
   *
   * @example
   * layerManager.updateLayerProps('h3-hexagon-layer', {
   *   opacity: 0.8,
   *   visible: true
   * });
   */
  updateLayerProps(layerId: string, props: Partial<Layer['props']>): LayerUpdateResult {
    const metadata = this.layers.get(layerId);

    if (!metadata) {
      return {
        success: false,
        layerId,
        message: `Layer '${layerId}' not found`,
      };
    }

    // Clone layer with new props
    const updatedLayer = metadata.layer.clone(props);
    metadata.layer = updatedLayer;
    metadata.updatedAt = new Date();

    this.triggerUpdate();

    return {
      success: true,
      layerId,
      message: `Layer '${layerId}' properties updated`,
    };
  }

  /**
   * Set layer visibility
   *
   * @param layerId - Layer ID
   * @param visible - Visibility state
   * @returns Success status
   */
  setLayerVisibility(layerId: string, visible: boolean): LayerUpdateResult {
    const metadata = this.layers.get(layerId);

    if (!metadata) {
      return {
        success: false,
        layerId,
        message: `Layer '${layerId}' not found`,
      };
    }

    metadata.visible = visible;
    metadata.layer = metadata.layer.clone({ visible });
    metadata.updatedAt = new Date();

    this.triggerUpdate();

    return {
      success: true,
      layerId,
      message: `Layer '${layerId}' visibility set to ${visible}`,
    };
  }

  /**
   * Get all layers as array
   *
   * Returns layers sorted by z-index (if specified).
   *
   * @param visibleOnly - Only return visible layers (default: false)
   * @returns Array of layer instances
   */
  getLayers(visibleOnly: boolean = false): Layer[] {
    const metadataArray = Array.from(this.layers.values());

    // Filter by visibility if requested
    const filtered = visibleOnly
      ? metadataArray.filter((m) => m.visible)
      : metadataArray;

    // Sort by z-index
    const sorted = filtered.sort((a, b) => {
      const aIndex = a.zIndex ?? 0;
      const bIndex = b.zIndex ?? 0;
      return aIndex - bIndex;
    });

    return sorted.map((m) => m.layer);
  }

  /**
   * Get layer by ID
   *
   * @param layerId - Layer ID
   * @returns Layer instance or undefined
   */
  getLayer(layerId: string): Layer | undefined {
    return this.layers.get(layerId)?.layer;
  }

  /**
   * Check if layer exists
   *
   * @param layerId - Layer ID
   * @returns True if layer exists
   */
  hasLayer(layerId: string): boolean {
    return this.layers.has(layerId);
  }

  /**
   * Get layer metadata
   *
   * @param layerId - Layer ID
   * @returns Layer metadata or undefined
   */
  getLayerMetadata(layerId: string): LayerMetadata | undefined {
    return this.layers.get(layerId);
  }

  /**
   * Get all layer IDs
   *
   * @returns Array of layer IDs
   */
  getLayerIds(): string[] {
    return Array.from(this.layers.keys());
  }

  /**
   * Get layers by type
   *
   * @param type - Layer type to filter by
   * @returns Array of layers with matching type
   */
  getLayersByType(type: string): Layer[] {
    return Array.from(this.layers.values())
      .filter((m) => m.type === type)
      .map((m) => m.layer);
  }

  /**
   * Clear all layers
   *
   * Removes all layers from the manager.
   */
  clearLayers(): void {
    this.layers.clear();
    this.triggerUpdate();
  }

  /**
   * Get layer count
   *
   * @returns Number of layers
   */
  getLayerCount(): number {
    return this.layers.size;
  }

  /**
   * Trigger update callback
   *
   * Calls the registered callback with current visible layers.
   */
  private triggerUpdate(): void {
    if (this.updateCallback) {
      const visibleLayers = this.getLayers(true);
      this.updateCallback(visibleLayers);
    }
  }

  /**
   * Dispose of the layer manager
   *
   * Cleans up resources and removes all layers.
   */
  dispose(): void {
    this.clearLayers();
    // @ts-ignore - Setting callback to undefined is intentional for cleanup
    this.updateCallback = undefined;
  }

  /**
   * Get statistics about layers
   *
   * @returns Layer statistics
   */
  getStats() {
    const allLayers = Array.from(this.layers.values());
    const visible = allLayers.filter((m) => m.visible).length;
    const hidden = allLayers.length - visible;

    const typeCount = new Map<string, number>();
    allLayers.forEach((m) => {
      if (m.type) {
        typeCount.set(m.type, (typeCount.get(m.type) || 0) + 1);
      }
    });

    return {
      total: this.layers.size,
      visible,
      hidden,
      types: Object.fromEntries(typeCount),
    };
  }
}

/**
 * Create a new LayerManager instance
 *
 * @returns New LayerManager
 *
 * @example
 * const layerManager = createLayerManager();
 * layerManager.addLayer(h3Layer);
 */
export function createLayerManager(): LayerManager {
  return new LayerManager();
}

/**
 * Singleton instance (optional)
 *
 * Use this for a global layer manager, or create instances as needed.
 */
let globalLayerManager: LayerManager | null = null;

/**
 * Get global layer manager instance
 *
 * Creates one if it doesn't exist.
 *
 * @returns Global LayerManager instance
 */
export function getGlobalLayerManager(): LayerManager {
  if (!globalLayerManager) {
    globalLayerManager = new LayerManager();
  }
  return globalLayerManager;
}

/**
 * Reset global layer manager
 *
 * Disposes current instance and creates a new one.
 */
export function resetGlobalLayerManager(): void {
  if (globalLayerManager) {
    globalLayerManager.dispose();
  }
  globalLayerManager = new LayerManager();
}

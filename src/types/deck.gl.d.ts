/**
 * Type declarations for Deck.gl packages
 *
 * These packages don't have official type definitions for version 8.9.x,
 * so we provide basic declarations to satisfy TypeScript.
 */

declare module '@deck.gl/core' {
  export interface Layer<PropsT = any> {
    id: string;
    props: PropsT;
    clone(props?: Partial<PropsT>): Layer<PropsT>;
  }

  export interface PickingInfo<DataT = any> {
    index: number;
    object?: DataT;
    x?: number;
    y?: number;
    coordinate?: [number, number];
    layer?: Layer;
    viewport?: any;
  }

  export interface Viewport {
    longitude: number;
    latitude: number;
    zoom: number;
    bearing: number;
    pitch: number;
  }
}

declare module '@deck.gl/geo-layers' {
  import { Layer } from '@deck.gl/core';

  export interface H3HexagonLayerProps<DataT = any> {
    id: string;
    data: DataT[];
    pickable?: boolean;
    wireframe?: boolean;
    filled?: boolean;
    extruded?: boolean;
    elevationScale?: number;
    getHexagon: (d: DataT) => string;
    getFillColor?: (d: DataT) => [number, number, number, number];
    getElevation?: (d: DataT) => number;
    getLineColor?: (d: DataT) => [number, number, number, number];
    lineWidthMinPixels?: number;
    lineWidthMaxPixels?: number;
    opacity?: number;
    transitions?: any;
    updateTriggers?: any;
    autoHighlight?: boolean;
    highlightColor?: [number, number, number, number];
    modelMatrix?: any;
    instanced?: boolean;
    _subLayerProps?: any;
  }

  export class H3HexagonLayer<DataT = any> extends Layer<H3HexagonLayerProps<DataT>> {
    constructor(props: H3HexagonLayerProps<DataT>);
  }
}

declare module '@deck.gl/mapbox' {
  import { Layer } from '@deck.gl/core';

  export interface MapboxOverlayProps {
    interleaved?: boolean;
    layers?: Layer[];
    onHover?: (info: any) => void;
    onClick?: (info: any) => void;
    getCursor?: (state: { isDragging: boolean; isHovering: boolean }) => string;
  }

  export class MapboxOverlay {
    constructor(props: MapboxOverlayProps);
    setProps(props: Partial<MapboxOverlayProps>): void;
    finalize(): void;
  }
}

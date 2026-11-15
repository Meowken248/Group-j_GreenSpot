declare namespace google {
  export namespace maps {
    export interface MapTypeStyle {
      elementType?: string;
      featureType?: string;
      stylers?: Array<Record<string, any>>;
    }
    export type Map = any;
    export type Marker = any;
    export type LatLng = any;
    export type LatLngLiteral = any;
    export type InfoWindow = any;
  }
}

declare const google: {
  maps: any;
};

declare interface Window {
  google?: typeof google;
}


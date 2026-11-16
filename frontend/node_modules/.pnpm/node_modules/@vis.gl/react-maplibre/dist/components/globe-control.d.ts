import * as React from 'react';
import { ControlPosition } from "../types/lib.js";
export type GlobeControlProps = {
    /** Placement of the control relative to the map. */
    position?: ControlPosition;
    /** CSS style override, applied to the control's container */
    style?: React.CSSProperties;
};
declare function _GlobeControl(props: GlobeControlProps): any;
export declare const GlobeControl: React.MemoExoticComponent<typeof _GlobeControl>;
export {};
//# sourceMappingURL=globe-control.d.ts.map
declare module '*.png';
declare module '*.svg';

declare global {
    interface Window {
      dopreview: (key: any, idx: number, isinternal: boolean, hastime: any[]) => void;
    }
}

declare module "./utils/preview.js" {
    export function dopreview(
      key: any,
      idx: number,
      isinternal?: boolean,
      hastime?: any
    ): void;
    export function initcanvas(): void;
    export function drawpreview(data: any): void;
    export function update(): void;
}

declare module "jda" {
  const jdata: any;
  export default jdata;
}

declare module "bjd" {
  const bjdata: any;
  export default bjdata;
}

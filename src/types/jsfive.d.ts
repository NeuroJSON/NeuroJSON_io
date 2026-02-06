declare module "jsfive" {
  export class File {
    constructor(buffer: ArrayBuffer);
    keys?: string[] | (() => string[]);
    attrs?: Record<string, any>;
    get(key: string): any;
  }

  export interface Dataset {
    shape?: number[];
    dtype?: string;
    value?: any;
    attrs?: Record<string, any>;
    keys?: string[] | (() => string[]);
    get?(key: string): any;
  }

  export interface Group {
    keys?: string[] | (() => string[]);
    attrs?: Record<string, any>;
    get(key: string): any;
  }
}

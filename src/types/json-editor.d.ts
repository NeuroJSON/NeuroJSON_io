// Declare JSONEditor as a global variable since we're loading it via CDN
// Declare JSONEditor as a global variable
declare const JSONEditor: {
  new (element: HTMLElement, options: any): JSONEditorInstance;
};

interface JSONEditorInstance {
  getValue(): any;
  setValue(value: any): void;
  on(event: string, callback: () => void): void;
  destroy(): void;
}

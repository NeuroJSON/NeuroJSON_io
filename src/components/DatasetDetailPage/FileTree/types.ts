export type LinkMeta = { url: string; index: number };

// this value can be one of these types
export type TreeNode =
  | {
      kind: "folder";
      name: string;
      path: string;
      children: TreeNode[];
      link?: LinkMeta;
    }
  | { kind: "file"; name: string; path: string; value?: any; link?: LinkMeta };

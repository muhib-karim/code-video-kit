export interface FileTreeInput {
  path: string;
  highlight?: boolean;
  note?: string;
}

export interface FileTreeRow {
  /** Display name of this node (last path segment). */
  name: string;
  /** Full path from the root, without trailing slash. */
  path: string;
  depth: number;
  isDir: boolean;
  highlight: boolean;
  note?: string;
}

interface Node {
  name: string;
  path: string;
  isDir: boolean;
  highlight: boolean;
  note?: string;
  children: Map<string, Node>;
}

/**
 * Turns a flat list of paths ("src/index.ts", "src/lib/", ...) into
 * depth-annotated rows in display order: directories first, then files,
 * each alphabetically. A trailing "/" marks an empty directory.
 */
export function buildTree(entries: readonly FileTreeInput[]): FileTreeRow[] {
  const root: Node = { name: '', path: '', isDir: true, highlight: false, children: new Map() };
  for (const entry of entries) {
    const explicitDir = entry.path.endsWith('/');
    const parts = entry.path.split('/').filter(Boolean);
    let node = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      let child = node.children.get(part);
      if (!child) {
        child = {
          name: part,
          path: node.path ? `${node.path}/${part}` : part,
          isDir: !isLast || explicitDir,
          highlight: false,
          children: new Map(),
        };
        node.children.set(part, child);
      }
      if (!isLast || explicitDir) child.isDir = true;
      if (isLast) {
        child.highlight = child.highlight || Boolean(entry.highlight);
        if (entry.note) child.note = entry.note;
      }
      node = child;
    });
  }

  const rows: FileTreeRow[] = [];
  const walk = (node: Node, depth: number) => {
    const kids = [...node.children.values()].sort((a, b) =>
      a.isDir === b.isDir ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) : a.isDir ? -1 : 1,
    );
    for (const kid of kids) {
      rows.push({ name: kid.name, path: kid.path, depth, isDir: kid.isDir, highlight: kid.highlight, note: kid.note });
      walk(kid, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

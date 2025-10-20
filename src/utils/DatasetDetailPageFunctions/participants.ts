export type ParticipantsTable = { columns: string[]; rows: any[] };

export function makeParticipantsTable(part: any): ParticipantsTable | null {
  if (!part || typeof part !== "object") return null;

  // Case A: object-of-arrays
  //   const cols = Object.keys(part);
  //   const isObjOfArrays =
  //     cols.length > 0 && cols.every((k) => Array.isArray(part[k]));
  const arrayCols = Object.keys(part).filter((k) => Array.isArray(part[k]));

  if (arrayCols.length > 0) {
    const n = Math.max(...arrayCols.map((k) => part[k].length));
    const rows = Array.from({ length: n }, (_, i) => {
      const r: any = { id: i + 1 };
      arrayCols.forEach((k) => (r[k] = part[k][i] ?? ""));
      return r;
    });
    return { columns: arrayCols, rows };
  }

  // Case B: array-of-objects fallback
  if (Array.isArray(part)) {
    const allCols = new Set<string>();
    part.forEach((r: any) =>
      Object.keys(r || {}).forEach((k) => allCols.add(k))
    );
    const columns = Array.from(allCols);
    const rows = part.map((r: any, i: number) => ({ id: i + 1, ...(r || {}) }));
    return { columns, rows };
  }

  return null;
}

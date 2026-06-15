export function normalizeSymbol(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '');
}

export function canonicalToDisplay(canonical: string): string {
  return canonical;
}

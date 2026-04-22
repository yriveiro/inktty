/**
 * Strip common markdown syntax for a parsed view.
 */
export function stripMarkdown(source: string): string {
  return source
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/^-\s+/gm, ""); // list items
}

/**
 * Prepend line numbers for a code view.
 */
export function withLineNumbers(source: string): string {
  const lines = source.split("\n");
  const width = String(lines.length).length;
  return lines.map((line, i) => `${String(i + 1).padStart(width, " ")} | ${line}`).join("\n");
}

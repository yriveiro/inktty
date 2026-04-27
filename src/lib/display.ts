export function stringWidth(text: string): number {
  return Bun.stringWidth(text);
}

function repeatSpaces(count: number): string {
  return count > 0 ? " ".repeat(count) : "";
}

export function padTextEnd(text: string, targetWidth: number): string {
  return text + repeatSpaces(targetWidth - stringWidth(text));
}

export function padTextStart(text: string, targetWidth: number): string {
  return repeatSpaces(targetWidth - stringWidth(text)) + text;
}

export function centerText(text: string, targetWidth: number): string {
  const textWidth = stringWidth(text);

  if (textWidth >= targetWidth) {
    return text;
  }

  const leftPadding = Math.floor((targetWidth - textWidth) / 2);
  const rightPadding = targetWidth - textWidth - leftPadding;
  return `${repeatSpaces(leftPadding)}${text}${repeatSpaces(rightPadding)}`;
}

export function sliceTextByWidth(
  text: string,
  startWidth: number,
  maxWidth = Number.POSITIVE_INFINITY,
): string {
  if (startWidth <= 0 && !Number.isFinite(maxWidth)) {
    return text;
  }

  let consumedWidth = 0;
  let visibleWidth = 0;
  let result = "";

  for (const char of text) {
    const charWidth = stringWidth(char);
    const nextConsumedWidth = consumedWidth + charWidth;

    if (nextConsumedWidth <= startWidth) {
      consumedWidth = nextConsumedWidth;
      continue;
    }

    // Wide characters cannot be partially rendered, so skip a glyph if the
    // requested slice begins in the middle of its occupied terminal cells.
    if (consumedWidth < startWidth) {
      consumedWidth = nextConsumedWidth;
      continue;
    }

    if (visibleWidth + charWidth > maxWidth) {
      break;
    }

    result += char;
    visibleWidth += charWidth;
    consumedWidth = nextConsumedWidth;
  }

  return result;
}

import type { ScrollBoxRenderable, Selection } from "@opentui/core";
import { type CapturedLine, type CapturedSpan, getDataPaths, KeyEvent } from "@opentui/core";
import type { TestRendererOptions } from "@opentui/core/testing";
import { testRender as baseTestRender } from "@opentui/react/test-utils";
import { act, type ReactNode } from "react";

// OpenTUI recreates the shared Tree-sitter client between test renderers while the
// global DataPathsManager persists, which trips EventEmitter's default listener limit.
getDataPaths().setMaxListeners(0);

export async function testRender(node: ReactNode, testRendererOptions: TestRendererOptions) {
  const testSetup = await baseTestRender(node, testRendererOptions);

  return {
    ...testSetup,
    mockMouse: {
      moveTo: async (
        x: number,
        y: number,
        options?: Parameters<typeof testSetup.mockMouse.moveTo>[2],
      ) => {
        await act(async () => {
          await testSetup.mockMouse.moveTo(x, y, options);
        });
      },
      click: async (
        x: number,
        y: number,
        button?: Parameters<typeof testSetup.mockMouse.click>[2],
        options?: Parameters<typeof testSetup.mockMouse.click>[3],
      ) => {
        await act(async () => {
          await testSetup.mockMouse.click(x, y, button, options);
        });
      },
      doubleClick: async (
        x: number,
        y: number,
        button?: Parameters<typeof testSetup.mockMouse.doubleClick>[2],
        options?: Parameters<typeof testSetup.mockMouse.doubleClick>[3],
      ) => {
        await act(async () => {
          await testSetup.mockMouse.doubleClick(x, y, button, options);
        });
      },
      pressDown: async (
        x: number,
        y: number,
        button?: Parameters<typeof testSetup.mockMouse.pressDown>[2],
        options?: Parameters<typeof testSetup.mockMouse.pressDown>[3],
      ) => {
        await act(async () => {
          await testSetup.mockMouse.pressDown(x, y, button, options);
        });
      },
      release: async (
        x: number,
        y: number,
        button?: Parameters<typeof testSetup.mockMouse.release>[2],
        options?: Parameters<typeof testSetup.mockMouse.release>[3],
      ) => {
        await act(async () => {
          await testSetup.mockMouse.release(x, y, button, options);
        });
      },
      drag: async (
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        button?: Parameters<typeof testSetup.mockMouse.drag>[4],
        options?: Parameters<typeof testSetup.mockMouse.drag>[5],
      ) => {
        await act(async () => {
          await testSetup.mockMouse.drag(startX, startY, endX, endY, button, options);
        });
      },
      scroll: async (
        x: number,
        y: number,
        direction: Parameters<typeof testSetup.mockMouse.scroll>[2],
        options?: Parameters<typeof testSetup.mockMouse.scroll>[3],
      ) => {
        await act(async () => {
          await testSetup.mockMouse.scroll(x, y, direction, options);
        });
      },
      getCurrentPosition: testSetup.mockMouse.getCurrentPosition,
      getPressedButtons: testSetup.mockMouse.getPressedButtons,
      emitMouseEvent: async (
        type: Parameters<typeof testSetup.mockMouse.emitMouseEvent>[0],
        x: number,
        y: number,
        button?: Parameters<typeof testSetup.mockMouse.emitMouseEvent>[3],
        options?: Parameters<typeof testSetup.mockMouse.emitMouseEvent>[4],
      ) => {
        await act(async () => {
          await testSetup.mockMouse.emitMouseEvent(type, x, y, button, options);
        });
      },
    },
    renderOnce: async () => {
      await act(async () => {
        await testSetup.renderOnce();
      });
    },
    resize: (width: number, height: number) => {
      act(() => {
        testSetup.resize(width, height);
      });
    },
  };
}

export type TestSetup = Awaited<ReturnType<typeof testRender>>;

export async function destroyTestSetup(testSetup: TestSetup): Promise<void> {
  await act(async () => {
    await testSetup.renderer.destroy();
  });
}

export async function pause(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

export async function renderFrame(testSetup: TestSetup): Promise<string> {
  await act(async () => {
    await testSetup.renderOnce();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await testSetup.renderOnce();
  });

  return testSetup.captureCharFrame();
}

export function emitKey(testSetup: TestSetup, name: string, sequence: string): void {
  const shift =
    sequence.length === 1 &&
    sequence.toLowerCase() !== sequence &&
    sequence.toUpperCase() === sequence;

  act(() => {
    testSetup.renderer.keyInput.emit(
      "keypress",
      new KeyEvent({
        name,
        sequence,
        ctrl: false,
        shift,
        meta: false,
        option: false,
        eventType: "press",
        repeated: false,
        number: false,
        raw: sequence,
        source: "raw",
      }),
    );
  });
}

export async function pressKey(
  testSetup: TestSetup,
  name: string,
  sequence: string = name,
): Promise<void> {
  emitKey(testSetup, name, sequence);
  await pause(50);
}

export function getScrollbox(testSetup: TestSetup): ScrollBoxRenderable | undefined {
  return testSetup.renderer.root.findDescendantById("markdown-reader-scrollbox") as
    | ScrollBoxRenderable
    | undefined;
}

export async function emitSelection(
  testSetup: TestSetup,
  selection: Pick<Selection, "getSelectedText">,
) {
  await act(async () => {
    testSetup.renderer.emit("selection", selection as Selection);
  });
}

export function getAllSpans(testSetup: TestSetup): CapturedSpan[] {
  return testSetup.captureSpans().lines.flatMap((line: CapturedLine) => line.spans);
}

export function findSpanByText(testSetup: TestSetup, text: string): CapturedSpan | undefined {
  return getAllSpans(testSetup).find((span: CapturedSpan) => span.text === text);
}

export function findSpansByText(testSetup: TestSetup, text: string): CapturedSpan[] {
  return getAllSpans(testSetup).filter((span: CapturedSpan) => span.text === text);
}

export function findSpanContainingText(
  testSetup: TestSetup,
  text: string,
): CapturedSpan | undefined {
  return getAllSpans(testSetup).find((span: CapturedSpan) => span.text.includes(text));
}

export function findSpanOnLine(
  testSetup: TestSetup,
  lineMatcher: RegExp | string,
  spanText: string,
): CapturedSpan | undefined {
  const matches =
    typeof lineMatcher === "string"
      ? (lineText: string) => lineText.includes(lineMatcher)
      : (lineText: string) => lineMatcher.test(lineText);

  for (const line of testSetup.captureSpans().lines) {
    const lineText = line.spans.map((span) => span.text).join("");

    if (!matches(lineText)) {
      continue;
    }

    const span = line.spans.find((candidate) => candidate.text === spanText);

    if (span) {
      return span;
    }
  }

  return undefined;
}

export function rgb(span: CapturedSpan | undefined): number[] | undefined {
  return span?.fg?.toInts().slice(0, 3);
}

export function selectionWithText(text: string): Pick<Selection, "getSelectedText"> {
  return {
    getSelectedText: () => text,
  };
}

import { getDataPaths } from "@opentui/core";
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

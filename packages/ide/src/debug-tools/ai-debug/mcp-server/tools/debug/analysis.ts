/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpServerDependencies } from "../../types/mcp-dependencies";
import {
  toolResult,
  toolError,
  formatError,
  noSession,
} from "../../utils/response-helpers";
import * as fs from "fs";

/**
 * Searches a single file for lines matching the given regex and appends
 * results to the matches array, up to maxResults.
 */
function searchFile(
  filePath: string,
  regex: RegExp,
  matches: Array<{ file: string; line: number; text: string }>,
  maxResults: number,
) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        matches.push({
          file: filePath,
          line: i + 1,
          text: lines[i].trim(),
        });
        regex.lastIndex = 0;

        if (matches.length >= maxResults) break;
      }
    }
  } catch {
    // Skip files that cannot be read
  }
}

/**
 * Registers analysis and inspection tools with the MCP server.
 *
 * Tools registered:
 * - debug_get_context: Get backtrace, registers, and local variables
 * - debug_analyze_fault: Analyze ARM Cortex-M or RISC-V fault state
 * - debug_search_source: Search workspace source files for a pattern
 */
export function registerAnalysisTools(
  server: McpServer,
  deps: McpServerDependencies,
): void {
  const { debugManager } = deps;

  server.registerTool(
    "debug_get_context",
    {
      title: "Get Debug Context",
      description:
        "Get comprehensive debug context including backtrace, registers, and local variables",
    },
    async () => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const backtrace = await session.evaluateREPL("backtrace");
        const registers = await session.evaluateREPL("info registers");
        const locals = await session.evaluateREPL("info locals");

        return toolResult({ backtrace, registers, locals });
      } catch (error) {
        return toolError("debug_get_context", error);
      }
    },
  );

  server.registerTool(
    "debug_analyze_fault",
    {
      title: "Analyze Fault",
      description:
        "Analyze the current fault state of the target processor. " +
        "Reads fault status registers, captures the stack frame, and provides a structured diagnosis. " +
        "Works with ARM Cortex-M (HardFault, MemManage, BusFault, UsageFault) and RISC-V (mcause, mtval).",
      inputSchema: {
        architecture: z
          .enum(["arm", "riscv"])
          .describe("Target processor architecture"),
      },
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const architecture = params.architecture as "arm" | "riscv";
        const commands =
          architecture === "arm"
            ? [
                "info registers",
                "x/1xw 0xE000ED28", // CFSR
                "x/1xw 0xE000ED2C", // HFSR
                "x/1xw 0xE000ED34", // BFAR
                "x/1xw 0xE000ED38", // MMFAR
                "bt full",
              ]
            : [
                "info registers",
                "p/x $mcause",
                "p/x $mtval",
                "p/x $mepc",
                "p/x $mstatus",
                "bt full",
              ];

        const results: Array<{
          cmd: string;
          output?: string;
          error?: string;
        }> = [];

        for (const cmd of commands) {
          try {
            const output = await session.evaluateREPL(cmd);
            results.push({ cmd, output });
          } catch (e) {
            results.push({
              cmd,
              error: formatError(e),
            });
          }
        }

        return toolResult({ architecture, faultAnalysis: results });
      } catch (error) {
        return toolError("debug_analyze_fault", error);
      }
    },
  );

  server.registerTool(
    "debug_search_source",
    {
      title: "Search Source Code",
      description:
        "Search workspace source files (.c, .h, .cpp, .S) for a text pattern " +
        "or symbol name. Returns matching file paths and line numbers. " +
        "Use this to find where a function, variable, or code pattern is " +
        "defined so you can set breakpoints at the right location.",
      inputSchema: {
        pattern: z
          .string()
          .describe(
            "Text or regex pattern to search for " +
              "(e.g. 'LED_On', 'GPIO_Set', 'MXC_GPIO_OutSet')",
          ),
        fileGlob: z
          .string()
          .default("**/*.{c,h,cpp,hpp,S,s}")
          .describe(
            "Glob pattern for files to search (default '**/*.{c,h,cpp,hpp,S,s}')",
          ),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Maximum number of matches to return (default 20)"),
      },
    },
    async (params) => {
      try {
        const pattern = params.pattern as string;
        const fileGlob = params.fileGlob as string;
        const maxResults = params.maxResults as number;

        const filePaths = await deps.workspaceFileSearch.findFiles(fileGlob);

        if (filePaths.length === 0) {
          return toolResult("No source files found matching the glob pattern");
        }

        const regex = new RegExp(pattern, "gi");
        const matches: Array<{
          file: string;
          line: number;
          text: string;
        }> = [];

        for (const filePath of filePaths) {
          if (matches.length >= maxResults) break;
          searchFile(filePath, regex, matches, maxResults);
        }

        if (matches.length === 0) {
          return toolResult(
            `No matches found for "${pattern}" in source files`,
          );
        }

        return toolResult(matches);
      } catch (error) {
        return toolError("debug_search_source", error);
      }
    },
  );
}

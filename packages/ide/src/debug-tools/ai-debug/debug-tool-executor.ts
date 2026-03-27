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

import * as vscode from "vscode";
import { CfsDebugManager, CfsDebugSession } from "../debug-manager";

/**
 * DebugToolExecutor provides debug tool execution using CfsDebugManager.
 * It wraps DAP requests and GDB commands in a simple, unified interface.
 */
export class DebugToolExecutor {
  constructor(private debugManager: CfsDebugManager) {}

  /**
   * Gets the active debug session, throwing if none exists.
   */
  private getSession(): CfsDebugSession {
    const session = this.debugManager.getActiveSession();
    if (!session) {
      throw new Error("No active debug session");
    }
    return session;
  }

  /**
   * Gets the primary thread ID from the active session.
   */
  private async getThreadId(): Promise<number> {
    const session = this.getSession();
    const threads = await session.vscodeSession.customRequest("threads");
    const threadId = threads.threads[0]?.id;
    if (!threadId) {
      throw new Error("No active thread");
    }
    return threadId;
  }
  /**
   * Executes multiple tools and collects results.
   */
  public async executeTools(
    tools: Array<{ name: string; args?: any }>,
    token: vscode.CancellationToken,
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const tool of tools) {
      if (token.isCancellationRequested) {
        break;
      }

      try {
        results[tool.name] = await this.executeTool(tool.name, tool.args);
      } catch (error) {
        results[tool.name] = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return results;
  }

  private async executeTool(name: string, args?: any): Promise<any> {
    switch (name) {
      case "get_debug_status":
        return this.getDebugStatus();

      case "get_variables":
        return this.getVariables(args?.frameId);

      case "get_stack_trace":
        return this.getStackTrace(args?.threadId);

      case "get_breakpoints":
        return this.getBreakpoints();

      case "get_registers":
        return this.getRegisters();

      case "get_memory":
        return this.getMemory(args.address, args.count);

      case "evaluate_expression":
        return this.evaluateExpression(args.expression, args.frameId);

      case "execute_gdb_command":
        return this.executeGdbCommand(args.command);

      case "step_over":
        await this.getSession().stepOver();
        return { message: "Stepped over" };

      case "step_into":
        await this.getSession().stepInto();
        return { message: "Stepped into" };

      case "step_out":
        await this.getSession().stepOut();
        return { message: "Stepped out" };

      case "continue_execution":
        await this.getSession().continue();
        return { message: "Execution continued" };

      case "pause_execution":
        await this.getSession().pause();
        return { message: "Execution paused" };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // === Debug Status ===
  private getDebugStatus(): any {
    const session = vscode.debug.activeDebugSession;
    return {
      isDebugging: !!session,
      sessionName: session?.name || null,
      sessionType: session?.type || null,
      workspaceFolder: session?.workspaceFolder?.name || null,
    };
  }

  // === Variables ===
  private async getVariables(frameId?: number): Promise<any> {
    const session = this.getSession();
    const threadId = await this.getThreadId();

    // Get stack trace to find frame
    const stackResponse = await session.vscodeSession.customRequest(
      "stackTrace",
      { threadId },
    );
    const frame = frameId
      ? stackResponse.stackFrames.find((f: any) => f.id === frameId)
      : stackResponse.stackFrames[0];

    if (!frame) {
      throw new Error("No stack frame available");
    }

    // Get scopes for the frame
    const scopesResponse = await session.vscodeSession.customRequest("scopes", {
      frameId: frame.id,
    });

    const scopes: any[] = [];
    for (const scope of scopesResponse.scopes) {
      const variablesResponse = await session.vscodeSession.customRequest(
        "variables",
        { variablesReference: scope.variablesReference },
      );
      scopes.push({
        scope: scope.name,
        variables: variablesResponse.variables.map((v: any) => ({
          name: v.name,
          value: v.value,
          type: v.type,
        })),
      });
    }

    return { frameId: frame.id, scopes };
  }

  // === Stack Trace ===
  private async getStackTrace(threadId?: number): Promise<any> {
    const session = this.getSession();
    const tid = threadId ?? (await this.getThreadId());

    const response = await session.vscodeSession.customRequest("stackTrace", {
      threadId: tid,
    });

    return {
      threadId: tid,
      stackFrames: response.stackFrames.map((frame: any) => ({
        id: frame.id,
        name: frame.name,
        source: frame.source,
        line: frame.line,
        column: frame.column,
      })),
    };
  }

  // === Breakpoints ===
  private getBreakpoints(): any {
    const breakpoints = vscode.debug.breakpoints;
    return {
      breakpoints: breakpoints.map((bp) => {
        if (bp instanceof vscode.SourceBreakpoint) {
          return {
            type: "source",
            enabled: bp.enabled,
            file: bp.location.uri.fsPath,
            line: bp.location.range.start.line + 1,
            condition: bp.condition,
            hitCondition: bp.hitCondition,
            logMessage: bp.logMessage,
          };
        } else if (bp instanceof vscode.FunctionBreakpoint) {
          return {
            type: "function",
            enabled: bp.enabled,
            functionName: bp.functionName,
            condition: bp.condition,
            hitCondition: bp.hitCondition,
          };
        }
        return { type: "unknown", enabled: bp.enabled };
      }),
    };
  }

  // === Registers (via GDB) ===
  private async getRegisters(): Promise<any> {
    const session = this.getSession();
    const result = await session.evaluateREPL("-data-list-register-values x");
    return { response: result };
  }

  // === Memory ===
  private async getMemory(address: string, count: number): Promise<any> {
    const session = this.getSession();

    try {
      // Prefer DAP readMemory (more reliable)
      const memoryData = await session.readMemory(address, count);
      return {
        address: `0x${memoryData.address.toString(16)}`,
        data: this.formatMemoryDump(memoryData.data, memoryData.address),
      };
    } catch {
      // Fall back to GDB command
      const result = await session.evaluateREPL(
        `-data-read-memory ${address} x 1 1 ${count}`,
      );
      return { response: result };
    }
  }

  /**
   * Formats a memory buffer as a hex dump with ASCII representation.
   */
  private formatMemoryDump(data: Buffer, startAddress: number): string {
    const lines: string[] = [];
    const bytesPerLine = 16;

    for (let i = 0; i < data.length; i += bytesPerLine) {
      const addr = (startAddress + i).toString(16).padStart(8, "0");
      const bytes = data.slice(i, i + bytesPerLine);

      // Hex representation
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");

      // ASCII representation
      const ascii = Array.from(bytes)
        .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
        .join("");

      lines.push(`${addr}: ${hex.padEnd(48)} ${ascii}`);
    }

    return lines.join("\n");
  }

  // === Expression Evaluation ===
  private async evaluateExpression(
    expression: string,
    frameId?: number,
  ): Promise<any> {
    const session = this.getSession();

    const response = await session.vscodeSession.customRequest("evaluate", {
      expression,
      frameId,
      context: "watch",
    });

    return {
      expression,
      result: response.result,
      type: response.type,
      variablesReference: response.variablesReference,
    };
  }

  // === GDB Command Execution ===
  /**
   * Executes an arbitrary GDB/MI command via the REPL.
   * Use with caution - allows direct debugger control.
   */
  public async executeGdbCommand(command: string): Promise<any> {
    const session = this.getSession();

    // Basic safety: block commands that could cause issues
    const dangerous = [
      "quit",
      "q",
      "detach",
      "kill",
      "file",
      "exec-file",
      "target",
    ];
    const cmdLower = command.toLowerCase().trim();
    if (dangerous.some((d) => cmdLower.startsWith(d))) {
      throw new Error(
        `Command "${command.split(" ")[0]}" is not allowed for safety`,
      );
    }

    const result = await session.evaluateREPL(command);
    return { command, result };
  }
}

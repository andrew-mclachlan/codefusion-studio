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

/**
 * Shared response helpers for MCP tool handlers.
 */

/**
 * Extract a human-readable message from an unknown thrown value.
 */
export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Tool response helpers

/**
 * Build a text success result for a tool handler.
 *
 * Accepts a string or an object. Objects are serialized
 * to pretty-printed JSON automatically.
 *
 * @example
 * return toolResult("Stepped over");
 * return toolResult({ state: "halted", stopInfo });
 */
export function toolResult(data: string | Record<string, unknown> | unknown[]) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  return {
    content: [{ type: "text" as const, text }],
  };
}

/**
 * Build an error result for a tool handler.
 *
 * - One arg:  known error message, no logging.
 * - Two args: catch-block usage — logs the error and formats the message.
 *
 * @example
 * // Known condition (no logging)
 * return toolError("Command not allowed");
 *
 * // Catch block (logs to console)
 * return toolError("debug_continue", error);
 */
export function toolError(message: string, error?: unknown) {
  if (error !== undefined) {
    const formatted = formatError(error);
    console.error(`CFS MCP [${message}]: ${formatted}`);

    return {
      content: [{ type: "text" as const, text: `Error: ${formatted}` }],
      isError: true as const,
    };
  }

  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

/**
 * Returns an error result when no debug session is active.
 * Shared by every debug tool that requires an active session.
 */
export function noSession() {
  return toolError("No active debug session");
}

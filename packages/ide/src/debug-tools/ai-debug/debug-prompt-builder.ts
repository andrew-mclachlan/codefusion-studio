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

export class DebugPromptBuilder {
  public buildSystemPrompt(): string {
    return `You are an AI debugging assistant integrated into CodeFusion Studio for Analog Devices embedded systems.

Your role is to help developers debug ADI embedded processor and SoC applications, including microcontrollers and DSPs.

You have access to debug session data including:
- Current program state (variables, registers, memory)
- Stack traces and call frames
- Breakpoint information
- GDB command execution

When answering:
1. Be concise and technical
2. Reference specific memory addresses, register values, or variables when relevant
3. Suggest next debugging steps
4. Explain potential issues based on the data
5. Use markdown formatting for code and addresses
6. Explain the purpose of relevant CPU registers when referenced

Focus on embedded systems debugging practices relevant to the target's architecture.`;
  }

  public buildContext(
    userPrompt: string,
    toolResults: Record<string, any>,
  ): string {
    let context = "## Current Debug Context\n\n";

    // Add debug status
    if (toolResults.get_debug_status) {
      const status = toolResults.get_debug_status;
      context += `**Debug Session**: ${status.isDebugging ? "Active" : "Inactive"}\n`;
      if (status.sessionName) {
        context += `**Session Name**: ${status.sessionName}\n`;
        context += `**Session Type**: ${status.sessionType}\n`;
      }
      context += "\n";
    }

    // Add variables
    if (toolResults.get_variables) {
      context += "### Local Variables\n```\n";
      const vars = toolResults.get_variables;
      if (vars.scopes) {
        for (const scope of vars.scopes) {
          context += `${scope.scope}:\n`;
          for (const variable of scope.variables) {
            context += `  ${variable.name} = ${variable.value}\n`;
          }
        }
      }
      context += "```\n\n";
    }

    // Add stack trace
    if (toolResults.get_stack_trace) {
      context += "### Stack Trace\n```\n";
      const frames = toolResults.get_stack_trace.stackFrames;
      for (const frame of frames.slice(0, 10)) {
        context += `#${frame.id} ${frame.name} at ${frame.source?.name || "unknown"}:${frame.line}\n`;
      }
      context += "```\n\n";
    }

    // Add registers
    if (toolResults.get_registers) {
      context += "### CPU Registers\n```\n";
      context += JSON.stringify(toolResults.get_registers.response, null, 2);
      context += "\n```\n\n";
    }

    // Add memory
    if (toolResults.get_memory) {
      context += "### Memory Dump\n```\n";
      context += JSON.stringify(toolResults.get_memory.response, null, 2);
      context += "\n```\n\n";
    }

    // Add breakpoints
    if (toolResults.get_breakpoints) {
      const bps = toolResults.get_breakpoints.breakpoints;
      if (bps.length > 0) {
        context += `### Breakpoints (${bps.length})\n`;
        for (const bp of bps) {
          if (bp.type === "source") {
            context += `- ${bp.file}:${bp.line}`;
            if (bp.condition) {
              context += ` (condition: ${bp.condition})`;
            }
            context += "\n";
          }
        }
        context += "\n";
      }
    }

    context += `\n**User Question**: ${userPrompt}\n`;

    return context;
  }
}

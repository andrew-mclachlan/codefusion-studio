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

export interface DebugConfig {
  name: string;
  workspaceFolder: vscode.WorkspaceFolder;
}

/**
 * Handles debug lifecycle commands (start, stop, restart, step, continue).
 */
export class LifecycleHandler {
  /**
   * Handles debug lifecycle commands.
   * @returns true if the command was handled, false otherwise
   */
  async handle(
    prompt: string,
    stream: vscode.ChatResponseStream,
    showHelp: () => void,
  ): Promise<boolean> {
    const lowerPrompt = prompt.toLowerCase();

    // Check for help command first
    if (
      lowerPrompt === "help" ||
      lowerPrompt.includes("help me") ||
      lowerPrompt.includes("what can you do") ||
      lowerPrompt.includes("list commands") ||
      lowerPrompt.includes("show commands")
    ) {
      showHelp();
      return true;
    }

    // Check for start debug intent
    if (
      lowerPrompt.includes("start debug") ||
      lowerPrompt.includes("begin debug") ||
      lowerPrompt.includes("launch debug") ||
      (lowerPrompt.includes("debug") &&
        (lowerPrompt.includes("start") || lowerPrompt.includes("begin")))
    ) {
      await this.handleStart(prompt, stream);
      return true;
    }

    // Check for stop debug intent
    if (
      lowerPrompt.includes("stop debug") ||
      lowerPrompt.includes("end debug") ||
      lowerPrompt.includes("terminate debug") ||
      lowerPrompt === "stop"
    ) {
      if (vscode.debug.activeDebugSession) {
        await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
        stream.markdown("✓ Debug session stopped\n");
      } else {
        stream.markdown("⚠️ No active debug session to stop\n");
      }
      return true;
    }

    // Check for restart debug intent
    if (
      lowerPrompt.includes("restart") ||
      lowerPrompt.includes("relaunch") ||
      lowerPrompt.includes("re-run")
    ) {
      if (vscode.debug.activeDebugSession) {
        await vscode.commands.executeCommand("workbench.action.debug.restart");
        stream.markdown("✓ Debug session restarted\n");
      } else {
        stream.markdown("⚠️ No active debug session to restart\n");
      }
      return true;
    }

    // Check for continue/resume intent
    if (
      lowerPrompt.includes("continue") ||
      lowerPrompt.includes("resume") ||
      lowerPrompt === "c" ||
      (lowerPrompt.includes("keep") && lowerPrompt.includes("going"))
    ) {
      if (vscode.debug.activeDebugSession) {
        await vscode.commands.executeCommand("workbench.action.debug.continue");
        stream.markdown("✓ Continuing execution\n");
      } else {
        stream.markdown("⚠️ No active debug session\n");
      }
      return true;
    }

    // Check for step over intent
    if (
      lowerPrompt.includes("step over") ||
      lowerPrompt.includes("next") ||
      (lowerPrompt.includes("step") &&
        !lowerPrompt.includes("into") &&
        !lowerPrompt.includes("out"))
    ) {
      if (vscode.debug.activeDebugSession) {
        await vscode.commands.executeCommand("workbench.action.debug.stepOver");
        stream.markdown("✓ Stepped over\n");
      } else {
        stream.markdown("⚠️ No active debug session\n");
      }
      return true;
    }

    // Check for step into intent
    if (lowerPrompt.includes("step into") || lowerPrompt.includes("step in")) {
      if (vscode.debug.activeDebugSession) {
        await vscode.commands.executeCommand("workbench.action.debug.stepInto");
        stream.markdown("✓ Stepped into\n");
      } else {
        stream.markdown("⚠️ No active debug session\n");
      }
      return true;
    }

    // Check for step out intent
    if (
      lowerPrompt.includes("step out") ||
      lowerPrompt.includes("finish") ||
      lowerPrompt.includes("return")
    ) {
      if (vscode.debug.activeDebugSession) {
        await vscode.commands.executeCommand("workbench.action.debug.stepOut");
        stream.markdown("✓ Stepped out\n");
      } else {
        stream.markdown("⚠️ No active debug session\n");
      }
      return true;
    }

    // Check for pause intent
    if (
      lowerPrompt.includes("pause") ||
      lowerPrompt.includes("break now") ||
      lowerPrompt.includes("halt")
    ) {
      if (vscode.debug.activeDebugSession) {
        await vscode.commands.executeCommand("workbench.action.debug.pause");
        stream.markdown("✓ Execution paused\n");
      } else {
        stream.markdown("⚠️ No active debug session\n");
      }
      return true;
    }

    return false;
  }

  /**
   * Handles starting a debug session.
   */
  private async handleStart(
    prompt: string,
    stream: vscode.ChatResponseStream,
  ): Promise<void> {
    stream.markdown("🔍 Looking for debug configurations...\n");

    const configs = this.getConfigurations();

    if (configs.length === 0) {
      stream.markdown(
        "❌ No debug configurations found. Please create a launch.json file.\n",
      );
      return;
    }

    stream.markdown(`Found ${configs.length} debug configuration(s).\n`);

    // Try to extract configuration name from prompt
    const selectedConfig = this.matchConfiguration(prompt, configs);

    if (selectedConfig) {
      stream.markdown(`✓ Matched configuration: **${selectedConfig.name}**\n`);
      stream.markdown(`Starting debug session...\n`);
      const success = await vscode.debug.startDebugging(
        selectedConfig.workspaceFolder,
        selectedConfig.name,
      );

      if (success) {
        stream.markdown("✓ Debug session started successfully\n");
      } else {
        stream.markdown("❌ Failed to start debug session\n");
      }
    } else {
      stream.markdown(
        "⚠️ Could not match a configuration from your request.\n\n",
      );
      stream.markdown("Available debug configurations:\n\n");
      this.showConfigList(stream, configs);
    }
  }

  /**
   * Matches a configuration from user prompt.
   */
  private matchConfiguration(
    prompt: string,
    configs: DebugConfig[],
  ): DebugConfig | null {
    const lowerPrompt = prompt.toLowerCase();

    const normalizeText = (text: string) =>
      text
        .toLowerCase()
        .replace(/start|debug|begin|launch|debugging|session/gi, "")
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const normalizedPrompt = normalizeText(lowerPrompt);

    for (const config of configs) {
      const configNameLower = config.name.toLowerCase();
      const normalizedConfigName = normalizeText(config.name);

      // Check for exact substring match first
      if (lowerPrompt.includes(configNameLower)) {
        return config;
      }

      // Check if normalized prompt contains normalized config name
      if (
        normalizedPrompt.includes(normalizedConfigName) ||
        normalizedConfigName.includes(normalizedPrompt)
      ) {
        return config;
      }

      // Fuzzy match by words
      const configWords = normalizedConfigName
        .split(" ")
        .filter((w) => w.length > 2);
      const promptWords = normalizedPrompt
        .split(" ")
        .filter((w) => w.length > 2);

      if (configWords.length > 0) {
        const matchingWords = configWords.filter((word) =>
          promptWords.includes(word),
        );
        if (matchingWords.length / configWords.length > 0.6) {
          return config;
        }
      }
    }

    return null;
  }

  /**
   * Gets all debug configurations from workspace.
   */
  getConfigurations(): DebugConfig[] {
    const configs: DebugConfig[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return configs;
    }

    for (const folder of workspaceFolders) {
      const launchConfig = vscode.workspace.getConfiguration("launch", folder);
      const configurations = launchConfig.get<any[]>("configurations", []);

      for (const config of configurations) {
        configs.push({
          name: config.name,
          workspaceFolder: folder,
        });
      }
    }

    return configs;
  }

  /**
   * Shows list of available configurations.
   */
  showConfigList(
    stream: vscode.ChatResponseStream,
    configs?: DebugConfig[],
  ): void {
    const configList = configs || this.getConfigurations();

    if (configList.length === 0) {
      return;
    }

    configList.forEach((config, index) => {
      stream.markdown(`${index + 1}. ${config.name}\n`);
    });
    stream.markdown('\nSay "start debugging <config name>" to begin.\n');
  }
}

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

export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference?: number;
}

export interface StackFrame {
  name: string;
  source?: string;
  line?: number;
  column?: number;
}

export interface Breakpoint {
  id?: number;
  verified: boolean;
  source?: string;
  line?: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}

export interface DebugChatContext {
  sessionActive: boolean;
  sessionName?: string;
  sessionType?: string;
  currentFile?: string;
  currentLine?: number;
  variables?: Variable[];
  stackTrace?: StackFrame[];
  breakpoints?: Breakpoint[];
}

export interface ChatToolResult {
  tool: string;
  success: boolean;
  data?: any;
  error?: string;
}

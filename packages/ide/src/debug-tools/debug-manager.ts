/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

/**
 * Represents data on memory
 */
export interface MemoryData {
  /** The memory address where the data was read from */
  address: number;
  /** The data buffer containing the memory contents */
  data: Buffer;
}

/**
 * Information about why and how the debug target stopped,
 * sourced from the DAP 'stopped' event.
 */
export interface StopInfo {
  /** Why the target stopped (e.g. 'breakpoint', 'step', 'pause', 'exception', 'entry') */
  readonly reason: string;
  /** IDs of breakpoints that were hit, if applicable */
  readonly hitBreakpointIds?: number[];
  /** The thread that triggered the stop */
  readonly threadId?: number;
  /** Human-readable description from the debug adapter */
  readonly description?: string;
}

/**
 * Execution state of a debug session.
 */
export type ExecutionState = "running" | "halted" | "no-session";

/**
 * Provides a higher level interface than vscode.debug namespace
 * This is achieved mainly by providing CfsDebugSession instances
 * that wraps DAP messages with functions and events.
 *
 * For functionality already provided by vscode.debug,
 * such as vscode.debug.onDidChangeActiveDebugSession or
 * vscode.debug.onDidTerminateDebugSession use those APIs directly.
 */
export class CfsDebugManager {
  private readonly onStartSessionEmitter =
    new vscode.EventEmitter<CfsDebugSession>();
  /** Event that fires when a new debug session starts.
   * This is equivalent to vscode.debug.onDidStartDebugSession,
   * but provides CfsDebugSession instances instead of vscode.DebugSession.
   */
  readonly onStartSession = this.onStartSessionEmitter.event;

  private disposables: vscode.Disposable[] = [];
  private sessions: Map<string, CfsDebugSession> = new Map();

  constructor() {
    this.disposables.push(
      vscode.debug.registerDebugAdapterTrackerFactory("*", {
        createDebugAdapterTracker: (session) => {
          const newSession = new CfsDebugSession(session);
          this.onStartSessionEmitter.fire(newSession);
          this.sessions.set(session.id, newSession);
          newSession.onStop(() => {
            this.sessions.delete(session.id);
          });
          return newSession;
        },
      }),
    );
  }

  /**
   * Retrieves the currently active debug session.
   * Equivalent to vscode.debug.activeDebugSession,
   * but returns a CfsDebugSession instance instead of vscode.DebugSession.
   * @returns The active CfsDebugSession if one exists, undefined otherwise
   */
  public getActiveSession(): CfsDebugSession | undefined {
    const session = vscode.debug.activeDebugSession;
    return session ? this.sessions.get(session.id) : undefined;
  }

  /**
   * Retrieves a specific CfsDebugSession by its ID.
   * @param sessionId - The unique identifier of the debug session
   * @returns The CfsDebugSession with the specified ID if it exists, undefined otherwise
   */
  public getSession(sessionId: string): CfsDebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}

/**
 * Represents a single debug session within the CodeFusion Studio IDE.
 * It offers methods and events to interact with the debug adapter at a
 * higher level than the raw DAP messages.
 */
export class CfsDebugSession implements vscode.DebugAdapterTracker {
  private readonly onStartEmitter = new vscode.EventEmitter<void>();
  /** Event that fires when the debug session starts */
  readonly onStart = this.onStartEmitter.event;

  private readonly onStopEmitter = new vscode.EventEmitter<void>();
  /** Event that fires when the debug session stops */
  readonly onStop = this.onStopEmitter.event;

  private readonly onContinueEmitter = new vscode.EventEmitter<void>();
  /** Event that fires when the debugged program continues execution */
  readonly onContinue = this.onContinueEmitter.event;

  private readonly onHaltEmitter = new vscode.EventEmitter<StopInfo>();
  /** Event that fires when the debugged program halts execution.
   * This may be due to hitting a breakpoint, stepping, pausing, etc.
   * The event payload contains stop information from DAP.
   */
  readonly onHalt = this.onHaltEmitter.event;

  /** The underlying vscode.DebugSession */
  vscodeSession: vscode.DebugSession;

  private running: boolean = false;
  private stopInfo: StopInfo | undefined = undefined;
  private evaluateOutputBuffer: string | undefined = undefined;

  /**
   * Whether the debugged program is currently executing.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Information about the last stop, if available.
   */
  get lastStopInfo(): StopInfo | undefined {
    return this.stopInfo;
  }
  private evaluateMutex: Promise<string> = Promise.resolve("");

  /**
   * Creates a new CfsDebugSession instance.
   * @param session - The VS Code debug session to wrap
   *
   * This method should not be used to create instances directly.
   * Use CfsDebugManager to obtain CfsDebugSession instances.
   */
  constructor(session: vscode.DebugSession) {
    this.vscodeSession = session;
  }

  /**
   * Evaluates an expression in the context of the debug session.
   * @param expression - The expression to evaluate
   * @returns A promise that resolves to the evaluation result as a string
   */
  async evaluateREPL(expression: string): Promise<string> {
    // This implementation is just a mutex wrapper around evaluateREPL_Internal
    // to prevent concurrent calls that would mix up output events.
    const result = this.evaluateMutex.then(() =>
      this.evaluateREPL_Internal(expression),
    );
    this.evaluateMutex = result.then(() => "");
    return result;
  }

  /**
   * This method is unsafe to be used concurrently, as it relies on
   * shared console output events from debug adapter.
   */
  private async evaluateREPL_Internal(expression: string): Promise<string> {
    this.evaluateOutputBuffer = "";
    await this.vscodeSession.customRequest("evaluate", {
      expression: expression,
      context: "repl",
    });
    const result = this.evaluateOutputBuffer;
    this.evaluateOutputBuffer = undefined;

    return result;
  }

  /**
   * Reads memory from the debugged program using a memory reference.
   * This is equivalent to the DAP 'readMemory' request.
   * @param reference - Memory reference, as provided to readMemory DAP request,
   *                    or a numeric value representing an address
   * @param count - The number of bytes to read
   * @param offset - Optional offset from the reference address
   * @returns A promise that resolves to the memory data (address and buffer)
   */
  async readMemory(
    reference: string | number,
    count: number,
    offset?: number,
  ): Promise<MemoryData> {
    if (typeof reference === "number") {
      reference = `0x${reference.toString(16)}`;
    }

    const response = await this.vscodeSession.customRequest("readMemory", {
      memoryReference: reference,
      count: count,
      offset: offset,
    });

    return {
      address: parseInt(response.address),
      data: Buffer.from(response.data, "base64"),
    };
  }

  /**
   * Writes data to memory in the debugged program using a memory reference.
   * @param reference - Memory reference, as provided to writeMemory DAP request,
   *                    or a numeric value representing an address
   * @param data - The buffer containing data to write
   * @param offset - Optional offset from the reference address
   * @returns A promise that resolves when the write operation completes
   */
  async writeMemory(
    reference: string | number,
    data: Buffer,
    offset?: number,
  ): Promise<void> {
    if (typeof reference === "number") {
      reference = `0x${reference.toString(16)}`;
    }
    await this.vscodeSession.customRequest("writeMemory", {
      memoryReference: reference,
      data: data.toString("base64"),
      offset: offset,
    });
  }

  /**
   * Gets the primary thread ID from the debug session.
   * @returns A promise that resolves to the thread ID
   */
  async getThreadId(): Promise<number> {
    const threads = await this.vscodeSession.customRequest("threads");
    const threadId = threads.threads[0]?.id;
    if (!threadId) {
      throw new Error("No active thread");
    }
    return threadId;
  }

  /**
   * Continues execution of the debugged program.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the continue request is sent
   */
  async continue(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("continue", { threadId: tid });
  }

  /**
   * Steps over the current line of code.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the step over request is sent
   */
  async stepOver(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("next", { threadId: tid });
  }

  /**
   * Steps into the current line of code.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the step into request is sent
   */
  async stepInto(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("stepIn", { threadId: tid });
  }

  /**
   * Steps out of the current function.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the step out request is sent
   */
  async stepOut(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("stepOut", { threadId: tid });
  }

  /**
   * Pauses execution of the debugged program.
   * @param threadId - Optional thread ID, defaults to primary thread
   * @returns A promise that resolves when the pause request is sent
   */
  async pause(threadId?: number): Promise<void> {
    const tid = threadId ?? (await this.getThreadId());
    await this.vscodeSession.customRequest("pause", { threadId: tid });
  }

  // Debug Adapter Tracker methods
  /**
   * Called by VS Code when the debug session is about to start.
   */
  onWillStartSession(): void {
    this.onStartEmitter.fire();
  }

  /**
   * Called by VS Code when the debug session is about to stop.
   */
  onWillStopSession(): void {
    this.onStopEmitter.fire();
  }

  /**
   * Called by VS Code when the debug adapter sends a message.
   * @param message - The message sent by the debug adapter
   */
  onDidSendMessage(message: any) {
    switch (message.type) {
      case "event":
        this.onDebugAdapterEvent(message);
        break;
      case "response":
        if (message.success === true) {
          this.onDebugAdapterResponse(message);
        }
        break;
    }
  }

  // Debug Adapter processing convenience methods
  onDebugAdapterEvent(message: any) {
    switch (message.event) {
      case "output":
        // Capture console output for evaluateREPL responses.
        // this.evaluateOutputBuffer !== undefined indicates
        // an ongoing execution of evaluateREPL.
        //
        // Mixing of outputs from concurrent evaluateREPL calls
        // is prevented by the mutex in evaluateREPL method,
        // although this can potentially be problematic
        // if output events of category console are triggered
        // by other means while an evaluateREPL is ongoing.
        if (
          message.body?.category === "console" &&
          this.evaluateOutputBuffer !== undefined
        ) {
          this.evaluateOutputBuffer += message.body.output;
        }
        break;
      case "continued":
        this.processContinue();
        break;
      case "stopped":
        this.processHalt({
          reason: message.body?.reason ?? "unknown",
          hitBreakpointIds: message.body?.hitBreakpointIds,
          threadId: message.body?.threadId,
          description: message.body?.description,
        });
        break;
    }
  }

  onDebugAdapterResponse(message: any) {
    switch (message.command) {
      case "launch":
      case "attach":
      case "continue":
      case "next":
      case "stepIn":
      case "stepOut":
        this.processContinue();
        break;
      case "pause":
        this.processHalt({ reason: "pause" });
        break;
    }
  }

  /**
   * Processes a continue operation, updating the running state and firing the continue event.
   * Prevents duplicate events if the session is already marked as running.
   * Note: Some debug adapters incorrectly send continued events as responses to continue requests,
   * which violates the DAP spec, so we guard against duplicate state changes.
   */
  private processContinue() {
    // This should not be necessary if DAP follows spec and do not
    // send continued events as response to continue requests, but
    // some debug adapters do that.
    if (!this.running) {
      this.running = true;
      this.onContinueEmitter.fire();
    }
  }

  /**
   * Processes a halt operation, updating the running state and firing the halt event.
   * Only fires the event if the session was previously running.
   */
  private processHalt(stopInfo?: StopInfo) {
    if (this.running) {
      this.running = false;
      const info = stopInfo ?? { reason: "unknown" };
      this.stopInfo = info;
      this.onHaltEmitter.fire(info);
    }
  }
}

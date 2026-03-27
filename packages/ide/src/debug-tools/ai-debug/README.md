# AI Debug

This directory contains the AI-assisted debugging features for CodeFusion Studio, including the `@cfs-debug` chat participant and the MCP (Model Context Protocol) debug server.

## Overview

AI Debug provides two interfaces to the same debugging functionality:

1. **Chat Participant** (`@cfs-debug`) — Natural language debugging within VS Code's Copilot Chat
2. **MCP Server** — Exposes debug tools and prompts via the Model Context Protocol for use by any MCP-compatible AI client

Both interfaces share the same `CfsDebugManager` and `DebugCommandExecutor` instances from the parent `debug-tools` directory.

## Directory Structure

```
ai-debug/
├── debug-assistant.ts          # Orchestrates chat participant + MCP server lifecycle
├── debug-chat-participant.ts   # VS Code chat participant (@cfs-debug)
├── debug-command-executor.ts   # Shared executor for debug lifecycle commands
├── debug-tool-executor.ts      # DAP-based debug tool execution
├── debug-prompt-builder.ts     # Prompt construction for GitHub Copilot
├── mcp-debug-web-server.ts     # Express HTTP server for MCP transport
├── handlers/                   # Chat participant command handlers
│   ├── index.ts
│   ├── analysis-handler.ts     # GDB commands & AI code analysis
│   ├── breakpoint-handler.ts   # Breakpoint management
│   ├── inspection-handler.ts   # Variable, register, memory inspection
│   ├── lifecycle-handler.ts    # Session start/stop/step/continue
│   └── help.ts                 # Help text
├── mcp-server/                 # MCP server implementation
│   ├── cfs-mcp-server.ts       # CfsMcpServer class (extends McpServer)
│   ├── types/
│   │   └── mcp-dependencies.ts # Dependency injection interfaces
│   ├── utils/
│   │   └── response-helpers.ts # Tool response formatting helpers
│   ├── tools/debug/            # MCP tool registrations
│   │   ├── index.ts            # Registers all tool groups
│   │   ├── analysis.ts         # Context, fault analysis, source search
│   │   ├── breakpoints.ts      # Breakpoints and watchpoints
│   │   ├── execution-control.ts# Step, continue, pause, wait-for-stop
│   │   ├── gdb-commands.ts     # Direct GDB/MI command execution
│   │   ├── memory.ts           # Memory read/write/search
│   │   └── session-lifecycle.ts# Session start/stop/restart
│   └── prompts/debug/          # MCP prompt registrations
│       ├── index.ts            # Registers all prompt groups
│       ├── breakpoint-and-stepping.ts
│       ├── state-and-crash.ts
│       └── watchpoint-and-memory.ts
├── types/
│   └── chat-types.ts           # Chat participant type definitions
└── README.md
```

## Architecture

### CfsDebugAssistant

`CfsDebugAssistant` (`debug-assistant.ts`) is the top-level orchestrator that:

- Creates and manages the `DebugChatParticipant` and `McpDebugStreamableWebServer`
- Registers VS Code commands for MCP server start/stop/status
- Wires up the `DebugCommandExecutor` and dependency injection for the MCP server

### Chat Participant

**DebugChatParticipant** registers with VS Code using `vscode.chat.createChatParticipant` and routes user messages through a handler cascade:

1. **LifecycleHandler** — start, stop, step, continue, pause
2. **BreakpointHandler** — set, remove, list, clear breakpoints
3. **InspectionHandler** — show variables, registers, stack, memory
4. **AnalysisHandler** — GDB commands, find bugs
5. **AI Query** — fallback to GitHub Copilot with debug context

### MCP Server

**CfsMcpServer** extends `McpServer` from `@modelcontextprotocol/sdk` and registers debug tools and prompts. It uses dependency injection (`McpServerDependencies`) to access `CfsDebugManager` and `DebugCommandExecutor` without directly importing `vscode`.

**McpDebugStreamableWebServer** wraps the MCP server in an Express HTTP server using the Streamable HTTP transport, allowing external AI clients to connect.

### Data Flow

```
Chat Participant path:
  User → @cfs-debug → Handler → DebugToolExecutor → CfsDebugManager → DAP

MCP Server path:
  AI Client → HTTP → McpDebugStreamableWebServer → CfsMcpServer → DebugCommandExecutor → CfsDebugManager → DAP
```

## Usage

### Chat Participant

```
@cfs-debug start debugging
@cfs-debug set breakpoint in main.c at line 42
@cfs-debug show variables
@cfs-debug gdb info registers
@cfs-debug find bugs
@cfs-debug what's causing this crash?
```

### MCP Server

The MCP server starts on an OS-assigned port. Control it via the VS Code command palette:

- **CFS: Start MCP Debug Server**
- **CFS: Stop MCP Debug Server**
- **CFS: MCP Debug Server Status**

The port is configurable via `cfs.mcp.port` in VS Code settings (default: `0` for OS-assigned).

## Development

### Adding a Chat Handler

1. Create handler in `handlers/`
2. Export from `handlers/index.ts`
3. Initialize in `DebugChatParticipant` constructor
4. Add to the handler cascade in `handleChatRequest()`

### Adding an MCP Tool

1. Create or extend a file in `mcp-server/tools/debug/`
2. Register the tool using `server.tool()` from the MCP SDK
3. Call the registration function from `mcp-server/tools/debug/index.ts`

### Adding an MCP Prompt

1. Create or extend a file in `mcp-server/prompts/debug/`
2. Register the prompt using `server.prompt()` from the MCP SDK
3. Call the registration function from `mcp-server/prompts/debug/index.ts`

### Testing

1. Start the extension with F5
2. In the Extension Development Host:
   - Open Copilot Chat and use `@cfs-debug <command>`
   - Or start the MCP server and connect an MCP client
3. Check the Extension Host console for logs

## Learn More

- [VS Code Chat API](https://code.visualstudio.com/api/extension-guides/chat)
- [VS Code Debug API](https://code.visualstudio.com/api/extension-guides/debugger-extension)
- [Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [GitHub Copilot Extensions](https://docs.github.com/en/copilot/building-copilot-extensions)

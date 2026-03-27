---
description: Prerequisites, starting the MCP server, and connecting AI clients to the AI Debug Assistant in CodeFusion Studio.
author: Analog Devices
date: 2026-03-25
---

# Getting started with the AI Debug Assistant

This page covers everything you need to enable the AI Debug Assistant and connect it to your preferred AI client.

## Prerequisites

Before you begin, make sure you have:

- **CodeFusion Studio** installed with an active project
- A **debug target connected** (the AI Debug Assistant requires a live hardware session for most operations)
- For **GitHub Copilot** integration: VS Code 1.96.0 or later and the [:octicons-link-external-24: GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot){:target="_blank"}
- For **Claude Code** integration: [:octicons-link-external-24: Claude Code](https://claude.com/product/claude-code){:target="_blank"} installed

## Step 1: Start the MCP server

!!! note
    The MCP server is only required for external AI clients such as Claude Code. If you are using the `@cfs-debug` chat participant or Agent Mode in GitHub Copilot, you can skip this step — the assistant connects directly through the VS Code extension.

The AI Debug Assistant runs as a local MCP (Model Context Protocol) server inside CodeFusion Studio. The server does not start automatically — you must start it manually before connecting an AI client.

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type MCP Server.
    ![Command Palette showing CFS MCP commands](./images/mcp-command-palette-light.png#only-light) ![Command Palette showing CFS MCP commands](./images/mcp-command-palette-dark.png#only-dark)
2. Run `(CFS) MCP: Start Debug Server`.

The following commands are available for managing the server:

| Command | Description |
|---|---|
| `(CFS) MCP: Start Debug Server` | Start the MCP server |
| `(CFS) MCP: Stop Debug Server` | Stop the MCP server |
| `(CFS) MCP: Server Status` | Check whether the server is running and which port it is listening on |

When the server starts, a VS Code notification shows the URL it is listening on (for example, `http://localhost:56448/mcp`). Note the port number from this URL — you will need it to connect AI clients.

!!! tip
    To start the MCP server automatically when the extension activates, go to **Settings → Extensions → CodeFusion Studio → General → MCP Server** and enable the **Run on Activation** setting (`cfs.mcp.runOnActivation`).

    ![CFS Run on Activation](./images/cfs-mcp-activation-light.png#only-light) ![CFS Run on Activation](./images/cfs-mcp-activation-dark.png#only-dark)

## Step 2: Start a debug session

Most AI Debug Assistant tools require an active debug session to inspect hardware state. Press **F5** or click the **Run and Debug** icon ![Run and Debug icon](../../images/run-and-debug-icon-dark.png#only-dark) ![Run and Debug icon](../../images/run-and-debug-icon-light.png#only-light) before asking the assistant to investigate, inspect, or control your target. For detailed debug steps, refer to [Start a debug session](../../debug-an-application.md).

## Step 3: Connect your AI client

### GitHub Copilot

No additional configuration or MCP server setup is needed. GitHub Copilot works out of the box with the AI Debug Assistant: the CFS debug tools are exposed directly in GitHub Copilot Chat through the `@cfs-debug` chat participant and Agent Mode (the MCP server is only required for external clients such as Claude Code).

!!! note
    Requires VS Code 1.96.0 or later. If the tools do not appear in GitHub Copilot Chat, check your VS Code version and update if needed.

!!! tip
    For best results, use a Claude model (such as Claude Sonnet 4.5 or Claude Opus 4.6) with the `@cfs-debug` chat participant. Other models may work for basic commands but could produce inconsistent results or errors for AI analysis features.

To activate the AI debug assistant, open GitHub Copilot Chat and either:

- Use **`@cfs-debug`** followed by your question to interact with the `@cfs-debug` chat assistant directly, or
- Use **Agent Mode** to let GitHub Copilot autonomously orchestrate multi-step debugging investigations

![GitHub Copilot Chat with @cfs-debug participant active](./images/copilot-chat-cfs-debug-light.png#only-light) ![GitHub Copilot Chat with @cfs-debug participant active](./images/copilot-chat-cfs-debug-dark.png#only-dark)

### Claude Code

The MCP server is assigned an available port by the operating system at startup. Before connecting Claude Code, check which URL was assigned:

- Check the VS Code notification that appears when the server starts, or
- Run `(CFS) MCP: Server Status` in the Command Palette.

Both show the full URL (for example, `http://localhost:56448/mcp`).

For a stable connection, we recommend setting a fixed port before registering with Claude Code. See [Set a fixed port](#set-a-fixed-port) below.

Once you know the port, register the server with Claude Code:

```bash
claude mcp add --transport http cfs-debug http://localhost:<port>/mcp
```

Replace `<port>` with the port assigned at startup. This registers the CFS MCP server with Claude Code using the name `cfs-debug`.

!!! important
    After adding the server, exit and restart Claude Code for the registration to take effect. To verify the server was added, run `claude mcp list`.

Start a debug session in CodeFusion Studio, then try asking Claude: *"What is the current execution state of the target?"* or *"Show me the registers."*

![Claude Code connected to a CFS debug session](./images/claude-code-connected-light.png#only-light) ![Claude Code connected to a CFS debug session](./images/claude-code-connected-dark.png#only-dark)

### Other MCP-compatible clients

The MCP server is open by design. Any client that supports the [:octicons-link-external-24: Model Context Protocol](https://modelcontextprotocol.io/){:target="_blank"} over Streamable HTTP can connect. Point it at `http://localhost:<port>/mcp`, where `<port>` is the port assigned at startup.

## Set a fixed port

By default, the OS assigns an available port when the MCP server starts. To use a fixed port instead (recommended for Claude Code, so the registration URL stays stable):

1. Go to **Settings → Extensions → CodeFusion Studio → General**, or search for (`cfs.mcp.port`).
  ![CFS MCP Server Settings](./images/cfs-mcp-port-light.png#only-light)
  ![CFS MCP Server Settings](./images/cfs-mcp-port-dark.png#only-dark)
2. Set the **Port** field (`cfs.mcp.port`) to a specific value (0–65535). Setting it to `0` restores OS-assigned behaviour.
3. Run `(CFS) MCP: Stop Debug Server` then `(CFS) MCP: Start Debug Server` to restart with the new port. A notification confirms the port the server is now listening on.
4. If using Claude Code, re-register the server with the new port:

    ```bash
    claude mcp remove cfs-debug
    claude mcp add --transport http cfs-debug http://localhost:<port>/mcp
    claude mcp list
    ```

!!! note
    GitHub Copilot reads the port directly from the `cfs.mcp.port` setting — no re-registration is needed after a port change.

## Verify the connection with MCP Inspector

To test the connection independently of any AI client, use the open-source [:octicons-link-external-24: MCP Inspector](https://github.com/modelcontextprotocol/inspector){:target="_blank"}:

```bash
npx @modelcontextprotocol/inspector
```

The inspector outputs a session token and a URL with that token pre-filled:

```bash
Starting MCP inspector...
⚙️ Proxy server listening on 127.0.0.1:6277
🔑 Session token: <your-session-token>
Use this token to authenticate requests or set DANGEROUSLY_OMIT_AUTH=true to disable auth

🔗 Open inspector with token pre-filled:
   http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=<your-session-token>

🔍 MCP Inspector is up and running at http://127.0.0.1:6274 🚀
```

1. Open the URL shown in your terminal — this opens the MCP Inspector in your browser with the session token pre-filled.
2. Select **Streamable HTTP** as the transport type.
3. Select **Via Proxy** as the **Connection Type**.
4. Enter the MCP server URL using the port assigned at startup (for example, `http://localhost:<port>/mcp`). Check the port via `(CFS) MCP: Server Status` if needed.
5. Click **Connect**.

Once connected, you can browse all available tools, resources, and prompts, and execute them manually to verify the server is working.

![Using MCP Inspector](./images/mcp-server-light.png#only-light) ![Using MCP Inspector](./images/mcp-server-dark.png#only-dark)

## Next steps

- [Using the AI Debug Assistant](using-ai-debug-assistant.md) — practical examples for Copilot Chat, Agent Mode, and Claude Code
- [Tools and workflows reference](reference.md) — full reference for all debug tools and diagnostic workflows

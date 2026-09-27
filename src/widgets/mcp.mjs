#!/usr/bin/env node
// Dependency-free, read-only MCP stdio server. stdout is reserved for JSON-RPC.
import { readFileSync } from "node:fs";
import {
  getWidget,
  getWidgetRecipe,
  searchWidgets,
  widgetGuidelines,
  widgetRecipes,
} from "./catalog.js";
const { version } = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
const tools = [
  {
    name: "search_widgets",
    description:
      "Find React widgets in the installed Cloudgate SDK by capability, name or category. Distinct from the legacy Cloudweb page-builder cookbook.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "get_widget",
    description:
      "Read the installed React widget API and a working import/example before implementing UI.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_widget_recipe",
    description:
      "Read a composition recipe: remote-table-edit, dashboard or permission-settings.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_widget_guidelines",
    description:
      "Read theme, accessibility, permissions and server data-loading rules for the installed React SDK.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
].map((tool) => ({
  ...tool,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
}));
const send = (message) =>
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
function handle(message) {
  if (
    !message ||
    message.jsonrpc !== "2.0" ||
    typeof message.method !== "string"
  )
    return { error: { code: -32600, message: "Invalid request" } };
  switch (message.method) {
    case "initialize":
      return {
        result: {
          protocolVersion: ["2025-06-18", "2025-03-26", "2024-11-05"].includes(
            message.params?.protocolVersion,
          )
            ? message.params.protocolVersion
            : "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "cloudgate-react-widgets", version },
          instructions:
            "Read get_widget_guidelines, then search_widgets and get_widget before composing React modules. APIs match this installed SDK version.",
        },
      };
    case "ping":
      return { result: {} };
    case "tools/list":
      return { result: { tools } };
    case "tools/call": {
      const name = message.params?.name,
        args = message.params?.arguments || {},
        tool = tools.find((tool) => tool.name === name);
      if (!tool) return { error: { code: -32602, message: "Unknown tool" } };
      if (
        typeof args !== "object" ||
        Array.isArray(args) ||
        Object.entries(args).some(
          ([key, value]) =>
            !(key in tool.inputSchema.properties) || typeof value !== "string",
        ) ||
        tool.inputSchema.required?.some((key) => !(key in args))
      )
        return { error: { code: -32602, message: "Invalid tool arguments" } };
      let value;
      if (name === "search_widgets")
        value = searchWidgets(args.query).map(
          ({ id, name, category, description, exports }) => ({
            id,
            name,
            category,
            description,
            exports,
          }),
        );
      else if (name === "get_widget") value = getWidget(args.id);
      else if (name === "get_widget_recipe") value = getWidgetRecipe(args.id);
      else
        value = {
          guidelines: widgetGuidelines,
          recipes: widgetRecipes.map(({ id, name }) => ({ id, name })),
        };
      return {
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                sdkVersion: version,
                result:
                  value ??
                  "Unknown ID. Search the catalogue for supported widgets and recipes.",
              }),
            },
          ],
          ...(value === undefined ? { isError: true } : {}),
        },
      };
    }
    default:
      return { error: { code: -32601, message: "Method not found" } };
  }
}
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  if (Buffer.byteLength(buffer, "utf8") > 1024 * 1024) {
    process.stderr.write("MCP input exceeded 1 MB.\n");
    process.exit(1);
  }
  let end;
  while ((end = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, end).trim();
    buffer = buffer.slice(end + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      send({ id: null, error: { code: -32700, message: "Parse error" } });
      continue;
    }
    if (
      message?.method?.startsWith("notifications/") &&
      !Object.hasOwn(message, "id")
    )
      continue;
    const response = handle(message);
    if (
      (message && Object.hasOwn(message, "id")) ||
      response.error?.code === -32600
    )
      send({ id: message?.id ?? null, ...response });
  }
});

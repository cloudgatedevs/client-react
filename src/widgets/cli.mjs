#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createWidgetManifest } from './manifest.mjs';
import {
  getWidget,
  getWidgetRecipe,
  searchWidgets,
  widgetGuidelines,
} from "./catalog.js";
const { version } = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
const [command = "help", ...args] = process.argv.slice(2);
let result;
switch (command) {
  case "manifest":
    result = createWidgetManifest();
    break;
  case "search":
    result = searchWidgets(args.join(" ")).map(
      ({ id, name, category, description, exports }) => ({
        id,
        name,
        category,
        description,
        exports,
      }),
    );
    break;
  case "widget":
    result = getWidget(args[0]);
    break;
  case "recipe":
    result = getWidgetRecipe(args[0]);
    break;
  case "guide":
    result = widgetGuidelines;
    break;
  case "version":
    result = { version };
    break;
  default:
    result = {
      version,
      usage: [
        "cloudgate-widgets manifest",
        "cloudgate-widgets search [terms]",
        "cloudgate-widgets widget data-table",
        "cloudgate-widgets recipe remote-table-edit",
        "cloudgate-widgets guide",
        "cloudgate-widgets version",
      ],
      mcp: "Run cloudgate-widgets-mcp for the read-only stdio MCP server.",
    };
}
if (result === undefined) {
  process.stderr.write(
    "Unknown widget or recipe. Use search to discover available IDs.\n",
  );
  process.exitCode = 1;
} else
  process.stdout.write(
    JSON.stringify({ sdkVersion: version, result }, null, 2) + "\n",
  );

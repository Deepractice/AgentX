/**
 * AgentX CLI - Terminal UI Client
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { tui } from "./app";

const argv = yargs(hideBin(process.argv))
  .scriptName("agentx")
  .usage("$0 [command] [options]")
  .command(
    ["$0", "chat"],
    "Start interactive chat session",
    (yargs) =>
      yargs
        .option("server", {
          alias: "s",
          type: "string",
          default: "ws://localhost:5200",
          description: "AgentX server URL",
        })
        .option("theme", {
          alias: "t",
          type: "string",
          description: "Theme name",
        }),
    async (args) => {
      await tui({
        serverUrl: args.server,
        theme: args.theme,
      });
    }
  )
  .help()
  .parseAsync();

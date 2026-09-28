import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBudgetTools } from "@/lib/mcp/tools";

export function createBudgetMcpServer(): McpServer {
  const server = new McpServer(
    { name: "monthly-budget", version: "1.0.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Personal monthly budget. Amounts are in the account currency (TND). " +
        "Months are 1-12. Expenses are filed under subcategories: call get_categories before add_expense.",
    }
  );
  registerBudgetTools(server);
  return server;
}

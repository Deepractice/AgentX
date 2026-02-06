/**
 * Next.js Instrumentation Hook
 *
 * Starts the AgentX WebSocket server when the Node.js runtime initializes.
 * This is the recommended way to run background services in Next.js 15+.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only start in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAgentXServer } = await import("@/lib/agentx");
    await startAgentXServer();
  }
}

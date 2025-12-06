/**
 * React Hooks for AgentX integration
 *
 * New architecture:
 * - Agent instance = one conversation
 * - Image = saved conversation snapshot (can be resumed)
 * - Session is internal (not exposed to UI)
 *
 * Hooks:
 * - useAgentX: Create and manage AgentX instance
 * - useAgent: Subscribe to agent events, send messages
 * - useImages: Manage saved conversations (list, resume, delete, snapshot)
 *
 * @example
 * ```tsx
 * import { useAgentX, useAgent, useImages } from "@agentxjs/ui";
 *
 * function App() {
 *   const agentx = useAgentX({ server: "ws://localhost:5200" });
 *   const [agentId, setAgentId] = useState<string | null>(null);
 *
 *   // Image management (saved conversations)
 *   const { images, resumeImage, snapshotAgent } = useImages(agentx);
 *
 *   // Current conversation
 *   const { messages, streaming, send, isLoading } = useAgent(agentx, agentId);
 *
 *   const handleResume = async (imageId: string) => {
 *     const { agentId } = await resumeImage(imageId);
 *     setAgentId(agentId);
 *   };
 *
 *   return <Chat messages={messages} streaming={streaming} onSend={send} />;
 * }
 * ```
 */

export {
  useAgent,
  type UseAgentResult,
  type UseAgentOptions,
  type AgentStatus,
  type UIMessage,
  type UIError,
} from "./useAgent";

export { useAgentX } from "./useAgentX";

export {
  useImages,
  type UseImagesResult,
  type UseImagesOptions,
} from "./useImages";

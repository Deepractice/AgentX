/**
 * Runtime Facades - Internal interfaces for dynamic instance management
 *
 * - ContainerFacade: Container CRUD
 * - SessionFacade: Session CRUD + run agent
 * - AgentFacade: Agent query + interaction + destroy
 * - EventsFacade: Event subscription
 *
 * Note: Internal objects (Container, Session, Agent) are not exposed.
 * All interactions go through facades.
 */

export type { ContainerFacade, ContainerInfo } from "./ContainerFacade";
export type { SessionFacade, SessionInfo } from "./SessionFacade";
export type { AgentFacade, AgentInfo } from "./AgentFacade";
export type { EventsFacade, Unsubscribe } from "./EventsFacade";

import type { Receptor } from "~/ecosystem/Receptor";
import type { ErrorEnvEvent } from "../event";

/**
 * ErrorReceptor - Transforms error EnvironmentEvents to RuntimeEvents.
 *
 * Listens for:
 * - error (EnvironmentEvent) → ErrorEnvEvent (RuntimeEvent)
 */
export interface ErrorReceptor extends Receptor {}

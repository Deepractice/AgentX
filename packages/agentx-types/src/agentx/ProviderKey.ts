/**
 * ProviderKey - Type-safe key for dependency injection
 *
 * Used with agentx.provide() and agentx.resolve() for runtime DI.
 *
 * @example
 * ```typescript
 * // Define a provider key
 * const MyServiceKey = createProviderKey<MyService>("MyService");
 *
 * // Register provider
 * agentx.provide(MyServiceKey, new MyServiceImpl());
 *
 * // Resolve provider
 * const service = agentx.resolve(MyServiceKey);
 * ```
 */

import type { LoggerFactory } from "~/common/logger";

/**
 * Type-safe provider key
 *
 * The generic type T represents the provider interface.
 */
export interface ProviderKey<T> {
  readonly id: symbol;
  readonly name: string;
  readonly __type?: T; // Phantom type for type inference
}

/**
 * Create a type-safe provider key
 *
 * @param name - Unique name for the provider
 * @returns Provider key for use with provide/resolve
 */
export function createProviderKey<T>(name: string): ProviderKey<T> {
  return {
    id: Symbol.for(`agentx:provider:${name}`),
    name,
  };
}

/**
 * Built-in provider key for LoggerFactory
 *
 * @example
 * ```typescript
 * agentx.provide(LoggerFactoryKey, {
 *   getLogger(name) {
 *     return new CustomLogger(name);
 *   }
 * });
 * ```
 */
export const LoggerFactoryKey: ProviderKey<LoggerFactory> =
  createProviderKey<LoggerFactory>("LoggerFactory");

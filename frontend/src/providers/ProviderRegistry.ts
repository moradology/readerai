/**
 * Provider Registry
 *
 * Central registry for all provider implementations
 * Manages provider lifecycle and dependency injection
 */

import type { BaseProvider, ProviderRegistry } from './types';

export class DefaultProviderRegistry implements ProviderRegistry {
  private providers = new Map<string, BaseProvider>();
  private initialized = false;

  register<T extends BaseProvider>(type: string, provider: T): void {
    if (this.providers.has(type)) {
      console.warn(`[ProviderRegistry] Overwriting existing provider: ${type}`);
    }

    this.providers.set(type, provider);
    console.log(`[ProviderRegistry] Registered ${type}: ${provider.name}`);
  }

  get<T extends BaseProvider>(type: string): T {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider not found: ${type}`);
    }
    return provider as T;
  }

  getAll(): Map<string, BaseProvider> {
    return new Map(this.providers);
  }

  has(type: string): boolean {
    return this.providers.has(type);
  }

  unregister(type: string): void {
    const provider = this.providers.get(type);
    if (provider) {
      if (provider.isReady()) {
        provider.cleanup();
      }
      this.providers.delete(type);
      console.log(`[ProviderRegistry] Unregistered ${type}`);
    }
  }

  async initializeAll(): Promise<void> {
    if (this.initialized) {
      console.warn('[ProviderRegistry] Already initialized');
      return;
    }

    console.log('[ProviderRegistry] Initializing all providers...');

    const initPromises: Promise<void>[] = [];

    for (const [type, provider] of this.providers.entries()) {
      if (!provider.isReady()) {
        console.log(`[ProviderRegistry] Initializing ${type}...`);
        initPromises.push(
          provider.initialize()
            .then(() => console.log(`[ProviderRegistry] ${type} initialized`))
            .catch(error => {
              console.error(`[ProviderRegistry] Failed to initialize ${type}:`, error);
              throw error;
            })
        );
      }
    }

    await Promise.all(initPromises);
    this.initialized = true;
    console.log('[ProviderRegistry] All providers initialized');
  }

  cleanupAll(): void {
    console.log('[ProviderRegistry] Cleaning up all providers...');

    for (const [type, provider] of this.providers.entries()) {
      if (provider.isReady()) {
        console.log(`[ProviderRegistry] Cleaning up ${type}...`);
        try {
          provider.cleanup();
        } catch (error) {
          console.error(`[ProviderRegistry] Error cleaning up ${type}:`, error);
        }
      }
    }

    this.initialized = false;
    console.log('[ProviderRegistry] All providers cleaned up');
  }
}

// Global registry instance
let globalRegistry: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new DefaultProviderRegistry();
  }
  return globalRegistry;
}

export function setProviderRegistry(registry: ProviderRegistry): void {
  if (globalRegistry) {
    globalRegistry.cleanupAll();
  }
  globalRegistry = registry;
}

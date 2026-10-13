import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * Resilient lazy loader that catches stale chunk import errors
 * (common after new production deployments) and reloads the window
 * to fetch the latest index.html and updated hashed chunks.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    const isAlreadyRefreshed = sessionStorage.getItem('himu_chunk_refreshed') === 'true';

    try {
      const module = await factory();
      sessionStorage.setItem('himu_chunk_refreshed', 'false');
      return module;
    } catch (error: any) {
      console.warn('Dynamic chunk import error detected:', error);

      const errorMessage = String(error?.message || '').toLowerCase();
      const isChunkError =
        errorMessage.includes('dynamically imported module') ||
        errorMessage.includes('failed to fetch') ||
        errorMessage.includes('mime type') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError && !isAlreadyRefreshed) {
        sessionStorage.setItem('himu_chunk_refreshed', 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }

      throw error;
    }
  });
}

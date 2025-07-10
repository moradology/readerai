/**
 * Typed Redux Hooks
 *
 * Responsibilities:
 * - Export pre-typed versions of useDispatch and useSelector
 * - Ensure type safety throughout the application
 * - Prevent need to import types in every component
 * - May include additional custom hooks for common Redux patterns
 */

import { useDispatch, useSelector, useStore } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch, AppStore } from './store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore: () => AppStore = useStore;

// Custom hooks for common patterns
export const useIsLoading = (): boolean => {
  // This will check loading states across different features
  // For now, return false as we don't have any slices yet
  return false;

  // Example implementation once we have slices:
  // return useAppSelector(state =>
  //   state.reading.isLoading ||
  //   state.passages.isLoading ||
  //   Object.values(state.api.queries).some(query => query?.status === 'pending')
  // );
};

export const useError = (): string | null => {
  // Aggregate errors from different parts of the app
  // For now, return null as we don't have any slices yet
  return null;

  // Example implementation:
  // return useAppSelector(state =>
  //   state.reading.error ||
  //   state.passages.error ||
  //   null
  // );
};

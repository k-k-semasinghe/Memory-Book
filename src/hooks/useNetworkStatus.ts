import { useNetworkState } from 'expo-network';

export function useNetworkStatus() {
  const state = useNetworkState();
  const isUnknown =
    state.isConnected === undefined && state.isInternetReachable === undefined;
  const isOffline =
    state.isConnected === false || state.isInternetReachable === false;
  return { isOffline, isOnline: !isOffline && !isUnknown, isUnknown };
}

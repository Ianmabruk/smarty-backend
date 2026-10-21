import Constants from "expo-constants";
import { Platform } from "react-native";

// The mobile client reads its API origin from the same environment variable
// name as the web build so a single deployment configuration covers both.
const envApiBase = (
  process.env.EXPO_PUBLIC_API_BASE ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.API_BASE ||
  ""
).trim();

const localhostFallback = "http://localhost:5000/api";
const androidEmulatorFallback = "http://10.0.2.2:5000/api";

const hostUriBase = (() => {
  if (!Constants?.expoConfig?.hostUri) return null;
  const host = Constants.expoConfig.hostUri.split(":")[0];
  return `http://${host}:5000/api`;
})();

let runtimeFallback = localhostFallback;
if (hostUriBase) {
  runtimeFallback = hostUriBase;
} else if (Platform.OS === "android") {
  runtimeFallback = androidEmulatorFallback;
}

if (!envApiBase) {
  // Never fall back silently: a device pointed at localhost can never reach a
  // deployed API, which is the usual cause of "Network request failed".
  console.warn(
    `[api] EXPO_PUBLIC_API_BASE is not set. Falling back to ${runtimeFallback}. ` +
      "Set EXPO_PUBLIC_API_BASE to the deployed API origin before shipping a release build."
  );
}

export const API_BASE = envApiBase || runtimeFallback;

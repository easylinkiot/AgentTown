import type {
  ExpoSpeechRecognitionModuleType,
  ExpoSpeechRecognitionNativeEventMap,
} from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";

type SpeechModule = {
  ExpoSpeechRecognitionModule: ExpoSpeechRecognitionModuleType;
};

let cachedModule: SpeechModule | null | undefined;

export function getSpeechRecognitionModule(): SpeechModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require("expo-speech-recognition") as SpeechModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function getSpeechRecognitionNativeModule():
  | ExpoSpeechRecognitionModuleType
  | null {
  return getSpeechRecognitionModule()?.ExpoSpeechRecognitionModule ?? null;
}

export type SpeechRecognitionEventMap = ExpoSpeechRecognitionNativeEventMap;

export function addSpeechRecognitionListener<
  K extends keyof SpeechRecognitionEventMap,
>(eventName: K, listener: (event: SpeechRecognitionEventMap[K]) => void) {
  const module = getSpeechRecognitionNativeModule();
  if (!module?.addListener) return null;

  const subscription = module.addListener(eventName, listener as never);
  return () => {
    if (subscription && typeof subscription.remove === "function") {
      subscription.remove();
      return;
    }
    if (typeof module.removeListener === "function") {
      module.removeListener(eventName, listener as never);
    }
  };
}

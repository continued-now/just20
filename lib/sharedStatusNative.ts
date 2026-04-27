import { NativeModules, Platform } from 'react-native';

const nativeModule = NativeModules.Just20SharedStatus as
  | { writeStatus: (status: Record<string, unknown>) => Promise<void> }
  | undefined;

export async function writeSharedStatus(status: Record<string, unknown>): Promise<void> {
  if (Platform.OS !== 'ios' || !nativeModule?.writeStatus) return;
  await nativeModule.writeStatus(status);
}

import type { SupportedEnvironment } from '@xiaipet/shared';
import { RELEASE_CHANNELS, SUPPORTED_ENVIRONMENTS } from '@xiaipet/shared';

export interface RuntimeEnv {
  envName: SupportedEnvironment;
  envId: string;
  appId: string;
  releaseChannel: string;
}

export function resolveRuntimeEnv(rawEnvName?: string): RuntimeEnv {
  const envName = rawEnvName ?? process.env.CLOUDBASE_ENV_NAME;

  if (!envName || !SUPPORTED_ENVIRONMENTS.includes(envName as SupportedEnvironment)) {
    throw new Error(`Unsupported environment: ${String(envName)}`);
  }

  const supportedEnvName = envName as SupportedEnvironment;
  return {
    envName: supportedEnvName,
    envId: process.env.CLOUDBASE_ENV_ID ?? '',
    appId: process.env.WECHAT_APP_ID ?? '',
    releaseChannel: RELEASE_CHANNELS[supportedEnvName]
  };
}

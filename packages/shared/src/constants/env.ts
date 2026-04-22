export const SUPPORTED_ENVIRONMENTS = ['dev', 'prod'] as const;

export type SupportedEnvironment = (typeof SUPPORTED_ENVIRONMENTS)[number];

export const RELEASE_CHANNELS = {
  dev: 'manual-dev',
  prod: 'manual-prod'
} as const;

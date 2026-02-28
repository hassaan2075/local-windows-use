import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ConfigSchema, type Config } from './schema.js';

const CONFIG_FILE = join(homedir(), '.windows-use.json');

export interface FileConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxSteps?: number;
  maxRounds?: number;
  cdpUrl?: string;
  timeoutMs?: number;
}

/** Load saved config from ~/.windows-use.json */
export function loadFileConfig(): FileConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Load config with priority: overrides > env vars > config file > defaults
 */
export function loadConfig(overrides?: Partial<Config>): Config {
  const file = loadFileConfig();

  const raw = {
    apiKey: overrides?.apiKey ?? process.env.WINDOWS_USE_API_KEY ?? file.apiKey ?? '',
    baseURL: overrides?.baseURL ?? process.env.WINDOWS_USE_BASE_URL ?? file.baseURL ?? '',
    model: overrides?.model ?? process.env.WINDOWS_USE_MODEL ?? file.model ?? '',
    maxSteps: overrides?.maxSteps ?? intEnv('WINDOWS_USE_MAX_STEPS') ?? file.maxSteps ?? 50,
    maxRounds: overrides?.maxRounds ?? intEnv('WINDOWS_USE_MAX_ROUNDS') ?? file.maxRounds ?? 20,
    cdpUrl: overrides?.cdpUrl ?? process.env.WINDOWS_USE_CDP_URL ?? file.cdpUrl ?? 'http://localhost:9222',
    timeoutMs: overrides?.timeoutMs ?? intEnv('WINDOWS_USE_TIMEOUT_MS') ?? file.timeoutMs ?? 300_000,
  };

  return ConfigSchema.parse(raw);
}

function intEnv(name: string): number | undefined {
  const val = process.env[name];
  if (val === undefined) return undefined;
  const n = parseInt(val, 10);
  return isNaN(n) ? undefined : n;
}

export type ModuleId = 'AHB' | 'FEED';

export type ModuleConfig = {
  id: ModuleId;
  name: string;
  title: string;
  footerLabel: string;
  basePath: string;
  description: string;
  isAvailable: boolean;
  //highlights: string[];
};

const MODULES: Record<ModuleId, ModuleConfig> = {
  AHB: {
    id: 'AHB',
    name: 'AHB',
    title: 'AHB Sales Forecasting',
    footerLabel: 'AHB Sales Forecasting',
    basePath: '/',
    description: 'Animal Health Business operations focusing on sales forecasting workflows.',
    isAvailable: true
  },
  FEED: {
    id: 'FEED',
    name: 'FEED',
    title: 'Feed Demand Forecasting',
    footerLabel: 'Feed Demand Forecasting',
    basePath: '/feed',
    description: 'Feed business forecasting with the exact same experience as the AHB console.',
    isAvailable: false
  }
};

export const MODULE_CONFIG = MODULES;
export const MODULE_LIST: ModuleConfig[] = Object.values(MODULES);
export const AVAILABLE_MODULE_LIST = MODULE_LIST.filter((module) => module.isAvailable);

const FALLBACK_MODULE_ID: ModuleId = 'AHB';

const AVAILABLE_MODULE_IDS = (
  AVAILABLE_MODULE_LIST.length
    ? AVAILABLE_MODULE_LIST.map((module) => module.id)
    : [FALLBACK_MODULE_ID]
) as [ModuleId, ...ModuleId[]];

export const DEFAULT_MODULE_ID: ModuleId = AVAILABLE_MODULE_IDS[0];

export function normalizeModuleId(value: unknown): ModuleId {
  if (typeof value !== 'string') {
    return DEFAULT_MODULE_ID;
  }
  const upper = value.trim().toUpperCase();
  const candidate = upper === 'FEED' ? 'FEED' : upper === 'AHB' ? 'AHB' : null;
  if (!candidate) {
    return DEFAULT_MODULE_ID;
  }
  return AVAILABLE_MODULE_IDS.includes(candidate) ? candidate : DEFAULT_MODULE_ID;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Hemisphere = 'north' | 'south';
export type ThemeDefault = 'system' | 'local-time' | 'day' | 'night';
export type Store = { enabled: boolean; url: string | null };
export type WorldSettings = {
  theme: ThemeDefault;
  season: 'current' | Season;
  hemisphere: Hemisphere;
  effectsEnabled: boolean;
  shakeEnabled: boolean;
  snowAmount: number;
  soundEnabled: boolean;
  animationEnabled: boolean;
  discoveriesEnabled: boolean;
};
export type InterfaceSettings = { showWorldSettings: boolean; showDiscoveryProgress: boolean };
export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
  theme: 'system', season: 'current', hemisphere: 'north',
  effectsEnabled: true, shakeEnabled: true, snowAmount: 1,
  soundEnabled: true, animationEnabled: true, discoveriesEnabled: true,
};
export const DEFAULT_INTERFACE_SETTINGS: InterfaceSettings = { showWorldSettings: true, showDiscoveryProgress: true };
export type SiteConfig = {
  version: 1;
  download: { enabled: boolean; comingSoonText: string };
  stores: { ios: Store; android: Store; comingSoonText: string };
  world: WorldSettings;
  interface: InterfaceSettings;
};
export type Release = { title: string; version: string; url: string; size: string; sha256?: string; requirements: string; available: boolean };

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown, max = 250): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

/** Only ordinary HTTPS or same-site relative download addresses are allowed. */
export function safeDownloadUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value !== value.trim() || /[\\\s\u0000-\u001f]/.test(value)) return null;
  if (value.startsWith('https://')) {
    try { const url = new URL(value); return url.hostname && !url.username && !url.password ? value : null; } catch { return null; }
  }
  if (/^(?:\.\/)?[a-zA-Z0-9_-]/.test(value) && !value.includes(':') && !value.split('/').includes('..')) return value;
  return null;
}
function store(value: unknown, platform: 'ios' | 'android'): Store | null {
  if (!object(value) || typeof value.enabled !== 'boolean' || typeof value.url !== 'string') return null;
  if (!value.enabled) return { enabled: false, url: null };
  try {
    const url = new URL(value.url);
    const host = platform === 'ios' ? 'apps.apple.com' : 'play.google.com';
    if (url.protocol !== 'https:' || url.hostname !== host || url.username || url.password || url.port || !url.pathname || url.pathname === '/') return null;
    return { enabled: true, url: url.href };
  } catch { return null; }
}

/** Invalid or partial configuration fails closed: no download or store links. */
export function parseSiteConfig(value: unknown): SiteConfig | null {
  if (!object(value) || value.version !== 1 || !object(value.download) || !object(value.stores) || !object(value.world)) return null;
  if (typeof value.download.enabled !== 'boolean' || !text(value.download.comingSoonText) || !text(value.stores.comingSoonText)) return null;
  const ios = store(value.stores.ios, 'ios'), android = store(value.stores.android, 'android');
  if (!ios || !android) return null;
  const theme = value.world.theme, season = value.world.season, hemisphere = value.world.hemisphere;
  if (typeof theme !== 'string' || typeof season !== 'string' || typeof hemisphere !== 'string' || !['system', 'local-time', 'day', 'night'].includes(String(theme)) || !['current', 'spring', 'summer', 'autumn', 'winter'].includes(String(season)) || !['north', 'south'].includes(String(hemisphere))) return null;
  const world: WorldSettings = { ...DEFAULT_WORLD_SETTINGS, theme: theme as ThemeDefault, season: season as 'current' | Season, hemisphere: hemisphere as Hemisphere };
  for (const key of ['effectsEnabled', 'shakeEnabled', 'soundEnabled', 'animationEnabled', 'discoveriesEnabled'] as const) {
    if (value.world[key] === undefined) continue;
    if (typeof value.world[key] !== 'boolean') return null;
    world[key] = value.world[key];
  }
  if (value.world.snowAmount !== undefined) {
    if (typeof value.world.snowAmount !== 'number' || !Number.isFinite(value.world.snowAmount) || value.world.snowAmount < .5 || value.world.snowAmount > 2) return null;
    world.snowAmount = value.world.snowAmount;
  }
  const interfaceSettings = { ...DEFAULT_INTERFACE_SETTINGS };
  if (value.interface !== undefined) {
    if (!object(value.interface)) return null;
    for (const key of ['showWorldSettings', 'showDiscoveryProgress'] as const) {
      if (value.interface[key] === undefined) continue;
      if (typeof value.interface[key] !== 'boolean') return null;
      interfaceSettings[key] = value.interface[key];
    }
  }
  return { version: 1, download: { enabled: value.download.enabled, comingSoonText: value.download.comingSoonText.trim() }, stores: { ios, android, comingSoonText: value.stores.comingSoonText.trim() }, world, interface: interfaceSettings };
}

export function parseRelease(value: unknown): Release | null {
  if (!object(value) || typeof value.available !== 'boolean' || !text(value.title) || !text(value.version, 60) || !text(value.size, 30) || !text(value.requirements, 1500)) return null;
  const url = safeDownloadUrl(value.url);
  if (!url) return null;
  if (value.sha256 !== undefined && (typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(value.sha256))) return null;
  return { title: value.title, version: value.version, size: value.size, requirements: value.requirements, url, available: value.available, ...(typeof value.sha256 === 'string' ? { sha256: value.sha256 } : {}) };
}

/** Meteorological seasons, using the visitor's local calendar. No location request. */
export function currentSeason(date = new Date(), hemisphere: Hemisphere = 'north'): Season {
  const northern: Season[] = ['winter', 'spring', 'summer', 'autumn'];
  const quarter = Math.floor(((date.getMonth() + 1) % 12) / 3);
  return northern[(quarter + (hemisphere === 'south' ? 2 : 0)) % 4];
}
export function defaultNight(theme: ThemeDefault, system: 'dark' | 'light' | null, date = new Date()): boolean {
  if (theme === 'night') return true;
  if (theme === 'day') return false;
  if (theme === 'system' && system !== null) return system === 'dark';
  return date.getHours() < 7 || date.getHours() >= 19;
}
export function isMobileVisitor(width: number, coarsePointer: boolean, userAgent: string, touchPoints = 0, platform = ''): boolean {
  return width <= 1024 || coarsePointer || /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1);
}

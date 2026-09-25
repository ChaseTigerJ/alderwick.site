import { useEffect, useState } from 'react';
import { DEFAULT_INTERFACE_SETTINGS, DEFAULT_WORLD_SETTINGS, currentSeason, defaultNight, isMobileVisitor, parseRelease, parseSiteConfig, type Release, type Season, type SiteConfig } from './site-config';
function systemAppearance(): 'dark' | 'light' | null {
  if (typeof window.matchMedia !== 'function') return null;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return null;
}
function mobileVisitor(): boolean {
  return isMobileVisitor(window.innerWidth, window.matchMedia?.('(pointer: coarse)').matches ?? false, navigator.userAgent, navigator.maxTouchPoints, navigator.platform);
}
export function useSiteSettings() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [release, setRelease] = useState<Release | null>(null);
  const [mobile, setMobile] = useState(mobileVisitor);
  const [night, setNight] = useState(() => defaultNight('system', systemAppearance()));
  const [season, setSeason] = useState<Season>(() => currentSeason());
  const [manualNight, setManualNight] = useState(false);
  const [manualSeason, setManualSeason] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    const load = (path: string) => fetch(`${import.meta.env.BASE_URL}${path}`, { signal: abort.signal, cache: 'no-store' }).then(response => response.ok ? response.json() : null);
    load('site-config.json').then(value => setConfig(parseSiteConfig(value))).catch(() => {});
    load('downloads/release.json').then(value => setRelease(parseRelease(value))).catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const update = () => setMobile(mobileVisitor());
    const pointer = window.matchMedia?.('(pointer: coarse)');
    window.addEventListener('resize', update);
    pointer?.addEventListener('change', update);
    return () => { window.removeEventListener('resize', update); pointer?.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    const sync = () => {
      if (!manualNight) setNight(defaultNight(config?.world.theme ?? 'system', systemAppearance()));
      if (!manualSeason) setSeason(config?.world.season && config.world.season !== 'current' ? config.world.season : currentSeason(new Date(), config?.world.hemisphere ?? 'north'));
    };
    sync();
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)');
    const light = window.matchMedia?.('(prefers-color-scheme: light)');
    dark?.addEventListener('change', sync); light?.addEventListener('change', sync);
    const timer = window.setInterval(sync, 60_000);
    return () => { dark?.removeEventListener('change', sync); light?.removeEventListener('change', sync); window.clearInterval(timer); };
  }, [config, manualNight, manualSeason]);
  return {
    config, release, mobile, night, season,
    worldSettings: config?.world ?? DEFAULT_WORLD_SETTINGS,
    interfaceSettings: config?.interface ?? DEFAULT_INTERFACE_SETTINGS,
    downloadAvailable: !mobile && config?.download.enabled === true && release?.available === true,
    previewNight: (value: boolean) => { setManualNight(true); setNight(value); },
    previewSeason: (value: Season) => { setManualSeason(true); setSeason(value); },
    useAutomaticWorld: () => { setManualNight(false); setManualSeason(false); },
    manualWorld: manualNight || manualSeason,
  };
}

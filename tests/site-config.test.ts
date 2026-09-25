import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { currentSeason, defaultNight, isMobileVisitor, parseRelease, parseSiteConfig, safeDownloadUrl } from '../src/site-config.ts';
const config = { version: 1, download: { enabled: true, comingSoonText: 'Coming soon!' }, stores: { ios: { enabled: false, url: '' }, android: { enabled: false, url: '' }, comingSoonText: 'Mobile is on the way.' }, world: { theme: 'system', season: 'current', hemisphere: 'north' } };
test('administrative disabled downloads stay disabled, malformed boolean fails closed', () => {
  assert.equal(parseSiteConfig(config)?.download.enabled, true);
  assert.equal(parseSiteConfig({ ...config, download: { ...config.download, enabled: false } })?.download.enabled, false);
  assert.equal(parseSiteConfig({ ...config, download: { ...config.download, enabled: 'false' } }), null);
  assert.equal(parseSiteConfig({}), null);
  assert.equal(parseSiteConfig(null), null);
});
test('download URLs reject executable, protocol-relative, traversal, and credential URLs', () => {
  for (const url of ['javascript:alert(1)', '//evil.example/x', '../secrets', 'downloads/../secret', 'https://user:pass@example.com/game.zip', 'https:\\evil.example', ' data:text/html,x', 'file:///x']) assert.equal(safeDownloadUrl(url), null, url);
  assert.equal(safeDownloadUrl('./downloads/Alderwick.zip'), './downloads/Alderwick.zip');
  assert.equal(safeDownloadUrl('https://example.com/game.zip'), 'https://example.com/game.zip');
});
test('mobile stores require explicit enabled and matching real store URLs', () => {
  assert.equal(parseSiteConfig({ ...config, stores: { ...config.stores, ios: { enabled: true, url: 'https://example.com/app' } } }), null);
  assert.equal(parseSiteConfig({ ...config, stores: { ...config.stores, ios: { enabled: true, url: 'https://apps.apple.com/us/app/alderwick/id123' } } })?.stores.ios.enabled, true);
  assert.equal(parseSiteConfig(config)?.stores.ios.url, null);
});
test('release manifest is validated before exposing a download', () => {
  const release = { title: 'Alderwick', version: '1', size: '11 MB', url: './downloads/game.zip', requirements: 'Python 3.8', available: true };
  assert.equal(parseRelease(release)?.available, true);
  assert.equal(parseRelease({ ...release, available: 'true' }), null);
  assert.equal(parseRelease({ ...release, url: 'javascript:alert(1)' }), null);
});
test('season boundaries and southern inversion follow local meteorological calendar', () => {
  const expected = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
  expected.forEach((season, month) => assert.equal(currentSeason(new Date(2026, month, 1)), season));
  assert.equal(currentSeason(new Date(2026, 8, 24), 'south'), 'spring');
});
test('computer appearance takes priority, local time is a permission-free fallback', () => {
  assert.equal(defaultNight('system', 'dark', new Date(2026, 0, 1, 12)), true);
  assert.equal(defaultNight('system', 'light', new Date(2026, 0, 1, 22)), false);
  assert.equal(defaultNight('system', null, new Date(2026, 0, 1, 22)), true);
  assert.equal(defaultNight('local-time', 'dark', new Date(2026, 0, 1, 12)), false);
  assert.equal(defaultNight('day', 'dark'), false);
});
test('phone/tablet and iPad desktop user agent do not receive desktop ZIP controls', () => {
  assert.equal(isMobileVisitor(1440, false, 'Desktop'), false);
  assert.equal(isMobileVisitor(768, false, 'Desktop'), true);
  assert.equal(isMobileVisitor(1366, true, 'Desktop', 5), true);
  assert.equal(isMobileVisitor(1366, false, 'Safari', 5, 'MacIntel'), true);
  assert.equal(isMobileVisitor(1366, false, 'Android'), true);
});
test('older configurations get compatible world and interface defaults without changing availability', () => {
  const legacy = parseSiteConfig({ ...config, download: { ...config.download, enabled: false } });
  assert.ok(legacy);
  assert.equal(legacy.download.enabled, false);
  assert.equal(legacy.stores.ios.enabled, false);
  assert.equal(legacy.world.effectsEnabled, true);
  assert.equal(legacy.world.shakeEnabled, true);
  assert.equal(legacy.world.soundEnabled, true);
  assert.equal(legacy.world.animationEnabled, true);
  assert.equal(legacy.world.discoveriesEnabled, true);
  assert.equal(legacy.world.snowAmount, 1);
  assert.equal(legacy.world.easterEggsEnabled, true);
  assert.equal(legacy.world.easterEggIntervalSeconds, 60);
  assert.equal(legacy.world.flameIntensity, .55);
  assert.deepEqual(legacy.interface, { showWorldSettings: true, showDiscoveryProgress: true });
});
test('explicit administrative effects and interface switches remain false', () => {
  const customized = parseSiteConfig({ ...config, world: { ...config.world, effectsEnabled: false, shakeEnabled: false, soundEnabled: false, animationEnabled: false, discoveriesEnabled: false, snowAmount: .5 }, interface: { showWorldSettings: false, showDiscoveryProgress: false } });
  assert.ok(customized);
  assert.equal(customized.world.effectsEnabled, false);
  assert.equal(customized.world.shakeEnabled, false);
  assert.equal(customized.world.soundEnabled, false);
  assert.equal(customized.world.animationEnabled, false);
  assert.equal(customized.world.discoveriesEnabled, false);
  assert.equal(customized.world.snowAmount, .5);
  assert.deepEqual(customized.interface, { showWorldSettings: false, showDiscoveryProgress: false });
});
test('invalid new options fail closed even when download and store links would otherwise be enabled', () => {
  const available = { ...config, stores: { ...config.stores, ios: { enabled: true, url: 'https://apps.apple.com/us/app/alderwick/id123' } } };
  for (const key of ['effectsEnabled', 'shakeEnabled', 'soundEnabled', 'animationEnabled', 'discoveriesEnabled', 'easterEggsEnabled']) {
    for (const invalid of ['false', 0, null]) assert.equal(parseSiteConfig({ ...available, world: { ...config.world, [key]: invalid } }), null, `${key}: ${invalid}`);
  }
  for (const invalid of ['1', 0, .49, 2.01, null, NaN, Infinity]) assert.equal(parseSiteConfig({ ...available, world: { ...config.world, snowAmount: invalid } }), null, `snowAmount: ${invalid}`);
  for (const key of ['showWorldSettings', 'showDiscoveryProgress']) assert.equal(parseSiteConfig({ ...available, interface: { [key]: 'false' } }), null, key);
  assert.equal(parseSiteConfig({ ...available, interface: null }), null);
  assert.equal(parseSiteConfig({ ...available, interface: [] }), null);
});
test('rare visitor timing and candle brightness validate bounds without enabling downloads', () => {
  for (const [key, min, max] of [['easterEggIntervalSeconds', 20, 300], ['flameIntensity', 0, 1]] as const) {
    for (const valid of [min, (min + max) / 2, max]) {
      const parsed = parseSiteConfig({ ...config, download: { ...config.download, enabled: false }, world: { ...config.world, [key]: valid, easterEggsEnabled: false } });
      assert.equal(parsed?.world[key], valid); assert.equal(parsed?.world.easterEggsEnabled, false); assert.equal(parsed?.download.enabled, false);
    }
    for (const invalid of [min - .01, max + .01, '1', null, Infinity, NaN]) assert.equal(parseSiteConfig({ ...config, world: { ...config.world, [key]: invalid } }), null);
  }
});
test('snow multiplier accepts both bounds and fractional values', () => {
  for (const snowAmount of [.5, 1, 1.25, 2]) assert.equal(parseSiteConfig({ ...config, world: { ...config.world, snowAmount } })?.world.snowAmount, snowAmount);
});

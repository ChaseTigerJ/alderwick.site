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

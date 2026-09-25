import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { announcementAccentText, announcementStorageKey, contrastRatio, parseAnnouncement, safeAnnouncementUrl } from '../src/announcement-config.ts';
import { parseSiteConfig } from '../src/site-config.ts';

const notice = { enabled: true, id: 'harbor-letter-1', title: 'A little news.', body: 'A note from the harbor.\n\nTake a wander.' };
const site = { version: 1, download: { enabled: true, comingSoonText: 'Soon.' }, stores: { ios: { enabled: false, url: '' }, android: { enabled: false, url: '' }, comingSoonText: 'Soon.' }, world: { theme: 'system', season: 'current', hemisphere: 'north' } };

test('announcements require explicit enabled and remain independently fail closed', () => {
  for (const value of [undefined, null, [], {}, { ...notice, enabled: false }, { ...notice, enabled: 'true' }, { ...notice, title: '' }]) assert.equal(parseAnnouncement(value).enabled, false);
  assert.equal(parseSiteConfig(site)?.announcement.enabled, false);
  const parsed = parseSiteConfig({ ...site, announcement: { ...notice, action: { url: 'javascript:alert(1)', label: 'Go' } } });
  assert.equal(parsed?.announcement.enabled, false);
  assert.equal(parsed?.download.enabled, true, 'an optional invalid announcement must not change release availability');
});

test('letter and banner modes preserve multiline copy, colors, artwork, and safe actions', () => {
  for (const mode of ['letter', 'banner']) {
    const result = parseAnnouncement({ ...notice, mode, image: { url: './island-poster.webp', alt: 'An island.', caption: 'From the shore.' }, action: { url: '#island', label: 'Explore', newTab: false }, colors: { background: '#fff', text: '#153e32', accent: '#bf673e' } });
    assert.equal(result.enabled, true);
    assert.equal(result.mode, mode);
    assert.equal(result.body, notice.body);
    assert.equal(result.image?.url, './island-poster.webp');
    assert.equal(result.action?.url, '#island');
    assert.equal(result.colors.accent, '#bf673e');
  }
  assert.equal(parseAnnouncement({ ...notice, image: null, action: null }).enabled, true);
});

test('announcement URLs reject executable and cross-origin tricks while allowing website assets', () => {
  for (const unsafe of ['javascript:alert(1)', 'data:image/svg+xml,x', 'http://example.com/image.png', '//example.com/a', '\\example.com/a', '/\\example.com/a', '../a', './%2e%2e/a', 'https://a:b@example.com/x', ' ./photo.png', 'https://example.com/ bad', 'file:///x']) assert.equal(safeAnnouncementUrl(unsafe), null, unsafe);
  for (const safe of ['./island-poster.webp', 'news/harbor.png', '/updates/letter.jpg', 'https://example.com/news.png']) assert.equal(safeAnnouncementUrl(safe, true), safe);
  assert.equal(safeAnnouncementUrl('#world'), '#world');
  assert.equal(safeAnnouncementUrl('#world', true), null);
});

test('invalid presentation choices are hidden instead of creating inaccessible announcements', () => {
  for (const invalid of [{ mode: 'popup' }, { frequency: 'daily' }, { id: 'bad id' }, { title: 'x'.repeat(141) }, { body: 'x'.repeat(5001) }, { colors: { accent: 'url(https://example.com)' } }, { colors: { background: '#fff', text: '#eee' } }, { image: { url: '/image.png', alt: '' } }, { action: { url: '#world', label: 'Go', newTab: 'false' } }]) assert.equal(parseAnnouncement({ ...notice, ...invalid }).enabled, false, JSON.stringify(invalid));
});

test('accent foreground remains readable for light and dark administrator colors', () => {
  for (const color of ['#fff', '#000', '#a74d30', '#d6b777', '#123456']) assert.ok(contrastRatio(color, announcementAccentText(color)) >= 4.5, color);
});

test('dismissal policies validate and a changed announcement id gives a new storage key', () => {
  for (const frequency of ['visit', 'session', 'once']) assert.equal(parseAnnouncement({ ...notice, frequency }).frequency, frequency);
  assert.equal(announcementStorageKey(notice), 'alderwick:announcement:harbor-letter-1');
  assert.notEqual(announcementStorageKey(notice), announcementStorageKey({ id: 'harbor-letter-2' }));
});

export type AnnouncementConfig = {
  enabled: boolean;
  id: string;
  mode: 'letter' | 'banner';
  frequency: 'visit' | 'session' | 'once';
  kicker: string;
  title: string;
  body: string;
  dismissLabel: string;
  image: { url: string; alt: string; caption: string } | null;
  action: { label: string; url: string; newTab: boolean } | null;
  colors: { background: string; text: string; accent: string };
};

export const DEFAULT_ANNOUNCEMENT: AnnouncementConfig = {
  enabled: false,
  id: 'a-note-from-the-shore',
  mode: 'letter',
  frequency: 'session',
  kicker: 'THE ALDERWICK POST',
  title: 'A little news from the shore.',
  body: 'Every little world has a story to tell. This is where we’ll share the next chapter of Alderwick.\n\nUntil then, take a wander. There’s always something waiting to be discovered.',
  dismissLabel: 'Back to the little world',
  image: null,
  action: null,
  colors: { background: '#faf6e9', text: '#153e32', accent: '#a74d30' },
};

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function shortText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

/** Plain site paths and HTTPS assets only; no HTML, executable URLs, or credentials. */
export function safeAnnouncementUrl(value: unknown, image = false): string | null {
  if (typeof value !== 'string' || !value || value !== value.trim() || /[\\\s\u0000-\u001f]/.test(value)) return null;
  if (!image && /^#[a-zA-Z][\w-]*$/.test(value)) return value;
  if (value.startsWith('https://')) {
    try {
      const url = new URL(value);
      return url.hostname && !url.username && !url.password ? value : null;
    } catch { return null; }
  }
  if (!/^(?:\.?\/)?[a-zA-Z0-9_-]/.test(value) || value.includes(':') || value.startsWith('//')) return null;
  try {
    const decoded = decodeURIComponent(value.split(/[?#]/)[0]);
    if (decoded.includes('\\') || decoded.split('/').includes('..')) return null;
    return value;
  } catch { return null; }
}

export function colorLuminance(hex: string): number {
  const full = hex.length === 4 ? [...hex.slice(1)].map(char => char + char).join('') : hex.slice(1);
  const channels = [0, 2, 4].map(offset => {
    const channel = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4);
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
export function contrastRatio(first: string, second: string): number {
  const a = colorLuminance(first), b = colorLuminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
export function announcementAccentText(accent: string): string {
  return contrastRatio(accent, '#ffffff') >= contrastRatio(accent, '#000000') ? '#ffffff' : '#000000';
}

/** An invalid optional notice hides itself without changing the site's availability. */
export function parseAnnouncement(value: unknown): AnnouncementConfig {
  const disabled = (): AnnouncementConfig => ({ ...DEFAULT_ANNOUNCEMENT, colors: { ...DEFAULT_ANNOUNCEMENT.colors } });
  if (value === undefined || !object(value) || value.enabled !== true) return disabled();
  if (!shortText(value.id, 80) || !/^[\w-]+$/.test(value.id) || !shortText(value.title, 140) || !shortText(value.body, 5000)) return disabled();
  const result: AnnouncementConfig = { ...DEFAULT_ANNOUNCEMENT, enabled: true, id: value.id, title: value.title.trim(), body: value.body.trim(), colors: { ...DEFAULT_ANNOUNCEMENT.colors } };
  if (value.mode !== undefined) {
    if (value.mode !== 'letter' && value.mode !== 'banner') return disabled();
    result.mode = value.mode;
  }
  if (value.frequency !== undefined) {
    if (!['visit', 'session', 'once'].includes(String(value.frequency))) return disabled();
    result.frequency = value.frequency as AnnouncementConfig['frequency'];
  }
  for (const [key, max] of [['kicker', 80], ['dismissLabel', 70]] as const) {
    if (value[key] === undefined) continue;
    if (!shortText(value[key], max)) return disabled();
    result[key] = value[key].trim();
  }
  if (value.colors !== undefined) {
    if (!object(value.colors)) return disabled();
    for (const key of ['background', 'text', 'accent'] as const) {
      if (value.colors[key] === undefined) continue;
      if (typeof value.colors[key] !== 'string' || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.colors[key])) return disabled();
      result.colors[key] = value.colors[key];
    }
    // Keep an administrator's palette while preventing unreadable body copy.
    if (contrastRatio(result.colors.background, result.colors.text) < 4.5) return disabled();
  }
  if (value.image !== undefined && value.image !== null) {
    if (!object(value.image)) return disabled();
    const url = safeAnnouncementUrl(value.image.url, true);
    if (!url || !shortText(value.image.alt, 250) || (value.image.caption !== undefined && (typeof value.image.caption !== 'string' || value.image.caption.length > 180))) return disabled();
    result.image = { url, alt: value.image.alt.trim(), caption: typeof value.image.caption === 'string' ? value.image.caption.trim() : '' };
  }
  if (value.action !== undefined && value.action !== null) {
    if (!object(value.action)) return disabled();
    const url = safeAnnouncementUrl(value.action.url);
    if (!url || !shortText(value.action.label, 70) || (value.action.newTab !== undefined && typeof value.action.newTab !== 'boolean')) return disabled();
    result.action = { url, label: value.action.label.trim(), newTab: value.action.newTab === true };
  }
  return result;
}

export function announcementStorageKey(config: Pick<AnnouncementConfig, 'id'>): string {
  return `alderwick:announcement:${config.id}`;
}

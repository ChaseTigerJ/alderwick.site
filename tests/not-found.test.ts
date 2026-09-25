import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html = await readFile(new URL('../404.html', import.meta.url), 'utf8');
const inline = html.match(/<script\b[^>]*\bid=["']homeward["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(inline, 'execute the actual homeward script shipped in the error document');

type Timer = { at: number; interval: number | null; callback: () => void };
type PageEvent = { persisted?: boolean };

function browserFixture(url = 'https://www.playalderwick.com/missing/deep/page', initialTime = 0) {
  let now = initialTime, nextId = 0;
  const timers = new Map<number, Timer>();
  const events = new Map<string, ((event: PageEvent) => void)[]>();
  const elements = new Map<string, { textContent: string }>();
  const replacements: { at: number; target: string; resolved: string }[] = [];
  const current = new URL(url);
  function schedule(callback: () => void, delay: number, interval: number | null) {
    const id = ++nextId; timers.set(id, { at: now + delay, interval, callback }); return id;
  }
  const location = {
    href: current.href, pathname: current.pathname, search: current.search, hash: current.hash,
    replace(target: string) { replacements.push({ at: now, target, resolved: new URL(target, current).href }); },
  };
  runInNewContext(inline!, {
    performance: { now: () => now },
    document: { getElementById: (id: string) => elements.get(id) ?? null },
    window: {
      location,
      addEventListener(type: string, callback: (event: PageEvent) => void) {
        const listeners = events.get(type) ?? []; listeners.push(callback); events.set(type, listeners);
      },
    },
    setTimeout: (callback: () => void, delay: number) => schedule(callback, delay, null),
    setInterval: (callback: () => void, delay: number) => schedule(callback, delay, delay),
    clearTimeout: (id: number) => timers.delete(id),
    clearInterval: (id: number) => timers.delete(id),
  }, { filename: '404.html#homeward' });

  return {
    replacements,
    get now() { return now; },
    get pendingTimers() { return timers.size; },
    mountBody() {
      elements.set('countdown-number', { textContent: '5' });
      elements.set('countdown-seconds', { textContent: '5 seconds' });
    },
    text(id: string) { return elements.get(id)?.textContent; },
    event(type: string, event: PageEvent = {}) { for (const callback of events.get(type) ?? []) callback(event); },
    advance(milliseconds: number) {
      const until = now + milliseconds;
      for (;;) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        const [id, timer] = next; now = timer.at;
        if (timer.interval === null) timers.delete(id);
        else timer.at += timer.interval;
        timer.callback();
      }
      now = until;
    },
  };
}

test('the actual error-page script redirects exactly five seconds after arrival, once, without waiting for body or resources', () => {
  const browser = browserFixture(undefined, 700);
  // The early script runs before the body and no load event ever occurs.
  browser.advance(4999); assert.deepEqual(browser.replacements, []);
  browser.advance(1);
  assert.deepEqual(browser.replacements, [{ at: 5700, target: '/', resolved: 'https://www.playalderwick.com/' }]);
  assert.equal(browser.pendingTimers, 0, 'neither countdown nor navigation timer survives redirection');
  browser.advance(30000); assert.equal(browser.replacements.length, 1, 'navigation must not repeat');
});

test('countdown catches up when the body becomes available and uses singular wording for the final second', () => {
  const browser = browserFixture();
  browser.advance(2050); browser.mountBody(); browser.advance(50);
  assert.equal(browser.text('countdown-number'), '3');
  assert.equal(browser.text('countdown-seconds'), '3 seconds');
  browser.advance(900);
  assert.equal(browser.text('countdown-number'), '2');
  assert.equal(browser.text('countdown-seconds'), '2 seconds');
  browser.advance(1000);
  assert.equal(browser.text('countdown-number'), '1');
  assert.equal(browser.text('countdown-seconds'), '1 second');
  browser.advance(999); assert.equal(browser.replacements.length, 0);
  browser.advance(1); assert.equal(browser.replacements[0].at, 5000, 'late DOM availability cannot postpone navigation');
});

test('leaving cancels both timers and a BFCache restoration gets a fresh five seconds', () => {
  const browser = browserFixture(); browser.mountBody();
  browser.advance(1600); browser.event('pagehide');
  assert.equal(browser.pendingTimers, 0, 'leaving stops countdown and navigation');
  const frozen = browser.text('countdown-seconds');
  browser.advance(10000);
  assert.equal(browser.replacements.length, 0, 'an abandoned page cannot navigate later');
  assert.equal(browser.text('countdown-seconds'), frozen);
  browser.event('pageshow', { persisted: true });
  const restoredAt = browser.now;
  assert.equal(browser.text('countdown-number'), '5');
  assert.equal(browser.text('countdown-seconds'), '5 seconds');
  assert.equal(browser.pendingTimers, 2, 'restoration schedules only one countdown and one redirect');
  browser.advance(4999); assert.equal(browser.replacements.length, 0);
  browser.advance(1);
  assert.deepEqual(browser.replacements, [{ at: restoredAt + 5000, target: '/', resolved: 'https://www.playalderwick.com/' }]);
  browser.advance(10000); assert.equal(browser.replacements.length, 1);
});

test('the initial non-BFCache pageshow event cannot restart the arrival timer', () => {
  const browser = browserFixture(); browser.mountBody();
  browser.advance(3000); browser.event('pageshow', { persisted: false });
  browser.advance(1999); assert.equal(browser.replacements.length, 0);
  browser.advance(1); assert.equal(browser.replacements[0].at, 5000);
});

test('broken paths, hostile redirect queries and fragments never change the fixed home destination', () => {
  for (const path of [
    '/lost/very/deep/path/?next=https://attacker.example/steal#return',
    '/%E0%A4%A?redirect=javascript%3Aalert(document.cookie)',
    '/missing/%3Cscript%3E/?url=%2F%2Fattacker.example#javascript:alert(1)',
  ]) {
    const browser = browserFixture(`https://www.playalderwick.com${path}`); browser.mountBody(); browser.advance(5000);
    assert.deepEqual(browser.replacements, [{ at: 5000, target: '/', resolved: 'https://www.playalderwick.com/' }]);
  }
});

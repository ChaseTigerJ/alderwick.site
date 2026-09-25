import { useEffect, useRef, useState } from 'react';
import type { IslandController } from './island-scene';
import type { Season, WorldSettings } from './site-config';
import { discoveries } from './discoveries';
export type { Season } from './site-config';
type Props = { night: boolean; season: Season; paused: boolean; reducedMotion: boolean; found: number[]; worldSettings: WorldSettings; onDiscover: (id: number) => void; action?: { id: number; nonce: number } | null };
export default function Island(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<IslandController | null>(null);
  const latest = useRef(props); latest.current = props;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    import('./island-scene').then(async ({ createIsland }) => {
      if (!active || !host.current) return;
      const scene = await createIsland(host.current, () => latest.current, (id: number) => latest.current.onDiscover(id));
      if (!active) { scene.dispose(); return; }
      controller.current = scene;
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; controller.current?.dispose(); controller.current = null; };
  }, []);
  return <div className="island-wrap" aria-label="Interactive miniature Alderwick harbor">
    <div className="island-canvas" ref={host} role="group" tabIndex={status === 'ready' ? 0 : -1} aria-label="Explore the three-dimensional Alderwick harbor" aria-describedby="island-keyboard-help" onKeyDown={event => {
      if (!controller.current) return;
      if (event.key === 'ArrowLeft') controller.current.rotate(-.2);
      else if (event.key === 'ArrowRight') controller.current.rotate(.2);
      else if (event.key === '+' || event.key === '=' || event.key === 'ArrowUp') controller.current.zoom(.9);
      else if (event.key === '-' || event.key === 'ArrowDown') controller.current.zoom(1.1);
      else if (event.key === 'Home') controller.current.reset();
      else return;
      event.preventDefault();
    }} />
    <p className="sr-only" id="island-keyboard-help">Use left and right arrow keys to rotate, plus and minus to zoom, and Home to reset the view. On a mouse, drag to rotate and scroll to zoom. On touchscreens, drag with one finger to rotate, pinch with two fingers to zoom, and swipe outside the world to scroll the page.{props.worldSettings.discoveriesEnabled && ` Click or tap objects in the world to discover their stories, or press Tab to reach the ${discoveries.length} discovery buttons.`}</p>
    {status === 'loading' && <div className="scene-loading" role="status"><span className="loading-line" />A little world is waking up…</div>}
    {status === 'error' && <div className="scene-fallback"><img src={`${import.meta.env.BASE_URL}island-poster.webp`} alt="Alderwick’s miniature coastal settlement" /><p>The harbor looks lovely from here. Try a browser with WebGL to explore in 3D.</p></div>}
    {status === 'ready' && props.worldSettings.discoveriesEnabled && <div className="keyboard-discoveries" role="group" aria-label="Island discoveries" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); host.current?.focus(); } }}>
      <p>Explore a little closer</p>
      <ul>{discoveries.map((discovery, index) => <li key={discovery.icon}><button onClick={() => props.onDiscover(index)}>{discovery.actionLabel}{props.found.includes(index) && <span className="sr-only"> — discovered</span>}</button></li>)}</ul>
      <span>Escape returns to the world.</span>
    </div>}
  </div>;
}

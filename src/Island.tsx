import { useEffect, useRef, useState } from 'react';
import { Hand, Pause, Play, Sparkle } from '@phosphor-icons/react';
import type { IslandController } from './island-scene';
import type { Season } from './site-config';
export type { Season } from './site-config';
type Props = { night: boolean; season: Season; paused: boolean; reducedMotion: boolean; found: number[]; onDiscover: (id: number) => void; action?: { id: number; nonce: number } | null; onTogglePause: () => void };
const secrets = ['A letter from Pip', 'Khloé was here.', 'Supplies for the shore'];
export default function Island(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const pins = useRef<(HTMLButtonElement | null)[]>([]);
  const controller = useRef<IslandController | null>(null);
  const latest = useRef(props); latest.current = props;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    import('./island-scene').then(async ({ createIsland }) => {
      if (!active || !host.current) return;
      const scene = await createIsland(host.current, pins.current, () => latest.current);
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
    <p className="sr-only" id="island-keyboard-help">Use left and right arrow keys to rotate, plus and minus to zoom, and Home to reset the view. On a mouse, drag to rotate and scroll to zoom. On touchscreens, use two fingers to explore or pinch to zoom; one finger scrolls the page.</p>
    {status === 'loading' && <div className="scene-loading" role="status"><span className="loading-line" />A little world is waking up…</div>}
    {status === 'error' && <div className="scene-fallback"><img src={`${import.meta.env.BASE_URL}island-poster.webp`} alt="Alderwick’s miniature coastal settlement" /><p>The harbor looks lovely from here. Try a browser with WebGL to explore in 3D.</p></div>}
    <div className="island-caption"><span>A place to begin.</span><span>A world to make your own.</span></div>
    {secrets.map((secret, index) => <button key={secret} ref={element => { pins.current[index] = element; }} className={`discovery-pin ${props.found.includes(index) ? 'found' : ''}`} style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }} onClick={() => props.onDiscover(index)} aria-label={secret} title={secret}><Sparkle weight="fill" size={15} /><span>{secret}</span></button>)}
    <div className="scene-bottom">
      <span className="drag-hint"><Hand size={17} /><span className="mouse-hint">Drag to wander. Scroll to look closer.</span><span className="touch-hint">Two fingers to explore. Pinch to look closer.</span></span>
      <button className="mobile-motion-control icon-button" aria-label={props.paused ? 'Resume world animation' : 'Pause world animation'} aria-pressed={props.paused} onClick={props.onTogglePause}>{props.paused ? <Play size={15} /> : <Pause size={15} />}</button>
    </div>
  </div>;
}

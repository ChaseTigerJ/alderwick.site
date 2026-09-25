import { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, Hand, Minus, Plus, Sparkle } from '@phosphor-icons/react';
import type { IslandController } from './island-scene';

export type Season = 'autumn' | 'summer' | 'winter';
type Props = { night: boolean; season: Season; paused: boolean; reducedMotion: boolean; found: number[]; onDiscover: (id: number) => void };
const secrets = ['A letter from Pip', 'Khloé’s favorite spot', 'Something for your journey'];
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
    <div className="island-canvas" ref={host} role="img" aria-label="A three-dimensional colonial harbor with timber cottages, autumn trees and a sailing ship. Use the view controls to rotate or zoom." />
    {status === 'loading' && <div className="scene-loading" role="status"><span className="loading-line" />A little world is waking up…</div>}
    {status === 'error' && <div className="scene-fallback"><img src="./island-poster.webp" alt="Alderwick’s miniature coastal settlement" /><p>The harbor looks lovely from here. Try a browser with WebGL to explore in 3D.</p></div>}
    <div className="island-caption"><span>A place to begin.</span><span>A world to make your own.</span></div>
    {secrets.map((secret, i) => <button key={secret} ref={el => { pins.current[i] = el; }} className={`discovery-pin ${props.found.includes(i) ? 'found' : ''}`} style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }} onClick={() => props.onDiscover(i)} aria-label={`Discover ${secret}`} title={secret}><Sparkle weight="fill" size={15} /><span>{props.found.includes(i) ? 'Discovered' : 'What’s this?'}</span></button>)}
    <div className="scene-bottom">
      <span className="drag-hint"><Hand size={17} /> Drag the world. Stay a while.</span>
      <div className="view-controls" aria-label="Island view controls">
        <button aria-label="Rotate island left" onClick={() => controller.current?.rotate(-0.35)}>↶</button>
        <button aria-label="Rotate island right" onClick={() => controller.current?.rotate(0.35)}>↷</button>
        <button aria-label="Zoom in" onClick={() => controller.current?.zoom(0.9)}><Plus size={15} /></button>
        <button aria-label="Zoom out" onClick={() => controller.current?.zoom(1.1)}><Minus size={15} /></button>
        <button aria-label="Reset island view" onClick={() => controller.current?.reset()}><ArrowClockwise size={15} /></button>
      </div>
    </div>
  </div>;
}

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Compass, DownloadSimple, Leaf, Moon, Package, Pause, Play, Sparkle, Sun, TreeEvergreen, X } from '@phosphor-icons/react';
import Island, { type Season } from './Island';

type Release = { title: string; version: string; url: string; size: string; sha256?: string; requirements: string; available: boolean };
const discoveries = [
  { title: 'A letter from Pip', text: '“A place is only a place until someone calls it home.” Pip has saved the first letter for you.', item: 'One warm welcome', icon: '01' },
  { title: 'Khloé was here.', text: 'A pink collar, muddy paws, and absolutely no regrets. Every great settlement needs a very good dog.', item: 'One very good companion', icon: '02' },
  { title: 'Supplies for the shore', text: 'A few tools. A little courage. Just enough to turn an unfamiliar shore into the beginning of something.', item: 'One grand beginning', icon: '03' },
];
const chapters = [
  { number: '01', title: 'Find your shore.', text: 'Step off the ship and into the unknown. Start small, gather what you need, and give your first settlers a place to call home.', detail: 'From the first camp to a bustling harbor.', season: 'autumn' as Season },
  { number: '02', title: 'Make a little life.', text: 'Cottages become neighborhoods. Strangers become familiar faces. Build, farm, trade, and get to know the people making it all happen.', detail: 'Little lives. Plenty of personality.', season: 'summer' as Season },
  { number: '03', title: 'Weather the unexpected.', text: 'Warm windows on a winter evening. New ships on the horizon. As the seasons change, your settlement’s story keeps unfolding.', detail: 'A living world, through every season.', season: 'winter' as Season },
];

function AdventureButton({ onClick }: { onClick: () => void }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 250, damping: 18 });
  const springY = useSpring(y, { stiffness: 250, damping: 18 });
  return <span className="adventure-wrap"><span className="parcel-whisper" aria-hidden="true">Careful. May contain an entire world.</span><motion.button className="primary-button adventure-button" style={{ x: springX, y: springY }} onPointerMove={event => { if (reduce || event.pointerType !== 'mouse') return; const box = event.currentTarget.getBoundingClientRect(); x.set((event.clientX - box.left - box.width / 2) * .035); y.set((event.clientY - box.top - box.height / 2) * .09); }} onPointerLeave={() => { x.set(0); y.set(0); }} onClick={onClick}><Package size={23} weight="duotone" /><span>Unpack your adventure</span><ArrowUpRight size={21} /></motion.button></span>;
}

function DownloadDialog({ open, onClose, release }: { open: boolean; onClose: () => void; release: Release | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [unpacked, setUnpacked] = useState(false);
  useEffect(() => {
    if (open) { setUnpacked(false); dialog.current?.showModal(); }
    else dialog.current?.close();
  }, [open]);
  return <dialog ref={dialog} className="download-dialog" onCancel={onClose} onClick={e => { if (e.target === dialog.current) onClose(); }} aria-labelledby="download-title">
    <button className="dialog-close icon-button" aria-label="Close download" onClick={onClose}><X size={22} /></button>
    <div className={`parcel-seal ${unpacked ? 'is-open' : ''}`} aria-hidden="true"><Package size={55} weight="duotone" />{unpacked && Array.from({ length: 14 }, (_, i) => <i key={i} className="parcel-confetti" style={{ '--i': i } as React.CSSProperties} />)}</div>
    <p className="eyebrow">A SPECIAL DELIVERY</p>
    <h2 id="download-title">Your next chapter,<br /><em>packed.</em></h2>
    <p className="dialog-intro">One little world. Ready to make your own.</p>
    {release?.available ? <>
      <div className="release-details"><div><strong>{release.title}</strong><span>{release.version} · {release.size} · ZIP</span></div><DownloadSimple size={23} /></div>
      <a className="primary-button download-action" href={release.url} download onClick={() => setUnpacked(true)}><DownloadSimple size={19} />{unpacked ? 'Download again' : 'Download Alderwick'}<ArrowDown size={19} /></a>
      {unpacked && <p className="download-success" role="status"><Check size={16} /> Your adventure is on its way. Check your downloads.</p>}
      <details className="installation" open><summary>How to unpack your adventure</summary><p>{release.requirements}</p><p>Your settlement saves in this browser. Keep using the same launcher and browser to return to it.</p></details>
    </> : <div className="release-details"><p>The game package is being prepared. Come back soon for your first adventure.</p></div>}
    <span className="edition-note">Portable browser edition · No account required</span>
  </dialog>;
}

export default function App() {
  const reduced = !!useReducedMotion();
  const [night, setNight] = useState(false);
  const [season, setSeason] = useState<Season>('autumn');
  const [paused, setPaused] = useState(false);
  const [found, setFound] = useState<number[]>([]);
  const [discovery, setDiscovery] = useState<number | null>(null);
  const [download, setDownload] = useState(false);
  const [release, setRelease] = useState<Release | null>(null);
  const [chapter, setChapter] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => { const abort = new AbortController(); fetch(`${import.meta.env.BASE_URL}downloads/release.json`, { signal: abort.signal }).then(r => r.ok ? r.json() : null).then(setRelease).catch(() => {}); return () => abort.abort(); }, []);
  useEffect(() => { document.documentElement.dataset.night = String(night); }, [night]);
  useEffect(() => { if (!download) return; const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, [download]);
  useEffect(() => { if (discovery === null) return; const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setDiscovery(null); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [discovery]);
  const openDownload = () => { lastFocus.current = document.activeElement as HTMLElement; setDownload(true); setMenuOpen(false); };
  const closeDownload = () => { setDownload(false); lastFocus.current?.focus(); };
  const discover = (id: number) => { setFound(current => current.includes(id) ? current : [...current, id]); setDiscovery(id); };
  const enter = reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: .75 } };
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <a className="wordmark" href="#" aria-label="Alderwick home"><TreeEvergreen weight="duotone" /><span>Alderwick</span></a>
      <nav aria-label="Main navigation" className={menuOpen ? 'open' : ''}>
        <a href="#world" onClick={() => setMenuOpen(false)}>The world</a>
        <a href="#discover" onClick={() => setMenuOpen(false)}>A little mischief</a>
        <button className="nav-download" onClick={openDownload}>Download <ArrowDown size={16} /></button>
      </nav>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation">{menuOpen ? 'Close' : 'Menu'}</button>
    </header>
    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <motion.div className="hero-copy" {...enter}>
          <p className="eyebrow"><span /> A COASTAL SETTLEMENT BUILDER</p>
          <h1 id="hero-title">A little world.<br />A grand<br /><em>beginning.</em></h1>
          <p className="hero-description">Build a home at the edge of the wild.<br />And a story that could only be yours.</p>
          <AdventureButton onClick={openDownload} />
          <p className="cta-note">Download Alderwick <span>·</span> Start something small</p>
        </motion.div>
        <div className="world-stage" id="island">
          <Island night={night} season={season} paused={paused} reducedMotion={reduced} found={found} onDiscover={discover} />
        </div>
        <div className="world-settings">
          <div className="time-toggle" aria-label="Time of day">
            <button aria-label="Daytime" aria-pressed={!night} onClick={() => setNight(false)}><Sun size={20} weight={!night ? 'fill' : 'regular'} /></button>
            <button aria-label="Nighttime" aria-pressed={night} onClick={() => setNight(true)}><Moon size={19} weight={night ? 'fill' : 'regular'} /></button>
          </div>
          <div className="season-picker"><label htmlFor="season">A change of season</label><div><Leaf size={15} /><select id="season" value={season} onChange={e => setSeason(e.target.value as Season)}><option value="autumn">Autumn</option><option value="summer">Summer</option><option value="winter">Winter</option></select></div></div>
          <button className="icon-button pause-button" aria-label={paused ? 'Resume world animation' : 'Pause world animation'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
        </div>
        <div className="hero-footer"><a href="#world"><ArrowDown size={18} /> A world worth getting lost in</a><span>Small beginnings. Extraordinary stories.</span><Compass size={33} weight="thin" /></div>
      </section>
      <section className="story-section" id="world" aria-labelledby="world-title">
        <div className="section-heading"><p className="eyebrow">WELCOME TO ALDERWICK</p><h2 id="world-title">It starts with a shore.<br /><em>It becomes your story.</em></h2></div>
        <div className="story-body"><p>Somewhere between the trees and the tide, there’s a place waiting for you. A living little settlement, full of people with plans of their own.</p><div className="chapter-tabs" role="tablist" aria-label="Life in Alderwick">{chapters.map((c, i) => <button key={c.number} role="tab" id={`chapter-${i}`} aria-controls={`chapter-panel-${i}`} aria-selected={chapter === i} tabIndex={chapter === i ? 0 : -1} onClick={() => { setChapter(i); setSeason(c.season); }} onKeyDown={e => { if (['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3; setChapter(next); setSeason(chapters[next].season); document.getElementById(`chapter-${next}`)?.focus(); } }}><span>{c.number}</span>{c.title}</button>)}</div>{chapters.map((c, i) => <div role="tabpanel" id={`chapter-panel-${i}`} aria-labelledby={`chapter-${i}`} key={i} hidden={chapter !== i} className="chapter-panel"><p>{c.text}</p><span>{c.detail}</span></div>)}</div>
      </section>
      <section className="discovery-section" id="discover" aria-labelledby="discovery-title">
        <div className="discovery-header"><span className="stamp"><Compass size={46} weight="thin" /></span><div><p className="eyebrow">CURIOSITY LOOKS GOOD ON YOU</p><h2 id="discovery-title">There’s more than<br /><em>meets the island.</em></h2></div></div>
        <div className="discovery-copy"><p>Pip left a few things around the harbor. Follow the little glimmers in the world above. A letter, a friend, a new beginning.</p><div className="discovery-progress" aria-label={`${found.length} of 3 discoveries found`}>{[0,1,2].map(i => <span key={i} className={found.includes(i) ? 'complete' : ''}>{found.includes(i) ? <Check size={17} /> : <Sparkle size={17} />}</span>)}<strong>{found.length} / 3 found</strong></div><a className="text-link" href="#island">{found.length === 3 ? 'Visit your discoveries again' : 'Let’s have a look around'}<ArrowRight size={18} /></a>{found.length === 3 && <p className="completion-note">A curious soul. You’ll fit right in here.</p>}</div>
      </section>
      <section className="closing-section" aria-labelledby="closing-title"><TreeEvergreen size={33} weight="duotone" /><p className="eyebrow">THE SHORE IS WAITING</p><h2 id="closing-title">Make yourself<br /><em>at home.</em></h2><AdventureButton onClick={openDownload} /><p>Alderwick · A little world with a life of its own</p></section>
    </main>
    <footer className="site-footer"><a className="footer-wordmark" href="#">Alderwick</a><p>An independent world, made with care.</p><span>© {new Date().getFullYear()} Alderwick</span></footer>
    {discovery !== null && <div className="discovery-toast" role="region" aria-label="Island discovery"><button className="icon-button toast-close" aria-label="Close discovery" onClick={() => setDiscovery(null)}><X size={18} /></button><p className="eyebrow">LITTLE DISCOVERY {discoveries[discovery].icon}</p><h3>{discoveries[discovery].title}</h3><p>{discoveries[discovery].text}</p><span className="found-item"><Check size={16} />{discoveries[discovery].item}</span><span className="sr-only" role="status">Discovered {discoveries[discovery].title}. {discoveries[discovery].text} {found.length} of 3 found.</span></div>}
    <DownloadDialog open={download} onClose={closeDownload} release={release} />
  </>;
}

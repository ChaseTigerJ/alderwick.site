import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, Check, Compass, Leaf, Moon, Pause, Play, Sparkle, Sun, TreeEvergreen, X } from '@phosphor-icons/react';
import Island, { type Season } from './Island';
import { AdventureButton, AvailabilityDialog, StoreButtons, type AvailabilityKind } from './Availability';
import { useSiteSettings } from './use-site-settings';

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

export default function App() {
  const reduced = !!useReducedMotion();
  const { config, release, mobile, night, season, downloadAvailable, previewNight, previewSeason, useAutomaticWorld, manualWorld } = useSiteSettings();
  const [paused, setPaused] = useState(false);
  const [found, setFound] = useState<number[]>([]);
  const [discovery, setDiscovery] = useState<number | null>(null);
  const [action, setAction] = useState<{ id: number; nonce: number } | null>(null);
  const [availability, setAvailability] = useState<AvailabilityKind | null>(null);
  const [chapter, setChapter] = useState(0);
  const lastFocus = useRef<HTMLElement | null>(null);
  const nextAction = useRef(0);
  useEffect(() => { document.documentElement.dataset.night = String(night); }, [night]);
  useEffect(() => { if (!availability) return; const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, [availability]);
  useEffect(() => { if (discovery === null) return; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setDiscovery(null); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [discovery]);
  const openAvailability = (kind: AvailabilityKind = 'desktop') => { lastFocus.current = document.activeElement as HTMLElement; setAvailability(kind); };
  const closeAvailability = () => { setAvailability(null); lastFocus.current?.focus(); };
  const discover = (id: number) => { setFound(current => current.includes(id) ? current : [...current, id]); setDiscovery(id); setAction({ id, nonce: ++nextAction.current }); };
  const adventureCta = mobile ? <StoreButtons config={config} onComingSoon={openAvailability} /> : <AdventureButton onClick={() => openAvailability()} available={downloadAvailable} />;
  const enter = reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: .75 } };
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <a className="wordmark" href="#" aria-label="Alderwick home"><TreeEvergreen weight="duotone" /><span>Alderwick</span></a>
      <nav aria-label="Main navigation">
        <a href="#world">The world</a>
        <a href="#discover">A little mischief</a>
        {!mobile && <button className="nav-download" onClick={() => openAvailability()}>{downloadAvailable ? 'Download' : 'Coming Soon!'} <ArrowDown size={16} /></button>}
      </nav>
      <a className="header-scroll" href="#world" aria-label="Explore Alderwick">Explore <ArrowDown size={14} /></a>
    </header>
    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <motion.div className="hero-copy" {...enter}>
          <p className="eyebrow"><span /> A COASTAL SETTLEMENT BUILDER</p>
          <h1 id="hero-title">A little world.<br />A grand<br /><em>beginning.</em></h1>
          <p className="hero-description">Build a home at the edge of the wild.<br />And a story that could only be yours.</p>
          {adventureCta}
          <p className="cta-note">{mobile ? <>A little world, soon in your pocket.</> : downloadAvailable ? <>For desktop <span>·</span> Start something small</> : <>Good things take a little growing.</>}</p>
        </motion.div>
        <div className="world-stage" id="island">
          <Island night={night} season={season} paused={paused} reducedMotion={reduced} found={found} onDiscover={discover} action={action} onTogglePause={() => setPaused(value => !value)} />
        </div>
        <details className="world-settings">
          <summary><Leaf size={14} /> World mood</summary>
          <div className="mood-panel">
            <div className="time-toggle" aria-label="Time of day">
              <button aria-label="Daytime" aria-pressed={!night} onClick={() => previewNight(false)}><Sun size={19} weight={!night ? 'fill' : 'regular'} /></button>
              <button aria-label="Nighttime" aria-pressed={night} onClick={() => previewNight(true)}><Moon size={18} weight={night ? 'fill' : 'regular'} /></button>
            </div>
            <div className="season-picker"><label htmlFor="season">A change of season</label><div><Leaf size={15} /><select id="season" value={season} onChange={event => previewSeason(event.target.value as Season)}><option value="spring">Spring</option><option value="summer">Summer</option><option value="autumn">Autumn</option><option value="winter">Winter</option></select></div></div>
            <button className="icon-button pause-button" aria-label={paused ? 'Resume world animation' : 'Pause world animation'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
            {manualWorld && <button className="automatic-world" onClick={useAutomaticWorld}>Use my current day & season</button>}
          </div>
        </details>
        <div className="hero-footer"><a href="#world"><ArrowDown size={18} /> A world worth getting lost in</a><span>Small beginnings. Extraordinary stories.</span><Compass size={33} weight="thin" /></div>
      </section>
      <section className="story-section" id="world" aria-labelledby="world-title">
        <div className="section-heading"><p className="eyebrow">WELCOME TO ALDERWICK</p><h2 id="world-title">It starts with a shore.<br /><em>It becomes your story.</em></h2></div>
        <div className="story-body"><p>Somewhere between the trees and the tide, there’s a place waiting for you. A living little settlement, full of people with plans of their own.</p><div className="chapter-tabs" role="tablist" aria-label="Life in Alderwick">{chapters.map((c, i) => <button key={c.number} role="tab" id={`chapter-${i}`} aria-controls={`chapter-panel-${i}`} aria-selected={chapter === i} tabIndex={chapter === i ? 0 : -1} onClick={() => { setChapter(i); previewSeason(c.season); }} onKeyDown={e => { if (['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3; setChapter(next); previewSeason(chapters[next].season); document.getElementById(`chapter-${next}`)?.focus(); } }}><span>{c.number}</span>{c.title}</button>)}</div>{chapters.map((c, i) => <div role="tabpanel" id={`chapter-panel-${i}`} aria-labelledby={`chapter-${i}`} key={i} hidden={chapter !== i} className="chapter-panel"><p>{c.text}</p><span>{c.detail}</span></div>)}</div>
      </section>
      <section className="discovery-section" id="discover" aria-labelledby="discovery-title">
        <div className="discovery-header"><span className="stamp"><Compass size={46} weight="thin" /></span><div><p className="eyebrow">CURIOSITY LOOKS GOOD ON YOU</p><h2 id="discovery-title">There’s more than<br /><em>meets the island.</em></h2></div></div>
        <div className="discovery-copy"><p>Pip left a few things around the harbor. Follow the little glimmers in the world above. A letter, a friend, a new beginning.</p><div className="discovery-progress" aria-label={`${found.length} of 3 discoveries found`}>{[0,1,2].map(i => <span key={i} className={found.includes(i) ? 'complete' : ''}>{found.includes(i) ? <Check size={17} /> : <Sparkle size={17} />}</span>)}<strong>{found.length} / 3 found</strong></div><a className="text-link" href="#island">{found.length === 3 ? 'Visit your discoveries again' : 'Let’s have a look around'}<ArrowRight size={18} /></a>{found.length === 3 && <p className="completion-note">A curious soul. You’ll fit right in here.</p>}</div>
      </section>
      <section className="closing-section" aria-labelledby="closing-title"><TreeEvergreen size={33} weight="duotone" /><p className="eyebrow">THE SHORE IS WAITING</p><h2 id="closing-title">Make yourself<br /><em>at home.</em></h2>{adventureCta}<p>Alderwick · A little world with a life of its own</p></section>
    </main>
    <footer className="site-footer"><a className="footer-wordmark" href="#">Alderwick</a><p>An independent world, made with care.</p><span>© {new Date().getFullYear()} Alderwick</span></footer>
    {discovery !== null && <div className="discovery-toast" role="region" aria-label="Island discovery"><button className="icon-button toast-close" aria-label="Close discovery" onClick={() => setDiscovery(null)}><X size={18} /></button><p className="eyebrow">LITTLE DISCOVERY {discoveries[discovery].icon}</p><h3>{discoveries[discovery].title}</h3><p>{discoveries[discovery].text}</p><span className="found-item"><Check size={16} />{discoveries[discovery].item}</span><button className="discovery-replay text-link" onClick={() => { discover(discovery); document.getElementById('island')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' }); }}>{discovery === 0 ? 'Send another letter' : discovery === 1 ? 'Play with Khloé' : 'Rock the boat'}<ArrowRight size={16} /></button><span className="sr-only" role="status">Discovered {discoveries[discovery].title}. {discoveries[discovery].text} {found.length} of 3 found.</span></div>}
    <AvailabilityDialog kind={availability} onClose={closeAvailability} release={release} config={config} mobile={mobile} downloadAvailable={downloadAvailable} />
  </>;
}

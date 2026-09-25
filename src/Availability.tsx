import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { AppStoreLogo, ArrowDown, ArrowUpRight, Check, DownloadSimple, GooglePlayLogo, Package, X } from '@phosphor-icons/react';
import type { Release, SiteConfig } from './site-config';
export type AvailabilityKind = 'desktop' | 'ios' | 'android';
export function AdventureButton({ onClick, available }: { onClick: () => void; available: boolean }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 250, damping: 18 }), springY = useSpring(y, { stiffness: 250, damping: 18 });
  return <span className="adventure-wrap"><span className="parcel-whisper" aria-hidden="true">{available ? 'Careful. May contain an entire world.' : 'A little anticipation. A grand adventure.'}</span><motion.button className="primary-button adventure-button" style={{ x: springX, y: springY }} onPointerMove={event => { if (reduce || event.pointerType !== 'mouse') return; const box = event.currentTarget.getBoundingClientRect(); x.set((event.clientX - box.left - box.width / 2) * .035); y.set((event.clientY - box.top - box.height / 2) * .09); }} onPointerLeave={() => { x.set(0); y.set(0); }} onClick={onClick}><Package size={23} weight="duotone" /><span>{available ? 'Unpack your adventure' : 'Coming Soon!'}</span><ArrowUpRight size={21} /></motion.button></span>;
}
export function StoreButtons({ config, onComingSoon }: { config: SiteConfig | null; onComingSoon: (kind: AvailabilityKind) => void }) {
  return <div className="store-buttons" aria-label="Alderwick for mobile">{(['ios', 'android'] as const).map(platform => {
    const store = config?.stores[platform];
    const title = platform === 'ios' ? 'App Store' : 'Google Play';
    const content = <>{platform === 'ios' ? <AppStoreLogo size={28} weight="fill" /> : <GooglePlayLogo size={27} weight="fill" />}<span><small>{store?.enabled ? 'Discover on the' : 'COMING SOON'}</small><strong>{title}</strong></span></>;
    return store?.enabled && store.url ? <a key={platform} className="store-button" href={store.url} target="_blank" rel="noopener noreferrer" aria-label={`Alderwick on ${title} (opens in a new tab)`}>{content}</a> : <button key={platform} className="store-button" onClick={() => onComingSoon(platform)} aria-label={`${title} — Coming Soon`}>{content}</button>;
  })}</div>;
}
export function AvailabilityDialog({ kind, onClose, release, config, mobile, downloadAvailable }: { kind: AvailabilityKind | null; onClose: () => void; release: Release | null; config: SiteConfig | null; mobile: boolean; downloadAvailable: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [unpacked, setUnpacked] = useState(false);
  const canDownload = kind === 'desktop' && !mobile && downloadAvailable && release !== null;
  const isMobileNotice = kind === 'ios' || kind === 'android' || mobile;
  useEffect(() => {
    if (kind) { setUnpacked(false); if (!dialog.current?.open) dialog.current?.showModal(); }
    else dialog.current?.close();
  }, [kind]);
  return <dialog ref={dialog} className="download-dialog" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }} aria-labelledby="availability-title">
    <button className="dialog-close icon-button" aria-label="Close availability details" onClick={onClose}><X size={22} /></button>
    <div className={`parcel-seal ${unpacked && canDownload ? 'is-open' : ''}`} aria-hidden="true">{isMobileNotice ? (kind === 'android' ? <GooglePlayLogo size={48} weight="duotone" /> : <AppStoreLogo size={48} weight="duotone" />) : <Package size={55} weight="duotone" />}{unpacked && canDownload && Array.from({ length: 14 }, (_, index) => <i key={index} className="parcel-confetti" style={{ '--i': index } as React.CSSProperties} />)}</div>
    <p className="eyebrow">{isMobileNotice ? 'A WORLD ON ITS WAY' : 'A SPECIAL DELIVERY'}</p>
    <h2 id="availability-title">{canDownload ? <>Your next chapter,<br /><em>packed.</em></> : <>Coming <em>Soon!</em></>}</h2>
    <p className="dialog-intro">{canDownload ? 'One little world. Ready to make your own.' : isMobileNotice ? config?.stores.comingSoonText ?? 'Alderwick for phones and tablets is coming soon.' : config?.download.comingSoonText ?? 'Your next adventure is on its way. Come back soon!'}</p>
    {canDownload && release ? <>
      <div className="release-details"><div><strong>{release.title}</strong><span>{release.version} · {release.size} · ZIP</span></div><DownloadSimple size={23} /></div>
      <a className="primary-button download-action" href={release.url} download onClick={() => setUnpacked(true)}><DownloadSimple size={19} />{unpacked ? 'Download again' : 'Download Alderwick'}<ArrowDown size={19} /></a>
      {unpacked && <p className="download-success" role="status"><Check size={16} /> Your adventure is on its way. Check your downloads.</p>}
      <details className="installation" open><summary>How to unpack your adventure</summary><p>{release.requirements}</p><p>Your settlement saves in this browser. Keep using the same launcher and browser to return to it.</p></details>
      <span className="edition-note">Portable browser edition · No account required</span>
    </> : <button className="primary-button" onClick={onClose}>Back to the little world <ArrowUpRight size={18} /></button>}
  </dialog>;
}

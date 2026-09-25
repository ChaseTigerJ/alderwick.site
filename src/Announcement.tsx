import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, EnvelopeSimple, TreeEvergreen, X } from '@phosphor-icons/react';
import { announcementAccentText, announcementStorageKey, type AnnouncementConfig } from './announcement-config';
import './announcement.css';

function storage(config: AnnouncementConfig): Storage | null {
  try { return config.frequency === 'session' ? window.sessionStorage : config.frequency === 'once' ? window.localStorage : null; }
  catch { return null; }
}

export default function Announcement({ config }: { config: AnnouncementConfig | undefined }) {
  if (!config?.enabled) return null;
  return <Notice key={`${config.id}:${config.mode}:${config.frequency}`} config={config} />;
}

function Notice({ config }: { config: AnnouncementConfig }) {
  const [visible, setVisible] = useState(() => {
    try { return storage(config)?.getItem(announcementStorageKey(config)) !== 'dismissed'; }
    catch { return true; }
  });
  const [imageFailed, setImageFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const close = () => {
    try { storage(config)?.setItem(announcementStorageKey(config), 'dismissed'); } catch { /* Storage may be blocked in private browsing. */ }
    setVisible(false);
  };
  useEffect(() => {
    if (!visible || config.mode !== 'letter') return;
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    title.current?.focus({ preventScroll: true });
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [visible, config.mode]);
  if (!visible) return null;
  const styles = {
    '--notice-paper': config.colors.background,
    '--notice-ink': config.colors.text,
    '--notice-accent': config.colors.accent,
    '--notice-accent-text': announcementAccentText(config.colors.accent),
  } as CSSProperties;
  const image = config.image && !imageFailed ? config.image : null;
  const message = <>
    <button className="notice-close" aria-label="Dismiss announcement" onClick={close}><X size={19} /></button>
    {image && <figure className="notice-picture">
      <img src={image.url} alt={image.alt} onError={() => setImageFailed(true)} />
      {image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>}
    <div className="notice-copy">
      <div className="notice-letterhead"><span className="notice-seal" aria-hidden="true"><TreeEvergreen size={26} weight="duotone" /></span><p>{config.kicker}</p><EnvelopeSimple className="notice-postmark" size={32} weight="thin" aria-hidden="true" /></div>
      <h2 id="announcement-title" ref={title} tabIndex={-1}>{config.title}</h2>
      <div id="announcement-body" className="notice-body">{config.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      <div className="notice-actions">
        {config.action && <a className="notice-action" href={config.action.url} target={config.action.newTab ? '_blank' : undefined} rel={config.action.newTab ? 'noopener noreferrer' : undefined} onClick={close}>{config.action.label}<ArrowUpRight size={18} /><span className="sr-only">{config.action.newTab ? ' (opens in a new tab)' : ''}</span></a>}
        <button className={`notice-dismiss${config.action ? '' : ' notice-dismiss-only'}`} onClick={close}>{config.dismissLabel}<span aria-hidden="true">↗</span></button>
      </div>
      <p className="notice-signature">With care, <span>Alderwick</span></p>
    </div>
  </>;
  const className = `announcement notice-${config.mode}${image ? ' notice-has-image' : ''}`;
  return config.mode === 'letter' ? <dialog ref={dialog} className={className} style={styles} aria-labelledby="announcement-title" aria-describedby="announcement-body" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); } }}><div className="notice-layout">{message}</div></dialog> : <section role="region" aria-labelledby="announcement-title" className={className} style={styles}><div className="notice-layout">{message}</div></section>;
}

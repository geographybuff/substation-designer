import { useEffect, useRef, useState } from 'preact/hooks';
import { isDesktop } from '../desktop';
import { acceptLicense, declineLicense, LICENSE_NAME, LICENSE_SUMMARY, LICENSE_TEXT } from '../license';
import { store } from '../store';

/**
 * Blocking license acceptance screen. The player must scroll through the full
 * license text and tick the agreement box before "Accept" is enabled.
 */
export function LicenseGate() {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [declined, setDeclined] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setScrolledToEnd(true);
  };
  useEffect(() => {
    checkScroll();
  }, []);

  if (declined) {
    return (
      <div class="screen center menu-bg" data-testid="license-declined">
        <div class="card" style={{ maxWidth: 560, textAlign: 'center' }}>
          <h2>License not accepted</h2>
          <p class="muted">Substation Designer can only be used under the {LICENSE_NAME}. You can close this window, or review the license again.</p>
          <button class="btn" onClick={() => setDeclined(false)}>
            Review the license again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="modal-back" role="dialog" aria-modal="true" aria-labelledby="license-title" data-testid="license-gate">
      <div class="modal">
        <div class="modal-head">
          <h2 id="license-title">License Agreement</h2>
          <div class="muted small">Please read and accept the license to play Substation Designer.</div>
        </div>
        <div class="modal-body">
          <ul>
            {LICENSE_SUMMARY.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div class="license-text" ref={boxRef} onScroll={checkScroll} tabIndex={0} data-testid="license-text">
            {LICENSE_TEXT}
          </div>
          <label style={{ display: 'flex', gap: '.5em', alignItems: 'center', marginTop: '.9em', opacity: scrolledToEnd ? 1 : 0.5 }}>
            <input type="checkbox" checked={agreed} disabled={!scrolledToEnd} onChange={(e) => setAgreed((e.target as HTMLInputElement).checked)} data-testid="license-agree" />
            I have read the {LICENSE_NAME} and agree to its terms.
          </label>
          {!scrolledToEnd && <div class="muted small">Scroll to the end of the license text to continue.</div>}
        </div>
        <div class="modal-foot">
          <button
            class="btn danger"
            onClick={() => {
              declineLicense();
              if (!isDesktop) setDeclined(true);
            }}
            data-testid="license-decline"
          >
            {isDesktop ? 'Decline and quit' : 'Decline'}
          </button>
          <button
            class="btn primary"
            disabled={!agreed}
            onClick={() => {
              acceptLicense();
              store.set({ licenseAccepted: true });
            }}
            data-testid="license-accept"
          >
            Accept and continue
          </button>
        </div>
      </div>
    </div>
  );
}

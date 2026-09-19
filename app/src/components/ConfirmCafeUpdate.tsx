import type { DetailsCheck } from '../lib/cafeRules'

type Props = {
  cafeName: string
  saved: { address: string | null; map_url: string | null }
  check: DetailsCheck
  busy: boolean
  onConfirm: () => void   // update the directory AND save the visit
  onSkip: () => void      // save the visit only; the directory stays as it is
  onBack: () => void      // keep editing
}

/** Asked when someone changes a cafe's pre-filled details while logging a visit. */
export function ConfirmCafeUpdate({ cafeName, saved, check, busy, onConfirm, onSkip, onBack }: Props) {
  return (
    <div className="overlay center-overlay" role="alertdialog" aria-modal="true" aria-label={`Update ${cafeName} in the directory?`}>
      <div className="dialog">
        <h2 className="sheet-title">Update {cafeName} for everyone?</h2>
        <p className="muted">
          You changed this cafe's details. If you update them, its shared page changes for everybody, and the change is
          recorded in the page history under your name. Entries already logged keep the details they had.
        </p>

        <div className="change-list">
          {check.addressChanged && (
            <div className="change">
              <span className="field-label">Address</span>
              {saved.address && <span className="was">{saved.address}</span>}
              <span className="now">{check.address}</span>
            </div>
          )}
          {check.mapChanged && (
            <div className="change">
              <span className="field-label">Map link</span>
              {saved.map_url && <span className="was">{saved.map_url}</span>}
              <span className="now">{check.mapUrl}</span>
            </div>
          )}
        </div>

        <div className="stack">
          <button className="btn primary" onClick={onConfirm} disabled={busy}>{busy ? 'Saving…' : 'Update the directory and save'}</button>
          <button className="btn ghost wide" onClick={onSkip} disabled={busy}>Save my visit only</button>
          <button className="link mut" onClick={onBack} disabled={busy}>Keep editing</button>
        </div>
      </div>
    </div>
  )
}

export function CriteriaBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="criteria-row">
      <span className="criteria-label">{label}</span>
      <span className="criteria-track"><span className="criteria-fill" style={{ width: `${(value / 5) * 100}%` }} /></span>
      <span className="criteria-value">{value ? value.toFixed(1) : '–'}</span>
    </div>
  )
}

import { PIN_LENGTH } from '../data/auth'

type Props = {
  id: string
  value: string
  onChange: (v: string) => void
  label: string
  autoComplete?: string
  autoFocus?: boolean
}

/** Digits only, masked, with the numeric keypad on phones. */
export function PinInput({ id, value, onChange, label, autoComplete = 'off', autoFocus }: Props) {
  return (
    <>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id} className="input pin" type="password" inputMode="numeric" pattern="[0-9]*"
        autoComplete={autoComplete} autoFocus={autoFocus}
        placeholder={'•'.repeat(PIN_LENGTH)} value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
      />
    </>
  )
}

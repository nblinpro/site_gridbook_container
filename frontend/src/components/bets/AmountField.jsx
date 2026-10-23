import { formatApex } from "../../utils/format";
import "./betSlip.css";

const STEPS = [10, 50, 100];

/** Champ « Mise » : saisie libre suffixée APEX + raccourcis +10 / +50 / +100 / Max. */
export default function AmountField({ id, value, onChange, wallet, error, disabled = false }) {
  const current = Math.max(0, Math.floor(Number(value) || 0));
  const max = Math.max(0, Math.floor(Number(wallet) || 0));
  const set = (n) => onChange(String(Math.min(max, Math.max(0, n))));

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>Mise</label>
      <div className="input-group">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          max={max || undefined}
          className="input amount-input num"
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-help`}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="input-suffix">APEX</span>
      </div>
      <div className="amount-chips" role="group" aria-label="Raccourcis de mise">
        {STEPS.map((step) => (
          <button key={step} type="button" className="amount-chip" disabled={disabled || current >= max} onClick={() => set(current + step)}>
            +{step}
          </button>
        ))}
        <button type="button" className="amount-chip" disabled={disabled || max === 0} onClick={() => set(max)}>Max</button>
      </div>
      <span id={`${id}-help`} className={error ? "field-error" : "field-hint"}>
        {error || `Solde disponible : ${formatApex(wallet)} APEX`}
      </span>
    </div>
  );
}

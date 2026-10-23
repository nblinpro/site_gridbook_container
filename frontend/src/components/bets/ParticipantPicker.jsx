import { useId, useMemo, useState } from "react";
import Icon from "../ui/Icon";
import { formatOdds } from "../../utils/format";
import "./betSlip.css";

// Retire accents et majuscules pour une recherche tolérante (« perez » trouve « Pérez »)
const normalize = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Liste de sélection d'un pilote / d'une équipe, avec recherche.
 * Boutons radio natifs : flèches du clavier pour se déplacer, Espace pour choisir.
 * `oddsFor(id)` renvoie la cote actuelle (ou null s'il n'y a encore aucune mise).
 */
export default function ParticipantPicker({ items, value, onChange, legend, searchPlaceholder, oddsFor, disabled = false }) {
  const [query, setQuery] = useState("");
  const name = useId();

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return items;
    return items.filter((it) => normalize(it.name).includes(q) || normalize(it.team_name).includes(q));
  }, [items, query]);

  return (
    <fieldset className="picker" disabled={disabled}>
      <legend className="field-label">{legend}</legend>
      <label className="picker-search">
        <span className="sr-only">Rechercher</span>
        <Icon name="search" size={16} />
        <input
          type="search"
          className="input input-sm"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="picker-list" role="presentation">
        {shown.length === 0 && <p className="picker-empty">Aucun résultat pour « {query} ».</p>}
        {shown.map((it) => {
          const checked = String(value) === String(it.id);
          const odds = oddsFor?.(it.id);
          return (
            <label key={it.id} className={`picker-row ${checked ? "is-selected" : ""}`}>
              <input
                type="radio"
                name={name}
                value={it.id}
                checked={checked}
                onChange={() => onChange(String(it.id))}
                className="picker-radio"
              />
              <span className="picker-check" aria-hidden><Icon name="check" size={12} strokeWidth={3} /></span>
              <span className="picker-text">
                <span className="picker-name">{it.name}</span>
                {it.team_name && <span className="picker-team">{it.team_name}</span>}
              </span>
              {oddsFor && (
                <span className={`picker-odds num ${odds ? "" : "is-empty"}`}>
                  {odds ? formatOdds(odds) : "—"}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

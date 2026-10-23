/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DISCIPLINES, getDiscipline } from "../../data/disciplines";

const STORAGE_KEY = "gridbook.discipline";
const DisciplineContext = createContext(null);

const readStored = () => {
  try { return localStorage.getItem(STORAGE_KEY) || "f1"; } catch { return "f1"; }
};
const writeStored = (slug) => {
  try { localStorage.setItem(STORAGE_KEY, slug); } catch { /* stockage indisponible : on garde l'état en mémoire */ }
};

// Discipline courante : déduite de l'URL quand la page appartient à un sport,
// sinon (classement, historique, pari, admin) la dernière discipline visitée.
export function DisciplineProvider({ children }) {
  const location = useLocation();
  const [stored, setStored] = useState(readStored);

  const fromPath = DISCIPLINES.find((d) => d.matchPrefixes.some((p) => location.pathname.startsWith(p)));
  const slug = fromPath ? fromPath.slug : stored;

  useEffect(() => {
    if (fromPath && fromPath.slug !== stored) {
      setStored(fromPath.slug);
      writeStored(fromPath.slug);
    }
  }, [fromPath, stored]);

  const setDiscipline = useCallback((next) => {
    setStored(next);
    writeStored(next);
  }, []);

  return (
    <DisciplineContext.Provider value={{ discipline: getDiscipline(slug), setDiscipline }}>
      {children}
    </DisciplineContext.Provider>
  );
}

export const useDiscipline = () => useContext(DisciplineContext);

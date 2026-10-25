import { toDate } from "../../utils/format";

export const CATEGORY_LABEL = { avatar: "Avatar", frame: "Cadre", badge: "Badge", title: "Titre", name_color: "Pseudo" };
export const RARITY_LABEL = { common: "Commun", rare: "Rare", epic: "Épique", legendary: "Légendaire" };
export const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };

export const CATEGORIES = [
  { key: "all", label: "Tout" },
  { key: "avatar", label: "Avatars" },
  { key: "frame", label: "Cadres" },
  { key: "badge", label: "Badges" },
  { key: "title", label: "Titres" },
  { key: "name_color", label: "Pseudos" },
];

export const SORTS = [
  { key: "featured", label: "Pertinence" },
  { key: "price_asc", label: "Prix croissant" },
  { key: "price_desc", label: "Prix décroissant" },
  { key: "rarity", label: "Rareté" },
  { key: "popular", label: "Popularité" },
];

/** Cosmétiques du joueur si l'article était équipé (aperçu, essayage). */
export function withItem(cosmetics, product) {
  const next = { ...(cosmetics || {}), [product.category]: product.value };
  if (product.category === "frame") next.frame_rarity = product.rarity;
  return next;
}

/** « Plus que 3 j 4 h », « Plus que 5 h » : temps restant avant la fin d'une vente. */
export function endsIn(iso) {
  const diff = toDate(iso).getTime() - Date.now();
  if (diff <= 0) return "Vente terminée";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return days > 0 ? `Plus que ${days} j ${hours} h` : `Plus que ${Math.max(hours, 1)} h`;
}

const normalize = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Catalogue filtré et trié selon les choix de la barre d'outils. */
export function filterProducts(products, { category, rarity, sort, query, hideOwned }) {
  const q = normalize(query.trim());
  const list = products.filter((p) =>
    !p.reward
    && (category === "all" || p.category === category)
    && (rarity === "all" || p.rarity === rarity)
    && (!hideOwned || !p.owned)
    && (!q || normalize(`${p.name} ${p.description} ${p.collection?.name || ""}`).includes(q)));
  const by = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    rarity: (a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.price - b.price,
    popular: (a, b) => b.owners_pct - a.owners_pct || Number(b.popular) - Number(a.popular),
    featured: (a, b) => Number(b.featured) - Number(a.featured) || Number(!!b.available_until) - Number(!!a.available_until)
      || Number(b.stock != null) - Number(a.stock != null) || RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity],
  }[sort];
  return by ? [...list].sort(by) : list;
}

import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import PageHeader from "../components/ui/PageHeader";
import Icon from "../components/ui/Icon";
import UserAvatar from "../components/cosmetics/UserAvatar";
import ConfirmDialog from "../components/confirm/ConfirmDialog";
import F1LightsLoader from "../components/loader/F1LightsLoader";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastContext";
import { getDiscipline } from "../data/disciplines";
import apiClient from "../services/apiClient";
import { formatApiError } from "../services/apiError";
import "./shop.css";

const CATEGORIES = [
  { key: "all", label: "Tout" },
  { key: "avatar", label: "Avatars" },
  { key: "frame", label: "Cadres" },
  { key: "badge", label: "Badges" },
  { key: "title", label: "Titres" },
];
const CATEGORY_LABEL = { avatar: "Avatar", frame: "Cadre", badge: "Badge", title: "Titre" };
const RARITY_LABEL = { common: "Commun", rare: "Rare", epic: "Épique", legendary: "Légendaire" };

// Cosmétiques du joueur si l'article était équipé : sert à l'aperçu et au visuel des cartes
function withItem(cosmetics, product) {
  const next = { ...(cosmetics || {}), [product.category]: product.value };
  if (product.category === "frame") next.frame_rarity = product.rarity;
  return next;
}

function ProductVisual({ product, username }) {
  if (product.category === "title") {
    return <div className="shop-visual-title">« {product.value} »</div>;
  }
  return <UserAvatar username={username} cosmetics={withItem({}, product)} size={72} />;
}

export default function Shop() {
  const { user, fetchUser } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "admin";

  const [products, setProducts] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [view, setView] = useState("shop"); // shop | inventory | admin
  const [preview, setPreview] = useState(null);
  const [toBuy, setToBuy] = useState(null);
  const [busy, setBusy] = useState(null);
  const [prices, setPrices] = useState({});

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/shop/products");
      setProducts(data);
    } catch (err) {
      toast.error(formatApiError(err, "Impossible de charger la boutique."));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadCatalog = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/shop/admin/products");
      setCatalog(data);
      setPrices(Object.fromEntries(data.map((p) => [p.id, p.price])));
    } catch (err) {
      toast.error(formatApiError(err, "Impossible de charger le catalogue."));
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (view === "admin") loadCatalog(); }, [view, loadCatalog]);

  const refreshProfile = () => {
    fetchUser();
    window.dispatchEvent(new Event("refreshDashboard"));
  };

  const confirmBuy = async () => {
    const product = toBuy;
    setToBuy(null);
    setBusy(product.id);
    try {
      const { data } = await apiClient.post(`/shop/buy/${product.id}`);
      toast.success(`${data.message}. Pense à l'équiper !`);
      await load();
      refreshProfile();
    } catch (err) {
      toast.error(formatApiError(err, "Achat impossible."));
    } finally {
      setBusy(null);
    }
  };

  const toggleEquip = async (product) => {
    setBusy(product.id);
    try {
      const { data } = await apiClient.post(`/shop/equip/${product.id}`);
      toast.success(data.equipped ? `${product.name} équipé.` : `${product.name} retiré.`);
      await load();
      refreshProfile();
    } catch (err) {
      toast.error(formatApiError(err, "Action impossible."));
    } finally {
      setBusy(null);
    }
  };

  const updateProduct = async (product, changes, message) => {
    try {
      await apiClient.patch(`/shop/admin/products/${product.id}`, changes);
      toast.success(message);
      await Promise.all([loadCatalog(), load()]);
    } catch (err) {
      toast.error(formatApiError(err, "Modification impossible."));
    }
  };

  const wallet = parseFloat(user?.wallet || 0);
  const owned = products.filter((p) => p.owned);
  const shown = useMemo(() => {
    const base = view === "inventory" ? products.filter((p) => p.owned) : products;
    return category === "all" ? base : base.filter((p) => p.category === category);
  }, [products, view, category]);

  const previewCosmetics = preview ? withItem(user?.cosmetics, preview) : user?.cosmetics;

  if (loading) return <F1LightsLoader label="Ouverture de la boutique…" />;

  return (
    <Layout rail={false}>
      <div className="page shop-page">
        <div className="shop-header">
          <PageHeader
            eyebrow="Paddock store"
            title="Boutique"
            subtitle="Personnalise ton profil avec tes APEX. Articles 100 % cosmétiques : aucun effet sur les paris ni sur les cotes."
          />

          <div className="shop-preview" aria-live="polite">
            <UserAvatar username={user?.username} cosmetics={previewCosmetics} size={84} />
            <div className="shop-preview-meta">
              <span className="shop-preview-label">{preview ? `Aperçu · ${preview.name}` : "Ton profil"}</span>
              <strong className="shop-preview-name">{user?.username}</strong>
              {previewCosmetics?.title && <span className="ua-title">{previewCosmetics.title}</span>}
              <span className="shop-preview-wallet"><span className="num">{wallet.toLocaleString("fr-FR")} APEX</span> · {owned.length}/{products.length} articles</span>
            </div>
          </div>
        </div>

        <div className="shop-toolbar">
          <div className="tabs shop-views" role="tablist" aria-label="Vue">
            <button role="tab" className="tab" aria-selected={view === "shop"} onClick={() => setView("shop")}>Catalogue</button>
            <button role="tab" className="tab" aria-selected={view === "inventory"} onClick={() => setView("inventory")}>Mon inventaire <span className="badge">{owned.length}</span></button>
            {isAdmin && <button role="tab" className="tab" aria-selected={view === "admin"} onClick={() => setView("admin")}><Icon name="settings" size={14} /> Gestion (admin)</button>}
          </div>
          <div className="segmented shop-filters" role="group" aria-label="Catégorie">
            {CATEGORIES.map((c) => (
              <button key={c.key} aria-pressed={category === c.key} onClick={() => setCategory(c.key)}>{c.label}</button>
            ))}
          </div>
        </div>

        {view === "admin" ? (
          <section className="shop-admin">
            <p className="muted">Retirer un article le cache de la boutique ; les joueurs qui l'ont déjà acheté le gardent.</p>
            <div className="card card-flush"><div className="table-wrap">
              <table className="table shop-admin-table">
                <thead>
                  <tr><th>Article</th><th>Type</th><th>Rareté</th><th className="num">Vendus</th><th>Prix (APEX)</th><th>État</th></tr>
                </thead>
                <tbody>
                  {catalog.filter((p) => category === "all" || p.category === category).map((p) => (
                    <tr key={p.id} className={p.is_active ? "" : "inactive"}>
                      <td>{p.category === "title" ? `« ${p.value} »` : p.value} {p.name}</td>
                      <td>{CATEGORY_LABEL[p.category]}</td>
                      <td><span className={`rarity-text ${p.rarity}`}>{RARITY_LABEL[p.rarity]}</span></td>
                      <td className="num">{p.sold}</td>
                      <td>
                        <span className="shop-price-edit">
                          <input type="number" min="1" className="input input-sm num" value={prices[p.id] ?? ""} aria-label={`Prix de ${p.name}`}
                            onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })} />
                          <button className="btn btn-secondary btn-sm" disabled={Number(prices[p.id]) === p.price || !(Number(prices[p.id]) > 0)}
                            onClick={() => updateProduct(p, { price: Number(prices[p.id]) }, `Prix de ${p.name} mis à jour.`)}>Enregistrer</button>
                        </span>
                      </td>
                      <td>
                        <button className={`btn btn-sm ${p.is_active ? "btn-secondary" : "btn-danger"}`}
                          onClick={() => updateProduct(p, { is_active: !p.is_active }, p.is_active ? `${p.name} retiré de la boutique.` : `${p.name} remis en vente.`)}>
                          {p.is_active ? "En vente · retirer" : "Retiré · remettre"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          </section>
        ) : shown.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-title">{view === "inventory" ? "Ton inventaire est vide" : "Aucun article dans cette catégorie"}</span>
            <p>{view === "inventory" ? "Achète un avatar, un cadre, un badge ou un titre pour personnaliser ton profil." : "Choisis une autre catégorie."}</p>
            {view === "inventory" && <button className="btn btn-primary" onClick={() => setView("shop")}>Voir le catalogue</button>}
          </div>
        ) : (
          <div className="shop-grid">
            {shown.map((p) => {
              const sport = p.discipline ? getDiscipline(p.discipline) : null;
              const tooExpensive = !p.owned && p.price > wallet;
              return (
                <article
                  key={p.id}
                  className={`card shop-card ${p.rarity} ${p.equipped ? "equipped" : ""}`}
                  onMouseEnter={() => setPreview(p)}
                  onMouseLeave={() => setPreview(null)}
                  onFocus={() => setPreview(p)}
                  onBlur={() => setPreview(null)}
                >
                  <div className="shop-card-top">
                    <span className={`rarity-text ${p.rarity}`}>{RARITY_LABEL[p.rarity]}</span>
                    <span className="shop-card-cat">
                      {sport && <span className="shop-sport-tag" style={{ background: sport.accent }}>{sport.short}</span>}
                      {CATEGORY_LABEL[p.category]}
                    </span>
                  </div>
                  <div className="shop-card-visual"><ProductVisual product={p} username={user?.username} /></div>
                  <h3 className="shop-card-name">{p.name}</h3>
                  <p className="shop-card-desc">{p.description}</p>
                  <div className="shop-card-foot">
                    {p.owned ? (
                      <>
                        <span className={`badge ${p.equipped ? "badge-success" : ""}`}>{p.equipped ? "Équipé" : "Possédé"}</span>
                        <button className={`btn btn-sm ${p.equipped ? "btn-ghost" : "btn-secondary"}`} disabled={busy === p.id} onClick={() => toggleEquip(p)}>
                          {p.equipped ? "Retirer" : "Équiper"}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="shop-price num">{p.price.toLocaleString("fr-FR")} <small>APEX</small></span>
                        <button className="btn btn-sm shop-buy" disabled={busy === p.id || tooExpensive} title={tooExpensive ? "Solde insuffisant" : undefined} onClick={() => setToBuy(p)}>
                          {tooExpensive ? <><Icon name="lock" size={14} /> Solde insuffisant</> : "Acheter"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toBuy !== null}
        title={`Acheter ${toBuy?.name} ?`}
        message={toBuy ? `${toBuy.price.toLocaleString("fr-FR")} APEX seront débités de ton solde (${wallet.toLocaleString("fr-FR")} APEX). L'achat est définitif.` : ""}
        confirmLabel="Acheter"
        cancelLabel="Annuler"
        onConfirm={confirmBuy}
        onCancel={() => setToBuy(null)}
      />
    </Layout>
  );
}

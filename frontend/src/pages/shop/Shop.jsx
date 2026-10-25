import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import UserAvatar from "../../components/cosmetics/UserAvatar";
import UserName from "../../components/cosmetics/UserName";
import ConfirmDialog from "../../components/confirm/ConfirmDialog";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/toast/ToastContext";
import apiClient from "../../services/apiClient";
import { formatApiError } from "../../services/apiError";
import { formatApex, formatDate } from "../../utils/format";
import { ProductCard, ProductModal, ProductVisual, RewardCard } from "./ShopParts";
import { CATEGORIES, CATEGORY_LABEL, RARITY_LABEL, SORTS, endsIn, filterProducts, withItem } from "./shopUtils";
import "./shop.css";

const VIEWS = [
  { key: "featured", label: "À la une", icon: "sparkles" },
  { key: "catalog", label: "Catalogue", icon: "bag" },
  { key: "collections", label: "Collections", icon: "file" },
  { key: "rewards", label: "Récompenses", icon: "trophy" },
  { key: "inventory", label: "Mon inventaire", icon: "ticket" },
];

export default function Shop() {
  const { user, fetchUser } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "admin";
  const wallet = Number(user?.wallet || 0);

  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState("featured");
  const [filters, setFilters] = useState({ category: "all", rarity: "all", sort: "featured", query: "", hideOwned: false });
  const [preview, setPreview] = useState(null);
  const [opened, setOpened] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: "product" | "collection", item }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([apiClient.get("/shop/products"), apiClient.get("/shop/collections")]);
      setProducts(p.data);
      setCollections(c.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (view === "inventory") apiClient.get("/shop/inventory").then((r) => setHistory(r.data)).catch(() => setHistory([]));
  }, [view, products]);

  // La fiche ouverte suit les données rafraîchies (après un achat, un équipement…)
  const openedProduct = opened ? products.find((p) => p.id === opened) : null;
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const refreshAll = async () => {
    await load();
    fetchUser();
    window.dispatchEvent(new Event("refreshDashboard"));
  };

  const run = async (request, fallback) => {
    setBusy(true);
    try {
      const { data } = await request();
      await refreshAll();
      return data;
    } catch (err) {
      toast.error(formatApiError(err, fallback));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const confirmPurchase = async () => {
    const { kind, item } = confirm;
    setConfirm(null);
    const data = kind === "collection"
      ? await run(() => apiClient.post(`/shop/collections/${item.slug}/buy`), "Achat de la collection impossible.")
      : await run(() => apiClient.post(`/shop/buy/${item.id}`), "Achat impossible.");
    if (data) toast.success(`${data.message}. Pense à l'équiper !`);
  };

  const equip = async (product) => {
    const data = await run(() => apiClient.post(`/shop/equip/${product.id}`), "Action impossible.");
    if (data) toast.success(data.equipped ? `${product.name} équipé.` : `${product.name} retiré.`);
  };

  const claim = async (product) => {
    const data = await run(() => apiClient.post(`/shop/rewards/${product.id}/claim`), "Récompense indisponible.");
    if (data) toast.success(`${data.message}. Tu peux l'équiper dès maintenant.`);
  };

  const wish = async (product) => {
    try {
      const { data } = await apiClient.post(`/shop/wishlist/${product.id}`);
      setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, wishlisted: data.wishlisted } : p)));
      toast.info(data.wishlisted ? `${product.name} ajouté à ta liste de souhaits.` : `${product.name} retiré de ta liste de souhaits.`);
    } catch (err) {
      toast.error(formatApiError(err, "Action impossible."));
    }
  };

  const cardProps = {
    username: user?.username, wallet, busy,
    onOpen: (p) => setOpened(p.id),
    onBuy: (p) => setConfirm({ kind: "product", item: p }),
    onEquip: equip,
    onWish: wish,
    onPreview: setPreview,
  };

  const purchasable = products.filter((p) => !p.reward);
  const rewards = products.filter((p) => p.reward);
  const owned = products.filter((p) => p.owned);
  const claimable = rewards.filter((p) => !p.owned && p.reward.unlocked).length;
  const previewCosmetics = preview ? withItem(user?.cosmetics, preview) : user?.cosmetics;

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
            <UserAvatar username={user?.username} cosmetics={previewCosmetics} size={72} />
            <div className="shop-preview-meta">
              <span className="shop-preview-label">{preview ? `Aperçu · ${preview.name}` : "Ton profil"}</span>
              <UserName name={user?.username} cosmetics={previewCosmetics} className="shop-preview-name" />
              {previewCosmetics?.title && <span className="ua-title">{previewCosmetics.title}</span>}
              <span className="shop-preview-wallet"><span className="num">{formatApex(wallet)} APEX</span> · {owned.length}/{products.length} articles</span>
            </div>
          </div>
        </div>

        <div className="tabs shop-views" role="tablist" aria-label="Rubriques de la boutique">
          {VIEWS.map((v) => (
            <button key={v.key} role="tab" className="tab" aria-selected={view === v.key} onClick={() => setView(v.key)}>
              <Icon name={v.icon} size={14} />{v.label}
              {v.key === "rewards" && claimable > 0 && <span className="badge badge-success">{claimable}</span>}
              {v.key === "inventory" && <span className="badge">{owned.length}</span>}
            </button>
          ))}
          {isAdmin && (
            <button role="tab" className="tab" aria-selected={view === "admin"} onClick={() => setView("admin")}><Icon name="settings" size={14} />Gestion (admin)</button>
          )}
        </div>

        {loading ? (
          <div className="shop-grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ height: 300 }} />)}</div>
        ) : error ? (
          <div className="alert alert-danger"><Icon name="info" size={16} />Impossible de charger la boutique. <button className="btn-link" onClick={load}>Réessayer</button></div>
        ) : view === "featured" ? (
          <FeaturedView collections={collections} byId={byId} products={purchasable} cardProps={cardProps} onBuyCollection={(c) => setConfirm({ kind: "collection", item: c })} onSeeAll={() => setView("catalog")} wallet={wallet} busy={busy} />
        ) : view === "catalog" ? (
          <CatalogView products={purchasable} filters={filters} setFilters={setFilters} cardProps={cardProps} />
        ) : view === "collections" ? (
          <div className="shop-collections">
            {collections.map((c) => <CollectionBlock key={c.slug} collection={c} byId={byId} cardProps={cardProps} wallet={wallet} busy={busy} onBuy={() => setConfirm({ kind: "collection", item: c })} />)}
          </div>
        ) : view === "rewards" ? (
          <section className="section">
            <p className="muted">Ces articles ne s'achètent pas : ils se débloquent en jouant. Quand un objectif est atteint, récupère la récompense et équipe-la.</p>
            <div className="shop-grid">{rewards.map((p) => <RewardCard key={p.id} product={p} username={user?.username} busy={busy} onClaim={claim} onEquip={equip} />)}</div>
          </section>
        ) : view === "inventory" ? (
          <InventoryView owned={owned} history={history} cardProps={cardProps} onBrowse={() => setView("catalog")} />
        ) : (
          <AdminView onChanged={load} />
        )}
      </div>

      {openedProduct && (
        <ProductModal
          product={openedProduct}
          user={user}
          wallet={wallet}
          busy={busy}
          onClose={() => setOpened(null)}
          onBuy={(p) => setConfirm({ kind: "product", item: p })}
          onEquip={equip}
          onWish={wish}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "collection" ? `Acheter la collection « ${confirm.item.name} » ?` : `Acheter ${confirm?.item.name} ?`}
        message={!confirm ? "" : confirm.kind === "collection"
          ? `${confirm.item.buyable_count} article(s) pour ${formatApex(confirm.item.bundle_price)} APEX au lieu de ${formatApex(confirm.item.remaining_price)} (−${confirm.item.discount_pct} %). Ton solde : ${formatApex(wallet)} APEX. L'achat est définitif.`
          : `${formatApex(confirm.item.price)} APEX seront débités de ton solde (${formatApex(wallet)} APEX).${confirm.item.stock != null ? " Édition numérotée : ton numéro d'exemplaire est attribué à l'achat." : ""} L'achat est définitif.`}
        confirmLabel="Acheter"
        cancelLabel="Annuler"
        onConfirm={confirmPurchase}
        onCancel={() => setConfirm(null)}
      />
    </Layout>
  );
}

/* ----------------------------------------------------------------- vues */

function CollectionHero({ collection, byId, username, wallet, busy, onBuy }) {
  const items = collection.product_ids.map((id) => byId[id]).filter(Boolean);
  const done = collection.buyable_count === 0;
  return (
    <section className="shop-hero" style={{ "--accent": collection.accent || "var(--sport)" }}>
      <div className="shop-hero-text">
        <div className="shop-hero-tags">
          <span className="badge shop-hero-badge">À la une</span>
          {collection.available_until && <span className="badge badge-info"><Icon name="clock" size={11} />{endsIn(collection.available_until)}</span>}
          {collection.discount_pct > 0 && <span className="badge badge-success">−{collection.discount_pct} % sur le lot</span>}
        </div>
        <h2 className="shop-hero-title">{collection.name}</h2>
        <p className="text-2">{collection.description}</p>
        <div className="shop-hero-buy">
          {done ? (
            <span className="badge badge-success">Collection complète dans ton inventaire</span>
          ) : (
            <>
              <div className="shop-hero-price">
                {collection.discount_pct > 0 && <s className="muted num">{formatApex(collection.remaining_price)}</s>}
                <strong className="num">{formatApex(collection.bundle_price)} <small>APEX</small></strong>
              </div>
              <button className="btn btn-lg shop-hero-cta" disabled={busy || collection.bundle_price > wallet} onClick={onBuy}>
                {collection.bundle_price > wallet ? "Solde insuffisant" : `Acheter la collection (${collection.buyable_count})`}
              </button>
            </>
          )}
          <span className="muted shop-hero-owned">{collection.owned_count}/{collection.total_count} possédés</span>
        </div>
        {collection.available_until && <p className="muted shop-hero-note">En vente jusqu'au {formatDate(collection.available_until)}, puis retirée définitivement.</p>}
      </div>
      <div className="shop-hero-items">
        {items.slice(0, 5).map((p) => (
          <div key={p.id} className={`shop-hero-item ${p.rarity}`} title={p.name}>
            <ProductVisual product={p} username={username} size={56} />
            <span className="shop-hero-item-name">{p.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedView({ collections, byId, products, cardProps, onBuyCollection, onSeeAll, wallet, busy }) {
  const featured = collections.filter((c) => c.featured);
  const numbered = products.filter((p) => p.stock != null);
  const popular = [...products].filter((p) => !p.owned).sort((a, b) => Number(b.popular) - Number(a.popular) || b.owners_pct - a.owners_pct).slice(0, 4);
  const wished = products.filter((p) => p.wishlisted && !p.owned);
  return (
    <div className="shop-featured">
      {featured.map((c) => <CollectionHero key={c.slug} collection={c} byId={byId} username={cardProps.username} wallet={wallet} busy={busy} onBuy={() => onBuyCollection(c)} />)}
      {wished.length > 0 && (
        <section className="section">
          <div className="section-head"><h2 className="section-title">Ta liste de souhaits</h2></div>
          <div className="shop-grid">{wished.map((p) => <ProductCard key={p.id} product={p} {...cardProps} />)}</div>
        </section>
      )}
      {numbered.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Éditions numérotées</h2>
            <span className="muted">Tirage limité : chaque exemplaire porte son numéro.</span>
          </div>
          <div className="shop-grid">{numbered.map((p) => <ProductCard key={p.id} product={p} {...cardProps} />)}</div>
        </section>
      )}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Les plus prisés</h2>
          <button className="btn-link" onClick={onSeeAll}>Tout le catalogue <Icon name="arrowRight" size={14} /></button>
        </div>
        <div className="shop-grid">{popular.map((p) => <ProductCard key={p.id} product={p} {...cardProps} />)}</div>
      </section>
    </div>
  );
}

function CatalogView({ products, filters, setFilters, cardProps }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const shown = filterProducts(products, filters);
  return (
    <section className="section">
      <div className="shop-toolbar">
        <label className="shop-search">
          <span className="sr-only">Rechercher un article</span>
          <Icon name="search" size={16} />
          <input type="search" className="input" placeholder="Rechercher un article ou une collection" value={filters.query} onChange={(e) => set({ query: e.target.value })} />
        </label>
        <div className="segmented shop-filters" role="group" aria-label="Catégorie">
          {CATEGORIES.map((c) => <button key={c.key} aria-pressed={filters.category === c.key} onClick={() => set({ category: c.key })}>{c.label}</button>)}
        </div>
        <div className="shop-toolbar-row">
          <label className="shop-select">
            <span className="sr-only">Rareté</span>
            <select className="select select-sm" value={filters.rarity} onChange={(e) => set({ rarity: e.target.value })}>
              <option value="all">Toutes les raretés</option>
              {Object.entries(RARITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="shop-select">
            <span className="sr-only">Trier par</span>
            <select className="select select-sm" value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>Tri : {s.label}</option>)}
            </select>
          </label>
          <label className="shop-check">
            <input type="checkbox" checked={filters.hideOwned} onChange={(e) => set({ hideOwned: e.target.checked })} />
            Masquer ce que je possède
          </label>
          <span className="muted shop-count num">{shown.length} article{shown.length > 1 ? "s" : ""}</span>
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon="search" title="Aucun article ne correspond" action={<button className="btn btn-secondary" onClick={() => setFilters({ category: "all", rarity: "all", sort: "featured", query: "", hideOwned: false })}>Réinitialiser les filtres</button>}>
          Essaie une autre catégorie, une autre rareté ou un autre mot-clé.
        </EmptyState>
      ) : (
        <div className="shop-grid">{shown.map((p) => <ProductCard key={p.id} product={p} {...cardProps} />)}</div>
      )}
    </section>
  );
}

function CollectionBlock({ collection, byId, cardProps, wallet, busy, onBuy }) {
  const items = collection.product_ids.map((id) => byId[id]).filter(Boolean);
  const pct = (collection.owned_count / collection.total_count) * 100;
  return (
    <section className="card shop-collection" style={{ "--accent": collection.accent || "var(--sport)" }}>
      <div className="shop-collection-head">
        <div>
          <h2 className="section-title">{collection.name}</h2>
          <p className="text-2">{collection.description}</p>
          <div className="shop-collection-progress">
            <div className="progress"><span style={{ width: `${pct}%` }} /></div>
            <span className="muted num">{collection.owned_count}/{collection.total_count} possédés</span>
          </div>
        </div>
        <div className="shop-collection-buy">
          {collection.available_until && <span className="badge badge-info"><Icon name="clock" size={11} />{endsIn(collection.available_until)}</span>}
          {collection.buyable_count > 0 ? (
            <>
              <span className="shop-price num">
                {collection.discount_pct > 0 && <s className="muted">{formatApex(collection.remaining_price)}</s>} {formatApex(collection.bundle_price)} <small>APEX</small>
              </span>
              <button className="btn btn-secondary btn-sm" disabled={busy || collection.bundle_price > wallet} onClick={onBuy}>
                {collection.bundle_price > wallet ? "Solde insuffisant" : `Tout acheter${collection.discount_pct ? ` (−${collection.discount_pct} %)` : ""}`}
              </button>
            </>
          ) : <span className="badge badge-success">Complète</span>}
        </div>
      </div>
      <div className="shop-grid">{items.map((p) => <ProductCard key={p.id} product={p} {...cardProps} />)}</div>
    </section>
  );
}

function InventoryView({ owned, history, cardProps, onBrowse }) {
  if (owned.length === 0) {
    return (
      <EmptyState icon="bag" title="Ton inventaire est vide" action={<button className="btn btn-primary" onClick={onBrowse}>Voir le catalogue</button>}>
        Achète un avatar, un cadre, un badge, un titre ou une couleur de pseudo pour personnaliser ton profil.
      </EmptyState>
    );
  }
  const spent = history.reduce((s, h) => s + (h.price_paid || 0), 0);
  return (
    <div className="shop-featured">
      <div className="shop-grid">{owned.map((p) => (p.reward ? null : <ProductCard key={p.id} product={p} {...cardProps} />))}</div>
      {history.length > 0 && (
        <section className="card card-flush">
          <div className="card-head">
            <span className="card-title">Historique des achats</span>
            <span className="muted num">{formatApex(spent)} APEX dépensés</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Article</th><th>Catégorie</th><th className="num">Exemplaire</th><th className="num">Prix payé</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={`${h.id}-${h.purchased_at}`}>
                    <td>{formatDate(h.purchased_at)}</td>
                    <td className="strong">{h.name}</td>
                    <td>{CATEGORY_LABEL[h.category]}</td>
                    <td className="num">{h.serial ? `n° ${h.serial}/${h.stock}` : "—"}</td>
                    <td className="num">{h.price_paid ? `${formatApex(h.price_paid)} APEX` : "Récompense"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function AdminView({ onChanged }) {
  const toast = useToast();
  const [catalog, setCatalog] = useState([]);
  const [prices, setPrices] = useState({});
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/shop/admin/products");
      setCatalog(data);
      setPrices(Object.fromEntries(data.map((p) => [p.id, p.price])));
    } catch (err) {
      toast.error(formatApiError(err, "Impossible de charger le catalogue."));
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const update = async (product, changes, message) => {
    try {
      await apiClient.patch(`/shop/admin/products/${product.id}`, changes);
      toast.success(message);
      await Promise.all([load(), onChanged()]);
    } catch (err) {
      toast.error(formatApiError(err, "Modification impossible."));
    }
  };

  const shown = catalog.filter((p) => category === "all" || p.category === category);
  const revenue = catalog.reduce((s, p) => s + p.revenue, 0);
  const sold = catalog.reduce((s, p) => s + p.sold, 0);

  return (
    <section className="section shop-admin">
      <div className="grid grid-3">
        <div className="card stat"><span className="stat-label">Articles</span><span className="stat-value num">{catalog.length}</span><span className="stat-hint">{catalog.filter((p) => p.is_active).length} en vente</span></div>
        <div className="card stat"><span className="stat-label">Ventes</span><span className="stat-value num">{sold}</span><span className="stat-hint">récompenses comprises</span></div>
        <div className="card stat"><span className="stat-label">APEX dépensés</span><span className="stat-value num">{formatApex(revenue)}<small>APEX</small></span><span className="stat-hint">retirés de l'économie du jeu</span></div>
      </div>
      <div className="segmented" role="group" aria-label="Catégorie">
        {CATEGORIES.map((c) => <button key={c.key} aria-pressed={category === c.key} onClick={() => setCategory(c.key)}>{c.label}</button>)}
      </div>
      <p className="muted">Retirer un article le cache de la boutique ; les joueurs qui l'ont déjà le gardent. « À la une » le met en avant en tête du catalogue.</p>
      <div className="card card-flush">
        <div className="table-wrap">
          <table className="table shop-admin-table">
            <thead><tr><th>Article</th><th>Type</th><th>Rareté</th><th className="num">Vendus</th><th className="num">APEX</th><th>Prix</th><th>À la une</th><th>État</th></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className={p.is_active ? "" : "inactive"}>
                  <td>
                    <span className="strong">{p.name}</span>
                    <span className="shop-admin-sub">{p.reward ? "Récompense" : p.collection?.name || "Hors collection"}{p.stock != null ? ` · ${p.sold}/${p.stock} ex.` : ""}{p.available_until ? ` · jusqu'au ${formatDate(p.available_until)}` : ""}</span>
                  </td>
                  <td>{CATEGORY_LABEL[p.category]}</td>
                  <td><span className={`rarity-text ${p.rarity}`}>{RARITY_LABEL[p.rarity]}</span></td>
                  <td className="num" data-sold>{p.sold}</td>
                  <td className="num">{formatApex(p.revenue)}</td>
                  <td>
                    {p.reward ? <span className="muted">—</span> : (
                      <span className="shop-price-edit">
                        <input type="number" min="1" className="input input-sm num" value={prices[p.id] ?? ""} aria-label={`Prix de ${p.name}`} onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })} />
                        <button className="btn btn-secondary btn-sm" disabled={Number(prices[p.id]) === p.price || !(Number(prices[p.id]) > 0)} onClick={() => update(p, { price: Number(prices[p.id]) }, `Prix de ${p.name} mis à jour.`)}>Enregistrer</button>
                      </span>
                    )}
                  </td>
                  <td>
                    <button className={`btn btn-sm ${p.featured ? "btn-primary" : "btn-ghost"}`} aria-pressed={p.featured} onClick={() => update(p, { featured: !p.featured }, p.featured ? `${p.name} n'est plus à la une.` : `${p.name} mis à la une.`)}>
                      {p.featured ? "★ Oui" : "☆ Non"}
                    </button>
                  </td>
                  <td>
                    <button className={`btn btn-sm ${p.is_active ? "btn-secondary" : "btn-danger"}`} onClick={() => update(p, { is_active: !p.is_active }, p.is_active ? `${p.name} retiré de la boutique.` : `${p.name} remis en vente.`)}>
                      {p.is_active ? "En vente · retirer" : "Retiré · remettre"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

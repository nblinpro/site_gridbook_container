import { useEffect, useRef } from "react";
import UserAvatar from "../../components/cosmetics/UserAvatar";
import UserName from "../../components/cosmetics/UserName";
import Icon from "../../components/ui/Icon";
import { getDiscipline } from "../../data/disciplines";
import { formatApex, formatDate } from "../../utils/format";
import { CATEGORY_LABEL, RARITY_LABEL, endsIn, withItem } from "./shopUtils";

/** Rendu de l'article lui-même : sur l'avatar du joueur, ou en texte pour un titre / un pseudo. */
export function ProductVisual({ product, username, size = 72 }) {
  if (product.category === "title") {
    return <span className="shop-visual-title">« {product.value} »</span>;
  }
  if (product.category === "name_color") {
    return <UserName name={username || "Pseudo"} cosmetics={{ name_color: product.value }} className="shop-visual-name" />;
  }
  return <UserAvatar username={username} cosmetics={withItem({}, product)} size={size} />;
}

/** Badges d'état d'un article : édition limitée, numérotée, populaire. */
export function ProductFlags({ product }) {
  const flags = [];
  if (product.remaining != null) {
    flags.push(product.remaining > 0
      ? <span key="stock" className="badge badge-warning">{product.remaining} / {product.stock} restants</span>
      : <span key="stock" className="badge badge-danger">Épuisé</span>);
  }
  if (product.available_until && !product.owned) flags.push(<span key="until" className="badge badge-info"><Icon name="clock" size={11} />{endsIn(product.available_until)}</span>);
  if (product.popular) flags.push(<span key="pop" className="badge badge-success">Populaire</span>);
  return flags.length ? <div className="shop-flags">{flags}</div> : null;
}

/** Carte d'un article du catalogue. */
export function ProductCard({ product, username, wallet, busy, onOpen, onBuy, onEquip, onWish, onPreview }) {
  const sport = product.discipline ? getDiscipline(product.discipline) : null;
  const soldOut = product.remaining === 0 && !product.owned;
  const tooExpensive = !product.owned && product.price > wallet;
  return (
    <article
      className={`card shop-card ${product.rarity} ${product.equipped ? "equipped" : ""}`}
      onMouseEnter={() => onPreview?.(product)}
      onMouseLeave={() => onPreview?.(null)}
    >
      <div className="shop-card-top">
        <span className={`rarity-text ${product.rarity}`}>{RARITY_LABEL[product.rarity]}</span>
        <span className="shop-card-cat">
          {sport && <span className="shop-sport-tag" style={{ background: sport.accent, color: sport.contrast }}>{sport.short}</span>}
          {CATEGORY_LABEL[product.category]}
        </span>
      </div>

      <button type="button" className="shop-card-visual" onClick={() => onOpen(product)} aria-label={`Voir le détail de ${product.name}`}>
        <ProductVisual product={product} username={username} />
      </button>

      <div className="shop-card-body">
        <h3 className="shop-card-name">{product.name}</h3>
        <ProductFlags product={product} />
        {product.collection && <span className="shop-card-collection">Collection {product.collection.name}</span>}
      </div>

      <button
        type="button"
        className={`shop-wish ${product.wishlisted ? "on" : ""}`}
        aria-pressed={product.wishlisted}
        aria-label={product.wishlisted ? `Retirer ${product.name} de ta liste de souhaits` : `Ajouter ${product.name} à ta liste de souhaits`}
        title={product.wishlisted ? "Dans ta liste de souhaits" : "Ajouter à ta liste de souhaits"}
        onClick={() => onWish(product)}
      >
        {product.wishlisted ? "♥" : "♡"}
      </button>

      <div className="shop-card-foot">
        {product.owned ? (
          <>
            <span className={`badge ${product.equipped ? "badge-success" : ""}`}>
              {product.equipped ? "Équipé" : "Possédé"}{product.serial ? ` · n° ${product.serial}` : ""}
            </span>
            <button className={`btn btn-sm ${product.equipped ? "btn-ghost" : "btn-secondary"}`} disabled={busy} onClick={() => onEquip(product)}>
              {product.equipped ? "Retirer" : "Équiper"}
            </button>
          </>
        ) : (
          <>
            <span className="shop-price num">{formatApex(product.price)} <small>APEX</small></span>
            <button className="btn btn-sm shop-buy" disabled={busy || tooExpensive || soldOut} title={tooExpensive ? "Solde insuffisant" : undefined} onClick={() => onBuy(product)}>
              {soldOut ? "Épuisé" : tooExpensive ? <><Icon name="lock" size={14} /> Solde insuffisant</> : "Acheter"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/** Carte d'une récompense à gagner, avec la progression du joueur. */
export function RewardCard({ product, username, busy, onClaim, onEquip }) {
  const { reward } = product;
  const pct = Math.min(100, (reward.current / reward.target) * 100);
  return (
    <article className={`card shop-card shop-reward ${product.rarity} ${product.owned ? "" : "locked"}`}>
      <div className="shop-card-top">
        <span className={`rarity-text ${product.rarity}`}>{RARITY_LABEL[product.rarity]}</span>
        <span className="shop-card-cat">{CATEGORY_LABEL[product.category]}</span>
      </div>
      <div className="shop-card-visual is-static">
        <ProductVisual product={product} username={username} />
        {!product.owned && <span className="shop-lock" aria-hidden><Icon name="lock" size={16} /></span>}
      </div>
      <div className="shop-card-body">
        <h3 className="shop-card-name">{product.name}</h3>
        <p className="shop-reward-condition">{reward.condition}</p>
        {!product.owned && (
          <>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={reward.target} aria-valuenow={reward.current}><span style={{ width: `${pct}%` }} /></div>
            <span className="muted shop-reward-count num">{reward.current >= reward.target ? "Objectif atteint" : `${reward.current.toLocaleString("fr-FR")} / ${reward.target.toLocaleString("fr-FR")}`}</span>
          </>
        )}
      </div>
      <div className="shop-card-foot">
        {product.owned ? (
          <>
            <span className={`badge ${product.equipped ? "badge-success" : ""}`}>{product.equipped ? "Équipé" : "Obtenu"}</span>
            <button className={`btn btn-sm ${product.equipped ? "btn-ghost" : "btn-secondary"}`} disabled={busy} onClick={() => onEquip(product)}>{product.equipped ? "Retirer" : "Équiper"}</button>
          </>
        ) : reward.unlocked ? (
          <button className="btn btn-sm btn-success btn-block" disabled={busy} onClick={() => onClaim(product)}><Icon name="sparkles" size={14} /> Récupérer</button>
        ) : (
          <span className="muted shop-reward-hint">À gagner en jouant</span>
        )}
      </div>
    </article>
  );
}

/** Fiche détaillée d'un article (fenêtre) : essayage sur le profil, informations, achat. */
export function ProductModal({ product, user, wallet, busy, onClose, onBuy, onEquip, onWish }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview = withItem(user?.cosmetics, product);
  const soldOut = product.remaining === 0 && !product.owned;
  const tooExpensive = !product.owned && product.price > wallet;

  return (
    <div className="shop-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`shop-modal ${product.rarity}`} role="dialog" aria-modal="true" aria-labelledby="shop-modal-title">
        <button ref={closeRef} type="button" className="btn btn-ghost btn-icon shop-modal-close" onClick={onClose} aria-label="Fermer"><Icon name="close" size={18} /></button>

        <div className="shop-modal-stage">
          <span className="shop-modal-stage-label">Essayage sur ton profil</span>
          <UserAvatar username={user?.username} cosmetics={preview} size={112} />
          <UserName name={user?.username} cosmetics={preview} className="shop-modal-username" />
          {preview?.title && <span className="ua-title">{preview.title}</span>}
        </div>

        <div className="shop-modal-info">
          <div className="shop-modal-tags">
            <span className={`rarity-text ${product.rarity}`}>{RARITY_LABEL[product.rarity]}</span>
            <span className="muted">·</span>
            <span className="muted">{CATEGORY_LABEL[product.category]}</span>
          </div>
          <h2 id="shop-modal-title" className="shop-modal-name">{product.name}</h2>
          <p className="text-2">{product.description}</p>
          <ProductFlags product={product} />

          <dl className="shop-modal-facts">
            {product.collection && <div className="kv"><dt>Collection</dt><dd><strong>{product.collection.name}</strong></dd></div>}
            {product.stock != null && <div className="kv"><dt>Édition</dt><dd><strong>Numérotée, {product.stock} exemplaires</strong></dd></div>}
            {product.available_until && <div className="kv"><dt>En vente jusqu'au</dt><dd><strong>{formatDate(product.available_until)}</strong></dd></div>}
            <div className="kv"><dt>Possédé par</dt><dd><strong className="num">{product.owners_pct.toLocaleString("fr-FR")} % des joueurs</strong></dd></div>
            {product.serial && <div className="kv"><dt>Ton exemplaire</dt><dd><strong className="num">n° {product.serial} / {product.stock}</strong></dd></div>}
          </dl>

          <div className="shop-modal-actions">
            {product.owned ? (
              <button className={`btn btn-lg btn-block ${product.equipped ? "btn-secondary" : "btn-primary"}`} disabled={busy} onClick={() => onEquip(product)}>
                {product.equipped ? "Retirer de mon profil" : "Équiper sur mon profil"}
              </button>
            ) : (
              <button className="btn btn-lg btn-block shop-buy" disabled={busy || tooExpensive || soldOut || !!product.unavailable_reason} onClick={() => onBuy(product)}>
                {soldOut ? "Épuisé" : product.unavailable_reason ? product.unavailable_reason : tooExpensive ? `Solde insuffisant (${formatApex(wallet)} APEX)` : `Acheter · ${formatApex(product.price)} APEX`}
              </button>
            )}
            <button type="button" className={`btn btn-secondary btn-lg shop-modal-wish ${product.wishlisted ? "on" : ""}`} aria-pressed={product.wishlisted} onClick={() => onWish(product)}>
              {product.wishlisted ? "♥ Dans ta liste" : "♡ Liste de souhaits"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

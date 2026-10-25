from datetime import datetime, timedelta

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.shop import Collection, Product, Purchase, WishlistItem
from app.models.token_transaction import TokenTransaction
from app.models.user import User
from app.services.cosmetics import equipped_cosmetics
from app.services.rewards import PlayerStats, describe, progress
from app.utils.dependencies import get_current_admin, get_current_user, get_db
from app.utils.validation import MAX_AMOUNT

router = APIRouter(prefix="/shop", tags=["Boutique"])

RARITY_ORDER = {"common": 0, "rare": 1, "epic": 2, "legendary": 3}
POPULAR_COUNT = 3


# ---------------------------------------------------------------- règles de vente

def _availability(product: Product, now: datetime) -> str | None:
    """Raison pour laquelle l'article ne peut pas être acheté maintenant, ou None."""
    if product.unlock_rule:
        return "Cette récompense ne s'achète pas : elle se gagne en jouant"
    if not product.is_active:
        return "Article retiré de la boutique"
    if product.available_from and now < product.available_from:
        return "Cet article n'est pas encore en vente"
    if product.available_until and now >= product.available_until:
        return "La vente de cet article est terminée"
    return None


def _sold_counts(db: Session) -> dict[int, int]:
    return dict(db.query(Purchase.product_id, func.count(Purchase.id)).group_by(Purchase.product_id).all())


def _lock_user(db: Session, user_id: int) -> User:
    # Verrou sur le compte : deux achats simultanés ne peuvent pas dépenser le même solde
    return db.query(User).filter(User.id == user_id).with_for_update().one()


def _sell(db: Session, user: User, product: Product, price: int, now: datetime) -> Purchase:
    """Contrôle et enregistre la vente d'un article (sans commit, sans débit du solde)."""
    reason = _availability(product, now)
    if reason:
        raise HTTPException(status_code=400, detail=reason)
    if db.query(Purchase).filter(Purchase.user_id == user.id, Purchase.product_id == product.id).first():
        raise HTTPException(status_code=400, detail=f"Tu possèdes déjà « {product.name} »")
    serial = None
    if product.stock is not None:
        # Verrou sur l'article : deux acheteurs simultanés ne reçoivent jamais le même numéro
        db.query(Product).filter(Product.id == product.id).with_for_update().one()
        sold = db.query(func.count(Purchase.id)).filter(Purchase.product_id == product.id).scalar()
        if sold >= product.stock:
            raise HTTPException(status_code=400, detail=f"« {product.name} » est épuisé")
        serial = sold + 1
    purchase = Purchase(user_id=user.id, product_id=product.id, price_paid=price, serial=serial)
    db.add(purchase)
    return purchase


# ---------------------------------------------------------------- présentation

def _serialize(product, purchase=None, *, sold=0, users=1, popular=frozenset(), wished=frozenset(), stats=None, now=None):
    now = now or datetime.utcnow()
    data = {
        "id": product.id,
        "slug": product.slug,
        "name": product.name,
        "description": product.description,
        "category": product.category,
        "value": product.value,
        "price": product.price,
        "rarity": product.rarity,
        "discipline": product.discipline,
        "is_active": product.is_active,
        "featured": bool(product.featured),
        "collection": {"slug": product.collection.slug, "name": product.collection.name} if product.collection else None,
        "available_until": product.available_until.isoformat() + "Z" if product.available_until else None,
        "stock": product.stock,
        "remaining": max(product.stock - sold, 0) if product.stock is not None else None,
        "owners_pct": round(100 * sold / users, 1) if users else 0,
        "popular": product.id in popular,
        "wishlisted": product.id in wished,
        "owned": purchase is not None,
        "equipped": bool(purchase and purchase.equipped),
        "serial": purchase.serial if purchase else None,
        "unavailable_reason": None if purchase else _availability(product, now),
        "reward": None,
    }
    if product.unlock_rule:
        current, target = progress(product.unlock_rule, stats) if stats else (0, 1)
        data["reward"] = {"condition": describe(product.unlock_rule), "current": current, "target": target, "unlocked": current >= target}
        data["unavailable_reason"] = None
    return data


def _context(db: Session, user: User):
    now = datetime.utcnow()
    owned = {p.product_id: p for p in db.query(Purchase).filter(Purchase.user_id == user.id).all()}
    sold = _sold_counts(db)
    week_sales = (
        db.query(Purchase.product_id, func.count(Purchase.id))
        .filter(Purchase.purchased_at >= now - timedelta(days=7), Purchase.price_paid > 0)
        .group_by(Purchase.product_id).order_by(func.count(Purchase.id).desc()).limit(POPULAR_COUNT).all()
    )
    return {
        "now": now,
        "owned": owned,
        "sold": sold,
        "users": db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 1,
        "popular": frozenset(pid for pid, _ in week_sales),
        "wished": frozenset(pid for (pid,) in db.query(WishlistItem.product_id).filter(WishlistItem.user_id == user.id)),
        "stats": PlayerStats(db, user.id),
    }


def _visible(product: Product, owned: dict, now: datetime) -> bool:
    """Un article retiré ou dont la vente est terminée n'apparaît plus, sauf pour ceux qui l'ont."""
    if product.id in owned or product.unlock_rule:
        return True
    return product.is_active and not (product.available_until and now >= product.available_until)


# ---------------------------------------------------------------- catalogue

@router.get("/products")
def list_products(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ctx = _context(db, user)
    products = [p for p in db.query(Product).all() if _visible(p, ctx["owned"], ctx["now"])]
    products.sort(key=lambda p: (p.category, RARITY_ORDER.get(p.rarity, 0), p.price))
    return [
        _serialize(p, ctx["owned"].get(p.id), sold=ctx["sold"].get(p.id, 0), users=ctx["users"],
                   popular=ctx["popular"], wished=ctx["wished"], stats=ctx["stats"], now=ctx["now"])
        for p in products
    ]


@router.get("/collections")
def list_collections(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    owned = {pid for (pid,) in db.query(Purchase.product_id).filter(Purchase.user_id == user.id)}
    sold = _sold_counts(db)
    result = []
    for col in db.query(Collection).all():
        items = [p for p in db.query(Product).filter(Product.collection_id == col.id).all() if _visible(p, owned, now)]
        if not items:
            continue
        buyable = [p for p in items if p.id not in owned and not _availability(p, now)
                   and not (p.stock is not None and sold.get(p.id, 0) >= p.stock)]
        full = sum(p.price for p in buyable)
        result.append({
            "slug": col.slug,
            "name": col.name,
            "description": col.description,
            "accent": col.accent,
            "featured": bool(col.featured),
            "discount_pct": col.discount_pct or 0,
            "available_until": col.available_until.isoformat() + "Z" if col.available_until else None,
            "product_ids": [p.id for p in items],
            "owned_count": sum(1 for p in items if p.id in owned),
            "total_count": len(items),
            "remaining_price": full,
            "bundle_price": round(full * (100 - (col.discount_pct or 0)) / 100),
            "buyable_count": len(buyable),
        })
    result.sort(key=lambda c: (not c["featured"], c["name"]))
    return result


@router.get("/inventory")
def inventory(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Articles possédés (y compris retirés depuis), du plus récent au plus ancien."""
    purchases = db.query(Purchase).filter(Purchase.user_id == user.id).order_by(Purchase.purchased_at.desc()).all()
    return [
        {**_serialize(p.product, p), "purchased_at": p.purchased_at.isoformat() + "Z", "price_paid": p.price_paid}
        for p in purchases
    ]


# ---------------------------------------------------------------- achats

@router.post("/buy/{product_id}")
def buy(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Article introuvable")
    now = datetime.utcnow()
    locked_user = _lock_user(db, user.id)
    if float(locked_user.wallet) < product.price:
        raise HTTPException(status_code=400, detail="Solde insuffisant")
    purchase = _sell(db, locked_user, product, product.price, now)
    locked_user.wallet = float(locked_user.wallet) - product.price
    db.add(TokenTransaction(user_id=user.id, amount=product.price, type="debit", reason=f"Boutique : {product.name}"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Tu possèdes déjà cet article")
    edition = f" (exemplaire n° {purchase.serial}/{product.stock})" if purchase.serial else ""
    return {"message": f"Ajouté à ton inventaire : {product.name}{edition}", "new_wallet_balance": locked_user.wallet, "serial": purchase.serial}


@router.post("/collections/{slug}/buy")
def buy_collection(slug: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Achète en une fois tous les articles encore disponibles d'une collection, avec sa remise."""
    col = db.query(Collection).filter(Collection.slug == slug).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection introuvable")
    now = datetime.utcnow()
    locked_user = _lock_user(db, user.id)
    owned = {pid for (pid,) in db.query(Purchase.product_id).filter(Purchase.user_id == user.id)}
    sold = _sold_counts(db)
    items = [p for p in db.query(Product).filter(Product.collection_id == col.id).order_by(Product.id).all()
             if p.id not in owned and not _availability(p, now)
             and not (p.stock is not None and sold.get(p.id, 0) >= p.stock)]
    if not items:
        raise HTTPException(status_code=400, detail="Tu possèdes déjà tous les articles disponibles de cette collection")
    discount = col.discount_pct or 0
    prices = {p.id: round(p.price * (100 - discount) / 100) for p in items}
    total = sum(prices.values())
    if float(locked_user.wallet) < total:
        raise HTTPException(status_code=400, detail="Solde insuffisant pour la collection")
    for p in items:
        _sell(db, locked_user, p, prices[p.id], now)
    locked_user.wallet = float(locked_user.wallet) - total
    db.add(TokenTransaction(user_id=user.id, amount=total, type="debit", reason=f"Boutique : collection {col.name}"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Achat interrompu : réessaie")
    return {"message": f"Collection « {col.name} » : {len(items)} article(s) ajouté(s)", "new_wallet_balance": locked_user.wallet, "count": len(items), "total": total}


@router.post("/rewards/{product_id}/claim")
def claim_reward(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product or not product.unlock_rule:
        raise HTTPException(status_code=404, detail="Récompense introuvable")
    current, target = progress(product.unlock_rule, PlayerStats(db, user.id))
    if current < target:
        raise HTTPException(status_code=400, detail=f"Condition pas encore remplie : {describe(product.unlock_rule).lower()}")
    db.add(Purchase(user_id=user.id, product_id=product.id, price_paid=0))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Récompense déjà obtenue")
    return {"message": f"Récompense obtenue : {product.name}"}


@router.post("/equip/{product_id}")
def toggle_equip(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Équipe l'article (et retire celui de la même catégorie), ou le retire s'il est déjà équipé."""
    purchase = db.query(Purchase).filter(Purchase.user_id == user.id, Purchase.product_id == product_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Cet article n'est pas dans ton inventaire")

    if purchase.equipped:
        purchase.equipped = False
    else:
        same_category = (
            db.query(Purchase).join(Product, Product.id == Purchase.product_id)
            .filter(Purchase.user_id == user.id, Product.category == purchase.product.category)
        )
        for other in same_category:
            other.equipped = False
        purchase.equipped = True
    db.commit()
    return {"equipped": purchase.equipped, "cosmetics": equipped_cosmetics(db, [user.id])[user.id]}


@router.post("/wishlist/{product_id}")
def toggle_wishlist(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not db.query(Product.id).filter(Product.id == product_id).first():
        raise HTTPException(status_code=404, detail="Article introuvable")
    item = db.query(WishlistItem).filter(WishlistItem.user_id == user.id, WishlistItem.product_id == product_id).first()
    if item:
        db.delete(item)
    else:
        db.add(WishlistItem(user_id=user.id, product_id=product_id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return {"wishlisted": item is None}


# ---------------------------------------------------------------- gestion (admin)

@router.get("/admin/products")
def admin_products(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    sold = _sold_counts(db)
    revenue = dict(db.query(Purchase.product_id, func.sum(Purchase.price_paid)).group_by(Purchase.product_id).all())
    products = db.query(Product).order_by(Product.category, Product.price).all()
    return [{**_serialize(p, sold=sold.get(p.id, 0)), "sold": sold.get(p.id, 0), "revenue": int(revenue.get(p.id) or 0)} for p in products]


@router.patch("/admin/products/{product_id}")
def admin_update_product(
    product_id: int,
    price: int | None = Body(None, embed=True),
    is_active: bool | None = Body(None, embed=True),
    featured: bool | None = Body(None, embed=True),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Change le prix, retire / remet en vente ou met en avant un article (les acheteurs le gardent)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if price is not None:
        if product.unlock_rule:
            raise HTTPException(status_code=400, detail="Une récompense n'a pas de prix")
        if price <= 0 or price > MAX_AMOUNT:
            raise HTTPException(status_code=400, detail="Prix invalide")
        product.price = price
    if is_active is not None:
        product.is_active = is_active
    if featured is not None:
        product.featured = featured
    db.commit()
    return _serialize(product)

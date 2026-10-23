from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.shop import Product, Purchase
from app.models.token_transaction import TokenTransaction
from app.models.user import User
from app.services.cosmetics import equipped_cosmetics
from app.utils.dependencies import get_current_admin, get_current_user, get_db

router = APIRouter(prefix="/shop", tags=["Boutique"])

RARITY_ORDER = {"common": 0, "rare": 1, "epic": 2, "legendary": 3}


def _serialize(product: Product, purchase: Purchase | None = None) -> dict:
    return {
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
        "owned": purchase is not None,
        "equipped": bool(purchase and purchase.equipped),
    }


def _owned(db: Session, user_id: int) -> dict:
    return {p.product_id: p for p in db.query(Purchase).filter(Purchase.user_id == user_id).all()}


@router.get("/products")
def list_products(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    owned = _owned(db, user.id)
    products = db.query(Product).filter(Product.is_active.is_(True)).all()
    products.sort(key=lambda p: (p.category, RARITY_ORDER.get(p.rarity, 0), p.price))
    return [_serialize(p, owned.get(p.id)) for p in products]


@router.get("/inventory")
def inventory(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Articles possédés, y compris ceux retirés du catalogue depuis l'achat."""
    purchases = db.query(Purchase).filter(Purchase.user_id == user.id).order_by(Purchase.purchased_at.desc()).all()
    return [{**_serialize(p.product, p), "purchased_at": p.purchased_at, "price_paid": p.price_paid} for p in purchases]


@router.post("/buy/{product_id}")
def buy(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id, Product.is_active.is_(True)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Article introuvable ou retiré de la boutique")

    # Verrou sur le compte : deux achats simultanés ne peuvent pas dépenser le même solde
    locked_user = db.query(User).filter(User.id == user.id).with_for_update().one()
    if db.query(Purchase).filter(Purchase.user_id == user.id, Purchase.product_id == product.id).first():
        raise HTTPException(status_code=400, detail="Tu possèdes déjà cet article")
    if float(locked_user.wallet) < product.price:
        raise HTTPException(status_code=400, detail="Solde insuffisant")

    locked_user.wallet = float(locked_user.wallet) - product.price
    db.add(Purchase(user_id=user.id, product_id=product.id, price_paid=product.price))
    db.add(TokenTransaction(user_id=user.id, amount=product.price, type="debit", reason=f"Boutique : {product.name}"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Tu possèdes déjà cet article")
    return {"message": f"Ajouté à ton inventaire : {product.name}", "new_wallet_balance": locked_user.wallet}


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


# --- Gestion du catalogue (admin) ---

@router.get("/admin/products")
def admin_products(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    sold = dict(db.query(Purchase.product_id, func.count(Purchase.id)).group_by(Purchase.product_id).all())
    products = db.query(Product).order_by(Product.category, Product.price).all()
    return [{**_serialize(p), "sold": sold.get(p.id, 0)} for p in products]


@router.patch("/admin/products/{product_id}")
def admin_update_product(
    product_id: int,
    price: int | None = Body(None, embed=True),
    is_active: bool | None = Body(None, embed=True),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Change le prix ou retire / remet un article en vente (les acheteurs le gardent)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Article introuvable")
    if price is not None:
        if price <= 0:
            raise HTTPException(status_code=400, detail="Le prix doit être positif")
        product.price = price
    if is_active is not None:
        product.is_active = is_active
    db.commit()
    return _serialize(product)

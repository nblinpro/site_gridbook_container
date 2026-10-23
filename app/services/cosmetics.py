from app.models.shop import Product, Purchase


def equipped_cosmetics(db, user_ids) -> dict:
    """{user_id: {"avatar": "🏍️", "frame": "#ffd659", ...}} pour les articles équipés."""
    result = {uid: {} for uid in user_ids}
    if not user_ids:
        return result
    rows = (
        db.query(Purchase.user_id, Product.category, Product.value, Product.rarity)
        .join(Product, Product.id == Purchase.product_id)
        .filter(Purchase.user_id.in_(user_ids), Purchase.equipped.is_(True))
        .all()
    )
    for user_id, category, value, rarity in rows:
        result[user_id][category] = value
        if category == "frame":
            result[user_id]["frame_rarity"] = rarity
    return result

import "./cosmetics.css";

// Avatar d'un joueur avec ses cosmétiques équipés (boutique) : emoji à la place de
// l'initiale, couleur du cadre, badge en pastille. Sans cosmétique : initiale + cadre rouge.
export default function UserAvatar({ username, cosmetics = {}, size = 40, className = "", glow = false }) {
  const { avatar, frame, frame_rarity: frameRarity, badge } = cosmetics || {};
  return (
    <span
      className={`ua ${frameRarity === "legendary" ? "ua-legendary" : ""} ${glow ? "ua-glow" : ""} ${className}`}
      style={{ width: size, height: size, fontSize: size * (avatar ? 0.5 : 0.42), "--ua-frame": frame || "#e10600" }}
    >
      <span className="ua-face">{avatar || (username?.charAt(0) || "U").toUpperCase()}</span>
      {badge && <span className="ua-badge" style={{ fontSize: Math.max(10, size * 0.28) }}>{badge}</span>}
    </span>
  );
}

import "./cosmetics.css";

// Pseudo affiché avec la couleur achetée en boutique (couleur unie ou dégradé).
export default function UserName({ name, cosmetics, className = "" }) {
  const color = cosmetics?.name_color;
  const isGradient = color?.includes("gradient");
  const style = !color ? undefined : isGradient ? { "--un-gradient": color } : { color };
  return (
    <span className={`un ${isGradient ? "un-gradient" : ""} ${className}`} style={style}>
      {name}
    </span>
  );
}

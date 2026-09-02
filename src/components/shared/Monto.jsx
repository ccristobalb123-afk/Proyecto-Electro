import "./Monto.css";

/**
 * Muestra un monto en soles con el símbolo "S/" más pequeño y tenue
 * que el número, para que el número principal resalte más limpio.
 * Uso: <Monto valor={8200} /> en vez de formatear el número directo en el JSX.
 */
export default function Monto({ valor, decimales = 2, className = "" }) {
  const numeroFormateado = Number(valor).toLocaleString("es-PE", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

  return (
    <span className={`monto ${className}`}>
      <span className="monto__simbolo">S/</span>
      {numeroFormateado}
    </span>
  );
}

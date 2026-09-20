// Mismo criterio de "calcular al leer, no guardar" que ya usamos en
// RRHH — evita que el semáforo de colores quede desactualizado sin un
// cron job. Los umbrales (10 y 45 días) calzan con los datos que ya
// tenía el mock del frontend (22→ámbar, 5→rojo, 95→gris, 40→ámbar).
export function calcularEstadoDocumento(fechaVencimiento) {
  if (!fechaVencimiento) return { dias: null, estado: "gray" };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento);
  vence.setHours(0, 0, 0, 0);

  const msPorDia = 24 * 60 * 60 * 1000;
  const dias = Math.round((vence - hoy) / msPorDia);

  if (dias <= 10) return { dias, estado: "red" };
  if (dias <= 45) return { dias, estado: "amber" };
  return { dias, estado: "gray" };
}

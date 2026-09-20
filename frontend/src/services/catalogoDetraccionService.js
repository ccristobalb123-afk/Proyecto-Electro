import { apiClient } from "./apiClient";

// Solo lectura por ahora — el catálogo se administra por seed/migración
// en el backend (son ~10-15 códigos que SUNAT cambia con poca
// frecuencia). Si más adelante hace falta un CRUD desde la UI, se
// agrega igual que ya existe para categorías de gasto.
export async function listarCatalogoDetraccion({ signal } = {}) {
  return apiClient.get("/catalogo-detraccion", {}, { signal });
}

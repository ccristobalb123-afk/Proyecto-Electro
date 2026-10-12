import { notificarVencimientos } from "./alertas.service.js";

// Chequeo programado (server.js: al arrancar y cada 12 horas). Toda la
// lógica vive en alertas.service.js — qué avisar, una vez por día por
// registro, agrupado si son muchos — y los textos en
// lib/mensajesAlerta.js, compartidos con la campana y el Dashboard.
export async function revisarVencimientosYNotificar(opciones) {
  return notificarVencimientos(opciones);
}

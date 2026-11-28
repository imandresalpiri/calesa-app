// Por qué quien mira no elige un vehículo de ejemplo o no cambia el Mensaje del portal en el editor de artes: los arma la página con
// `puede()` y el editor los dice tal cual (el disparador apagado, el editor del mensaje de sólo lectura). Puro.

// Sin `vehiculos.ver` en el origen de la plantilla.
export function motivoSinVehiculosDeEjemplo(origen: string): string {
  return `No ves los vehículos de ${origen}: el arte usa los datos de ejemplo.`
}

// Sin `leads.configurar` (la misma clave que pide su action).
export const MOTIVO_SIN_EL_MENSAJE_DEL_PORTAL = 'Sólo quien configura Leads cambia este mensaje.'

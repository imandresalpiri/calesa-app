// El panel «Vincular a un lead» de un turno de la web, en la URL (8.05-1): `?panel=vincular-turno&turno=<id>`. Lo abre la tarjeta (`web`) y lo monta el
// Inicio (`src/app`), por eso el nombre vive en `entities`.
export const PANEL_VINCULAR_TURNO = 'vincular-turno'
export const CLAVE_DE_TURNO = 'turno'
// La clave con la que el alta de un lead nuevo devuelve el lead creado a la pantalla (`?vincular=<leadId>`).
export const CLAVE_DE_ELEGIR_TURNO = 'vincular'
// El panel «Turnos de la web sin confirmar» de Inicio (`/?panel=turnos`): todos mis turnos, de a 20. Lo abre «Ver todos» del bloque y lo monta `src/app`.
export const PANEL_DE_TURNOS = 'turnos'

export function rutaDelPanelDeTurnos(): string {
  return `/?panel=${PANEL_DE_TURNOS}`
}

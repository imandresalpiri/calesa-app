// Pantalla del área `turnos` de `web`: el panel «Turnos de la web sin confirmar» sobre Inicio (`?panel=turnos`), que monta `src/app`. Sólo `src/app` importa este archivo
// (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { PanelDeTurnosDiferido } from '../features/turnos/panel/components/diferidos'
export { PANEL_DE_TURNOS } from '../entities/turnos/paneles'

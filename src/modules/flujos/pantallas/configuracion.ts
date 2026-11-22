// Pantalla del núcleo de `flujos`: el editor del flujo, en la pestaña Fases de un origen y en Repuestos › Flujo de repuestos. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa
// pantalla dibuja y nada más.
export { PantallaDelFlujo } from '../features/configuracion/components/pantalla-del-flujo'
export type { HuecosDelFlujo, SeccionesDelPanel } from '../features/configuracion/components/huecos'
export type { FlujoFijo } from '../entities/selector-de-flujos'

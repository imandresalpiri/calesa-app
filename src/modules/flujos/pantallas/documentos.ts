// Pantalla del área `documentos` de `flujos` (5.02, la llena el 5.09): el contenido del drawer «Tipos de documento» del editor del flujo. Sólo `src/app`
// importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más. Es de servidor: lo de cliente va en
// `pantallas/documentos-nuevo.ts`.
export { PantallaDeDocumentos } from '../features/documentos/components/pantalla-de-documentos'
export { EsqueletoDeTipos } from '../features/documentos/components/esqueleto-de-tipos'
export { quienCambiaLosTipos } from '../entities/documentos/quien-cambia-los-tipos'
export type { QuienCambiaLosTipos } from '../entities/documentos/quien-cambia-los-tipos'

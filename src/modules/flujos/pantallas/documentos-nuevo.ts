// «Nuevo tipo de documento» del área `documentos` de `flujos`, para el editor del flujo (lo monta el drawer de los catálogos, en `src/app`, la primera
// vez que la URL lo abre). Sólo `src/app` importa este archivo: es de cliente, y sale aparte de `pantallas/documentos.ts`, que es de servidor.
export { CrearTipoDeDocumentoDiferido } from '../features/documentos/components/diferidos'
export type { QuienCambiaLosTipos } from '../entities/documentos/quien-cambia-los-tipos'

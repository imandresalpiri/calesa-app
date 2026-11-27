// La entrada del SHELL del módulo `equipo` para Client Components de `src/app/(app)/_shell/`: sólo lo que el
// marco necesita en el navegador. Existe aparte de `client.ts` porque ese archivo reexporta también el menú
// de vistas guardadas y la insignia de rol, que el marco no usa, y todo lo que el shell importa viaja en el
// JS de **todas** las pantallas (`docs/RENDIMIENTO.md`). Nada de servidor: para eso está `shell.ts`.
export { usePerspectiva } from './features/perspectiva/hooks/use-perspectiva'
export { useMenuPlegado } from './features/perfil/hooks/use-menu-plegado'
// El menú y la paleta con el Modo Live (`Sesion.live`): una función pura, sin E/S, que el marco usa en el servidor y en sus pruebas.
export { seOcultaEnElLive, type AreaDelLive } from './entities/live-pantallas'
export type { EstadoDelLive } from './entities/live-combinar'

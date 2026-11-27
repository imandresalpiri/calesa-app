// La entrada del SHELL del módulo `notificaciones` para Client Components de `src/app/(app)/_shell/`: sólo lo que el
// marco dibuja en toda pantalla (la campana de la barra y el push silenciado por el Modo Live). Existe aparte de `client.ts` porque lo que importa el
// shell viaja en el JS de **todas** las pantallas (`docs/RENDIMIENTO.md`). El contenido del popover va diferido.
export { Campana } from './features/campana/components/campana'
export type { AccionesPorTipo } from './features/lista/components/fila-de-notificacion'
export { SilencioDelPushEnElLive } from './features/push/components/silencio-del-push-en-el-live'

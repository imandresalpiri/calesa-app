// El origen que dibuja toda página de Logística (área `cadena`): el pedido por `?origen=`, el último que usó la persona o el primero. Lo usa
// `src/app/(app)/logistica/origen-de-la-cadena.ts`, que también prueba; aparte de `index.ts` para que su test no cargue el servidor. Sólo `src/app` importa este archivo.
export { origenElegido } from '../entities/cadena/origenes'

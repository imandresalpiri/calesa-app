// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`. Lo de «visto» va en `composicion-vistos.client.ts`.
export { descartarAvatar, subirAvatar } from './infra/avatar.client'
// «Ver más» de «Ajustes por persona» (Configuración › Modo Live).
export { leerMasPersonasDelLive } from './infra/live.client'

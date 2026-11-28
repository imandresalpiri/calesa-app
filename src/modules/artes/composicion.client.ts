// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`. Aparte de `composicion.ts`, que es `server-only`.
// Sólo las subidas (supabase-js): las importan el modal de subir y el editor de artes, que llegan con `diferido()`.
export { subirImagen, subirMiniatura, type ImagenSubida } from './infra/subida.client'

// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`. Aparte de `composicion.ts`, que es `server-only`.
// Sólo la subida (supabase-js): la importa el modal de subir, que llega con `diferido()`.
export { subirImagen, type ImagenSubida } from './infra/subida.client'

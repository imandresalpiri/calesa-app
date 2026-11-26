// Composición de «Ayuda» del menú del perfil, en el navegador. Aparte de `composicion.client.ts` a propósito: trae supabase-js, y sólo la
// pide el modal diferido de `src/app/(app)/_shell/ayuda/` al abrirse; el marco de toda pantalla no la paga.
export { leerMisEnlacesDeAyuda } from './infra/mis-enlaces-de-ayuda.client'

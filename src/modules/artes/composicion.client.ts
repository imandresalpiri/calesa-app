// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`. Aparte de `composicion.ts`, que es `server-only`.
// Las subidas (supabase-js), que importan el modal de subir y el editor de artes, y las lecturas del vehículo de ejemplo (`fetch` a las rutas de
// `src/app`): todo llega con `diferido()`.
export {
  esSinRed,
  leerCotizacionesDelVehiculo,
  leerDatosDeLaCotizacion,
  leerDatosDelVehiculo,
  leerVehiculosDeEjemplo,
  MENSAJE_SIN_LOS_VEHICULOS,
} from './infra/ejemplo.client'
export { subirImagen, subirMiniatura, type ImagenSubida } from './infra/subida.client'

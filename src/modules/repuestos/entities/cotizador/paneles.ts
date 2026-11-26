// Las confirmaciones de una cotización de repuestos en la URL (8.12-4, C13): `?panel=aceptar-cotizacion` y `?panel=anular-cotizacion`. Una de cada una por
// pantalla. Abrir «Aceptar» por la URL cuando no se puede (sin permiso, con cambios sin guardar, sin total) no abre: se avisa y la URL se limpia.
export const PANEL_ACEPTAR_COTIZACION = 'aceptar-cotizacion'
export const PANEL_ANULAR_COTIZACION = 'anular-cotizacion'

// La cotización a la que se refiere la confirmación cuando se abre desde la lista (`?panel=aceptar-cotizacion&cotizacion=<id>`): en la hoja de una cotización no
// hace falta (la ruta ya la nombra).
export const CLAVE_DE_COTIZACION = 'cotizacion'

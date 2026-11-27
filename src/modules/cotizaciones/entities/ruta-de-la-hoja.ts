import { RUTAS } from '@/shared/lib/rutas'

// La URL de la hoja de cotizar (`docs/UX.md` › «Cotizar»): `/cotizaciones/nuevo?origen=&lead=&vehiculo=`. Las claves son nombres de la URL; los ids se validan donde se leen.
export const RUTA_DE_LA_HOJA: string = RUTAS.nuevaCotizacion
export const CLAVE_DE_ORIGEN = 'origen'
export const CLAVE_DE_LEAD = 'lead'
export const CLAVE_DE_VEHICULO = 'vehiculo'

// Cambiar de pestaña de origen conserva el lead (lo elegido desde su ficha) y suelta el vehículo: es de otro origen.
export function rutaDeLaHoja(datos: { origen: string; lead: string | null }): string {
  const parametros = new URLSearchParams({ [CLAVE_DE_ORIGEN]: datos.origen })
  if (datos.lead !== null) {
    parametros.set(CLAVE_DE_LEAD, datos.lead)
  }
  return `${RUTA_DE_LA_HOJA}?${parametros.toString()}`
}

// El listado `/cotizaciones` (4.16-4a): sin vehículo es el listado entero; con él, el camino a lo antiguo del historial de un vehículo (`?vehiculo=`, que no es un filtro del
// esquema: ni chip ni lo borra «Limpiar»). El único lugar que escribe esa ruta.
export const RUTA_DEL_LISTADO: string = RUTAS.cotizaciones

// Con `lead` (4.17-4b), el de la sección «Cotizaciones» de la ficha del lead; con los dos, el lead primero.
export function rutaDelListado(datos: { vehiculo?: string; lead?: string }): string {
  const parametros = new URLSearchParams()
  if (datos.lead !== undefined) {
    parametros.set(CLAVE_DE_LEAD, datos.lead)
  }
  if (datos.vehiculo !== undefined) {
    parametros.set(CLAVE_DE_VEHICULO, datos.vehiculo)
  }
  const consulta = parametros.toString()
  return consulta === '' ? RUTA_DEL_LISTADO : `${RUTA_DEL_LISTADO}?${consulta}`
}

// La página de una cotización guardada (`/cotizaciones/[id]`, 4.15-3): de ahí se ve y se edita. El único lugar que escribe esa ruta.
export const rutaDeLaCotizacion = (id: string): string => `/cotizaciones/${id}`

// El PDF de una cotización guardada (4.18-3a): bajo su página, lo arma el route handler con lo guardado. El único lugar que escribe esa ruta (la usa «Descargar PDF», 4.18-3b).
export const rutaDelPdf = (id: string): string => `${rutaDeLaCotizacion(id)}/pdf`

// Los tamaños en que se pide la imagen de la tarjeta además de la grande (`.claude/rules/escala.md`: la miniatura de 480 px en toda lista). `?ancho=` con otro valor es
// la grande.
export const ANCHOS_DE_LA_IMAGEN = [480] as const
export type AnchoDeLaImagen = (typeof ANCHOS_DE_LA_IMAGEN)[number]
export const CLAVE_DEL_ANCHO = 'ancho'
// «Reintentar» pide otra URL (`?intento=n`): el navegador no reusa la respuesta que falló. La ruta lo ignora.
export const CLAVE_DEL_INTENTO = 'intento'
// La variante del Modo Live (`?sin-moneda=1`): los montos sin su símbolo ni su código de moneda. Otra URL y otra ETag: se cachean aparte.
export const CLAVE_SIN_MONEDA = 'sin-moneda'

// La imagen de la tarjeta de una cotización guardada (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): bajo su página, la arma su route handler para quien la pide.
// El único lugar que escribe esa ruta; con `ancho`, la miniatura (la de las listas); con `sinMoneda`, la del Modo Live; con `intento` > 0, la de «Reintentar».
export const rutaDeLaImagen = (
  id: string,
  {
    ancho,
    intento = 0,
    sinMoneda = false,
  }: { ancho?: AnchoDeLaImagen | undefined; intento?: number; sinMoneda?: boolean } = {},
): string => {
  const parametros = new URLSearchParams()
  if (ancho !== undefined) {
    parametros.set(CLAVE_DEL_ANCHO, String(ancho))
  }
  if (sinMoneda) {
    parametros.set(CLAVE_SIN_MONEDA, '1')
  }
  if (intento > 0) {
    parametros.set(CLAVE_DEL_INTENTO, String(intento))
  }
  const consulta = parametros.toString()
  const ruta = `${rutaDeLaCotizacion(id)}/imagen`
  return consulta === '' ? ruta : `${ruta}?${consulta}`
}

// `?sin-moneda=` leído: sólo `1` pide la variante del Modo Live; otro valor se ignora, como un `?ancho=` que no es de la lista.
export const sinMonedaDeLaImagen = (texto: string | null | undefined): boolean => texto === '1'

// `?ancho=` leído: uno de los anchos de la miniatura, o nulo (la grande).
export function anchoDeLaImagen(texto: string | null | undefined): AnchoDeLaImagen | null {
  return ANCHOS_DE_LA_IMAGEN.find((ancho) => String(ancho) === texto) ?? null
}

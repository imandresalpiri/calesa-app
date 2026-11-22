// La edición a pantalla completa: el modo en que una pieza clave de Configuración (la planilla, la hoja, la
// tarjeta, una tabla, el flujo) ocupa toda la ventana. Vive en la URL (`?editar=si`) para que recargar lo mantenga, y lo decide la página en el servidor. Este
// archivo no sabe de cotizaciones ni de flujos: sólo la clave, el estado que se dibuja en la barra y su texto.

export const CLAVE_DE_LA_EDICION = 'editar'
export const VALOR_DE_LA_EDICION = 'si'
// La consulta que entra al modo, para sumar a la de una ruta (`rutaDeLaFormula(…, { ...CONSULTA_DE_LA_EDICION })`).
export const CONSULTA_DE_LA_EDICION: Readonly<Record<string, string>> = {
  [CLAVE_DE_LA_EDICION]: VALOR_DE_LA_EDICION,
}

type Parametros = Readonly<Record<string, string | string[] | undefined>>

// ¿La página está en el modo? Con `editar=si` o con alguna de las claves `implicadas` presente (las de un enlace viejo que ya abría el editor: `?tabla=`).
export function enLaEdicion(parametros: Parametros, implicadas: readonly string[] = []): boolean {
  const pedido = parametros[CLAVE_DE_LA_EDICION]
  if ((Array.isArray(pedido) ? pedido[0] : pedido) === VALOR_DE_LA_EDICION) {
    return true
  }
  return implicadas.some((clave) => parametros[clave] !== undefined)
}

// Lo que dice el estado de la pieza que se edita, junto a su título: lo no guardado manda sobre lo demás. `detalle` (quién y cuándo) acompaña al estado en pantallas
// anchas. Una pieza sin borrador (el flujo se guarda en el acto) no dice estado: `null`.
export type EstadoDeLaEdicion =
  | { tipo: 'cambios' }
  | { tipo: 'borrador'; detalle?: string }
  // Sin `version` (la lectura de la pieza no la trae): «Publicada».
  | { tipo: 'publicada'; version?: number; detalle?: string }
  | null

export function textoDelEstado(estado: NonNullable<EstadoDeLaEdicion>): string {
  switch (estado.tipo) {
    case 'cambios':
      return 'Cambios sin guardar'
    case 'borrador':
      return 'Borrador'
    case 'publicada':
      return estado.version === undefined ? 'Publicada' : `Publicada v${String(estado.version)}`
  }
}

export type TonoDelEstado = 'aviso' | 'neutro' | 'exito'

export function tonoDelEstado(estado: NonNullable<EstadoDeLaEdicion>): TonoDelEstado {
  switch (estado.tipo) {
    case 'cambios':
      return 'aviso'
    case 'borrador':
      return 'neutro'
    case 'publicada':
      return 'exito'
  }
}

// El estado de una pieza con borrador, desde lo que la lectura sabe: lo no guardado manda; después, el borrador; después, la publicada (sin ninguna, nada).
export function estadoDeUnaPieza(lectura: {
  hayCambios: boolean
  borrador: { detalle?: string } | null
  publicada: { version?: number; detalle?: string } | null
}): EstadoDeLaEdicion {
  if (lectura.hayCambios) {
    return { tipo: 'cambios' }
  }
  if (lectura.borrador) {
    return lectura.borrador.detalle === undefined
      ? { tipo: 'borrador' }
      : { tipo: 'borrador', detalle: lectura.borrador.detalle }
  }
  if (lectura.publicada) {
    const { version, detalle } = lectura.publicada
    return {
      tipo: 'publicada',
      ...(version === undefined ? {} : { version }),
      ...(detalle === undefined ? {} : { detalle }),
    }
  }
  return null
}

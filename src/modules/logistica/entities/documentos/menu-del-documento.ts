import type { DocumentoDeLaUnidad, TipoDeDocumento } from './documento'
import { quePuedeHacer, type Accion, type ClavesDeDocumentos } from './revision'

// Las líneas del «⋯» de un documento, en su orden y con lo que cada una puede hacer quien mira (D20, D21, D23). Pura: la lista es una sola para toda fila, también la del drawer de gastos y la del ítem de
// repuesto; sobre `quePuedeHacer`. Lo que no corresponde al estado (aprobar un aprobado) no está; lo que corresponde pero quien mira no puede queda apagado con su motivo.

export type ClaveDeLaLinea =
  'ver' | 'descargar' | 'aprobar' | 'rechazar' | 'portal' | 'editar' | 'eliminar'

export type LineaDelMenu = {
  clave: ClaveDeLaLinea
  etiqueta: string
  // `habilitada` se puede elegir; `apagada` se ve, sin poder, y dice por qué (`motivo`, nulo mientras no se leen los permisos).
  estado: 'habilitada' | 'apagada'
  motivo: string | null
  // Sólo «Visible en el portal»: una casilla con marca.
  marcada?: boolean
}

const dePermiso = (
  clave: ClaveDeLaLinea,
  etiqueta: string,
  accion: Accion,
): LineaDelMenu | null => {
  if (accion.tipo === 'oculta') return null
  return {
    clave,
    etiqueta,
    estado: accion.tipo === 'habilitada' ? 'habilitada' : 'apagada',
    motivo: accion.tipo === 'apagada' ? accion.motivo : null,
  }
}

/** Todas las acciones de un documento para quien tiene estas claves: Ver y Descargar (si hay archivo), Aprobar y Rechazar (según el estado), Visible en el portal, Editar y Eliminar. */
export function lineasDelMenu(
  documento: Pick<DocumentoDeLaUnidad, 'estado' | 'visiblePortal' | 'ruta'>,
  tipo: Pick<TipoDeDocumento, 'visiblePortalPermitido'> | null,
  claves: ClavesDeDocumentos,
): LineaDelMenu[] {
  const puede = quePuedeHacer(documento, tipo, claves)
  const conArchivo = documento.ruta !== null
  const portal = dePermiso('portal', 'Visible en el portal', puede.portal)
  const lineas: (LineaDelMenu | null)[] = [
    conArchivo ? { clave: 'ver', etiqueta: 'Ver', estado: 'habilitada', motivo: null } : null,
    conArchivo
      ? { clave: 'descargar', etiqueta: 'Descargar', estado: 'habilitada', motivo: null }
      : null,
    dePermiso('aprobar', 'Aprobar', puede.aprobar),
    dePermiso('rechazar', 'Rechazar…', puede.rechazar),
    portal ? { ...portal, marcada: documento.visiblePortal } : null,
    dePermiso('editar', 'Editar…', puede.editar),
    dePermiso('eliminar', 'Eliminar…', puede.eliminar),
  ]
  return lineas.filter((l): l is LineaDelMenu => l !== null)
}

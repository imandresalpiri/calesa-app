// Qué ofrece cada «⋯» de Embarques y en qué orden: la fila de la lista, la cabecera del embarque y la sección (o el drawer) de un contenedor. Lo que escribe sale sólo con
// `logistica.transporte.editar` del origen; «Mover el contenedor», con `flujos.mover`; los huecos del grupo (documentos, gastos) ya vienen filtrados por permiso.

export type AccionDeEmbarques = { clave: string; etiqueta: string }

export const PREFIJO_DE_HUECO = 'hueco:'

const huecos = (lista: readonly { clave: string; titulo: string }[]): AccionDeEmbarques[] =>
  lista.map((h) => ({ clave: `${PREFIJO_DE_HUECO}${h.clave}`, etiqueta: h.titulo }))

/** El «⋯» de la fila de un embarque en la lista. */
export function accionesDeLaFilaDelEmbarque(puedeEditar: boolean): AccionDeEmbarques[] {
  return [
    { clave: 'abrir', etiqueta: 'Abrir el embarque' },
    ...(puedeEditar ? [{ clave: 'editar', etiqueta: 'Editar el embarque' }] : []),
  ]
}

/** El «⋯» de la fila de un contenedor en la lista. */
export function accionesDeLaFilaDelContenedor(conEmbarque: boolean): AccionDeEmbarques[] {
  return [
    { clave: 'abrir', etiqueta: 'Abrir el contenedor' },
    ...(conEmbarque ? [{ clave: 'embarque', etiqueta: 'Ir a su embarque' }] : []),
  ]
}

/** El «⋯» de la cabecera de la página de un embarque. */
export function accionesDelEmbarque(
  puedeEditar: boolean,
  huecosDelEmbarque: readonly { clave: string; titulo: string }[],
): AccionDeEmbarques[] {
  return [
    ...(puedeEditar
      ? [
          { clave: 'editar', etiqueta: 'Editar el embarque' },
          { clave: 'agregar-contenedor', etiqueta: 'Agregar contenedor' },
          { clave: 'agregar-vehiculos', etiqueta: 'Agregar vehículos' },
        ]
      : []),
    ...huecos(huecosDelEmbarque),
  ]
}

/**
 * El «⋯» de un contenedor: en la página del embarque (su sección) suma «Abrir el contenedor» y «Mover el contenedor»; en su drawer esos dos ya están a la vista (`enElDrawer`).
 * «Mover» va primero entre los huecos porque es lo que más se hace (R4).
 */
export function accionesDelContenedor(args: {
  puedeEditar: boolean
  puedeMover: boolean
  enElDrawer: boolean
  huecos: readonly { clave: string; titulo: string }[]
}): AccionDeEmbarques[] {
  const { puedeEditar, puedeMover, enElDrawer } = args
  return [
    ...(enElDrawer ? [] : [{ clave: 'abrir', etiqueta: 'Abrir el contenedor' }]),
    ...(puedeEditar
      ? [
          { clave: 'editar', etiqueta: 'Editar el contenedor' },
          ...(enElDrawer ? [] : [{ clave: 'agregar-vehiculos', etiqueta: 'Agregar vehículos' }]),
        ]
      : []),
    ...(puedeMover && !enElDrawer ? [{ clave: 'mover', etiqueta: 'Mover el contenedor' }] : []),
    ...huecos(args.huecos),
  ]
}

/** `hueco:<clave>` → la clave del hueco; nulo si la acción no es un hueco. */
export function huecoDeLaAccion(clave: string): string | null {
  return clave.startsWith(PREFIJO_DE_HUECO) ? clave.slice(PREFIJO_DE_HUECO.length) : null
}

import type { AccionDeMenu } from '@/shared/ui/lista'

export type QuehaceresDeFase = {
  alEditar: () => void
  alPedirQuitar: () => void
  alReactivar: () => void
}

// Las líneas del «⋯» de una fase, en su orden. Activa: Editar · ─ · Jubilar o eliminar (destructiva). Jubilada: Editar · Reactivar. Lo que abre algo
// encima espera a que el menú se cierre (`despuesDeCerrar`). «Reactivar» se hace y se avisa: no ofrece «Deshacer», porque `fase_eliminar` sobre una
// fase sin uso la borraría (C5).
export function accionesDeFase(
  fase: { activa: boolean },
  { alEditar, alPedirQuitar, alReactivar }: QuehaceresDeFase,
): AccionDeMenu[] {
  const editar: AccionDeMenu = {
    tipo: 'accion',
    clave: 'editar',
    etiqueta: 'Editar',
    despuesDeCerrar: true,
    alElegir: alEditar,
  }
  if (!fase.activa) {
    return [
      editar,
      { tipo: 'accion', clave: 'reactivar', etiqueta: 'Reactivar', alElegir: alReactivar },
    ]
  }
  return [
    editar,
    { tipo: 'separador', clave: 'antes-de-quitar' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Jubilar o eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      alElegir: alPedirQuitar,
    },
  ]
}

export type QuehaceresDelPanel = {
  alMover: (direccion: 'subir' | 'bajar') => void
  alPedirQuitar: () => void
  // Por qué no se puede mover en esa dirección; nulo si se puede.
  motivoSinMover: Record<'subir' | 'bajar', string | null>
}

// Las líneas del «⋯» del panel de una fase, en su orden: Mover antes · Mover después · ─ · Jubilar o eliminar (sólo en una activa; una jubilada se reactiva desde su
// aviso). Una apagada dice su motivo debajo, en texto; si las dos tienen el mismo, se dice una sola vez bajo las dos. Mover no abre nada encima: el menú se cierra
// y el foco vuelve al «⋯», que no se mueve de lugar cuando llega el orden nuevo.
export function accionesDelPanelDeFase(
  fase: { activa: boolean },
  { alMover, alPedirQuitar, motivoSinMover }: QuehaceresDelPanel,
): AccionDeMenu[] {
  const mover = (direccion: 'subir' | 'bajar', etiqueta: string): AccionDeMenu => ({
    tipo: 'accion',
    clave: direccion,
    etiqueta,
    deshabilitada: motivoSinMover[direccion] !== null,
    alElegir: () => {
      alMover(direccion)
    },
  })
  const nota = (clave: string, texto: string | null): AccionDeMenu[] =>
    texto === null ? [] : [{ tipo: 'nota', clave: `motivo-${clave}`, texto }]
  const { subir, bajar } = motivoSinMover
  const movimientos: AccionDeMenu[] =
    subir !== null && subir === bajar
      ? [mover('subir', 'Mover antes'), mover('bajar', 'Mover después'), ...nota('ambos', subir)]
      : [
          mover('subir', 'Mover antes'),
          ...nota('subir', subir),
          mover('bajar', 'Mover después'),
          ...nota('bajar', bajar),
        ]
  if (!fase.activa) {
    return movimientos
  }
  return [
    ...movimientos,
    { tipo: 'separador', clave: 'antes-de-quitar' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Jubilar o eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      alElegir: alPedirQuitar,
    },
  ]
}

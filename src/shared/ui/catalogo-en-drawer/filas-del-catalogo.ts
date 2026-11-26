import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import { usoDelElemento } from './frases'
import type { TextosDelCatalogo } from './tipos'

type Quehaceres = {
  alRenombrar: (elemento: ElementoDeCatalogo) => void
  alActivar: (elemento: ElementoDeCatalogo, activo: boolean) => void
  alPedirQuitar: (id: string) => void
}

// Las líneas del «⋯» de un elemento: Renombrar · Activar o Desactivar · ─ · Quitar (Subir y Bajar los pone `ListaDeCatalogo`). Sin
// permiso, todas apagadas con el motivo.
function accionesDelElemento(
  elemento: ElementoDeCatalogo,
  { alRenombrar, alActivar, alPedirQuitar }: Quehaceres,
  motivoSinPermiso: string | null,
): AccionDeMenu[] {
  const apagada = motivoSinPermiso !== null
  return [
    {
      tipo: 'accion',
      clave: 'renombrar',
      etiqueta: 'Renombrar',
      deshabilitada: apagada,
      alElegir: () => {
        alRenombrar(elemento)
      },
    },
    {
      tipo: 'accion',
      clave: elemento.activo ? 'desactivar' : 'activar',
      etiqueta: elemento.activo ? 'Desactivar' : 'Activar',
      deshabilitada: apagada,
      alElegir: () => {
        alActivar(elemento, !elemento.activo)
      },
    },
    { tipo: 'separador', clave: 'antes-de-quitar' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Quitar',
      destructiva: true,
      despuesDeCerrar: true,
      deshabilitada: apagada,
      alElegir: () => {
        alPedirQuitar(elemento.id)
      },
    },
    ...(motivoSinPermiso === null
      ? []
      : [{ tipo: 'nota' as const, clave: 'sin-permiso', texto: motivoSinPermiso }]),
  ]
}

// Los elementos como filas de la lista de catálogo, en su orden, con cuántos ítems tiene cada uno.
export function filasDelCatalogo(args: {
  lista: readonly ElementoDeCatalogo[]
  usos: ReadonlyMap<string, number>
  textos: TextosDelCatalogo
  motivoSinPermiso: string | null
  quehaceres: Quehaceres
}): FilaDeCatalogo[] {
  const { lista, usos, textos, motivoSinPermiso, quehaceres } = args
  return lista.map((elemento, posicion) => ({
    id: elemento.id,
    nombre: elemento.nombre,
    icono: null,
    activo: elemento.activo,
    insignias: [],
    uso: usoDelElemento(usos.get(elemento.id) ?? 0, textos),
    acciones: accionesDelElemento(elemento, quehaceres, motivoSinPermiso),
    puedeSubir: motivoSinPermiso === null && posicion > 0,
    puedeBajar: motivoSinPermiso === null && posicion < lista.length - 1,
    ...(motivoSinPermiso === null ? {} : { motivoSinOrden: motivoSinPermiso }),
  }))
}

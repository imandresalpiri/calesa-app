import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import {
  dominioDe,
  puedeMoverse,
  type EnlaceDeAyudaDeLaEmpresa,
} from '../../../entities/enlaces-de-ayuda'

type Quehaceres = {
  alEditar: (id: string) => void
  alActivar: (enlace: EnlaceDeAyudaDeLaEmpresa, activo: boolean) => void
  alPedirQuitar: (id: string) => void
}

// Las líneas del «⋯» de un enlace de la empresa: Editar · (Subir · Bajar, que suma la lista) · Desactivar o Activar · ─ · Quitar. Lo que abre
// algo encima espera a que el menú se cierre.
function accionesDeEnlace(
  enlace: EnlaceDeAyudaDeLaEmpresa,
  { alEditar, alActivar, alPedirQuitar }: Quehaceres,
): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      despuesDeCerrar: true,
      alElegir: () => {
        alEditar(enlace.id)
      },
    },
    {
      tipo: 'accion',
      clave: enlace.activo ? 'desactivar' : 'activar',
      etiqueta: enlace.activo ? 'Desactivar' : 'Activar',
      alElegir: () => {
        alActivar(enlace, !enlace.activo)
      },
    },
    { tipo: 'separador', clave: 'antes-de-quitar' },
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Quitar',
      destructiva: true,
      despuesDeCerrar: true,
      alElegir: () => {
        alPedirQuitar(enlace.id)
      },
    },
  ]
}

// Los enlaces de la empresa como filas de la lista de catálogo, en su orden: el dominio en la columna de la dirección y las líneas del «⋯».
export function filasDeEnlaces(
  enlaces: readonly EnlaceDeAyudaDeLaEmpresa[],
  quehaceres: Quehaceres,
): FilaDeCatalogo[] {
  return enlaces.map((enlace) => ({
    id: enlace.id,
    nombre: enlace.titulo,
    icono: null,
    activo: enlace.activo,
    insignias: [],
    uso: dominioDe(enlace.url),
    acciones: accionesDeEnlace(enlace, quehaceres),
    puedeSubir: puedeMoverse(enlaces, enlace.id, 'subir'),
    puedeBajar: puedeMoverse(enlaces, enlace.id, 'bajar'),
  }))
}

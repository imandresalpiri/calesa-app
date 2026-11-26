import type { AccionDeMenu } from '@/shared/ui/lista'
import { accionesConOrden } from '@/shared/ui/lista-de-catalogo/acciones-de-orden'
import type { Direccion } from '../../../entities/enlaces-de-ayuda'
import { claveDelElemento, type ElementoDeMisEnlaces } from '../../../entities/mis-enlaces-de-ayuda'

type Quehaceres = {
  alEditar: (id: string) => void
  alQuitar: (id: string) => void
  alMover: (clave: string, direccion: Direccion) => void
}

export function urlDelElemento(elemento: ElementoDeMisEnlaces): string {
  return elemento.tipo === 'empresa' ? elemento.enlace.url : elemento.url
}

function abrirEnOtraPestana(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

// Las líneas del «⋯» de un enlace en Perfil. Uno de la empresa: Abrir el enlace · Subir · Bajar (mostrarlo u ocultarlo es su interruptor).
// Uno propio: Editar · Subir · Bajar · Abrir el enlace · ─ · Quitar. Abrir va sin esperar a que el menú se cierre: el navegador sólo abre otra
// pestaña en el mismo gesto.
export function accionesDeMiEnlace(
  elementos: readonly ElementoDeMisEnlaces[],
  elemento: ElementoDeMisEnlaces,
  { alEditar, alQuitar, alMover }: Quehaceres,
): AccionDeMenu[] {
  const clave = claveDelElemento(elemento)
  const i = elementos.findIndex((uno) => claveDelElemento(uno) === clave)
  const abrir: AccionDeMenu = {
    tipo: 'accion',
    clave: 'abrir',
    etiqueta: 'Abrir el enlace',
    alElegir: () => {
      abrirEnOtraPestana(urlDelElemento(elemento))
    },
  }
  const propias: AccionDeMenu[] =
    elemento.tipo === 'empresa'
      ? [abrir]
      : [
          {
            tipo: 'accion',
            clave: 'editar',
            etiqueta: 'Editar',
            despuesDeCerrar: true,
            alElegir: () => {
              alEditar(elemento.id)
            },
          },
          abrir,
          { tipo: 'separador', clave: 'antes-de-quitar' },
          {
            tipo: 'accion',
            clave: 'quitar',
            etiqueta: 'Quitar',
            destructiva: true,
            alElegir: () => {
              alQuitar(elemento.id)
            },
          },
        ]
  return accionesConOrden(
    {
      id: clave,
      nombre: '',
      icono: null,
      activo: true,
      insignias: [],
      uso: '',
      acciones: propias,
      puedeSubir: i > 0,
      puedeBajar: i !== -1 && i < elementos.length - 1,
    },
    (direccion) => {
      alMover(clave, direccion)
    },
  )
}

// Lo que hace tocar la fila: la primera acción de su «⋯».
export function primeraAccion(acciones: readonly AccionDeMenu[]): (() => void) | null {
  const primera = acciones.find((linea) => linea.tipo === 'accion')
  return primera?.tipo === 'accion' ? primera.alElegir : null
}

'use client'

import type { AccionDeMenu } from '@/shared/ui/lista/acciones'
import { MasAcciones } from '@/shared/ui/lista/mas-acciones'

export const SIN_SECCION_ANTES = 'No hay una sección antes donde entre.'
export const SIN_SECCION_DESPUES = 'No hay una sección después donde entre.'

type Props = {
  // «Precio», «la tarjeta del total» o «la sección «Base»».
  nombre: string
  ocupado: boolean
  alQuitar: () => void
  // «Mover a la sección anterior / siguiente» (sólo las piezas de una sección): si hay una donde entre.
  vecinas?: { antes: boolean; despues: boolean; alMover: (paso: -1 | 1) => void }
  // «Quitar» o «Quitar la sección»; apagado con su motivo (la última sección).
  quitar?: { etiqueta: string; motivo: string | null }
}

const nota = (clave: string, texto: string): AccionDeMenu => ({ tipo: 'nota', clave, texto })

function deLasVecinas(vecinas: NonNullable<Props['vecinas']>, ocupado: boolean): AccionDeMenu[] {
  const { antes, despues, alMover } = vecinas
  return [
    {
      tipo: 'accion',
      clave: 'anterior',
      etiqueta: 'Mover a la sección anterior',
      deshabilitada: ocupado || !antes,
      alElegir: () => {
        alMover(-1)
      },
    },
    {
      tipo: 'accion',
      clave: 'siguiente',
      etiqueta: 'Mover a la sección siguiente',
      deshabilitada: ocupado || !despues,
      alElegir: () => {
        alMover(1)
      },
    },
    ...(antes ? [] : [nota('sin-anterior', SIN_SECCION_ANTES)]),
    ...(despues ? [] : [nota('sin-siguiente', SIN_SECCION_DESPUES)]),
    { tipo: 'separador', clave: 'separador' },
  ]
}

// El «⋯» de una pieza o una sección del lienzo: a la sección anterior o siguiente (una pieza; dentro de su sección se mueve con Alt+flechas o arrastrándola) y
// Quitar (se hace y ofrece «Deshacer»).
export function MenuDeLaPieza({ nombre, ocupado, alQuitar, vecinas, quitar }: Props) {
  const motivo = quitar?.motivo ?? null
  const acciones: AccionDeMenu[] = [
    ...(vecinas === undefined ? [] : deLasVecinas(vecinas, ocupado)),
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: quitar?.etiqueta ?? 'Quitar',
      destructiva: true,
      deshabilitada: ocupado || motivo !== null,
      alElegir: alQuitar,
    },
    ...(motivo === null ? [] : [nota('motivo', motivo)]),
  ]
  return <MasAcciones nombre={nombre} acciones={acciones} conBorde />
}

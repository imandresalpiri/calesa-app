import type { Announcements } from '@dnd-kit/core'
import { leerId, type QueHaceLaSoltada } from '@/shared/lib/campos'

export const INSTRUCCIONES_DE_ORDEN =
  'Para mover, pulsa Espacio, usa las flechas y pulsa Espacio otra vez. Esc cancela.'

type Nombres = {
  // La etiqueta de un campo (por su id) o de una casilla o fila fija (por su llave).
  deCampo: (id: string) => string
  deLlave: (llave: string) => string
  zona: string
}

function nombreDe(id: string | number, nombres: Nombres): string {
  const elemento = leerId(String(id))
  if (elemento === null) {
    return ''
  }
  switch (elemento.tipo) {
    case 'campo':
      return `«${nombres.deCampo(elemento.id)}»`
    case 'libre':
      return `el lugar libre ${String(elemento.posicion + 1)} de ${nombres.zona}`
    case 'casilla':
    case 'fijo':
      return `«${nombres.deLlave(elemento.llave)}»`
  }
}

// Lo que se dice al soltar, con lo que la soltada hizo (o por qué no hizo nada).
function alSoltar(tomado: string, soltada: QueHaceLaSoltada, nombres: Nombres): string {
  switch (soltada.tipo) {
    case 'mover-campo':
      return soltada.despuesDe === null
        ? `${tomado} quedó primero.`
        : `${tomado} quedó después de «${nombres.deCampo(soltada.despuesDe)}».`
    case 'poner-en-casilla':
      return `${tomado} quedó en el lugar ${String(soltada.posicion + 1)} de ${nombres.zona}.`
    case 'mover-casilla':
      return `${tomado} pasó al lugar ${String(soltada.hasta + 1)} de ${nombres.zona}.`
    case 'nada':
      return soltada.motivo ?? `${tomado} quedó en su lugar.`
  }
}

// Los anuncios del arrastre en español: cada paso, y al soltar lo que pasó (o el motivo de que no pasara nada).
export function anunciosDelEditor(
  nombres: Nombres,
  soltada: (activo: string, sobre: string | null) => QueHaceLaSoltada,
): Announcements {
  const cancelado = (id: string | number) =>
    `Se canceló: ${nombreDe(id, nombres)} volvió a su lugar.`
  return {
    onDragStart: ({ active }) => `Tomaste ${nombreDe(active.id, nombres)}.`,
    onDragOver: ({ active, over }) =>
      over === null || over.id === active.id
        ? undefined
        : `${nombreDe(active.id, nombres)} está sobre ${nombreDe(over.id, nombres)}.`,
    onDragEnd: ({ active, over }) =>
      over === null
        ? cancelado(active.id)
        : alSoltar(
            nombreDe(active.id, nombres),
            soltada(String(active.id), String(over.id)),
            nombres,
          ),
    onDragCancel: ({ active }) => cancelado(active.id),
  }
}

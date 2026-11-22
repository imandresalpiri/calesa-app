import type { KeyboardCoordinateGetter } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

type Datos = { current?: Record<string, unknown> | undefined } | undefined

// El contenedor de un soltable: el de su lista ordenable (`SortableContext id`) o el que declara (un lugar libre).
function contenedorDe(datos: Datos): unknown {
  const actual = datos?.current
  const ordenable = actual?.['sortable']
  if (typeof ordenable === 'object' && ordenable !== null && 'containerId' in ordenable) {
    return ordenable.containerId
  }
  return actual?.['contenedor']
}

// El teclado del arrastre: las flechas van a la fila o casilla vecina (el de fábrica de dnd-kit), pero sólo dentro del contenedor al que
// va lo que se arrastra: un campo, su grupo; una casilla o un dato común, las casillas. Sin esto una flecha saltaba a otro grupo, donde
// soltar no hace nada.
export const coordenadasDelContenedor: KeyboardCoordinateGetter = (evento, argumentos) => {
  const { context } = argumentos
  const { active, droppableContainers } = context
  if (!active) {
    return undefined
  }
  const declarado: unknown = active.data.current?.['destino']
  const destino = declarado ?? contenedorDe(active.data)
  const filtrados = droppableContainers
    .getEnabled()
    .filter((soltable) => contenedorDe(soltable.data) === destino)
  const soloEstos = {
    ...droppableContainers,
    getEnabled: () => filtrados,
    get: (id: Parameters<typeof droppableContainers.get>[0]) => droppableContainers.get(id),
  } as typeof droppableContainers
  return sortableKeyboardCoordinates(evento, {
    ...argumentos,
    context: { ...context, droppableContainers: soloEstos },
  })
}

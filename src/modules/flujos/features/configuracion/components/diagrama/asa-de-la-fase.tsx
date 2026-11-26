'use client'

import { Handle, Position, useConnection } from '@xyflow/react'
import { cn } from 'cn'

const OCULTO = 'pointer-events-none! opacity-0!'
// El destino cubre toda la caja («easy connect» de xyflow 12): se suelta sobre cualquier parte. Sólo recibe el puntero con una conexión en curso, así el clic
// de la caja sigue siendo de su botón.
const DESTINO =
  'absolute! inset-0! size-full! min-h-0! min-w-0! transform-none! rounded-(--radius-card)! border-0! bg-transparent! opacity-0!'
// El asa, a la derecha: de ahí se arrastra una salida nueva.
const ASA =
  'size-4! border-2! border-(--color-surface)! bg-(--color-primario)! cursor-crosshair! hover:scale-125 transition'

type Props = { nombre: string; puedeVincular: boolean; lado: 'destino' | 'asa' }

// Los `<Handle>` de una caja: React Flow dibuja las aristas entre ellos (el camino de cada flecha sale de su ruta, no de ellos). El destino va antes del
// botón y el asa después, hermanos de él. Sin poder vincular, el asa queda oculta y sin conexión.
export function AsaDeLaFase({ nombre, puedeVincular, lado }: Props) {
  const conectando = useConnection((c) => c.inProgress)
  if (lado === 'destino') {
    return (
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={puedeVincular}
        className={cn(DESTINO, !(conectando && puedeVincular) && 'pointer-events-none!')}
      />
    )
  }
  const texto = `Crear una salida desde «${nombre}»`
  return (
    <Handle
      type="source"
      position={Position.Right}
      isConnectable={puedeVincular}
      aria-label={puedeVincular ? texto : undefined}
      title={puedeVincular ? texto : undefined}
      className={puedeVincular ? ASA : OCULTO}
    />
  )
}

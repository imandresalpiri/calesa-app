import type { HuecoDeLaUnidad } from '../../../../entities/nucleo/hueco'
import { ATRIBUTO_DEL_BLOQUE } from '../../../../entities/nucleo/paneles-de-la-unidad'
import type { UnidadAbierta } from '../../../../entities/nucleo/unidad'
import { ContenidoDelHueco } from '../contenido-del-hueco'

type Props = {
  unidad: UnidadAbierta
  // Los huecos visibles de la tarjeta, en el orden del panel (`tarjetasDeLaUnidad`).
  huecos: readonly HuecoDeLaUnidad[]
}

// Lo que abre el drawer de una tarjeta: su hueco tal cual o, si junta varios (Dinero: gastos, pagos y margen), una sección hermana con su `h3` por cada uno; un solo nivel, sin
// pestañas. Cada hueco lleva su ancla (`data-bloque-del-hueco`): «Revisar» y «Completar» buscan adentro lo que enfocan. Compatible con servidor.
export function ContenidoDeLaTarjeta({ unidad, huecos }: Props) {
  if (huecos.length === 1 && huecos[0] !== undefined) {
    const hueco = huecos[0]
    return (
      <div {...{ [ATRIBUTO_DEL_BLOQUE]: hueco.clave }} className="min-w-0">
        <ContenidoDelHueco hueco={hueco} unidad={unidad} />
      </div>
    )
  }
  return (
    <div className="grid min-w-0 gap-6">
      {huecos.map((hueco) => (
        <section
          key={hueco.clave}
          aria-labelledby={`titulo-del-hueco-${hueco.clave}`}
          {...{ [ATRIBUTO_DEL_BLOQUE]: hueco.clave }}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3"
        >
          <h3
            id={`titulo-del-hueco-${hueco.clave}`}
            className="text-(length:--text-base) font-medium text-(--color-ink)"
          >
            {hueco.titulo}
          </h3>
          <ContenidoDelHueco hueco={hueco} unidad={unidad} />
        </section>
      ))}
    </div>
  )
}

import type { Permisos } from '@/shared/lib/permisos'
import type { EstadoDeLaBandeja } from '../../../entities/alertas/estado-de-la-bandeja'
import { BandejaVacia } from './bandeja-vacia'
import { GrupoDeLaBandeja } from './grupo-de-la-bandeja'

type Props = {
  estado: EstadoDeLaBandeja
  permisos: Permisos
  ahora: Date
  zona: string
  origenes: ReadonlyMap<string, string> | null
  origenId: string
}

// La bandeja del día de un origen: lo que le toca hoy a quien mira, por grupos y con su acción. Server Component: sólo las filas y los botones llevan JS. Nada pendiente dice «Nada pendiente hoy».
export function BandejaDelDia({ estado, permisos, ahora, zona, origenes, origenId }: Props) {
  return (
    <section
      aria-labelledby="bandeja-titulo"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3"
    >
      <h2 id="bandeja-titulo" className="text-(length:--text-lg) font-semibold text-(--color-ink)">
        Bandeja del día
      </h2>
      {estado.tipo === 'vacia' ? (
        <BandejaVacia origenId={origenId} />
      ) : (
        estado.grupos.map((grupo) => (
          <GrupoDeLaBandeja
            key={grupo.grupo}
            grupo={grupo}
            permisos={permisos}
            ahora={ahora}
            zona={zona}
            origenes={origenes}
            origenId={origenId}
          />
        ))
      )}
    </section>
  )
}

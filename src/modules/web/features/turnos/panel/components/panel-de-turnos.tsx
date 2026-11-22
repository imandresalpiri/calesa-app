'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { TOPE_DE_TURNOS_CARGADOS } from '../../../../entities/turnos/turnos'
import { TarjetaTurno } from '../../tarjeta/components/tarjeta-de-turno'
import { useTurnosDelPanel } from '../hooks/use-turnos-del-panel'

type Props = {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  // La frase de vacío del bloque de Inicio: qué aparece acá y qué lo hace aparecer.
  vacio: string
  // «Vincular a lead» sólo con `leads.ver`: lo decide `page.tsx` con `puede()`.
  puedeVincular: boolean
}

function Esqueleto() {
  return (
    <div aria-hidden className="grid gap-3">
      {Array.from({ length: 3 }, (_, n) => (
        <div key={n} className="grid gap-2 rounded-(--radius-lg) border border-(--color-line) p-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-11 w-40 md:h-9" />
        </div>
      ))}
    </div>
  )
}

// Lo de adentro: se lee al montarse (el drawer lo desmonta al cerrarse, así que cada apertura lee de nuevo).
function Contenido({ vacio, puedeVincular }: Pick<Props, 'vacio' | 'puedeVincular'>) {
  const { estado, verMas, quitar, reintentar } = useTurnosDelPanel()
  if (estado.estado === 'cargando') {
    return (
      <div role="status" aria-label="Cargando los turnos">
        <Esqueleto />
      </div>
    )
  }
  if (estado.estado === 'error') {
    return (
      <EstadoError compacto titulo="No se pudieron cargar los turnos" alReintentar={reintentar} />
    )
  }
  if (estado.turnos.length === 0) {
    return <EstadoVacio compacto titulo="Nada pendiente" descripcion={vacio} />
  }
  return (
    <div className="grid gap-3">
      <ul className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line) rounded-(--radius-lg) border border-(--color-line)">
        {estado.turnos.map((turno) => (
          <li key={turno.id}>
            <TarjetaTurno
              turno={turno}
              ahora={estado.leidoEn}
              puedeVincular={puedeVincular}
              alConfirmar={() => {
                quitar(turno.id)
              }}
            />
          </li>
        ))}
      </ul>
      {estado.enElTope ? (
        <AvisoDeTope
          texto={`Se muestran los primeros ${String(TOPE_DE_TURNOS_CARGADOS)}, los que vencen primero.`}
          camino="Confirma los de arriba para ver los siguientes."
        />
      ) : estado.hayMas ? (
        <div className="grid justify-items-start gap-2">
          {estado.errorAlSeguir ? (
            <p role="alert" className="text-(length:--text-sm) text-(--color-ink)">
              No se pudieron cargar más turnos.
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={estado.cargandoMas}
            onClick={verMas}
          >
            {estado.errorAlSeguir ? 'Reintentar' : 'Ver más'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

// «Ver todos» del bloque «Turnos de la web sin confirmar» (`?panel=turnos`): todos mis turnos sin confirmar, los que vencen primero arriba, de a 20 con «Ver más».
// Cada uno con «Contacté» y «Vincular a lead», como en el bloque. A pantalla completa en el celular.
export function PanelDeTurnos({ abierto, alCerrar, titulo, vacio, puedeVincular }: Props) {
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={titulo}
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      <Contenido vacio={vacio} puedeVincular={puedeVincular} />
    </Drawer>
  )
}

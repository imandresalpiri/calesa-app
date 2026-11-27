'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { Monto } from '@/shared/ui/monto'
import { Skeleton } from '@/shared/ui/skeleton'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { cifraDelMargen, SIN_PERMISO_DE_MARGEN, type Margen } from '../../../entities/dinero/margen'
import { PANEL_DESGLOSE_DEL_MARGEN } from '../../../entities/dinero/paneles'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useMargen } from '../hooks/use-margen'
import { DesgloseDelMargenDiferido } from './diferidos-de-dinero'

// El renglón del margen y el botón miden lo mismo cargando, con error y listo: cambiar de vista o releer no mueve nada.
const RENGLON = 'min-h-8 text-(length:--text-xl) font-semibold'
const BOTON = 'min-h-11 md:min-h-9'

function LineaDelMargen({ margen }: { margen: Margen }) {
  const cifra = cifraDelMargen(margen)
  return (
    <p className={RENGLON} data-cifra="margen">
      {cifra.monto === null ? (
        <span className="text-(--color-ink-soft)">{cifra.sinDato}</span>
      ) : (
        <Monto valor={cifra.monto} />
      )}
    </p>
  )
}

function ErrorDelMargen({
  sinPermiso,
  mensaje,
  reintentar,
}: {
  sinPermiso: boolean
  mensaje: string
  reintentar: () => void
}) {
  return (
    <div className="grid gap-2">
      <Aviso tono={sinPermiso ? 'info' : 'peligro'}>
        <p>{sinPermiso ? SIN_PERMISO_DE_MARGEN : mensaje}</p>
      </Aviso>
      {sinPermiso ? null : (
        <div>
          <Button variant="outline" className={BOTON} onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  )
}

// La vista «Margen» del drawer de Dinero: el margen en una línea (la cifra de la base; un nulo es «Sin venta registrada», nunca 0) y «Ver el desglose» (`?panel=desglose-del-margen`,
// un modal diferido con lo que ya se leyó). Sólo existe con `logistica.margen.ver` en el origen; vuelve a leer cuando un gasto o un pago cambia.
export function HuecoDeMargen({ unidad }: { unidad: Unidad }) {
  const { lectura, reintentar } = useMargen(unidad.id)
  const panel = usePanelPorUrl(PANEL_DESGLOSE_DEL_MARGEN)
  const listo = lectura.tipo === 'listo' ? lectura.dato : null
  const montado = useAbiertoAlgunaVez(panel.abierto && listo !== null)
  if (lectura.tipo === 'error') {
    return (
      <ErrorDelMargen
        sinPermiso={lectura.error.codigo === 'sin_permiso'}
        mensaje={lectura.error.mensaje}
        reintentar={reintentar}
      />
    )
  }
  return (
    <div className="grid content-start gap-3" data-hueco="margen" data-estado={lectura.tipo}>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">Margen</p>
      {listo === null ? (
        <div aria-busy="true" aria-label="Cargando el margen" className={RENGLON}>
          <Skeleton className="h-8 w-40" />
        </div>
      ) : (
        <LineaDelMargen margen={listo} />
      )}
      <div>
        <Button
          variant="outline"
          className={BOTON}
          disabled={listo === null}
          onClick={() => {
            recordarQuienAbre()
            panel.abrir()
          }}
        >
          Ver el desglose
        </Button>
      </div>
      {montado && listo !== null ? (
        <DesgloseDelMargenDiferido abierto={panel.abierto} alCerrar={panel.cerrar} margen={listo} />
      ) : null}
    </div>
  )
}

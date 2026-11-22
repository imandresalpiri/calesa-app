'use client'

import { InboxIcon } from 'lucide-react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import type { PestanaDelResumenDeCotizacion } from '../../../../entities/pestanas-del-resumen'
import { useLineaDeTiempo } from '../../hooks/use-linea-de-tiempo'
import { EntradaDeLaLineaDeTiempo } from './entrada-de-la-linea'

type Props = {
  cotizacionId: string
  puedeAdjuntar: boolean
  alElegirPestana: (pestana: PestanaDelResumenDeCotizacion) => void
}

const NOMBRE_DE_LA_FUENTE = {
  comentarios: 'los comentarios',
  revisiones: 'las revisiones',
  adjuntos: 'los adjuntos',
} as const

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Cargando la actividad" className="grid gap-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

function FalloDeUnaFuente({
  fallo,
  ocupado,
}: {
  fallo: { fuente: keyof typeof NOMBRE_DE_LA_FUENTE; mensaje: string; reintentar: () => void }
  ocupado: boolean
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)"
    >
      <p>
        No se pudieron cargar {NOMBRE_DE_LA_FUENTE[fallo.fuente]}. {fallo.mensaje}
      </p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        disabled={ocupado}
        onClick={fallo.reintentar}
      >
        Reintentar
      </Button>
    </div>
  )
}

// Lo que se ve sin actividad: ofrece lo que la llena, «Agregar comentario» y, con permiso para guardarla, «Adjuntar».
function VacioDeLaLinea({
  puedeAdjuntar,
  alElegirPestana,
}: Pick<Props, 'puedeAdjuntar' | 'alElegirPestana'>) {
  return (
    <EstadoVacio
      Icono={InboxIcon}
      titulo="Todavía no hay actividad."
      descripcion="Los comentarios, las revisiones y los adjuntos de la cotización aparecerán acá."
      compacto
      accion={
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            className="min-h-11 md:min-h-9"
            onClick={() => {
              alElegirPestana('comentarios')
            }}
          >
            Agregar comentario
          </Button>
          {puedeAdjuntar ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 md:min-h-9"
              onClick={() => {
                alElegirPestana('adjuntos')
              }}
            >
              Adjuntar
            </Button>
          ) : null}
        </div>
      }
    />
  )
}

// «Todo» del resumen de una cotización: adjuntos, revisiones y comentarios juntos, lo más nuevo arriba. Cada fuente se lee por su cuenta (`useLineaDeTiempo`): si una falla lo dice
// con su «Reintentar» y el resto se ve. Vacío, ofrece lo que la llena: «Agregar comentario» y, con permiso para guardarla, «Adjuntar».
export function TodoDelResumen({ cotizacionId, puedeAdjuntar, alElegirPestana }: Props) {
  const linea = useLineaDeTiempo(cotizacionId)
  const vacia = linea.todasLeidas && linea.entradas.length === 0
  return (
    <div className="grid min-w-0 gap-3">
      {linea.fallos.map((fallo) => (
        <FalloDeUnaFuente key={fallo.fuente} fallo={fallo} ocupado={linea.pidiendo} />
      ))}
      {linea.leyendo ? <Esqueleto /> : null}
      {vacia ? (
        <VacioDeLaLinea puedeAdjuntar={puedeAdjuntar} alElegirPestana={alElegirPestana} />
      ) : linea.entradas.length > 0 ? (
        <ol
          aria-label="Actividad de la cotización"
          className="grid grid-cols-[minmax(0,1fr)] gap-2"
        >
          {linea.entradas.map((entrada) => (
            <EntradaDeLaLineaDeTiempo
              key={`${entrada.tipo}:${entrada.id}`}
              entrada={entrada}
              etiquetas={linea.etiquetasDeRevisiones}
              calculos={linea.calculosDeRevisiones}
            />
          ))}
        </ol>
      ) : null}
      {linea.enElTope ? (
        <AvisoDeTope
          texto="Mostrando lo más reciente."
          camino="Para ver lo anterior, abre «Comentarios» o «Revisiones»."
        />
      ) : linea.hayMasParaPedir ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          disabled={linea.pidiendo}
          onClick={linea.verMas}
        >
          {linea.pidiendo ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
    </div>
  )
}

'use client'

import { HistoryIcon } from 'lucide-react'
import { DesdeUnaFecha } from '@/shared/ui/desde-una-fecha'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import type { useRevisiones } from '../hooks/use-revisiones'
import { EsqueletoDeRevisiones } from './esqueleto-de-revisiones'
import { PieDeRevisiones } from './pie-de-revisiones'
import { Revision } from './revision'

// Lo que dibuja un panel de revisiones según cómo va su lectura: el esqueleto, el error con «Reintentar», el vacío o la lista con «Ir a una fecha» y «Ver más». Lo comparten el panel de
// la guardada (`?panel=revisiones`) y la pestaña «Revisiones» del resumen de una cotización.
export function ContenidoDeRevisiones({
  revisiones,
  zona,
}: {
  revisiones: ReturnType<typeof useRevisiones>
  zona: string
}) {
  if (!revisiones.leido) {
    return revisiones.error ? (
      <div role="alert">
        <EstadoError
          titulo="No se pudieron cargar las revisiones."
          alReintentar={revisiones.reintentar}
        />
      </div>
    ) : (
      <EsqueletoDeRevisiones />
    )
  }
  if (revisiones.revisiones.length === 0 && revisiones.desde === null) {
    return <EstadoVacio Icono={HistoryIcon} titulo="Todavía no tiene cambios guardados." compacto />
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <DesdeLaFecha revisiones={revisiones} zona={zona} />
      {revisiones.revisiones.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          No hay revisiones hasta esa fecha.
        </p>
      ) : (
        <ul aria-label="Revisiones" className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {revisiones.revisiones.map((revision) => (
            <Revision
              key={revision.id}
              revision={revision}
              etiquetas={revisiones.etiquetas.nodos}
              calculos={revisiones.etiquetas}
            />
          ))}
        </ul>
      )}
      <PieDeRevisiones revisiones={revisiones} zona={zona} />
    </div>
  )
}

function DesdeLaFecha({
  revisiones,
  zona,
}: {
  revisiones: ReturnType<typeof useRevisiones>
  zona: string
}) {
  return revisiones.desde === null ? null : (
    <DesdeUnaFecha
      dia={revisiones.desde}
      zona={zona}
      ocupado={revisiones.ocupado}
      volver="Volver a las más recientes"
      alVolver={revisiones.volverALasMasRecientes}
    />
  )
}

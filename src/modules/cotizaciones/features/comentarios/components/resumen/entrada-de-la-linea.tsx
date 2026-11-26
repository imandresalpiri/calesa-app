'use client'

import { HistoryIcon, MessageSquareIcon, PaperclipIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { fechaRelativa, formatearFechaHora } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import { autorDelComentario } from '../../../../entities/comentarios/comentario'
import type { EntradaDeLaLinea } from '../../../../entities/comentarios/linea-de-tiempo'
import type { DeLosCalculos } from '../../../../entities/cambios-de-la-revision'
import { ContenidoDeLaRevision } from '../../../revisiones/components/revision'
import { ContenidoDeAdjunto } from '../adjunto'

const ETIQUETA: Record<EntradaDeLaLinea['tipo'], { texto: string; Icono: LucideIcon }> = {
  comentario: { texto: 'Comentario', Icono: MessageSquareIcon },
  revision: { texto: 'Revisión', Icono: HistoryIcon },
  adjunto: { texto: 'Adjunto', Icono: PaperclipIcon },
}

function Marco({ tipo, children }: { tipo: EntradaDeLaLinea['tipo']; children: ReactNode }) {
  const { texto, Icono } = ETIQUETA[tipo]
  return (
    <li
      data-entrada={tipo}
      className="grid min-w-0 gap-1 rounded-(--radius-md) border border-(--color-border) p-3 text-(length:--text-sm)"
    >
      <p className="flex items-center gap-1.5 text-(length:--text-xs) text-(--color-ink-soft)">
        <Icono aria-hidden className="size-3.5" />
        {texto}
      </p>
      {children}
    </li>
  )
}

function Comentario({ entrada }: { entrada: Extract<EntradaDeLaLinea, { tipo: 'comentario' }> }) {
  const { zonaHoraria } = useRegional()
  const { comentario } = entrada
  return (
    <Marco tipo="comentario">
      <p className="flex flex-wrap items-baseline gap-x-2 text-(length:--text-sm)">
        <span className="font-medium [overflow-wrap:anywhere] text-(--color-ink)">
          {autorDelComentario(comentario)}
        </span>
        <time
          dateTime={comentario.creadoEn}
          title={formatearFechaHora(comentario.creadoEn, { zona: zonaHoraria })}
          className="text-(--color-ink-soft)"
        >
          {fechaRelativa(comentario.creadoEn, { zona: zonaHoraria })}
        </time>
      </p>
      {comentario.eliminado ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft) italic">
          Comentario eliminado.
        </p>
      ) : (
        <p className="line-clamp-4 min-w-0 text-(length:--text-sm) break-words whitespace-pre-wrap text-(--color-ink)">
          {comentario.cuerpo}
        </p>
      )}
      {comentario.respuestas.length > 0 ? (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          Tiene respuestas: ábrelas en «Comentarios».
        </p>
      ) : null}
    </Marco>
  )
}

// Una entrada de «Todo»: su tipo con icono y texto (nunca sólo el icono), y lo mismo que dibuja su pestaña. Sólo se lee: quitar, borrar y responder son de cada pestaña.
export function EntradaDeLaLineaDeTiempo({
  entrada,
  etiquetas,
  calculos,
}: {
  entrada: EntradaDeLaLinea
  etiquetas: ReadonlyMap<string, string>
  calculos?: DeLosCalculos | undefined
}) {
  if (entrada.tipo === 'comentario') {
    return <Comentario entrada={entrada} />
  }
  if (entrada.tipo === 'revision') {
    return (
      <Marco tipo="revision">
        <ContenidoDeLaRevision
          revision={entrada.revision}
          etiquetas={etiquetas}
          calculos={calculos}
        />
      </Marco>
    )
  }
  return (
    <Marco tipo="adjunto">
      <ContenidoDeAdjunto
        adjunto={entrada.adjunto}
        quitable={false}
        pedirQuitar={() => undefined}
      />
    </Marco>
  )
}

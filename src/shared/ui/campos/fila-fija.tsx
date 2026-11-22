'use client'

import { Badge } from '@/shared/ui/badge'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { ToqueDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import type { PropsDeFijo } from './cuerpo'
import { LugarDelAsa } from './lugar-del-asa'

function motivoDe(props: PropsDeFijo): string | null {
  if (!props.puedeGestionar) {
    return props.motivoSinPermiso
  }
  return !props.es && props.topeLleno ? props.textos.motivoTope : null
}

// Una fila que no es un campo del layout (un dato común): no se edita ni se ordena; sólo entra o sale de las casillas. Tocarla hace eso
// mismo, con permiso y lugar.
export function FilaFija(props: PropsDeFijo) {
  const { llave, etiqueta, insignia, textos, es, conAsa, alAlternar, alMontar, estilo, asa } = props
  const motivo = motivoDe(props)
  const verbo = es ? textos.quitar : textos.hacer
  const acciones: AccionDeMenu[] = [
    {
      tipo: 'accion',
      clave: 'alternar',
      etiqueta: verbo,
      principal: true,
      deshabilitada: motivo !== null,
      alElegir: () => {
        alAlternar(llave)
      },
    },
    ...(motivo === null
      ? []
      : [{ tipo: 'nota' as const, clave: 'alternar-motivo', texto: motivo }]),
  ]
  return (
    <li
      ref={alMontar}
      style={estilo}
      data-fijo={llave}
      className="relative flex min-w-0 items-center gap-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) py-1 pr-1 pl-3 has-[[data-slot=toque-de-la-tarjeta]:hover]:bg-(--color-surface-2) has-[>[data-asa]]:pl-0"
    >
      {motivo === null ? (
        <ToqueDeLaTarjeta
          etiqueta={`${verbo}: ${etiqueta}`}
          abrir={() => {
            alAlternar(llave)
          }}
        />
      ) : null}
      {conAsa ? (
        <span data-asa className="relative z-10 flex shrink-0">
          {asa ?? <LugarDelAsa />}
        </span>
      ) : null}
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="min-w-0 font-medium break-words text-(--color-ink)">{etiqueta}</span>
        <span className="flex flex-wrap gap-1">
          <Badge variant="outline">{insignia}</Badge>
          {es ? <Badge variant="outline">{textos.insignia}</Badge> : null}
        </span>
      </span>
      <span className="relative z-10 flex shrink-0">
        <MasAcciones nombre={etiqueta} acciones={acciones} />
      </span>
    </li>
  )
}

'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { embarqueDeLogistica } from '@/shared/lib/rutas'
import type { Conteo } from '../../../entities/transporte/embarque'
import { CLAVE_DE_FALTA, VALOR_DE_FALTA } from '../../../entities/transporte/paneles'
import { textoDeFaltan } from '../../../entities/transporte/textos'

// Lo que comparten las filas y las tarjetas de la lista: un valor o «—», y «2 con algo que falta» enlazado a la página del embarque filtrada (`?falta=1`).

export function Valor({ texto }: { texto: string | null }) {
  return texto === null ? <span className="text-(--color-ink-faint)">—</span> : <>{texto}</>
}

export function Faltan({
  faltan,
  embarqueId,
  origenId,
}: {
  faltan: Conteo
  // Nulo: un contenedor sin embarque (no hay página que filtrar).
  embarqueId: string | null
  origenId: string
}) {
  const texto = textoDeFaltan(faltan)
  if (texto === null) return <Valor texto={null} />
  if (embarqueId === null) return <span className="text-(--color-aviso-ink)">{texto}</span>
  return (
    <Link
      href={
        `${embarqueDeLogistica(embarqueId, origenId)}&${CLAVE_DE_FALTA}=${VALOR_DE_FALTA}` as Route
      }
      prefetch={false}
      className="text-(--color-aviso-ink) underline-offset-2 hover:underline"
    >
      {texto}
    </Link>
  )
}

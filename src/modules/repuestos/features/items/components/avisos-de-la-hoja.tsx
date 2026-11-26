'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useTransition } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  AVISO_DE_PROYECTO_CERRADO,
  TEXTO_DEL_TOPE_DE_LA_HOJA,
  TEXTO_DE_HOJA_VACIA,
} from '../../../entities/items/hoja'

// Los avisos de la hoja (8.09-2, C12 y C13): el proyecto cerrado, el tope de 200 y el vacío de primera vez.
export function AvisoDeCerrado() {
  return (
    <Aviso tono="info">
      <p>{AVISO_DE_PROYECTO_CERRADO}</p>
    </Aviso>
  )
}

export function AvisoDeTopeDeLaHoja() {
  return <AvisoDeTope texto={TEXTO_DEL_TOPE_DE_LA_HOJA} />
}

export function HojaVacia() {
  return <EstadoVacio compacto titulo={TEXTO_DE_HOJA_VACIA} />
}

// Otra persona cambió el ítem (`PT409`): la hoja no pisa nada. «Recargar» trae lo nuevo (se renuevan las filas desde el servidor) y descarta lo escrito. Queda «en curso» hasta que las filas nuevas llegan, y
// sólo entonces el aviso se va (`alRecargar`): un cierre del panel a mitad de camino descartaría el refresco en vuelo y la hoja se quedaría con lo viejo sin decirlo.
export function AvisoDeConflictoDeLaHoja({
  mensaje,
  alRecargar,
}: {
  mensaje: string
  alRecargar: () => void
}) {
  const router = useRouter()
  const [enCurso, empezar] = useTransition()
  const pedido = useRef(false)
  const alTerminar = useRef(alRecargar)
  useEffect(() => {
    alTerminar.current = alRecargar
  })
  useEffect(() => {
    if (enCurso || !pedido.current) return
    pedido.current = false
    alTerminar.current()
  }, [enCurso])
  return (
    <AvisoDeConflicto
      mensaje={mensaje}
      enCurso={enCurso}
      alRecargar={() => {
        pedido.current = true
        empezar(() => {
          router.refresh()
        })
      }}
    />
  )
}

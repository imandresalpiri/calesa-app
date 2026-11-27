'use client'

import { useState } from 'react'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import {
  idsConElMovido,
  idsMoviendoUnLugar,
  puedeMoverse,
  textoDelLugarDeLogo,
  type Direccion,
  type ListaDeLogos,
  type VarianteDelLogo,
} from '../../../entities/logos'
import type { RespuestaDeLogos } from '../../../entities/repositorios'
import type { usePedidosDeLogos } from './use-pedidos-de-logos'

type Args = {
  lista: ListaDeLogos
  poner: (lista: ListaDeLogos) => void
  unaVez: ReturnType<typeof useUnEnvioALaVez>
  pedir: ReturnType<typeof usePedidosDeLogos>
  rechazar: (envio: Envio<RespuestaDeLogos>) => void
}

// El orden de las variantes propias: arrastrar, o «Mover antes» y «Mover después». La lista cambia al instante y vuelve a como estaba si la base no lo
// acepta; la respuesta trae la lista entera con las versiones nuevas.
export function useOrdenDeLogos({ lista, poner, unaVez, pedir, rechazar }: Args) {
  // Lo que anuncia el lector de pantalla tras mover, y qué se movió (la pantalla devuelve el foco).
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<{ id: string; veces: number } | null>(null)

  // Lleva `id` a su lugar nuevo: la lista cambia al instante y vuelve a como estaba si la base no lo acepta.
  async function ordenarA(id: string, ids: string[]) {
    const antes = lista
    const orden = new Map(ids.map((uno, i) => [uno, i]))
    poner({
      ...antes,
      variantes: [
        ...antes.variantes.filter((v) => v.uso !== null),
        ...antes.variantes
          .filter((v) => v.uso === null)
          .sort((a, b) => (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0)),
      ],
    })
    const envio = await unaVez.mandar(() => pedir.ordenar(ids))
    if (envio === null) {
      poner(antes)
      return
    }
    if (!envio.ok) {
      poner(antes)
      rechazar(envio)
      return
    }
    poner(envio.data.lista)
    setAnuncio(textoDelLugarDeLogo(envio.data.lista, id))
    setMovimiento((previo) => ({ id, veces: (previo?.veces ?? 0) + 1 }))
  }

  async function mover(logo: VarianteDelLogo, direccion: Direccion) {
    if (puedeMoverse(lista, logo.id, direccion)) {
      await ordenarA(logo.id, idsMoviendoUnLugar(lista, logo.id, direccion))
    }
  }

  // Al soltar una arrastrada sobre otra: toma el lugar de aquella.
  async function soltar(id: string, sobre: string) {
    const ids = lista.variantes.filter((v) => v.uso === null).map((v) => v.id)
    const hasta = ids.indexOf(sobre)
    if (id !== sobre && hasta !== -1) {
      await ordenarA(id, idsConElMovido(lista, id, hasta))
    }
  }

  return { anuncio, movimiento, mover, soltar }
}

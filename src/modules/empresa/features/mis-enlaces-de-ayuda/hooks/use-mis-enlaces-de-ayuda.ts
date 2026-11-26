'use client'

import { useState } from 'react'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import type { Direccion } from '../../../entities/enlaces-de-ayuda'
import {
  armarMisElementos,
  claveDelElemento,
  conMostrar,
  conPropio,
  firmaDeMisEnlaces,
  moverElemento,
  sinPropio,
  type ElementoDeMisEnlaces,
  type EnlacePropio,
  type MisEnlacesLeidos,
} from '../../../entities/mis-enlaces-de-ayuda'
import { useGuardarMisEnlaces } from './use-guardar-mis-enlaces'

function tituloDe(elemento: ElementoDeMisEnlaces): string {
  return elemento.tipo === 'empresa' ? elemento.enlace.titulo : elemento.titulo
}

// Lo leído, sembrado por una firma: si lo que trae la página cambia (otra pestaña, «Recargar»), lo local se vuelve a sembrar con eso.
function useLeidosSembrados(inicial: MisEnlacesLeidos) {
  const firma = firmaDeMisEnlaces(inicial)
  const [visto, setVisto] = useState(firma)
  const [leidos, setLeidos] = useState(inicial)
  if (visto !== firma) {
    setVisto(firma)
    setLeidos(inicial)
  }
  return [leidos, setLeidos] as const
}

// Los enlaces de ayuda de quien mira, en Perfil. Cada cambio (mostrar u ocultar uno de la empresa, mover, sumar, editar o quitar uno propio)
// guarda la lista entera (`useGuardarMisEnlaces`); lo reversible ofrece «Deshacer».
export function useMisEnlacesDeAyuda(inicial: MisEnlacesLeidos) {
  const [leidos, poner] = useLeidosSembrados(inicial)
  const { elementos, actual, enCurso, guardar, rechazar, guardarConDeshacer } =
    useGuardarMisEnlaces(leidos, poner)
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)

  async function mostrar(enlaceId: string, ver: boolean) {
    const elemento = actual.current.elementos.find(
      (uno) => uno.tipo === 'empresa' && uno.enlace.id === enlaceId,
    )
    if (!elemento) {
      return
    }
    await guardarConDeshacer(
      conMostrar(actual.current.elementos, enlaceId, ver),
      `«${tituloDe(elemento)}» ${ver ? 'se ve' : 'ya no se ve'} en tu menú.`,
    )
  }

  async function mover(clave: string, direccion: Direccion) {
    const nuevos = moverElemento(actual.current.elementos, clave, direccion)
    const envio = nuevos && (await guardar(nuevos))
    if (!envio) {
      return
    }
    if (!envio.ok) {
      rechazar(envio)
      return
    }
    const ahora = armarMisElementos(envio.data)
    const i = ahora.findIndex((uno) => claveDelElemento(uno) === clave)
    const movido = ahora[i]
    if (movido) {
      setAnuncio(`${tituloDe(movido)}, ${String(i + 1)} de ${String(ahora.length)}`)
    }
    setMovimiento((antes) => ({ id: clave, direccion, veces: (antes?.veces ?? 0) + 1 }))
  }

  async function quitarPropio(id: string) {
    const elemento = actual.current.elementos.find((uno) => uno.tipo === 'propio' && uno.id === id)
    if (!elemento) {
      return
    }
    await guardarConDeshacer(
      sinPropio(actual.current.elementos, id),
      `«${tituloDe(elemento)}» quitado.`,
    )
  }

  return {
    leidos,
    elementos,
    version: leidos.version,
    topePropios: leidos.topePropios,
    anuncio,
    movimiento,
    enCurso,
    mostrar,
    mover,
    quitarPropio,
    // El del modal devuelve el envío entero: el modal dice el motivo junto al campo.
    guardarPropio: (propio: EnlacePropio) => guardar(conPropio(actual.current.elementos, propio)),
  }
}

export type MisEnlacesDeAyuda = ReturnType<typeof useMisEnlacesDeAyuda>

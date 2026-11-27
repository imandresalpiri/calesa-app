'use client'

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

import { ATRIBUTO_DEL_BLOQUE } from '../../../entities/nucleo/paneles-de-la-unidad'

// Lo que pasa dentro del panel de una unidad se avisa por el navegador, no por la URL: un hueco guarda algo y otro, de la misma unidad, vuelve a leer (6.04; mismo patrón que
// `eventos-de-dinero.ts`). Dos avisos: «cambió algo de la unidad» (el hueco «Qué falta» se relee) y «abre ese hueco» (el atajo de una falta).
const EVENTO_DE_CAMBIO = 'logistica:unidad-cambio'
const EVENTO_DE_ABRIR = 'logistica:abrir-hueco'

export { ATRIBUTO_DEL_BLOQUE } from '../../../entities/nucleo/paneles-de-la-unidad'

export function avisarCambioDeLaUnidad(unidadId: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENTO_DE_CAMBIO, { detail: unidadId }))
}

// Llama `alCambiar` cada vez que otro hueco avisa que cambió algo de esa unidad.
export function useAlCambiarLaUnidad(unidadId: string, alCambiar: () => void): void {
  const ultima = useRef(alCambiar)
  useEffect(() => {
    ultima.current = alCambiar
  })
  useEffect(() => {
    const oyente = (evento: Event) => {
      if (evento instanceof CustomEvent && evento.detail === unidadId) {
        ultima.current()
      }
    }
    window.addEventListener(EVENTO_DE_CAMBIO, oyente)
    return () => {
      window.removeEventListener(EVENTO_DE_CAMBIO, oyente)
    }
  }, [unidadId])
}

function bloqueDe(clave: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${ATRIBUTO_DEL_BLOQUE}="${CSS.escape(clave)}"]`)
}

/** Abre el bloque de ese hueco (si estaba cerrado), lo trae a la vista y le lleva el foco. Devuelve `false` si el panel no lo tiene. */
export function abrirHueco(clave: string): boolean {
  if (bloqueDe(clave) === null) return false
  window.dispatchEvent(new CustomEvent<string>(EVENTO_DE_ABRIR, { detail: clave }))
  return true
}

// Abre lo que contiene el hueco cuando alguien lo pide por el aviso: lo usan la tarjeta de la unidad (abre su drawer) y «Qué falta» (se trae a la vista).
export function useAlPedirAbrirElHueco(clave: string, alAbrir: () => void): void {
  const ultima = useRef(alAbrir)
  useEffect(() => {
    ultima.current = alAbrir
  })
  useEffect(() => {
    const oyente = (evento: Event) => {
      if (evento instanceof CustomEvent && evento.detail === clave) {
        ultima.current()
      }
    }
    window.addEventListener(EVENTO_DE_ABRIR, oyente)
    return () => {
      window.removeEventListener(EVENTO_DE_ABRIR, oyente)
    }
  }, [clave])
}

const sinSuscripcion = () => () => undefined

/** ¿El panel tiene ese hueco? Falso en el servidor y mientras no se sabe; un atajo sólo se dibuja si el hueco existe. */
export function useHayHueco(clave: string): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => bloqueDe(clave) !== null,
    () => false,
  )
}

/** Cuáles de esos huecos tiene el panel (una sola lectura del DOM para muchos botones). Vacío en el servidor. */
export function useHuecosQueHay(claves: readonly string[]): ReadonlySet<string> {
  const lista = useSyncExternalStore(
    sinSuscripcion,
    () => claves.filter((clave) => bloqueDe(clave) !== null).join(','),
    () => '',
  )
  return useMemo(() => new Set(lista === '' ? [] : lista.split(',')), [lista])
}

/** Lleva el foco al título del panel de la unidad (p. ej. tras mover, cuando lo que se tocaba cambió de lugar). */
export function enfocarElTituloDeLaUnidad(): void {
  document.querySelector<HTMLElement>('[data-slot="panel-de-la-unidad"] h2')?.focus()
}

'use client'

import { useSyncExternalStore } from 'react'
import { crearCola } from '@/shared/lib/cola'
import { subirImagenDelSitio } from '../subir-imagen.client'

// Las imágenes que se están subiendo (o fallaron) de cada imagen o galería de la guía. Una foto sin ruta todavía no es parte del documento
// (`documentoLimpio` la descarta): nunca se guarda ni queda en el borrador. Al terminar, `alTerminar` pone la ruta en su bloque.
export type Pendiente = {
  id: string
  estado: 'subiendo' | 'error'
  mensaje: string | null
  archivo: File
}

type AlTerminar = (ruta: string, archivo: File) => void

const MAXIMO_EN_PARALELO = 2
const SIN_PENDIENTES: readonly Pendiente[] = []
const cola = crearCola(MAXIMO_EN_PARALELO)
const porGrupo = new Map<string, readonly Pendiente[]>()
const oyentes = new Set<() => void>()
let siguiente = 0

function publicar(grupo: string, pendientes: readonly Pendiente[]) {
  if (pendientes.length === 0) {
    porGrupo.delete(grupo)
  } else {
    porGrupo.set(grupo, pendientes)
  }
  oyentes.forEach((oyente) => {
    oyente()
  })
}

const de = (grupo: string): readonly Pendiente[] => porGrupo.get(grupo) ?? SIN_PENDIENTES

function cambiar(grupo: string, id: string, cambios: Partial<Pendiente> | null) {
  publicar(
    grupo,
    cambios === null
      ? de(grupo).filter((p) => p.id !== id)
      : de(grupo).map((p) => (p.id === id ? { ...p, ...cambios } : p)),
  )
}

async function subir(grupo: string, id: string, archivo: File, alTerminar: AlTerminar) {
  const turno = cola.pedir()
  await turno.turno
  try {
    const subida = await subirImagenDelSitio(archivo)
    if (subida.ok) {
      cambiar(grupo, id, null)
      alTerminar(subida.data.ruta, archivo)
    } else {
      cambiar(grupo, id, { estado: 'error', mensaje: subida.error.mensaje })
    }
  } finally {
    turno.soltar()
  }
}

export function nuevoGrupoDeSubidas(): string {
  siguiente += 1
  return `subida-${Date.now().toString(36)}-${siguiente}`
}

// Sube los archivos (a lo sumo dos a la vez) y llama a `alTerminar` con la ruta de cada uno.
export function subirImagenes(grupo: string, archivos: readonly File[], alTerminar: AlTerminar) {
  const nuevas = archivos.map((archivo): Pendiente => {
    siguiente += 1
    return { id: `${grupo}-${siguiente}`, estado: 'subiendo', mensaje: null, archivo }
  })
  publicar(grupo, [...de(grupo), ...nuevas])
  nuevas.forEach((p) => {
    void subir(grupo, p.id, p.archivo, alTerminar)
  })
}

export function reintentarSubida(grupo: string, id: string, alTerminar: AlTerminar) {
  const pendiente = de(grupo).find((p) => p.id === id)
  if (pendiente) {
    cambiar(grupo, id, { estado: 'subiendo', mensaje: null })
    void subir(grupo, id, pendiente.archivo, alTerminar)
  }
}

export function descartarSubida(grupo: string, id: string) {
  cambiar(grupo, id, null)
}

export function descartarGrupo(grupo: string) {
  publicar(grupo, SIN_PENDIENTES)
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function usePendientes(grupo: string | null): readonly Pendiente[] {
  return useSyncExternalStore(
    suscribir,
    () => (grupo === null ? SIN_PENDIENTES : de(grupo)),
    () => SIN_PENDIENTES,
  )
}

// Si hay alguna subida en curso en toda la guía (un error no cuenta: esa foto ya no va).
export function haySubiendo(): boolean {
  return [...porGrupo.values()].some((lista) => lista.some((p) => p.estado === 'subiendo'))
}

// Lo mismo, para dibujar: guardar espera a que no quede ninguna y salir con alguna en curso pregunta.
export function useHaySubiendo(): boolean {
  return useSyncExternalStore(suscribir, haySubiendo, () => false)
}

export function cuantasPendientes(grupo: string): number {
  return de(grupo).length
}

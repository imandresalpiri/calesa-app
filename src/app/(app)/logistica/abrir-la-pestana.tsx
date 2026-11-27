import 'server-only'
import { connection } from 'next/server'
import type { ReactElement } from 'react'
import {
  CLAVE_DE_ORIGEN_DE_LOGISTICA,
  enElOrigen,
  type OrigenDeLaCadena,
} from '@/modules/logistica'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { pestanaDisponible, tituloDeLaPestana, type PestanaDeLogistica } from './enlaces'
import { EstadoDelOrigen } from './estado-del-origen'
import { origenDeLaPagina } from './origen-de-la-pagina'

type Parametros = Record<string, string | string[] | undefined>
type DeLaPagina = Awaited<ReturnType<typeof origenDeLaPagina>>

export type PestanaAbierta =
  | {
      tipo: 'ok'
      permisos: Permisos
      origen: OrigenDeLaCadena
      origenes: OrigenDeLaCadena[]
      parametros: Parametros
    }
  | { tipo: 'estado'; estado: ReactElement }

// Sin un origen que dibujar: el estado que lo dice, con el primero que sí ve para ir.
function estadoSinOrigen(
  resuelto: Exclude<DeLaPagina['resuelto'], { tipo: 'ok' }>,
  paraConfigurar: DeLaPagina['paraConfigurar'],
): EstadoDelOrigen {
  switch (resuelto.tipo) {
    case 'sin_acceso':
    case 'error':
      return { tipo: resuelto.tipo }
    case 'sin_origenes':
      return { tipo: 'sin_origenes', configurar: paraConfigurar.length > 0 }
    case 'sin_permiso':
    case 'no_disponible': {
      const primero = resuelto.origenes[0]
      const ir = primero
        ? { nombre: primero.nombre, href: enElOrigen(RUTAS.logistica, primero.id) }
        : null
      return resuelto.tipo === 'sin_permiso'
        ? { tipo: 'sin_permiso', nombre: resuelto.nombre ?? '', ir }
        : { tipo: 'no_disponible', nombre: resuelto.nombre, ir }
    }
  }
}

// La pestaña en el origen elegido: nulo si va; si no, el estado que dice por qué.
function estadoDeLaPestana(
  permisos: Permisos,
  origen: OrigenDeLaCadena,
  pestana: PestanaDeLogistica,
): EstadoDelOrigen | null {
  switch (pestanaDisponible(permisos, origen, pestana)) {
    case 'no_usa':
      return {
        tipo: 'no_usa',
        origen: origen.nombre,
        pestana: tituloDeLaPestana(pestana),
        hrefDeLaCadena: enElOrigen(RUTAS.logistica, origen.id),
      }
    case 'sin_permiso':
      return { tipo: 'sin_permiso_en_la_pestana' }
    case 'flujo_no_leido':
      return { tipo: 'flujo_no_leido', origen: origen.nombre }
    case 'si':
      return null
  }
}

// Lo que el contenido de una página de Logística necesita antes de leer: la URL, el origen resuelto (`origenDeLaPagina`, en caché con la barra) y que la pestaña
// vaya en ese origen. Si no hay qué dibujar, el estado que lo dice (`EstadoDelOrigen`). Tras `await connection()`: lee sesión y base.
export async function abrirLaPestana(
  searchParams: Promise<Parametros>,
  pestana: PestanaDeLogistica,
): Promise<PestanaAbierta> {
  await connection()
  const parametros = await searchParams
  const { permisos, resuelto, paraConfigurar } = await origenDeLaPagina(
    unParametro(parametros[CLAVE_DE_ORIGEN_DE_LOGISTICA]),
  )
  const conEstado = (e: EstadoDelOrigen): PestanaAbierta => ({
    tipo: 'estado',
    estado: <EstadoDelOrigen estado={e} />,
  })
  if (resuelto.tipo !== 'ok') return conEstado(estadoSinOrigen(resuelto, paraConfigurar))
  const { origen, origenes } = resuelto
  const estado = estadoDeLaPestana(permisos, origen, pestana)
  return estado === null
    ? { tipo: 'ok', permisos, origen, origenes, parametros }
    : conEstado(estado)
}

'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTonos } from '../../../areas/diseno/composicion'
import type { RespuestaDeTonos } from '../../../entities/diseno/respuesta-de-tonos'
import { MOTIVO_SIN_PERMISO_DE_TONOS } from '../../../entities/diseno/tonos'
import { comoResultado } from '../../niveles/actions/resultado'
import { esquemaCrearTono } from '../schemas/tonos'

type Pedido = Parameters<typeof repositorioDeTonos.crear>[0]

// Crea el color con el id del intento (`tono_crear`): repetirlo devuelve el mismo. El catálogo es de la empresa: el permiso se pide sin origen y la base lo vuelve a pedir.
async function crear(
  pedido: Pedido,
  permisos: Parameters<typeof puede>[0],
): Promise<ResultadoDeAccion<RespuestaDeTonos>> {
  if (!puede(permisos, 'cotizaciones.configurar')) {
    return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_TONOS)
  }
  return comoResultado(await repositorioDeTonos.crear(pedido))
}

// Crea un color desde la sección de colores, que se dibuja de nuevo con el catálogo leído.
export const crearTono = actionClient
  .inputSchema(esquemaCrearTono)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeTonos>> => {
    const hecho = await crear(parsedInput, ctx.permisos)
    if (hecho.ok) revalidatePath(RUTAS.origenes, 'layout')
    return hecho
  })

// «Nuevo color» al vuelo, desde el panel de una banda: sin revalidar. La respuesta trae el catálogo entero y la planilla suma el color en pantalla; revalidar
// volvería a dibujar la página y se llevaría el panel abierto de la URL (`docs/LECCIONES.md`). El catálogo no se guarda en caché: la próxima pantalla lo lee.
export const crearTonoAlVuelo = actionClient
  .inputSchema(esquemaCrearTono)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeTonos>> =>
    crear(parsedInput, ctx.permisos),
  )

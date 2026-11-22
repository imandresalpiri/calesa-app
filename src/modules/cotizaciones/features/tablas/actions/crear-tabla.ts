'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTablas } from '../../../areas/tablas/composicion'
import { MOTIVO_SIN_PERMISO_DE_TABLA } from '../../../entities/tablas/publicacion'
import type { TablaCreada } from '../../../entities/tablas/resultado-de-estructura'
import { esquemaDeCrearTabla } from '../schemas/estructura-de-tabla'

// Crea una tabla de referencia del origen o compartida (`tabla_referencia_crear()`): la base saca la clave del nombre, valida las columnas, el choque de claves
// y el tope, y vuelve a pedir el permiso. `puede()` sólo evita pedir lo que se va a rechazar: una compartida pide el de algún origen. Sólo si entró, las
// pestañas se vuelven a leer.
export const crearTabla = actionClient
  .inputSchema(esquemaDeCrearTabla)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<TablaCreada>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_TABLA)
    }
    const hecho = await repositorioDeTablas.crear(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return hecho
  })

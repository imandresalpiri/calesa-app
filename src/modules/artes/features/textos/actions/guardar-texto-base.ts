'use server'

import { getOrigenes, leerLayout } from '@/modules/origenes'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { guardarTextoBase, type TextoBaseGuardado } from '../../../composicion'
import { validarTextoBase } from '../../../entities/datos/texto-base'
import { variablesDelArte, type CatalogoDelArte } from '../../../entities/datos/variables-del-arte'
import {
  esquemaGuardarTextoBase,
  MOTIVO_SIN_EL_ORIGEN,
  motivoSinPermisoDelTextoBase,
} from '../schemas/guardar-texto-base'

// El origen (su nombre, para los motivos, y su tipo) y los campos activos de su ficha: su catálogo de variables. Nulo si no se pudo leer.
async function origenDelTextoBase(origenId: string) {
  const origenes = await getOrigenes(true)
  return origenes.ok ? (origenes.data.find((o) => o.id === origenId) ?? null) : null
}

async function catalogoDelOrigen(
  origenId: string,
): Promise<{ nombre: string; catalogo: CatalogoDelArte } | null> {
  const [origen, layout] = await Promise.all([
    origenDelTextoBase(origenId),
    leerLayout(origenId, { conUso: false }),
  ])
  if (!origen || !layout.ok) {
    return null
  }
  return {
    nombre: origen.nombre,
    catalogo: variablesDelArte({ tipo: origen.tipo, campos: layout.data.campos }),
  }
}

// Guarda el texto base de un origen (pestaña «Textos» del editor de artes): con `cotizaciones.configurar` en ese origen y las reglas de la
// base dichas antes (`validarTextoBase()`, espejo de `artes_texto_base_guardar()`, que las repite con la versión). No revalida: el editor tiene
// algo a medio hacer y redibujarlo lo perdería; devuelve la versión nueva y el panel la aplica.
export const guardarTextoBaseDelOrigen = actionClient
  .inputSchema(esquemaGuardarTextoBase)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<TextoBaseGuardado>> => {
    const { origenId, texto, actualizadoEnEsperado } = parsedInput
    if (!puede(ctx.permisos, 'cotizaciones.configurar', origenId)) {
      const origen = await origenDelTextoBase(origenId)
      return fallo('sin_permiso', motivoSinPermisoDelTextoBase(origen?.nombre ?? null))
    }
    const leido = await catalogoDelOrigen(origenId)
    if (!leido) {
      return fallo('regla', MOTIVO_SIN_EL_ORIGEN)
    }
    const validado = validarTextoBase(texto, leido.catalogo)
    if (!validado.ok) {
      return {
        ok: false,
        error: { codigo: 'validacion', mensaje: validado.motivo },
        porCampo: { texto: validado.motivo },
      }
    }
    const hecho = await guardarTextoBase({ origenId, texto: validado.texto, actualizadoEnEsperado })
    if (!hecho.ok && hecho.error.codigo === 'sin_permiso') {
      return fallo('sin_permiso', motivoSinPermisoDelTextoBase(leido.nombre))
    }
    return hecho
  })

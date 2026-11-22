import 'server-only'
import { leerFormulaDeTrabajo } from '@/modules/cotizaciones'
import {
  estadoDeLaPuestaEnMarcha,
  siguePendienteLaPuestaEnMarcha,
  type OrigenConUso,
} from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'
import { rutaDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import { permisosDeLaPuestaEnMarcha } from './puesta-en-marcha/abrir'

// A dónde lleva «Seguir la puesta en marcha» de la cabecera del origen (a la raíz, que abre el paso que toca), o nulo si no va: un origen inactivo, ya con
// fórmula activa o sin nada que la persona pueda hacer. La fórmula de trabajo sólo se lee si hace falta (sin el permiso del cotizador la RLS no la deja leer);
// si esa lectura falla, se sigue como si no hubiera fórmula.
export async function seguirLaPuestaEnMarcha(
  permisos: Permisos,
  origen: OrigenConUso,
): Promise<string | null> {
  if (!origen.activo || origen.uso.formulaPublicada) {
    return null
  }
  const losPermisos = permisosDeLaPuestaEnMarcha(permisos, origen.id)
  const formula = losPermisos.cotizador ? await leerFormulaDeTrabajo(origen.id) : null
  const estado = estadoDeLaPuestaEnMarcha({
    uso: origen.uso,
    hayFormulaDeTrabajo: formula !== null && formula.ok && formula.data !== null,
    permisos: losPermisos,
  })
  return siguePendienteLaPuestaEnMarcha(estado) ? rutaDeLaPuestaEnMarcha(origen.id) : null
}

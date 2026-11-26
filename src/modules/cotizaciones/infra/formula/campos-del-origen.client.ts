// Los campos del origen (su clave y su tipo), desde el navegador y con la sesión de quien edita: con ellos la planilla marca las filas cuyo dato del vehículo no
// existe en este origen (`camposQueFaltan()`, la copia de una fórmula de otro origen) y no ofrece «Decimales» en las que no es un número (`datosQueNoSonNumero()`).
// Una lectura al montarse, sólo si la definición nombra un dato que no es común. La policy de `origenes_campos` la abre a todo `authenticated`.
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { TOPE_DE_CAMPOS_DEL_ORIGEN } from '../../entities/campos-que-faltan'
import type { CampoDelOrigen } from '../../entities/decimales-de-celda'

const esquemaDeLosCampos = z.array(z.object({ clave: z.string(), tipo: z.string() }))

// Por `origenes_campos_origen_id_clave_key (origen_id, clave)`.
export async function leerCamposDelOrigen(origenId: string): Promise<Resultado<CampoDelOrigen[]>> {
  const { data, error } = await createClient()
    .from('origenes_campos')
    .select('clave, tipo')
    .eq('origen_id', origenId)
    .limit(TOPE_DE_CAMPOS_DEL_ORIGEN)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const campos = esquemaDeLosCampos.safeParse(data)
  if (!campos.success) return fallo('inesperado', 'No pudimos leer los campos del origen.')
  return ok(campos.data)
}

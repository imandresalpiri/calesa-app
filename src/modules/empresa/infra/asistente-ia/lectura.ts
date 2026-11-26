import 'server-only'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import type { createClient } from '@/shared/lib/supabase/server'
import type { EmpresaDelPedido } from '../../entities/asistente-ia/pedido'

type ClienteDeQuienPide = Awaited<ReturnType<typeof createClient>>

export type AsistenteLeido = {
  // null si la fila no está en la instalación.
  integracion: { activa: boolean; config: unknown; secretoGuardadoEn: string | null } | null
  empresa: EmpresaDelPedido
}

// La fila `asistente_ia` y el nombre y el país de la empresa, con el cliente de quien pide: dos lecturas por clave primaria, en paralelo.
export async function leerElAsistente(
  supabase: ClienteDeQuienPide,
): Promise<Resultado<AsistenteLeido>> {
  const [fila, empresa] = await Promise.all([
    supabase
      .from('integraciones')
      .select('activa, config, secreto_guardado_en')
      .eq('clave', 'asistente_ia')
      .maybeSingle(),
    supabase.from('ajustes_empresa').select('nombre, pais').eq('id', 1).single(),
  ])
  if (fila.error) return { ok: false, error: errorDePostgrest(fila.error) }
  if (empresa.error) return { ok: false, error: errorDePostgrest(empresa.error) }
  return ok({
    integracion: fila.data
      ? {
          activa: fila.data.activa,
          config: fila.data.config,
          secretoGuardadoEn: fila.data.secreto_guardado_en,
        }
      : null,
    empresa: { nombre: empresa.data.nombre, pais: empresa.data.pais },
  })
}

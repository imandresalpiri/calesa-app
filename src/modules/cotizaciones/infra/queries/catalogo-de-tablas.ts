import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { TablaDelCatalogoDelOrigen } from '../../entities/catalogo-de-tablas'
import { leerCatalogoDeTablasSobre } from './consulta-del-catalogo-de-tablas'

// El catálogo de tablas del origen, en el servidor, con la sesión de quien configura. Null si no se pudo leer.
export async function leerCatalogoDeTablas(
  origenId: string,
): Promise<TablaDelCatalogoDelOrigen[] | null> {
  return leerCatalogoDeTablasSobre(await createClient(), origenId)
}

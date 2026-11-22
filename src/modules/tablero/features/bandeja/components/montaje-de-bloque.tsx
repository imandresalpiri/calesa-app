import { connection } from 'next/server'
import type { Permisos } from '@/shared/lib/permisos'
import type { BloqueParaMontar } from '../bloques/registro'

// Lee la sesión y la base: por eso va tras `connection()` y dentro del `<Suspense>` de su bloque.
export async function MontajeDeBloque({
  montaje: { bloque, cuerpo: Cuerpo },
  zona,
  permisos,
}: {
  montaje: BloqueParaMontar
  zona: string
  permisos: Permisos
}) {
  await connection()
  return <Cuerpo bloque={bloque} zona={zona} permisos={permisos} />
}

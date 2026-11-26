import type { GrupoDeCampos } from '@/shared/lib/campos'
import type { OperacionesDelCatalogo } from '@/shared/ui/catalogo-en-drawer'
import { crearDesdeAccion, type RespuestaDeCrear } from '@/shared/ui/combo-de-catalogo'
import type { GruposDelEditor } from './tipos'

// El catálogo de grupos que recibe el editor, a partir de lo leído, de la action «crear grupo» del módulo y de las del drawer.
export function gruposDelEditor(args: {
  lista: readonly GrupoDeCampos[]
  hayMas: boolean
  puedeCrear: boolean
  enviar: (nombre: string) => Promise<RespuestaDeCrear | undefined>
  // Las del drawer «Grupos»; sin ellas, el editor no lo dibuja.
  operaciones?: OperacionesDelCatalogo | null
}): GruposDelEditor {
  return {
    lista: args.lista,
    hayMas: args.hayMas,
    puedeCrear: args.puedeCrear,
    crear: crearDesdeAccion(args.enviar),
    operaciones: args.operaciones ?? null,
  }
}

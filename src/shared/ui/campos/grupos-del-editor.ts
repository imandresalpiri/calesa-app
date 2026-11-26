import type { GrupoDeCampos } from '@/shared/lib/campos'
import { crearDesdeAccion, type RespuestaDeCrear } from '@/shared/ui/combo-de-catalogo'
import type { GruposDelEditor } from './tipos'

// El catálogo de grupos que recibe el editor, a partir de lo leído y de la action «crear grupo» del módulo.
export function gruposDelEditor(args: {
  lista: readonly GrupoDeCampos[]
  hayMas: boolean
  puedeCrear: boolean
  enviar: (nombre: string) => Promise<RespuestaDeCrear | undefined>
}): GruposDelEditor {
  return {
    lista: args.lista,
    hayMas: args.hayMas,
    puedeCrear: args.puedeCrear,
    crear: crearDesdeAccion(args.enviar),
  }
}

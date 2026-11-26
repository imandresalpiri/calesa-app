'use client'

import type { GrupoDeCampos } from '@/shared/lib/campos'
import { useConLosCreados, type OperacionesDelCatalogo } from '@/shared/ui/catalogo-en-drawer'
import { crearDesdeAccion, type RespuestaDeCrear } from '@/shared/ui/combo-de-catalogo'
import type { GruposDelEditor } from './tipos'

// El catálogo de grupos que recibe el editor, a partir de lo leído, de la action «crear grupo» del módulo y de las del drawer. Lo
// creado desde el combo queda en la lista del combo y del drawer aunque se descarte el campo (`useConLosCreados`).
export function useGruposDelEditor(args: {
  lista: readonly GrupoDeCampos[]
  hayMas: boolean
  puedeCrear: boolean
  enviar: (nombre: string) => Promise<RespuestaDeCrear | undefined>
  // Las del drawer «Grupos»; sin ellas, el editor no lo dibuja.
  operaciones?: OperacionesDelCatalogo | null
}): GruposDelEditor {
  const creados = useConLosCreados(args.lista)
  return {
    lista: creados.lista,
    hayMas: args.hayMas,
    puedeCrear: args.puedeCrear,
    crear: creados.conCrear(crearDesdeAccion(args.enviar)),
    operaciones: args.operaciones ? creados.conQuitar(args.operaciones) : null,
  }
}

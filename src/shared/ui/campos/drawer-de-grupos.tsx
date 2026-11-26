'use client'

import { LARGO_DEL_NOMBRE_DE_GRUPO, type CampoBase } from '@/shared/lib/campos'
import { usosPorElemento } from '@/shared/lib/catalogo'
import { DrawerDeCatalogo } from '@/shared/ui/catalogo-en-drawer'
import { PANEL_DE_GRUPOS, TEXTOS_DE_GRUPOS } from './textos-de-grupos'
import type { GruposDelEditor } from './tipos'

type Props = {
  grupos: GruposDelEditor
  campos: readonly CampoBase[]
  // null = puede gestionarlos; si no, el porqué de la lista de sólo lectura.
  motivoSinPermiso: string | null
}

// «Grupos» de la cabecera del editor: el drawer `?panel=grupos` con el catálogo del layout y cuántos campos tiene cada grupo (también
// los desactivados). Sin operaciones (un módulo que no las da), no se dibuja.
export function DrawerDeGrupos({ grupos, campos, motivoSinPermiso }: Props) {
  if (!grupos.operaciones) {
    return null
  }
  return (
    <DrawerDeCatalogo
      panel={PANEL_DE_GRUPOS}
      catalogo={grupos}
      usos={usosPorElemento(campos, (campo) => campo.grupoId)}
      operaciones={grupos.operaciones}
      textos={TEXTOS_DE_GRUPOS}
      maximoDelNombre={LARGO_DEL_NOMBRE_DE_GRUPO}
      motivoSinPermiso={motivoSinPermiso}
    />
  )
}

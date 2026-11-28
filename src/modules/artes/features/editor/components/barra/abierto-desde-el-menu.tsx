'use client'

import { AyudaDeAtajos } from '@/shared/ui/atajos'
import { ModalOtroFormatoDiferido } from '../../../plantillas/components/diferidos'
import type { FuenteDelOtroFormato } from '../../../plantillas/hooks/use-otro-formato'
import type { useMenuDelEditor } from '../../hooks/use-menu-del-editor'

type Props = {
  menu: ReturnType<typeof useMenuDelEditor>
  fuente: FuenteDelOtroFormato
  // Lo que se ve en el editor, también sin guardar: es lo que se duplica.
  documento: () => unknown
}

// Lo que abre el «⋯» de la barra: «Atajos de teclado» (también con «?») y «Duplicar en otro formato» (`?panel=otro-formato`, montado sólo
// mientras la URL lo pide: cada apertura empieza de cero).
export function AbiertoDesdeElMenu({ menu, fuente, documento }: Props) {
  return (
    <>
      <AyudaDeAtajos abierta={menu.atajos} alCambiar={menu.setAtajos} />
      {menu.otroFormato.abierto ? (
        <ModalOtroFormatoDiferido
          fuente={fuente}
          documento={documento}
          alCerrar={menu.otroFormato.cerrar}
        />
      ) : null}
    </>
  )
}

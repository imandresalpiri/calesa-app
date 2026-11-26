'use client'

import { useRouter } from 'next/navigation'
import type { CampoBase } from '@/shared/lib/campos'
import { Drawer } from '@/shared/ui/drawer'
import { useApertura } from '@/shared/ui/use-apertura'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { FormularioDeCampoDiferido } from './diferidos'
import type { ConfiguracionDeCampos, EdicionesDeCampos, GruposDelEditor } from './tipos'

type Props<Campo extends CampoBase, Cambios extends object, Nuevo> = {
  // 'nuevo' para crear, el campo de `?campo=` para editar, null con el panel cerrado.
  campo: Campo | 'nuevo' | null
  // `&eliminar=1`: abre pidiendo eliminarlo («Eliminar…» del «⋯»).
  eliminar: boolean
  todos: readonly Campo[]
  puedeGestionar: boolean
  configuracion: ConfiguracionDeCampos<Campo, Cambios, Nuevo>
  ediciones: EdicionesDeCampos<Cambios, Nuevo>
  grupos: GruposDelEditor
  alCerrar: () => void
}

// El segundo nivel del editor: un campo, con su URL (`?campo=`), en un drawer amplio. Cada apertura arranca de lo guardado; mientras está
// abierto, lo que trae «Recargar» (otra persona guardó) no borra lo escrito: el formulario sigue y manda la versión nueva.
export function PanelDeCampo<Campo extends CampoBase, Cambios extends object, Nuevo>({
  campo,
  ...resto
}: Props<Campo, Cambios, Nuevo>) {
  const router = useRouter()
  const aLaVista = useUltimo(campo)
  const veces = useApertura(campo !== null)
  const existente = aLaVista === 'nuevo' ? null : aLaVista
  const { textos } = resto.configuracion
  return (
    <Drawer
      abierto={campo !== null}
      alCerrar={resto.alCerrar}
      ancho="amplio"
      titulo={existente ? existente.etiqueta : textos.panelNuevo}
      descripcion={existente ? textos.panelDescripcionExistente : textos.panelDescripcionNuevo}
    >
      {aLaVista ? (
        <FormularioDeCampoDiferido
          key={`${existente?.id ?? 'nuevo'}-${String(veces)}`}
          campo={existente}
          alRecargar={() => {
            router.refresh()
          }}
          {...resto}
        />
      ) : null}
    </Drawer>
  )
}

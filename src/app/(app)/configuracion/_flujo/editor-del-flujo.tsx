import { Suspense } from 'react'
import { leerRolesParaElegir } from '@/modules/equipo'
import { PantallaDelFlujo, type FlujoFijo } from '@/modules/flujos/pantallas/configuracion'
import { getOrigenes } from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { FueraDeReglaDelFlujo } from './fuera-de-regla'
import { HUECOS_DE_FLUJOS } from './huecos'
import { seccionesDelPanel } from './secciones-del-panel'

type Props = {
  permisos: Permisos
  fijo: FlujoFijo
  // `?seccion=` tal cual: la sección que el panel muestra abierta.
  seccionPedida: string | undefined
}

// El editor de un flujo fijo, con lo que cada área de `flujos` le pone: la pestaña Fases de un origen y Repuestos › Flujo de repuestos. Se lee detrás de
// `<Suspense>`; la página ya comprobó el permiso y la base vuelve a decidir cada escritura.
export function EditorDelFlujo({ permisos, fijo, seccionPedida }: Props) {
  return (
    <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
      <PantallaDelFlujo
        permisos={permisos}
        origenes={getOrigenes(true)}
        roles={leerRolesParaElegir()}
        fijo={fijo}
        huecos={HUECOS_DE_FLUJOS}
        sobreLaLista={(flujo) => <FueraDeReglaDelFlujo flujo={flujo} />}
        secciones={seccionesDelPanel({ permisos, fijo }, seccionPedida)}
      />
    </Suspense>
  )
}

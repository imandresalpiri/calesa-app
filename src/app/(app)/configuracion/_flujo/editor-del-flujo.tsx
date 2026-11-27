import { Suspense } from 'react'
import { leerRolesParaElegir } from '@/modules/equipo'
import { PantallaDelFlujo, type FlujoFijo } from '@/modules/flujos/pantallas/configuracion'
import { getOrigenes } from '@/modules/origenes'
import type { Permisos } from '@/shared/lib/permisos'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { CatalogosDelPanel } from './catalogos-del-panel'
import { FueraDeReglaDelFlujo } from './fuera-de-regla'
import { HUECOS_DE_FLUJOS, HUECOS_DE_LECTURA } from './huecos'
import { modoDelEditor } from './modo-del-editor'
import { seccionesDelPanel } from './secciones-del-panel'

type Props = {
  permisos: Permisos
  fijo: FlujoFijo
  // `?seccion=` tal cual: la sección que el panel muestra abierta.
  seccionPedida: string | undefined
  // `?panel=` tal cual: el catálogo cuyo drawer está abierto (los tipos de documento se leen en el servidor sólo entonces).
  panelPedido: string | undefined
}

// El editor de un flujo fijo, con lo que cada área de `flujos` le pone y los catálogos en la barra: la pestaña Fases de un origen y Repuestos › Flujo de
// repuestos. Quien sólo gestiona los catálogos de logística del origen lo ve en lectura (`modoDelEditor`): sin huecos de escritura, sin «Reglas» y sin lo
// fuera de regla. Se lee detrás de `<Suspense>`; la página ya comprobó el permiso y la base vuelve a decidir cada escritura.
export function EditorDelFlujo({ permisos, fijo, seccionPedida, panelPedido }: Props) {
  const lectura = modoDelEditor(permisos, fijo) === 'lectura'
  return (
    <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
      <PantallaDelFlujo
        permisos={permisos}
        origenes={getOrigenes(true)}
        roles={leerRolesParaElegir()}
        fijo={fijo}
        huecos={lectura ? HUECOS_DE_LECTURA : HUECOS_DE_FLUJOS}
        {...(lectura
          ? { soloLectura: true }
          : {
              sobreLaLista: (flujo) => <FueraDeReglaDelFlujo flujo={flujo} />,
              secciones: seccionesDelPanel({ permisos, fijo }, seccionPedida),
            })}
        catalogos={<CatalogosDelPanel permisos={permisos} fijo={fijo} panelPedido={panelPedido} />}
      />
    </Suspense>
  )
}

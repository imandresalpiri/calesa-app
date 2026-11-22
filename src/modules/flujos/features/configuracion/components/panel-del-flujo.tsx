'use client'

import type { ReactNode } from 'react'
import { CORTE_DEL_PANEL } from '@/shared/lib/ancho'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { Drawer } from '@/shared/ui/drawer'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import type { MostradoEnElPanel } from '../hooks/use-contenido-del-panel'
import { ContenidoDeLaFase } from './contenido-de-la-fase'
import type { HuecosDelFlujo } from './huecos'

type Props = {
  abierto: boolean
  alCerrar: () => void
  flujo: FlujoParaConfigurar
  nombreDelFlujo: string
  // La fase o la sección que muestra (la última, mientras se cierra).
  mostrado: MostradoEnElPanel
  // Con una sección: su título y lo que dibujó el servidor (su esqueleto hasta que llega).
  seccion: { titulo: string; contenido: ReactNode } | null
  roles: readonly RolLeido[]
  huecos: HuecosDelFlujo
}

// El panel del flujo: un `<Drawer>` al costado con todo lo de una fase (`?fase=<id>`, con el «⋯» de sus acciones arriba a la derecha y sus tres pestañas) o lo del flujo entero (`?seccion=reglas|documentos`). Desde 1024 px no es
// modal (el diagrama sigue a la vista y tocar otra fase cambia el panel sin cerrarlo); más angosto, el drawer modal de siempre. Se pide recién al abrirlo
// (`diferidos.tsx`).
export function PanelDelFlujo({
  abierto,
  alCerrar,
  flujo,
  nombreDelFlujo,
  mostrado,
  seccion,
  roles,
  huecos,
}: Props) {
  const alCostado = useAlMenos(CORTE_DEL_PANEL)
  const deFase = mostrado.tipo === 'fase'
  const Acciones = huecos.bloques?.acciones
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={deFase ? mostrado.fase.nombre : (seccion?.titulo ?? '')}
      descripcion={deFase ? `Fase de ${nombreDelFlujo}` : `Del flujo de ${nombreDelFlujo}`}
      ancho="amplio"
      alCostado={alCostado}
      acciones={deFase && Acciones ? <Acciones flujo={flujo} fase={mostrado.fase} /> : undefined}
    >
      {deFase ? (
        <ContenidoDeLaFase
          key={mostrado.fase.id}
          flujo={flujo}
          fase={mostrado.fase}
          roles={roles}
          huecos={huecos}
        />
      ) : (
        seccion?.contenido
      )}
    </Drawer>
  )
}

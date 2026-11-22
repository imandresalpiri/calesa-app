'use client'

import { Bloque } from '@/shared/ui/bloque'
import { BloquesALaVista } from '@/shared/ui/bloques-a-la-vista'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import { AvisosDeLaFase } from './avisos-de-la-fase'
import { LecturaDeDatos, LecturaDeRequisitos, LecturaDeSalidas } from './bloques-del-inspector'
import type { HuecosDelFlujo } from './huecos'

type Props = {
  flujo: FlujoParaConfigurar
  fase: FaseParaConfigurar
  roles: readonly RolLeido[]
  huecos: HuecosDelFlujo
}

// Todo lo de una fase en el panel: arriba sus avisos de «Revisar» (el nombre es el título del panel y el «⋯» con sus acciones lo pone el `<Drawer>`); debajo, tres
// pestañas (hueco `pestanas`, del área `fases`): «Reglas» abre primero, con «Requisitos para entrar», «Salidas y quién mueve» y «Reglas que la afectan» a la
// vista (sin acordeones: `<BloquesALaVista>`); «Identidad» y «Ajustes» son el formulario de la fase. Cada bloque lo llena el hueco de su área; sin hueco, lo
// leído. Sin el hueco de las pestañas, los bloques de «Reglas» y una lectura de los datos, sin pestañas.
export function ContenidoDeLaFase({ flujo, fase, roles, huecos }: Props) {
  const { pestanas: Pestanas, requisitos: Requisitos } = huecos.bloques ?? {}
  const { salidas: Salidas, reglas: Reglas } = huecos.bloques ?? {}
  const reglas = (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <Bloque titulo="Requisitos para entrar">
        <LecturaDeRequisitos flujo={flujo} fase={fase} />
        {Requisitos ? <Requisitos flujo={flujo} fase={fase} /> : null}
      </Bloque>
      <Bloque titulo="Salidas y quién mueve">
        {Salidas ? (
          <Salidas flujo={flujo} fase={fase} roles={roles} />
        ) : (
          <LecturaDeSalidas flujo={flujo} fase={fase} roles={roles} />
        )}
      </Bloque>
      {Reglas ? (
        <Bloque titulo="Reglas que la afectan">
          <Reglas flujo={flujo} fase={fase} />
        </Bloque>
      ) : null}
    </div>
  )
  return (
    <BloquesALaVista nivel={3}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <AvisosDeLaFase faseId={fase.id} />
        {Pestanas ? (
          <Pestanas flujo={flujo} fase={fase} reglas={reglas} />
        ) : (
          <>
            {reglas}
            <Bloque titulo="Datos">
              <LecturaDeDatos fase={fase} />
            </Bloque>
          </>
        )}
      </div>
    </BloquesALaVista>
  )
}

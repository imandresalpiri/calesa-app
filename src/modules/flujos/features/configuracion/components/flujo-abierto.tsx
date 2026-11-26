'use client'

import { Fragment, useMemo, type ReactNode } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import type { FlujoParaCopiar } from '../../../entities/selector-de-flujos'
import { SECCIONES_DEL_PANEL } from '../../../entities/panel-del-flujo'
import { useContenidoDelPanel } from '../hooks/use-contenido-del-panel'
import { ContextoDeFlujosParaCopiar } from '../hooks/use-flujos-para-copiar'
import { ContextoDeSeccionesDelPanel } from '../hooks/use-panel-del-flujo'
import { BarraDelFlujo } from './barra-del-flujo'
import { PanelDelFlujoDiferido } from './diferidos'
import type { HuecosDelFlujo, SeccionesDelPanel } from './huecos'
import { ProveedorDelFlujo } from './proveedor-del-flujo'
import { VistaDelFlujo } from './vista-del-flujo'

type Props = {
  flujo: FlujoParaConfigurar
  nombreDelFlujo: string
  roles: readonly RolLeido[]
  huecos: HuecosDelFlujo
  secciones: SeccionesDelPanel
}

type PropsDelFlujoAbierto = Props & {
  // De dónde copiar las fases si el flujo está vacío (`ContextoDeFlujosParaCopiar`); en los demás, vacío.
  desde: readonly FlujoParaCopiar[]
}

const SinOrden = ({ children }: { flujo: FlujoParaConfigurar; children: ReactNode }) => (
  <Fragment>{children}</Fragment>
)

// El flujo abierto: su proveedor de versión, el orden de las fases y lo que escribe el diagrama (huecos de las áreas `fases` y `transiciones`), la barra, las fases (diagrama o lista) y, montado la primera vez
// que se abre, el panel al costado con la fase de `?fase=` o la sección de `?seccion=`.
export function FlujoAbierto({
  flujo,
  nombreDelFlujo,
  roles,
  huecos,
  secciones,
  desde,
}: PropsDelFlujoAbierto) {
  const disponibles = useMemo(
    () => SECCIONES_DEL_PANEL.filter((clave) => secciones[clave] !== undefined),
    [secciones],
  )
  return (
    <ContextoDeSeccionesDelPanel value={disponibles}>
      <ContextoDeFlujosParaCopiar value={desde}>
        <ProveedorDelFlujo flujoId={flujo.id} version={flujo.version}>
          <Abierto
            flujo={flujo}
            nombreDelFlujo={nombreDelFlujo}
            roles={roles}
            huecos={huecos}
            secciones={secciones}
          />
        </ProveedorDelFlujo>
      </ContextoDeFlujosParaCopiar>
    </ContextoDeSeccionesDelPanel>
  )
}

function Abierto({ flujo, nombreDelFlujo, roles, huecos, secciones }: Props) {
  const panel = useContenidoDelPanel(flujo)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const Orden = huecos.ordenDeFases ?? SinOrden
  const FasesDelDiagrama = huecos.diagramaDeFases ?? SinOrden
  const SalidasDelDiagrama = huecos.salidasDelDiagrama ?? SinOrden
  const mostrado = panel.mostrado
  return (
    <Orden flujo={flujo}>
      <FasesDelDiagrama flujo={flujo}>
        <SalidasDelDiagrama flujo={flujo}>
          <section aria-labelledby="titulo-de-fases" className="grid min-w-0 gap-3">
            <BarraDelFlujo flujo={flujo} huecos={huecos} />
            <VistaDelFlujo
              flujo={flujo}
              nombreDelFlujo={nombreDelFlujo}
              roles={roles}
              huecos={huecos}
              faseAbierta={panel.faseAbierta}
              alAbrir={panel.abrirFase}
            />
          </section>
          {montado && mostrado ? (
            <PanelDelFlujoDiferido
              abierto={panel.abierto}
              alCerrar={panel.cerrar}
              flujo={flujo}
              nombreDelFlujo={nombreDelFlujo}
              mostrado={mostrado}
              seccion={mostrado.tipo === 'seccion' ? (secciones[mostrado.clave] ?? null) : null}
              roles={roles}
              huecos={huecos}
            />
          ) : null}
        </SalidasDelDiagrama>
      </FasesDelDiagrama>
    </Orden>
  )
}

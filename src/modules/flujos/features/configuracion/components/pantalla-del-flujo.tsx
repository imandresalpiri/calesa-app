import { WorkflowIcon } from 'lucide-react'
import { Suspense, type ReactNode } from 'react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import {
  leerFlujoParaConfigurar,
  leerFlujosConfigurables,
  leerFlujosConFases,
} from '../../../areas/nucleo/composicion'
import {
  armarSelector,
  candidatosParaCopiar,
  entradaFija,
  flujosParaCopiar,
  textoSinFlujo,
  type EntradaDelSelector,
  type FlujoFijo,
  type FlujoParaCopiar,
  type OrigenDelSelector,
} from '../../../entities/selector-de-flujos'
import { FlujoAbierto } from './flujo-abierto'
import type { HuecosDelFlujo, SeccionesDelPanel } from './huecos'

type Props = {
  permisos: Permisos
  // Todos los orígenes del catálogo, también los inactivos: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly OrigenDelSelector[]>>
  // Los roles para nombrarlos en el panel (los compone la página: `flujos` no importa `equipo`).
  roles: Promise<Resultado<{ roles: readonly { id: string; nombre: string }[]; hayMas: boolean }>>
  // El flujo que abre la página: el del origen de la pestaña o el de repuestos. Nunca otro.
  fijo: FlujoFijo
  huecos: HuecosDelFlujo
  // Lo que va sobre las fases del flujo abierto (5.08: el aviso de «fuera de regla»). Una función de servidor, no un hueco de cliente: se llama con el
  // flujo ya leído y puede leer lo suyo; va detrás de su propio `<Suspense>` sin esqueleto (lo común es que no haya nada que mostrar).
  sobreLaLista?: (flujo: FlujoParaConfigurar) => ReactNode
  // Las reglas y los tipos de documento, que se abren en el panel desde la barra del flujo (los dibuja la página).
  secciones?: SeccionesDelPanel
}

// El editor de un flujo (5.02): la pestaña Fases de un origen o Repuestos › Flujo de repuestos, leído en el servidor con la sesión de quien mira y detrás
// de `<Suspense>`: el flujo fijo entero y los roles para nombrarlos. La base vuelve a decidir cada escritura. Una lectura que falla sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function PantallaDelFlujo({
  permisos,
  origenes,
  roles,
  fijo,
  huecos,
  sobreLaLista,
  secciones,
}: Props) {
  const [flujos, listaDeOrigenes, rolesLeidos] = await Promise.all([
    leerFlujosConfigurables(permisos),
    origenes,
    roles,
  ])
  const entradas = armarSelector(datosO(flujos), datosO(listaDeOrigenes))
  const entrada = entradaFija(entradas, fijo)
  if (!entrada) {
    return <EstadoVacio Icono={WorkflowIcon} titulo={textoSinFlujo(fijo)} compacto />
  }
  const flujo = datosO(await leerFlujoParaConfigurar(entrada.flujo.id))
  const desde = flujo && huecos.sinFases ? await deDondeCopiar(entradas, flujo, fijo) : []
  const Franja = huecos.franjaDeRevisar
  const Revisar = huecos.proveedorDeRevisar
  const contenido = (
    <div className="grid min-w-0 gap-4">
      {flujo && Franja ? <Franja flujo={flujo} /> : null}
      {flujo && sobreLaLista ? <Suspense fallback={null}>{sobreLaLista(flujo)}</Suspense> : null}
      {flujo ? (
        <FlujoAbierto
          flujo={flujo}
          nombreDelFlujo={entrada.titulo}
          roles={datosO(rolesLeidos).roles}
          huecos={huecos}
          secciones={secciones ?? {}}
          desde={desde}
        />
      ) : (
        <EstadoVacio Icono={WorkflowIcon} titulo="Este flujo ya no existe." compacto />
      )}
    </div>
  )
  return flujo && Revisar ? <Revisar flujo={flujo}>{contenido}</Revisar> : contenido
}

// De dónde puede empezar a copiar las fases un flujo vacío de un origen: los de vehículos que quien mira configura y que tienen alguna fase activa.
// Con fases, o en el de repuestos, no se pregunta. Si la lectura falla no se ofrece copiar (queda «Nueva fase»): nunca tumba la pestaña.
async function deDondeCopiar(
  entradas: readonly EntradaDelSelector[],
  flujo: FlujoParaConfigurar,
  fijo: FlujoFijo,
): Promise<FlujoParaCopiar[]> {
  if (flujo.fases.length > 0 || !('origenId' in fijo)) {
    return []
  }
  const conFases = await leerFlujosConFases(candidatosParaCopiar(entradas, flujo.id))
  return conFases.ok ? flujosParaCopiar(entradas, flujo.id, conFases.data) : []
}

import { WorkflowIcon } from 'lucide-react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerFlujosConfigurables } from '../../../areas/nucleo/composicion'
import {
  leerTiposDeDocumento,
  leerUsoDeTiposDeDocumento,
} from '../../../areas/documentos/composicion'
import {
  armarSelector,
  entradaFija,
  textoSinFlujo,
  type FlujoFijo,
  type OrigenDelSelector,
} from '../../../entities/selector-de-flujos'
import {
  tapadosDelGrupo,
  type TapadosDelGrupo,
  type VistaDeGrupo,
} from '../../../entities/documentos/vista-de-grupo'
import { compartidosTapados } from '../../../entities/propios-del-flujo'
import { TiposDeDocumento } from './tipos-de-documento'

type Props = { permisos: Permisos } & (
  | // Logística › Configuración › Tipos de documento: los compartidos.
    { grupos: 'empresa' }
  | {
      // El panel del flujo: los suyos y los compartidos.
      grupos: 'flujo'
      fijo: FlujoFijo
      // Todos los orígenes del catálogo, también los inactivos, para nombrar el flujo: los compone la página (este módulo no depende de `origenes`).
      origenes: Promise<Resultado<readonly OrigenDelSelector[]>>
    }
)

// Un grupo leído con la sesión de quien mira. El uso de cada tipo sólo se pide a quien puede cambiar el grupo: a los demás la base les diría 42501.
async function leerGrupo(flujoId: string | null, puedeCambiar: boolean): Promise<VistaDeGrupo> {
  const [grupo, uso] = await Promise.all([
    leerTiposDeDocumento(flujoId),
    puedeCambiar ? leerUsoDeTiposDeDocumento(flujoId) : null,
  ])
  return {
    grupo: datosO(grupo),
    puedeCambiar,
    uso: uso === null ? null : datosO(uso),
    tapados: null,
  }
}

// Los compartidos los cambia quien gestiona los catálogos de logística (la base pide la clave en cada origen que los usa).
const leerCompartidos = (permisos: Permisos) =>
  leerGrupo(null, puede(permisos, 'logistica.catalogos.gestionar'))

// Los compartidos que tapa un propio activo del flujo, con la insignia que nombra su origen (nulo: el de repuestos).
function tapadosPorElFlujo(
  compartidos: VistaDeGrupo,
  propios: VistaDeGrupo,
  origen: string | null,
): TapadosDelGrupo {
  return tapadosDelGrupo(compartidosTapados(compartidos.grupo.tipos, propios.grupo.tipos), origen)
}

// Los tipos de documento (5.09), leídos en el servidor con la sesión de quien mira y detrás de `<Suspense>`: en Logística › Configuración, los compartidos
// (se ven con `flujos.configurar`; se cambian con `logistica.catalogos.gestionar`); en el panel del flujo, los de ese flujo (uno que quien mira configura)
// y los compartidos, marcados los que el flujo tapa. La base vuelve a decidir cada escritura. Una lectura que falla sube al `error.tsx` de `(app)`, que
// ofrece «Reintentar».
export async function PantallaDeDocumentos(props: Props) {
  if (props.grupos === 'empresa') {
    const empresa = await leerCompartidos(props.permisos)
    return <TiposDeDocumento vistas={{ empresa, flujo: null }} origen={null} />
  }
  const [flujos, listaDeOrigenes] = await Promise.all([
    leerFlujosConfigurables(props.permisos),
    props.origenes,
  ])
  const origenes = datosO(listaDeOrigenes)
  const entrada = entradaFija(armarSelector(datosO(flujos), origenes), props.fijo)
  if (!entrada) {
    return <EstadoVacio Icono={WorkflowIcon} titulo={textoSinFlujo(props.fijo)} compacto />
  }
  // Un flujo configurable ya es uno que quien mira puede configurar.
  const [flujo, compartidos] = await Promise.all([
    leerGrupo(entrada.flujo.id, true),
    leerCompartidos(props.permisos),
  ])
  const origen = origenes.find((o) => o.id === entrada.flujo.origenId)?.nombre ?? null
  const empresa = { ...compartidos, tapados: tapadosPorElFlujo(compartidos, flujo, origen) }
  return <TiposDeDocumento vistas={{ empresa, flujo }} origen={origen} />
}

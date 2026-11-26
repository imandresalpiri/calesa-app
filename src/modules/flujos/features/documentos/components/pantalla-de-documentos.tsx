import { WorkflowIcon } from 'lucide-react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerFlujosVisibles } from '../../../areas/nucleo/composicion'
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
import { quienCambiaLosTipos } from '../../../entities/documentos/quien-cambia-los-tipos'
import { tapadosDelGrupo, type VistaDeGrupo } from '../../../entities/documentos/vista-de-grupo'
import { compartidosTapados } from '../../../entities/propios-del-flujo'
import { TiposDeDocumento } from './tipos-de-documento'

type Props = {
  permisos: Permisos
  fijo: FlujoFijo
  // Todos los orígenes del catálogo, también los inactivos, para nombrar el flujo: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly OrigenDelSelector[]>>
}

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

// El contenido del drawer «Tipos de documento» (5.09), leído en el servidor con la sesión de quien mira y detrás de `<Suspense>`: los del flujo que se
// ve (uno que quien mira configura o, el de un origen, ve en lectura porque gestiona ahí los catálogos) y los compartidos, marcados los que el flujo
// tapa. Cada grupo se cambia según `quienCambiaLosTipos`; la base vuelve a decidir cada escritura. Una lectura que falla sube al `error.tsx` de `(app)`,
// que ofrece «Reintentar».
export async function PantallaDeDocumentos({ permisos, fijo, origenes: pedidoDeOrigenes }: Props) {
  const [flujos, listaDeOrigenes] = await Promise.all([
    leerFlujosVisibles(permisos),
    pedidoDeOrigenes,
  ])
  const origenes = datosO(listaDeOrigenes)
  const entrada = entradaFija(armarSelector(datosO(flujos), origenes), fijo)
  if (!entrada) {
    return <EstadoVacio Icono={WorkflowIcon} titulo={textoSinFlujo(fijo)} compacto />
  }
  const quien = quienCambiaLosTipos(permisos, fijo)
  const [propios, compartidos] = await Promise.all([
    leerGrupo(entrada.flujo.id, quien.propios),
    leerGrupo(null, quien.compartidos),
  ])
  const origen = origenes.find((o) => o.id === entrada.flujo.origenId)?.nombre ?? null
  const tapados = tapadosDelGrupo(
    compartidosTapados(compartidos.grupo.tipos, propios.grupo.tipos),
    origen,
  )
  return (
    <TiposDeDocumento
      vistas={{ origen: propios, compartido: { ...compartidos, tapados } }}
      origen={origen}
      puedeCrear={quien.propios || quien.compartidos}
    />
  )
}

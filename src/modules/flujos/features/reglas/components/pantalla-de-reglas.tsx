import { WorkflowIcon } from 'lucide-react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerFlujoParaConfigurar, leerFlujosConfigurables } from '../../../areas/nucleo/composicion'
import { leerCatalogoDeTransporte, leerOfertaDeTransporte } from '../../../areas/reglas/composicion'
import { reglaEncendida } from '../../../entities/reglas/catalogo'
import { motivoSinPermisoDeReglas } from '../../../entities/reglas/permiso'
import {
  armarSelector,
  entradaFija,
  textoSinFlujo,
  type FlujoFijo,
  type OrigenDelSelector,
} from '../../../entities/selector-de-flujos'
import { ConfiguracionDeReglas } from './configuracion-de-reglas'

type Props = {
  permisos: Permisos
  // Todos los orígenes del catálogo, también los inactivos: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly OrigenDelSelector[]>>
  // El flujo de la página: las reglas se abren en su panel.
  fijo: FlujoFijo
}

// Lo guardado y lo que se puede marcar (lo que usa el origen del flujo): se leen juntos, y sólo con «Transporte» encendida.
async function leerTransporte(flujoId: string, origenId: string | null) {
  const [oferta, catalogo] = await Promise.all([
    leerOfertaDeTransporte(flujoId),
    leerCatalogoDeTransporte(origenId),
  ])
  return { oferta: datosO(oferta), catalogo: datosO(catalogo) }
}

// Las reglas del flujo (5.11), en su panel (`?seccion=reglas`: el flujo es el de la página), leídas en
// el servidor con la sesión de quien mira y detrás de `<Suspense>`: el flujo elegido, sus reglas y, con «Transporte» encendida, su oferta y los puertos y
// navieras de su origen que se pueden marcar. La base vuelve a decidir cada escritura. Una lectura que falla sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function PantallaDeReglas({ permisos, origenes, fijo }: Props) {
  const [flujos, listaDeOrigenes] = await Promise.all([leerFlujosConfigurables(permisos), origenes])
  const entradas = armarSelector(datosO(flujos), datosO(listaDeOrigenes))
  const entrada = entradaFija(entradas, fijo)
  if (!entrada) {
    return <EstadoVacio Icono={WorkflowIcon} titulo={textoSinFlujo(fijo)} compacto />
  }
  const flujo = datosO(await leerFlujoParaConfigurar(entrada.flujo.id))
  if (!flujo) {
    return <EstadoVacio Icono={WorkflowIcon} titulo="Este flujo ya no existe." compacto />
  }
  const transporte = reglaEncendida(flujo.reglas, 'transporte')
    ? await leerTransporte(flujo.id, flujo.origenId)
    : null
  return (
    <ConfiguracionDeReglas
      flujoId={flujo.id}
      claveDelFlujo={entrada.clave}
      ambito={flujo.ambito}
      version={flujo.version}
      reglas={flujo.reglas}
      motivoSinPermiso={motivoSinPermisoDeReglas(permisos, flujo.ambito, flujo.origenId)}
      transporte={transporte}
      // Sin puertos o navieras que ofrecer, quien gestiona esos catálogos en el origen del flujo ve el enlace a su drawer; en el de repuestos, nadie.
      origenParaCargar={
        flujo.origenId !== null && puede(permisos, 'logistica.catalogos.gestionar', flujo.origenId)
          ? flujo.origenId
          : null
      }
    />
  )
}

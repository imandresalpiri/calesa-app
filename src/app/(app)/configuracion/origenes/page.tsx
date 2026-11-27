import type { Metadata } from 'next'
import { leerIntegraciones, puedeCambiarAjustesDeCotizacion } from '@/modules/empresa'
import { leerOrigenes } from '@/modules/origenes'
import { ListaDeOrigenes } from '@/modules/origenes/pantallas/origenes'
import { puede, requerirSesion } from '@/modules/equipo'
import { cortarAlTope } from '@/shared/lib/conteo'
import { datosO } from '@/shared/lib/errores'
import { TOPE_DE_LA_LISTA_DE_ORIGENES } from '@/shared/lib/paginacion'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { puedeAbrirElOrigen, puedeAbrirOrigenes } from './acceso'
import { ParaTodosLosOrigenes } from './para-todos-los-origenes'
import { SinElBloque } from './sin-el-bloque'
import { ocultoEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Orígenes' }

// Configuración › Orígenes: las tarjetas de los orígenes que la persona abre (cualquiera de los tres permisos en ese origen), hasta
// `TOPE_DE_LA_LISTA_DE_ORIGENES` y con su aviso, con lo que le falta a cada uno. Los edita quien tiene `origenes.gestionar`; quien
// configura el flujo o la fórmula de uno lo ve deshabilitado, con el motivo (la base lo vuelve a comprobar). La integración de apibara se lee
// sólo si hay un origen de subasta; si la lectura falla, cuenta como activa (como en el inicio): no se inventa una falta. Arriba, «Para todos los orígenes»: los colores y
// la vigencia de las cotizaciones, de toda la empresa, para quien tiene `cotizaciones.configurar` en algún origen (la vigencia la cambia quien la tiene en todos).
export default async function PaginaOrigenes() {
  const oculto = await ocultoEnElLive('origenes.lectura')
  if (oculto) {
    return oculto
  }
  const sesion = await requerirSesion()
  if (!puedeAbrirOrigenes(sesion.permisos)) {
    return <EstadoSinPermiso />
  }
  const abiertos = datosO(await leerOrigenes()).filter((origen) =>
    puedeAbrirElOrigen(sesion.permisos, origen.id),
  )
  const { filas: origenes, hayMas } = cortarAlTope(abiertos, TOPE_DE_LA_LISTA_DE_ORIGENES)
  let apibaraActiva = true
  if (origenes.some((origen) => origen.tipo === 'subasta')) {
    const integraciones = await leerIntegraciones()
    apibaraActiva =
      !integraciones.ok || integraciones.data.some((una) => una.clave === 'apibara' && una.activa)
  }
  const veLoDeTodos = puede(sesion.permisos, 'cotizaciones.configurar')
  // Con el Modo Live (Configuración de orígenes en «Sólo lectura»): sólo las tarjetas para abrir cada origen, sin «Para todos los orígenes» (se edita).
  const enElLive = sesion.live.encendido
  return (
    <div className="grid gap-6">
      {enElLive ? null : veLoDeTodos ? (
        <ParaTodosLosOrigenes
          puedeCambiarLaVigencia={puedeCambiarAjustesDeCotizacion(sesion.permisos)}
          puedeIrARoles={
            puede(sesion.permisos, 'equipo.roles.ver') ||
            puede(sesion.permisos, 'equipo.roles.gestionar')
          }
        />
      ) : (
        <SinElBloque />
      )}
      <ListaDeOrigenes
        origenes={origenes}
        hayMas={hayMas}
        puedeGestionar={puede(sesion.permisos, 'origenes.gestionar')}
        apibaraActiva={apibaraActiva}
        soloLectura={enElLive}
      />
    </div>
  )
}

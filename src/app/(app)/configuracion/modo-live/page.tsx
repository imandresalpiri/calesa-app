import type { Metadata } from 'next'
import {
  leerAjustesDeLosRoles,
  leerPersonasDelLive,
  puede,
  requerirSesion,
  textoDeLaBusquedaDelLive,
} from '@/modules/equipo'
import { AjustesPorPersona, TarjetasDeLosRoles } from '@/modules/equipo/pantallas/modo-live'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EncabezadoDeConfiguracion } from '../_navegacion/encabezado-de-configuracion'
import { SiSeVeEnElLive } from '../../_live/guarda'
import { SECCION_DE_MODO_LIVE } from './seccion'

export const metadata: Metadata = { title: SECCION_DE_MODO_LIVE.titulo }

// Configuración › Modo Live (`live.configurar`; la base lo vuelve a pedir en cada RPC): qué puede y qué ve cada rol con el Live encendido, una tarjeta
// por rol, y debajo lo propio de cada persona. Los orígenes los lee esta página y se los pasa: `equipo` no depende de `origenes`. Con el Live encendido,
// la pantalla «Oculto en Modo Live» antes de leer nada (`loading.tsx` es su `<Suspense>`).
export default function PaginaDelModoLive(props: PageProps<'/configuracion/modo-live'>) {
  return (
    <SiSeVeEnElLive area="siempre-oculto">
      <ModoLive {...props} />
    </SiSeVeEnElLive>
  )
}

async function ModoLive({ searchParams }: PageProps<'/configuracion/modo-live'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(sesion.permisos, 'live.configurar')) {
    return <EstadoSinPermiso />
  }
  const texto = textoDeLaBusquedaDelLive(unParametro(parametros['q']))
  // Los nombres y correos de «Ajustes por persona» son del equipo: sin verlo, la base no los da (`live_personas()`) y no se piden.
  const veElEquipo =
    puede(sesion.permisos, 'equipo.usuarios.ver') ||
    puede(sesion.permisos, 'equipo.usuarios.gestionar')
  // También los orígenes inactivos: uno que un rol tiene elegido se nombra «(inactivo)» en vez de perderse.
  const [roles, personas, origenes] = await Promise.all([
    leerAjustesDeLosRoles(),
    veElEquipo ? leerPersonasDelLive({ texto, cursor: null }) : null,
    getOrigenes(true),
  ])
  const delLive = datosO(origenes).map(({ id, nombre, activo }) => ({ id, nombre, activo }))
  return (
    <div className="grid gap-6">
      <EncabezadoDeConfiguracion {...SECCION_DE_MODO_LIVE} />
      <div role="group" aria-labelledby="modo-live-por-rol" className="grid min-w-0 gap-3">
        <h2
          id="modo-live-por-rol"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Por rol
        </h2>
        <TarjetasDeLosRoles roles={datosO(roles)} origenes={delLive} />
      </div>
      <div role="group" aria-labelledby="modo-live-por-persona" className="grid min-w-0 gap-3">
        <h2
          id="modo-live-por-persona"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Ajustes por persona
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Lo propio de una persona pisa lo de su rol sólo en los campos que cambies.
        </p>
        {personas === null ? (
          <EstadoSinPermiso
            titulo="No puedes ver al equipo"
            descripcion="Para darle a una persona sus ajustes propios te hace falta «Ver el equipo»."
          />
        ) : (
          <AjustesPorPersona
            pagina={datosO(personas)}
            buscando={texto !== null}
            origenes={delLive}
          />
        )}
      </div>
    </div>
  )
}

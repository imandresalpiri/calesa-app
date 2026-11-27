import { Suspense, type ReactNode } from 'react'
import { TiposCambioVigentes, getAjustes, getTiposCambioDeLaBarra } from '@/modules/empresa/shell'
import {
  BannerPerspectiva,
  ProveedorPerspectiva,
  ProveedorPreferencias,
  cerrarSesion,
  nombreVisible,
  puede,
  requerirSesion,
} from '@/modules/equipo/shell'
import { AltaDeLead, ProveedorDeEscribirPorChat } from '@/modules/leads/shell'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { anchoDeEstaPeticion } from '@/shared/lib/ancho.server'
import type { Permisos } from '@/shared/lib/permisos'
import { ProveedorDeAncho } from '@/shared/ui/ancho-de-pantalla'
import { EstiloDeMarca } from '@/shared/ui/estilo-de-marca'
import { SimbolosDeLista } from '@/shared/ui/lista/simbolos-de-lista'
import { Marca } from '@/shared/ui/marca'
import { ProveedorDelLive } from '@/shared/ui/proveedor-del-live'
import { ProveedorRegional } from '@/shared/ui/regional'
import { BarraLateral } from './_shell/barra-lateral'
import { EsqueletoShell } from './_shell/esqueleto-shell'
import { Marco } from './_shell/marco'
import { MenuUsuario } from './_shell/menu-usuario'
import { accionesDeLaPaleta, tiposDeLaPaleta } from './_shell/acciones-de-la-paleta'
import { HuecoBuscador } from './_shell/huecos/buscador'
import { HuecoCampana } from './_shell/huecos/campana'
import { HuecoChat } from './_shell/huecos/chat'
import { HuecoSilencioDelPush } from './_shell/huecos/silencio-del-push'
import { entradasVisibles } from './_shell/navegacion'
import { NuevoDeLaBarraSuperior } from './_shell/nuevo/nuevo-de-la-barra-superior'
import { opcionesDeNuevo } from './_shell/nuevo/opciones'
import { RUTAS_CON_PANTALLA } from './_shell/rutas-con-pantalla'

// Sin `leads.crear` no se monta el drawer ni la `N`, ni hay una URL que lo abra. El drawer lee lo que necesita al abrirse: el documento de la pantalla no lleva los
// catálogos del alta.
function altaDeLead(permisos: Permisos): ReactNode {
  return puede(permisos, 'leads.crear') ? <AltaDeLead /> : undefined
}

// «Nuevo»: sólo las claves de lo que quien mira puede crear (no `permisos.ts`: lo que el layout pasa viaja en todas las pantallas); sin nada que crear, no hay botón.
function nuevoDeLaBarra(permisos: Permisos): ReactNode {
  const opciones = opcionesDeNuevo(permisos)
  return opciones.length > 0 ? <NuevoDeLaBarraSuperior opciones={opciones} /> : undefined
}

// La marca de la barra lateral: plegada, el nombre queda sólo para el lector y se ve el logo.
function marcaDeLaEmpresa(ajustes: Awaited<ReturnType<typeof getAjustes>>): ReactNode {
  return (
    <Marca
      nombre={ajustes.nombre}
      logoUrl={urlPublicaONull('marca', ajustes.logoRuta)}
      logoOscuroUrl={urlPublicaONull('marca', ajustes.logoOscuroRuta)}
      nombreClassName="group-data-plegado/lateral:sr-only"
    />
  )
}

type SesionDelShell = Awaited<ReturnType<typeof requerirSesion>>

// El menú del usuario: quién es y las entradas de su zona (con el Modo Live, sólo lo que muestra).
function menuDelUsuario(sesion: SesionDelShell): ReactNode {
  const entradas = entradasVisibles(sesion.permisos, 'usuario', sesion.live).map(
    ({ clave, titulo, ruta }) => ({ clave, titulo, ruta }),
  )
  return (
    <MenuUsuario
      persona={{
        nombre: nombreVisible(sesion),
        email: sesion.email,
        avatarUrl: urlPublicaONull('avatares', sesion.avatarRuta),
        rol: sesion.roles[0]?.nombre ?? null,
      }}
      entradas={entradas}
      alCerrarSesion={cerrarSesion}
      puedeConfigurarAyuda={puede(sesion.permisos, 'empresa.ajustes.gestionar')}
    />
  )
}

// Todo lo que depende de quién entró: la sesión, sus permisos y los ajustes de la empresa. Acá se
// leen una vez y se reparten por props a un marco que no sabe de dónde salen.
async function Shell({ children }: { children: ReactNode }) {
  const [sesion, ajustes, tiposCambio, ancho] = await Promise.all([
    requerirSesion(),
    getAjustes(),
    getTiposCambioDeLaBarra(),
    anchoDeEstaPeticion(),
  ])

  return (
    <ProveedorRegional
      locale={ajustes.locale}
      monedaBase={ajustes.monedaBase}
      zonaHoraria={ajustes.zonaHoraria}
      zonaDeLaPersona={sesion.preferencias.zonaHoraria}
    >
      {/* El ancho de quien pide: cada lista dibuja una sola de sus vistas, ya desde el servidor (cierre 1). */}
      <ProveedorDeAncho inicial={ancho}>
        {/* El color de la empresa pisa los tokens neutros de design/tokens.css. */}
        <EstiloDeMarca color={ajustes.colorAcento} />
        {/* Los iconos que se repiten en cada fila de una lista, dibujados una vez (`<use>`): el «⋯» cuesta 3 nodos, no 6. */}
        <SimbolosDeLista />
        <ProveedorPreferencias {...sesion.preferencias}>
          {/* La perspectiva «ver como» de esta sesión, para el menú, el banner y quien la pida. */}
          <ProveedorPerspectiva perspectiva={sesion.perspectiva}>
            <ProveedorDeEscribirPorChat habilitado={puede(sesion.permisos, 'chat.participar')}>
              {/* El Modo Live: si se puede encender y si esta pantalla se dibujó con él (la cookie; `sesion.permisos` ya viene recortado). */}
              <ProveedorDelLive
                puedeEncender={sesion.live.puedeEncender}
                enElServidor={sesion.live.encendido}
              >
                {/* Con el Live encendido este dispositivo no recibe push (se vuelve a suscribir al apagarlo). */}
                <HuecoSilencioDelPush />
                <Marco
                  nombreEmpresa={ajustes.nombre}
                  marca={marcaDeLaEmpresa(ajustes)}
                  enElLive={sesion.live.encendido}
                  navegacion={<BarraLateral permisos={sesion.permisos} live={sesion.live} />}
                  // Los que la empresa eligió para la barra (hasta 3; sin ninguno, el por defecto). Sin tipos de cambio vigentes el hueco no ocupa lugar.
                  tipoCambio={
                    tiposCambio.length > 0 ? (
                      <TiposCambioVigentes
                        tipos={tiposCambio}
                        puedeGestionar={puede(sesion.permisos, 'empresa.tipos_cambio.gestionar')}
                      />
                    ) : undefined
                  }
                  altaDeLead={altaDeLead(sesion.permisos)}
                  nuevo={nuevoDeLaBarra(sesion.permisos)}
                  aviso={<BannerPerspectiva />}
                  buscador={
                    <HuecoBuscador
                      acciones={accionesDeLaPaleta(sesion.permisos, sesion.live)}
                      tipos={tiposDeLaPaleta(sesion.live)}
                    />
                  }
                  // Las notificaciones son de lo que siempre se oculta en el Live: sin campana ni sus avisos.
                  campana={
                    sesion.live.encendido ? undefined : (
                      <HuecoCampana usuarioId={sesion.usuarioId} disponibles={RUTAS_CON_PANTALLA} />
                    )
                  }
                  flotante={<HuecoChat sesion={sesion} zona={ajustes.zonaHoraria} />}
                  menuUsuario={menuDelUsuario(sesion)}
                >
                  {children}
                </Marco>
              </ProveedorDelLive>
            </ProveedorDeEscribirPorChat>
          </ProveedorPerspectiva>
        </ProveedorPreferencias>
      </ProveedorDeAncho>
    </ProveedorRegional>
  )
}

// Las pantallas con sesión. El layout en sí es estático (la cáscara es el esqueleto del marco);
// leer la sesión es de cada request y por eso va detrás de <Suspense>.
export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<EsqueletoShell />}>
      <Shell>{children}</Shell>
    </Suspense>
  )
}

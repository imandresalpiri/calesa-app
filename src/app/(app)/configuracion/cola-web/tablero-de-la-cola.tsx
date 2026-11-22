import { filtroDelEquipoDesde, leerEquipo } from '@/modules/equipo'
import {
  leerPoliticaDeLaCola,
  leerSinAsignar,
  leerTableroDeLaCola,
  PANEL_AGREGAR_A_LA_RUEDA,
  personasParaLaRueda,
  type Tablero,
} from '@/modules/web'
import {
  AgregarALaRueda,
  AvisosDeLaPolitica,
  ErrorDeLectura,
  RuedaDeLaCola,
  SinAsignar,
  TarjetaDeLaPolitica,
} from '@/modules/web/pantallas/cola'
import type { Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'

type Props = {
  permisos: Permisos
  // `?panel=` y `?q=` de la página: con «Agregar a la rueda» abierto se lee una página del equipo.
  panel: string | undefined
  busqueda: string | undefined
}

// El cuerpo de Configuración › Cola web (8.04-2): tres lecturas en paralelo —la política, la primera página de «Sin asignar» y el tablero— y cada parte
// con su error si no llegó, sin tapar las otras. Los bloques van en su orden: «Sin asignar», «En la rueda» (con «Agregar a la rueda») y «Política de la
// cola» (una tarjeta de ajustes que se edita en un modal). «Actualizar» y volver a la pestaña repiten las tres (`router.refresh()`). Con «Agregar a la rueda»
// abierto (8.04-3), una cuarta: la página del equipo que cumple la búsqueda (sólo si quien mira ve el equipo).
export async function TableroDeLaCola({ permisos, panel, busqueda }: Props) {
  const puedeVerEquipo =
    puede(permisos, 'equipo.usuarios.ver') || puede(permisos, 'equipo.usuarios.gestionar')
  const puedeVerRoles =
    puede(permisos, 'equipo.roles.ver') || puede(permisos, 'equipo.roles.gestionar')
  const conEquipo = panel === PANEL_AGREGAR_A_LA_RUEDA && puedeVerEquipo
  const [politica, sinAsignar, tablero, equipo] = await Promise.all([
    leerPoliticaDeLaCola(),
    leerSinAsignar(null),
    leerTableroDeLaCola(),
    conEquipo ? leerEquipo(filtroDelEquipoDesde({ q: busqueda })) : null,
  ])
  return (
    <div className="grid gap-6">
      {politica.ok ? (
        <AvisosDeLaPolitica
          politica={politica.data}
          puedeEditarElSitio={puede(permisos, 'web.ajustes.gestionar')}
        />
      ) : null}
      {sinAsignar.ok ? (
        <SinAsignar primera={sinAsignar.data} />
      ) : (
        <ErrorDeLectura
          titulo="No pudimos leer las solicitudes sin asignar"
          mensaje={sinAsignar.error.mensaje}
        />
      )}
      {tablero.ok ? (
        <ParteDeLaRueda
          tablero={tablero.data}
          equipo={equipo}
          puedeVerEquipo={puedeVerEquipo}
          puedeVerRoles={puedeVerRoles}
        />
      ) : (
        <ErrorDeLectura titulo="No pudimos leer la rueda" mensaje={tablero.error.mensaje} />
      )}
      {politica.ok ? (
        <TarjetaDeLaPolitica politica={politica.data} />
      ) : (
        <ErrorDeLectura
          titulo="No pudimos leer la política de la cola"
          mensaje={politica.error.mensaje}
        />
      )}
    </div>
  )
}

type PropsDeLaRueda = {
  tablero: Tablero
  // La página del equipo, si se leyó (panel abierto y quien mira ve el equipo).
  equipo: Resultado<{ personas: Parameters<typeof personasParaLaRueda>[0]; hayMas: boolean }> | null
  puedeVerEquipo: boolean
  puedeVerRoles: boolean
}

// «En la rueda»: su acción principal, «Agregar a la rueda», va junto al título. Sin el tablero no se dibuja: no sabría quién ya está habilitada.
function ParteDeLaRueda({ tablero, equipo, puedeVerEquipo, puedeVerRoles }: PropsDeLaRueda) {
  const leido = equipo?.ok ? equipo.data : null
  return (
    <RuedaDeLaCola
      tablero={tablero}
      puedeVerRoles={puedeVerRoles}
      accion={
        <AgregarALaRueda
          personas={leido ? personasParaLaRueda(leido.personas, tablero.filas) : null}
          hayMas={leido?.hayMas ?? false}
          errorDelEquipo={equipo && !equipo.ok ? equipo.error.mensaje : null}
          puedeVerEquipo={puedeVerEquipo}
          puedeVerRoles={puedeVerRoles}
          hayMasEnElTablero={tablero.hayMas}
        />
      }
    />
  )
}

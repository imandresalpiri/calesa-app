// Las acciones de los avisos de un vehículo, dichas una sola vez: qué se puede hacer cuando la papelera lo rechaza, o cuando la pantalla ya
// sabe que no va. La base dice la causa con una clave (`_vehiculo_bloqueo()`, `rechazados[].causa`); acá cada causa se traduce a ofertas en su
// orden (la principal primero) y `resolverAcciones()` de `@/shared/lib/acciones-del-aviso` las filtra por permiso. Sin I/O.
import {
  pedidoDe,
  resolverAcciones,
  SIN_ACCIONES,
  type AccionesDeUnAviso,
  type OfertaDeAccion as OfertaDeAviso,
} from '@/shared/lib/acciones-del-aviso'
import type { ErrorApp } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS, unidadDeLogistica } from '@/shared/lib/rutas'
import { rutaDelVehiculo } from './ruta-por-vehiculo'
import { PANEL_DESVINCULAR } from './vehiculos-del-lead'

// Las claves que devuelve `_vehiculo_bloqueo()`. `cotizacion_papelera` sólo frena una purga, no un envío.
export const CAUSAS_DE_BLOQUEO = [
  'vinculado',
  'fase',
  'comprobante',
  'final',
  'cotizacion_papelera',
  'documentos',
  'pagos',
  'aduana',
  'repuestos',
] as const

export type CausaDeBloqueo = (typeof CAUSAS_DE_BLOQUEO)[number]

export function esCausaDeBloqueo(valor: unknown): valor is CausaDeBloqueo {
  return CAUSAS_DE_BLOQUEO.some((causa) => causa === valor)
}

// `?luego=papelera` en la URL del panel de desvincular: al terminar, vuelve a ofrecer enviar el vehículo a la papelera.
export const CLAVE_DE_LUEGO = 'luego'
export const LUEGO_PAPELERA = 'papelera'

// Quitar el vínculo siempre va a la ficha (`?panel=desvincular` lleva a su bloque «Relacionados»): el panel de desvincular sólo existe ahí.
export function rutaParaDesvincular(vehiculoId: string): string {
  return `${RUTAS.vehiculos}/${vehiculoId}?${new URLSearchParams({ panel: PANEL_DESVINCULAR, [CLAVE_DE_LUEGO]: LUEGO_PAPELERA }).toString()}`
}

// «Ver las cotizaciones»: su bloque en la ficha (`?seccion=cotizaciones`).
const rutaDeLasCotizaciones = (vehiculoId: string) =>
  `${RUTAS.vehiculos}/${vehiculoId}?seccion=cotizaciones`

// Verbo + objeto, nunca «Aceptar» (un test lo comprueba sobre este catálogo).
export const ETIQUETA_DE_AVISO = {
  quitarVinculo: 'Quitar el vínculo',
  verLead: 'Ver el lead',
  verEnLogistica: 'Ver en logística',
  verDocumentos: 'Ver los documentos',
  verCotizaciones: 'Ver las cotizaciones',
  verRepuestos: 'Ver el proyecto de repuestos',
  verCambios: 'Ver los cambios',
  enviarAPapelera: 'Enviar a la papelera',
} as const

// Lo que quien mira puede abrir desde un aviso de un vehículo de un origen. Se resuelve en el servidor y viaja como booleanos, con la ruta de los
// documentos.
export type AlcanceDeAvisos = {
  verLeads: boolean
  verLogistica: boolean
  verCotizaciones: boolean
  verRepuestos: boolean
  // «Ver los documentos»: la unidad de logística con sus documentos abiertos, como plantilla con `MARCADOR_DE_VEHICULO` (cada vehículo pone su id).
  // La arma `src/app` con `logistica`, que este módulo no conoce.
  documentos: string
}

export function alcanceDeAvisos(
  permisos: Permisos,
  origenId: string,
  documentos: string,
): AlcanceDeAvisos {
  return {
    verLeads: puede(permisos, 'leads.ver'),
    verLogistica: puede(permisos, 'logistica.ver', origenId),
    verCotizaciones: puede(permisos, 'cotizaciones.ver', origenId),
    verRepuestos: puede(permisos, 'repuestos.ver'),
    documentos,
  }
}

// Del vehículo del aviso: su lead, si ese lead se puede abrir (lo dice la base: `vehiculos_con_lead_visible`), si quien mira lo edita y la ruta de su
// proyecto de repuestos, si la página la resolvió (la ficha, con `repuestos.ver`: `repuestos` lo arma `src/app`). Sin ella, «Ver el proyecto de
// repuestos» no se ofrece.
export type VehiculoDelAviso = {
  id: string
  leadId: string | null
  leadVisible: boolean
  editable: boolean
  proyecto: string | null
}

// «Ver en logística» vale para varias causas: la fase, los pagos y la aduana viven en la unidad de logística.
const aLogistica = (vehiculo: VehiculoDelAviso, alcance: AlcanceDeAvisos): OfertaDeAviso[] => [
  {
    accion: {
      tipo: 'ir',
      etiqueta: ETIQUETA_DE_AVISO.verEnLogistica,
      ruta: unidadDeLogistica(vehiculo.id),
    },
    puede: alcance.verLogistica,
  },
]

// «Ver el proyecto de repuestos», sólo si la página resolvió la ruta del proyecto (la fila de la lista no la lee).
function aRepuestos(vehiculo: VehiculoDelAviso, alcance: AlcanceDeAvisos): OfertaDeAviso[] {
  if (vehiculo.proyecto === null) {
    return []
  }
  return [
    {
      accion: { tipo: 'ir', etiqueta: ETIQUETA_DE_AVISO.verRepuestos, ruta: vehiculo.proyecto },
      puede: alcance.verRepuestos,
    },
  ]
}

function ofertasDe(
  causa: CausaDeBloqueo,
  vehiculo: VehiculoDelAviso,
  alcance: AlcanceDeAvisos,
): OfertaDeAviso[] {
  switch (causa) {
    case 'vinculado':
      // La que destraba va primero; la que sólo informa, después. El panel de desvincular existe con `leads.ver` y si quien mira edita el
      // vehículo: si eso cambia, cambia a la vez la ruta y este `puede`.
      return [
        {
          accion: {
            tipo: 'ir',
            etiqueta: ETIQUETA_DE_AVISO.quitarVinculo,
            ruta: rutaParaDesvincular(vehiculo.id),
          },
          puede: vehiculo.editable && alcance.verLeads,
          pedido: pedidoDe('quitar el vínculo'),
        },
        ...(vehiculo.leadId === null
          ? []
          : [
              {
                accion: {
                  tipo: 'ir' as const,
                  etiqueta: ETIQUETA_DE_AVISO.verLead,
                  ruta: `${RUTAS.leads}/${vehiculo.leadId}`,
                },
                puede: vehiculo.leadVisible,
              },
            ]),
      ]
    case 'fase':
    case 'pagos':
    case 'aduana':
      return aLogistica(vehiculo, alcance)
    case 'documentos':
      return [
        {
          accion: {
            tipo: 'ir',
            etiqueta: ETIQUETA_DE_AVISO.verDocumentos,
            ruta: rutaDelVehiculo(alcance.documentos, vehiculo.id),
          },
          puede: alcance.verLogistica,
        },
      ]
    case 'comprobante':
    case 'final':
    case 'cotizacion_papelera':
      return [
        {
          accion: {
            tipo: 'ir',
            etiqueta: ETIQUETA_DE_AVISO.verCotizaciones,
            ruta: rutaDeLasCotizaciones(vehiculo.id),
          },
          puede: alcance.verCotizaciones,
        },
      ]
    case 'repuestos':
      return aRepuestos(vehiculo, alcance)
  }
}

// Qué ofrece un vehículo bloqueado por esta causa, ya filtrado por lo que quien mira puede abrir.
export function accionesDeBloqueo(
  causa: CausaDeBloqueo,
  vehiculo: VehiculoDelAviso,
  alcance: AlcanceDeAvisos,
): AccionesDeUnAviso {
  return resolverAcciones(ofertasDe(causa, vehiculo, alcance))
}

// Lo mismo desde un error que viene de la base: sin causa (o una que esta versión no conoce) no hay nada que ofrecer. Un conflicto (otra persona
// cambió el vehículo) suma «Ver los cambios» si la pantalla sabe adónde (`paraActividad`: la ficha, con `actividad.ver`); «Recargar» lo pone
// `avisarError()`.
export function accionesDeError(
  error: ErrorApp,
  vehiculo: VehiculoDelAviso,
  alcance: AlcanceDeAvisos,
  paraActividad?: string | null,
): AccionesDeUnAviso {
  if (error.codigo === 'conflicto' && paraActividad) {
    return resolverAcciones([
      {
        accion: { tipo: 'ir', etiqueta: ETIQUETA_DE_AVISO.verCambios, ruta: paraActividad },
        puede: true,
      },
    ])
  }
  return esCausaDeBloqueo(error.causa)
    ? accionesDeBloqueo(error.causa, vehiculo, alcance)
    : SIN_ACCIONES
}

// El vehículo de una fila o de la ficha, con lo que la página resolvió de él (la fila no lee su proyecto de repuestos).
export function vehiculoDelAviso(
  vehiculo: { id: string; leadId: string | null },
  {
    editable,
    leadVisible,
    proyecto = null,
  }: { editable: boolean; leadVisible: boolean; proyecto?: string | null },
): VehiculoDelAviso {
  return { id: vehiculo.id, leadId: vehiculo.leadId, leadVisible, editable, proyecto }
}

// Lo que hace falta para decir qué se puede hacer si la base rechaza el envío (comprobante, documentos, pagos…): el vehículo con lo que la página
// resolvió de él, lo que quien mira puede abrir y, en la ficha, adónde ver los cambios si otra persona lo tocó.
export type AvisosDelMenu = {
  vehiculo: VehiculoDelAviso
  alcance: AlcanceDeAvisos
  paraActividad?: string | null
}

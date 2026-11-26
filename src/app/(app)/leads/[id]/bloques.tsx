import { Suspense } from 'react'
import { getAjustes } from '@/modules/empresa'
import type { Permisos } from '@/modules/equipo'
import {
  BloqueDeSeguimientos,
  EsqueletoDeOportunidades,
  EsqueletoDePortal,
  EsqueletoDeSeguimientos,
  SeccionOportunidades,
  SeccionPortal,
} from '@/modules/leads/pantallas/ficha'
import { opcionesDeVehiculoDelLead } from '@/modules/vehiculos'
import { EsqueletoDeRelacionados } from '@/modules/vehiculos/pantallas/relacionados'
import { GestionDeVehiculosDelLead } from '@/modules/vehiculos/pantallas/vehiculos-del-lead'
import { leerDireccionPublica } from '@/modules/web'
import { datosO } from '@/shared/lib/errores'
import { RelacionadosDelLeadServidor } from '../../_relacionados/relacionados-del-lead'
import { BloqueCotizacionesDelLead } from './bloque-cotizaciones'

type Lead = { id: string; nombre: string }
type LoQueVe = {
  vehiculos: boolean
  oportunidades: boolean
  cotizaciones: boolean
  portal: boolean
}

// Los bloques de la ficha del lead, cada uno con su título y detrás de su `<Suspense>` con su esqueleto (del alto de lo que viene: un salto
// a un bloque de abajo no se mueve). Los de `vehiculos`, `cotizaciones`, `empresa` y `web` los compone esta ruta (`leads` no los importa). Uno que quien
// mira no ve es nulo: no se lee ni se dibuja. Los vehículos del lead (para elegir uno en un seguimiento, un recordatorio o una oportunidad)
// se piden una vez y se comparte la promesa (y `lead_vehiculos` se lee una vez por pedido: `cache`).
// `paraCotizar`: la hoja con este lead en el primer origen donde quien mira cotiza (la arma la página), o null: «Cotizaciones» sin «Cotizar».
// `embudoRecordado`: el embudo que quien mira dejó a la vista en «Oportunidades» la última vez (sus preferencias), o null.
export function bloquesDeLaFicha(
  lead: Lead,
  ve: LoQueVe,
  permisos: Permisos,
  { paraCotizar, embudoRecordado }: { paraCotizar: string | null; embudoRecordado: string | null },
) {
  const vehiculos = ve.vehiculos ? { vehiculos: opcionesDeVehiculoDelLead(lead.id) } : {}
  return {
    seguimientos: (
      <Suspense fallback={<EsqueletoDeSeguimientos />}>
        <BloqueDeSeguimientos leadId={lead.id} leadNombre={lead.nombre} {...vehiculos} />
      </Suspense>
    ),
    oportunidades: ve.oportunidades ? (
      <Suspense fallback={<EsqueletoDeOportunidades />}>
        <SeccionOportunidades leadId={lead.id} embudoRecordado={embudoRecordado} {...vehiculos} />
      </Suspense>
    ) : null,
    // «Vehículos»: los relacionados (de un vistazo, con las acciones de cada fila y «Vincular o marcar» en el título) y, al pie, «Ver los
    // vínculos anteriores» (su drawer), el panel para vincular o marcar uno y la confirmación de desvincular.
    relacionados: ve.vehiculos ? (
      <>
        <Suspense fallback={<EsqueletoDeRelacionados presentacion="compacta" />}>
          <RelacionadosDelLeadServidor leadId={lead.id} permisos={permisos} />
        </Suspense>
        <Suspense fallback={null}>
          <GestionDeVehiculosDelLead leadId={lead.id} leadNombre={lead.nombre} />
        </Suspense>
      </>
    ) : null,
    // El título con «Cotizar» lo dibuja el servidor; la lista se lee desde el navegador al acercarse a la vista.
    cotizaciones: ve.cotizaciones ? (
      <BloqueCotizacionesDelLead leadId={lead.id} cotizar={paraCotizar} />
    ) : null,
    // El nombre de la empresa y la dirección de la web los componen `empresa` y `web`.
    portal: ve.portal ? (
      <Suspense fallback={<EsqueletoDePortal />}>
        <SeccionPortal
          leadId={lead.id}
          leadNombre={lead.nombre}
          empresa={getAjustes().then((ajustes) => ajustes.nombre)}
          direccion={leerDireccionPublica().then(datosO)}
        />
      </Suspense>
    ) : null,
  }
}

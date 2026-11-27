import type { Metadata } from 'next'
import { Suspense } from 'react'
import { z } from 'zod'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  accionesDeCartera,
  CLAVE_DE_SECCION,
  duenoDe,
  leerFichaDeLead,
  puedeCambiarTelefonoDeLead,
  puedeEditarTelefonosExtra,
  puedeEditarLead,
  puedeEnviarLead,
  puedeGestionarPortal,
  seccionDeLead,
} from '@/modules/leads'
import { FichaDeLead, LeadNoDisponible } from '@/modules/leads/pantallas/ficha'
import { RegistrarVisita } from '@/modules/buscador/pantallas/visita'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS, unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { RegistrarVisto } from '@/modules/equipo/client'
import { paraActividadDe, paraCotizarDe } from '../rutas-del-menu'
import { ResumenDeLaPagina } from '../../cotizaciones/resumen-de-la-pagina'
import { bloquesDeLaFicha } from './bloques'
import { ocultoEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Lead' }

// Qué bloques ve quien mira: «Vehículos» sólo con `vehiculos.ver` en algún origen; «Oportunidades», con el lead en la cartera;
// «Cotizaciones», con `cotizaciones.ver` en algún origen (la RLS recorta las filas; sin cartera ni origen: P2 del 4.17-4); «Acceso al portal»,
// con la cartera y `leads.portal.gestionar`. «Seguimiento» siempre.
const loQueVe = (permisos: Permisos, enCartera: boolean) => ({
  vehiculos: puede(permisos, 'vehiculos.ver'),
  oportunidades: enCartera,
  cotizaciones: puede(permisos, 'cotizaciones.ver'),
  portal: puedeGestionarPortal(permisos, enCartera),
})

// La ficha de un lead, en dos columnas con sus bloques compactos a la vista (`bloques.tsx`). Lo que no existe, lo que está en la papelera o sin
// dueño y lo que la persona no ve se muestran igual: decir «no tienes permiso» confirmaría que existe. Qué recibe de él (el teléfono
// completo, los datos «solo la cartera») lo decide la base. `?seccion=` (los enlaces de siempre) lleva al bloque.
export default async function PaginaLead({ params, searchParams }: PageProps<'/leads/[id]'>) {
  const oculto = await ocultoEnElLive('clientes')
  if (oculto) {
    return oculto
  }
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  if (!puede(sesion.permisos, 'leads.ver')) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para ver leads. Pídeselo a quien administra los roles." />
    )
  }
  if (!z.guid().safeParse(id).success) {
    return <LeadNoDisponible />
  }
  // La lectura de los orígenes corre a la vez que la de la ficha (sólo para quien cotiza).
  const [lectura, paraCotizar] = await Promise.all([
    leerFichaDeLead(id),
    paraCotizarDe(sesion.permisos, id),
  ])
  const datos = datosO(lectura)
  if (!datos) {
    return <LeadNoDisponible />
  }
  const { ficha } = datos
  const ve = loQueVe(sesion.permisos, ficha.enCartera)
  return (
    <>
      <RegistrarVisita tipo="lead" id={ficha.id} />
      <RegistrarVisto modulo="leads" tipo="lead" id={ficha.id} />
      <FichaDeLead
        ficha={ficha}
        campos={datos.campos}
        origen={datos.origen}
        tipo={datos.tipo}
        puedeEditar={puedeEditarLead(sesion.permisos, ficha.enCartera)}
        puedeCambiarTelefono={puedeCambiarTelefonoDeLead(sesion.permisos, ficha.enCartera)}
        puedeEditarExtras={puedeEditarTelefonosExtra(sesion.permisos, ficha.enCartera)}
        puedeConfigurar={puede(sesion.permisos, 'leads.configurar')}
        seccion={seccionDeLead(unParametro(parametros[CLAVE_DE_SECCION]), ve)}
        ve={ve}
        paraCotizar={paraCotizar}
        paraActividad={paraActividadDe(sesion.permisos, ficha.id)}
        etiquetas={datos.etiquetas}
        cartera={datos.cartera}
        accionesDeCartera={accionesDeCartera(sesion.permisos, datos.cartera)}
        puedeEnviarAPapelera={puedeEnviarLead(
          sesion.permisos,
          duenoDe(datos.cartera)?.usuarioId ?? null,
          sesion.usuarioId,
        )}
        {...bloquesDeLaFicha(ficha, ve, sesion.permisos, {
          paraCotizar,
          embudoRecordado: sesion.preferencias.embudoDeLaFicha,
        })}
      />
      {/* El resumen de una cotización (`?cotizacion=`): sólo se lee y se dibuja con esa clave en la URL. */}
      {ve.cotizaciones ? (
        <Suspense fallback={null}>
          <ResumenDeLaPagina parametros={searchParams} ruta={`${RUTAS.leads}/${ficha.id}`} />
        </Suspense>
      ) : null}
    </>
  )
}

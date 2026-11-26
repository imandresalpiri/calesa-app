'use client'

import { useRef } from 'react'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { PRIMEROS_DE_RECORDATORIOS } from '../../../entities/bloques-de-la-ficha'
import { estadoDelRecordatorio } from '../../../entities/recordatorios'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useBusquedaDeRecordatorio } from '../hooks/use-busqueda-de-recordatorio'
import { useModalDeRecordatorio } from '../hooks/use-modal-de-recordatorio'
import type { Recordatorios } from '../hooks/use-recordatorios'
import { Completados } from './completados'
import { ModalDeRecordatorioDiferido } from './diferidos'
import { EsqueletoDeRecordatorios } from './esqueleto-de-recordatorios'
import { ItemDeRecordatorio } from './item-de-recordatorio'
import { ListaDeRecordatorios } from './lista-de-recordatorios'

export type FormaDelBloque = {
  // Dentro del drawer «Ver todos»: sin botón a quien volver, el modal no devuelve el foco a ciegas (4-58, como `LineaDeSeguimientos`).
  enDrawer?: boolean
  // «resumen» (el bloque «Seguimiento» de la ficha): sólo el pendiente más próximo (`PRIMEROS_DE_RECORDATORIOS`), en una fila, sin título,
  // sin «Agendar» (está en el «+» del título) y sin pie; sin pendientes, nada. «completa» («Ver tus recordatorios»): todo.
  forma?: 'completa' | 'resumen'
  // Falso: otro dueño de los modales responde a la URL (el drawer «Ver todos» abierto encima del resumen).
  atiendeLaUrl?: boolean
}

type Props = FormaDelBloque & {
  leadId: string
  zona: string
  // `useRecordatorios(leadId)`: lo llama quien monta el bloque (la ficha le pone ahí el recordatorio
  // que nace con un seguimiento).
  recordatorios: Recordatorios
}

// Los pendientes: lo que hay, el vacío o el error de la primera lectura.
function Pendientes({
  ahora,
  zona,
  recordatorios,
  alEditar,
}: {
  ahora: string
  zona: string
  recordatorios: Recordatorios
  alEditar: (id: string) => void
}) {
  const { estado, listas } = recordatorios
  if (estado === 'cargando') {
    return <EsqueletoDeRecordatorios etiqueta="Cargando los recordatorios" />
  }
  if (estado === 'error') {
    return <ErrorDeLaLectura recordatorios={recordatorios} />
  }
  if (listas.pendientes.lista.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Ningún recordatorio pendiente sobre este lead.
      </p>
    )
  }
  return (
    <ListaDeRecordatorios
      lista={listas.pendientes.lista}
      hayMas={listas.pendientes.hayMas}
      ahora={ahora}
      zona={zona}
      recordatorios={recordatorios}
      alEditar={alEditar}
      verMas={recordatorios.verMasPendientes}
      cargandoMas={recordatorios.cargandoMas === 'pendientes'}
      textoDelTope={`Mostrando los primeros ${String(TOPE_DE_LO_CARGADO)}.`}
    />
  )
}

// La primera lectura falló (sólo pasa sin lo leído en el servidor): una línea con «Reintentar».
function ErrorDeLaLectura({ recordatorios }: { recordatorios: Recordatorios }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2">
      <p className="text-(length:--text-sm) text-(--color-ink)">
        No se pudieron cargar los recordatorios.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={recordatorios.reintentar}>
        Reintentar
      </Button>
    </div>
  )
}

// En el bloque «Seguimiento»: tu pendiente más próximo (un vencido primero), o nada.
function ElMasProximo({
  ahora,
  zona,
  recordatorios,
  alEditar,
}: {
  ahora: string
  zona: string
  recordatorios: Recordatorios
  alEditar: (id: string) => void
}) {
  if (recordatorios.estado === 'error') {
    return <ErrorDeLaLectura recordatorios={recordatorios} />
  }
  const primero = recordatorios.listas.pendientes.lista.slice(0, PRIMEROS_DE_RECORDATORIOS).at(0)
  if (recordatorios.estado === 'cargando' || primero === undefined) {
    return null
  }
  return (
    <ItemDeRecordatorio
      compacto
      recordatorio={primero}
      estado={estadoDelRecordatorio(primero, ahora)}
      zona={zona}
      enCurso={recordatorios.enCurso}
      alCompletar={(completado) => void recordatorios.completar(primero, completado)}
      alEditar={() => {
        alEditar(primero.id)
      }}
      alEliminar={() => void recordatorios.eliminar(primero)}
    />
  )
}

// El modal de agendar y editar según la URL, sobre todo lo cargado (pendientes, completados y los leídos por su id).
function useModalDelBloque(recordatorios: Recordatorios, atiendeLaUrl: boolean | undefined) {
  const { pendientes, completados } = recordatorios.listas
  const cargados = [...pendientes.lista, ...(completados?.lista ?? []), ...recordatorios.sueltos]
  const buscando = useBusquedaDeRecordatorio({
    estado: recordatorios.estado,
    cargados,
    buscar: recordatorios.buscar,
    atiendeLaUrl,
  })
  return useModalDeRecordatorio({
    lista: cargados,
    puedeAgendar: recordatorios.puedoAgendar,
    buscando,
    atiendeLaUrl,
  })
}

// El modal de agendar y editar. En el bloque no hay «Agendar»: el foco vuelve a quien lo abrió (el «+», el «⋯» de la fila o el de la
// cabecera); sin nadie, `focoSinOrigen`.
function ModalDelBloque({
  leadId,
  zona,
  modal,
  recordatorios,
  focoSinOrigen,
}: {
  leadId: string
  zona: string
  modal: ReturnType<typeof useModalDelBloque>
  recordatorios: Recordatorios
  focoSinOrigen: () => HTMLElement | boolean
}) {
  return (
    <ModalDeRecordatorioDiferido
      key={modal.llave}
      abierto={modal.abierto}
      alCerrar={modal.cerrar}
      leadId={leadId}
      zona={zona}
      original={modal.original}
      noDisponible={modal.noDisponible}
      alGuardar={(guardado) => {
        recordatorios.poner(guardado)
        modal.cerrar()
      }}
      focoAlCerrar={() => modal.focoAlCerrar() ?? focoSinOrigen()}
      // «Recargar» tras un conflicto: sólo ése, por su id.
      alRecargar={() => {
        if (modal.original) {
          void recordatorios.recargarUno(modal.original.id)
        }
      }}
    />
  )
}

// «Tus recordatorios» de este lead. En «Ver tus recordatorios» (`completa`): «Agendar» arriba, los pendientes —los vencidos primero,
// marcados— por páginas y, a la vista, los completados, que se leen al acercarse (el título lo pone el drawer). En el bloque «Seguimiento» (`resumen`): sólo el más próximo.
// Son personales: nadie más los ve. Agendar y editar abren un modal con su URL (`?panel=agendar-recordatorio`,
// `?panel=editar-recordatorio&recordatorio=<id>`; en el bloque, agendar lo pide el «+» del título); uno de la URL que no está cargado se
// lee por su id antes de decir que no está.
export function BloqueDeRecordatorios({
  leadId,
  zona,
  recordatorios,
  enDrawer,
  forma,
  atiendeLaUrl,
}: Props) {
  const botonAgendar = useRef<HTMLButtonElement>(null)
  const resumen = forma === 'resumen'
  const modal = useModalDelBloque(recordatorios, atiendeLaUrl)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const ahora = new Date().toISOString()
  const dialogo = montar ? (
    <ModalDelBloque
      leadId={leadId}
      zona={zona}
      modal={modal}
      recordatorios={recordatorios}
      focoSinOrigen={() => botonAgendar.current ?? !enDrawer}
    />
  ) : null
  if (resumen) {
    return (
      <>
        <section aria-label="Tus recordatorios" className="grid min-w-0 empty:hidden">
          <ElMasProximo
            ahora={ahora}
            zona={zona}
            recordatorios={recordatorios}
            alEditar={modal.abrirEdicion}
          />
        </section>
        {dialogo}
      </>
    )
  }
  return (
    <section aria-label="Tus recordatorios" className="grid content-start gap-2">
      {recordatorios.puedoAgendar ? (
        <Button
          ref={botonAgendar}
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-8"
          onClick={modal.abrirAgendar}
        >
          Agendar recordatorio
        </Button>
      ) : null}
      <Pendientes
        ahora={ahora}
        zona={zona}
        recordatorios={recordatorios}
        alEditar={modal.abrirEdicion}
      />
      <Completados
        ahora={ahora}
        zona={zona}
        recordatorios={recordatorios}
        alEditar={modal.abrirEdicion}
      />
      {dialogo}
    </section>
  )
}

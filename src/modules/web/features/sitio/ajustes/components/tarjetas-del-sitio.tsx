'use client'

import type { ConteoAcotado } from '@/shared/lib/conteo'
import {
  TarjetaEditable,
  TarjetasDeAjustes,
  ValoresDeLaTarjeta,
  type FilaDeValores,
} from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import type { TarjetaDelSitio } from '../../../../entities/sitio/tarjetas-del-sitio'
import { usePanelesDelSitio } from '../hooks/use-paneles-del-sitio'
import {
  ModalDeContactoDiferido,
  ModalDeIdentidadDiferido,
  ModalDeRedesDiferido,
  ModalDeSeoDiferido,
  ModalDeVitrinaDiferido,
} from './diferidos'
import {
  filasDeContacto,
  filasDeIdentidad,
  filasDeRedes,
  filasDeSeo,
  filasDeVitrina,
} from './valores-del-sitio'

export type PropsDeAjustesDelSitio = {
  ajustes: AjustesDelSitio
  // Los orígenes activos (los compone la página: `web` no importa `origenes`).
  origenes: readonly { id: string; nombre: string }[]
  // Por origen que hoy se ve: cuántos vehículos publicados dejan de verse al apagarlo (`null`: no se pudo leer).
  conteos: Record<string, ConteoAcotado | null>
}

type Paneles = ReturnType<typeof usePanelesDelSitio>

function Tarjeta({
  titulo,
  panel,
  paneles,
  filas,
  vacio,
}: {
  titulo: string
  panel: TarjetaDelSitio
  paneles: Paneles
  filas: readonly FilaDeValores[]
  // Lo que se dice cuando no hay ninguna fila (las redes sin dirección).
  vacio?: string
}) {
  return (
    <TarjetaEditable titulo={titulo} motivo={null} abrir={paneles[panel].abrir}>
      {filas.length === 0 && vacio ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">{vacio}</p>
      ) : (
        <ValoresDeLaTarjeta filas={filas} />
      )}
    </TarjetaEditable>
  )
}

// Los cinco modales, cada uno recién cuando se abre por primera vez.
function ModalesDelSitio({ props, paneles }: { props: PropsDeAjustesDelSitio; paneles: Paneles }) {
  const { ajustes } = props
  const deLosModales = { ajustes, alCerrar: paneles.cerrar }
  return (
    <>
      {paneles.identidad.montar ? (
        <ModalDeIdentidadDiferido {...deLosModales} abierto={paneles.identidad.abierto} />
      ) : null}
      {paneles.contacto.montar ? (
        <ModalDeContactoDiferido {...deLosModales} abierto={paneles.contacto.abierto} />
      ) : null}
      {paneles.redes.montar ? (
        <ModalDeRedesDiferido {...deLosModales} abierto={paneles.redes.abierto} />
      ) : null}
      {paneles.seo.montar ? (
        <ModalDeSeoDiferido {...deLosModales} abierto={paneles.seo.abierto} />
      ) : null}
      {paneles.vitrina.montar ? (
        <ModalDeVitrinaDiferido
          {...deLosModales}
          abierto={paneles.vitrina.abierto}
          origenes={props.origenes}
          conteos={props.conteos}
        />
      ) : null}
    </>
  )
}

// Configuración › Sitio web › Ajustes: cinco tarjetas con lo guardado a la vista (identidad, contacto, redes, SEO y vitrina); cada «Editar» abre su
// modal (`?panel=<tarjeta>`), que se pide recién entonces. Una escritura por modal, todas con la misma versión de la fila. Entra quien tiene
// `web.ajustes.gestionar` (la página lo exige).
export function TarjetasDelSitio(props: PropsDeAjustesDelSitio) {
  const { ajustes, origenes } = props
  const paneles = usePanelesDelSitio()
  return (
    <>
      <TarjetasDeAjustes etiqueta="Ajustes del sitio">
        <Tarjeta
          titulo="Identidad del sitio"
          panel="identidad"
          paneles={paneles}
          filas={filasDeIdentidad(ajustes)}
        />
        <Tarjeta
          titulo="Contacto"
          panel="contacto"
          paneles={paneles}
          filas={filasDeContacto(ajustes)}
        />
        <Tarjeta
          titulo="Redes"
          panel="redes"
          paneles={paneles}
          filas={filasDeRedes(ajustes)}
          vacio="Ninguna red enlazada."
        />
        <Tarjeta titulo="SEO" panel="seo" paneles={paneles} filas={filasDeSeo(ajustes)} />
        <Tarjeta
          titulo="Vitrina"
          panel="vitrina"
          paneles={paneles}
          filas={filasDeVitrina(ajustes, origenes)}
        />
      </TarjetasDeAjustes>
      <ModalesDelSitio props={props} paneles={paneles} />
    </>
  )
}

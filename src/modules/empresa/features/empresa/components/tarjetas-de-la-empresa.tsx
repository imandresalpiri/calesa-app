'use client'

import Image from 'next/image'
import { Aviso } from '@/shared/ui/aviso'
import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  TarjetaEditable,
  TarjetasDeAjustes,
  ValoresDeLaTarjeta,
} from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { ListaDeEnlacesDeLaEmpresa } from '../../../entities/enlaces-de-ayuda'
import type { ListaDeLogos } from '../../../entities/logos'
import { MOTIVO_SIN_LOGO, MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { TarjetaDeEnlacesDeAyuda } from '../../enlaces-de-ayuda/components/tarjeta-de-enlaces-de-ayuda'
import { useVolverALosNeutros } from '../../iconos/hooks/use-iconos'
import { TarjetaDeLogos } from '../../logos/components/tarjeta-de-logos'
import { usePanelesDeLaEmpresa, type MotivosDeLosPaneles } from '../hooks/use-paneles-de-la-empresa'
import {
  ModalDeDatosLegalesDiferido,
  ModalDeIconosDiferido,
  ModalDeIdentidadDiferido,
  ModalDePoliticasDiferido,
  ModalDeRegionDiferido,
} from './diferidos'
import {
  filasDeDatosLegales,
  filasDeIdentidad,
  filasDePoliticas,
  filasDeRegion,
} from './valores-de-la-empresa'

type Props = {
  ajustes: AjustesEmpresa
  // URL pública de los logos guardados, ya armadas en el servidor.
  logoUrl: string | null
  logoOscuroUrl: string | null
  // La dirección del ícono de 192 px en uso (el propio o el neutro), ya armada en el servidor.
  iconoActualUrl: string
  zonas: readonly string[]
  // Sin `empresa.ajustes.gestionar` se ve todo, con «Editar» apagado y el motivo.
  puedeEditar: boolean
  // Los enlaces de ayuda de la empresa (hasta el tope + 1), para su tarjeta.
  enlacesDeAyuda: ListaDeEnlacesDeLaEmpresa
  // Las variantes del logo (las dos fijas y las propias), para su tarjeta.
  logos: ListaDeLogos
}

// La tarjeta de los íconos: el ícono en uso y, si ya se dibujaron, «Volver a los íconos neutros» en el «⋯».
function TarjetaDeIconos({
  props,
  motivo,
  abrir,
}: {
  props: Props
  motivo: string | null
  abrir: () => void
}) {
  const { ajustes, puedeEditar } = props
  const neutros = useVolverALosNeutros(ajustes)
  const extra: AccionDeMenu[] =
    ajustes.iconos && puedeEditar
      ? [
          {
            tipo: 'accion',
            clave: 'neutros',
            etiqueta: 'Volver a los íconos neutros',
            deshabilitada: neutros.enCurso,
            alElegir: () => void neutros.volver(),
          },
        ]
      : []
  return (
    <TarjetaEditable titulo="Íconos de la app" motivo={motivo} abrir={abrir} extra={extra}>
      <div className="flex flex-wrap items-center gap-3">
        <Image
          src={props.iconoActualUrl}
          alt="Ícono actual de la app"
          width={56}
          height={56}
          unoptimized
          className="size-14"
        />
        <p className="min-w-0 flex-1 text-(length:--text-sm) text-(--color-ink-soft)">
          {ajustes.iconos
            ? 'La app usa los íconos generados desde el logo.'
            : 'La app usa los íconos neutros.'}
        </p>
      </div>
      {props.logoUrl === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">{MOTIVO_SIN_LOGO}</p>
      ) : null}
    </TarjetaEditable>
  )
}

type Paneles = ReturnType<typeof usePanelesDeLaEmpresa>

// Los cinco modales, cada uno recién cuando se abre por primera vez.
function ModalesDeLaEmpresa({ props, paneles }: { props: Props; paneles: Paneles }) {
  const { ajustes } = props
  const deLosModales = { ajustes, alCerrar: paneles.cerrar }
  return (
    <>
      {paneles.identidad.montar ? (
        <ModalDeIdentidadDiferido
          {...deLosModales}
          abierto={paneles.identidad.abierto}
          logoUrl={props.logoUrl}
          logoOscuroUrl={props.logoOscuroUrl}
        />
      ) : null}
      {paneles.region.montar ? (
        <ModalDeRegionDiferido
          {...deLosModales}
          abierto={paneles.region.abierto}
          zonas={props.zonas}
        />
      ) : null}
      {paneles.legales.montar ? (
        <ModalDeDatosLegalesDiferido {...deLosModales} abierto={paneles.legales.abierto} />
      ) : null}
      {paneles.politicas.montar ? (
        <ModalDePoliticasDiferido {...deLosModales} abierto={paneles.politicas.abierto} />
      ) : null}
      {paneles.iconos.montar ? (
        <ModalDeIconosDiferido
          abierto={paneles.iconos.abierto}
          alCerrar={paneles.cerrar}
          logoUrl={props.logoUrl}
          colorAcento={ajustes.colorAcento}
          iconos={ajustes.iconos}
          actualizadoEn={ajustes.actualizadoEn}
        />
      ) : null}
    </>
  )
}

// Las siete tarjetas de Datos de la empresa (la de los enlaces de ayuda, con su lista y sus modales, va tercera: así «Datos legales» abre la
// segunda columna y la página entra a 1440×900), con lo guardado a la vista; cada «Editar» abre su modal (`?panel=<tarjeta>`), que se pide
// recién entonces. Una escritura por modal, todas con la misma versión de la fila.
export function TarjetasDeLaEmpresa(props: Props) {
  const { ajustes, puedeEditar } = props
  const motivo = puedeEditar ? null : MOTIVO_SIN_PERMISO_AJUSTES
  const motivos: MotivosDeLosPaneles = {
    identidad: motivo,
    region: motivo,
    'datos-legales': motivo,
    politicas: motivo,
    iconos: motivo ?? (props.logoUrl === null ? MOTIVO_SIN_LOGO : null),
  }
  const paneles = usePanelesDeLaEmpresa(motivos)

  return (
    <>
      {puedeEditar ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES}</Aviso>}
      <TarjetasDeAjustes etiqueta="Ajustes de la empresa">
        <TarjetaEditable titulo="Identidad" motivo={motivo} abrir={paneles.identidad.abrir}>
          <ValoresDeLaTarjeta
            filas={filasDeIdentidad(ajustes, props.logoUrl, props.logoOscuroUrl)}
          />
        </TarjetaEditable>
        <TarjetaEditable titulo="Región" motivo={motivo} abrir={paneles.region.abrir}>
          <ValoresDeLaTarjeta filas={filasDeRegion(ajustes)} />
        </TarjetaEditable>
        <TarjetaDeEnlacesDeAyuda lista={props.enlacesDeAyuda} motivo={motivo} />
        <TarjetaEditable
          titulo="Datos legales y de contacto"
          motivo={motivo}
          abrir={paneles.legales.abrir}
        >
          <ValoresDeLaTarjeta filas={filasDeDatosLegales(ajustes)} />
        </TarjetaEditable>
        <TarjetaEditable titulo="Políticas" motivo={motivo} abrir={paneles.politicas.abrir}>
          <ValoresDeLaTarjeta filas={filasDePoliticas(ajustes)} />
        </TarjetaEditable>
        <TarjetaDeLogos
          lista={props.logos}
          motivo={motivo}
          alCambiarEnIdentidad={paneles.identidad.abrir}
        />
        <TarjetaDeIconos props={props} motivo={motivos.iconos} abrir={paneles.iconos.abrir} />
      </TarjetasDeAjustes>
      <ModalesDeLaEmpresa props={props} paneles={paneles} />
    </>
  )
}

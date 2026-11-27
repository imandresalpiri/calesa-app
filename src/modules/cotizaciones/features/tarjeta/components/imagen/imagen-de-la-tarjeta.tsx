'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useALaVista } from '@/shared/ui/use-a-la-vista'
import { useLive } from '@/shared/ui/live'
import { rutaDeLaImagen, type AnchoDeLaImagen } from '../../../../entities/ruta-de-la-hoja'
import type { LugarDeLaImagen } from '../../../../entities/tarjeta/clave-del-visor-de-la-imagen'
import { useCargaDeLaImagen } from '../../hooks/use-carga-de-la-imagen'
import { useVisorDeLaImagen } from '../../hooks/use-visor-de-la-imagen'
import { VisorDeLaImagenDiferido } from './diferidos'
import { RecuadroDeLaImagen } from './recuadro-de-la-imagen'

// La proporción de la tarjeta de V1 (960 × 512): la del marco si quien la usa no da otra.
export const PROPORCION_DE_LA_IMAGEN = 15 / 8

export type PropsDeLaImagen = {
  cotizacionId: string
  // Para el texto alternativo y el título del visor.
  numero: number
  // El del recuadro mientras se arma o carga, o si falla; sin él, sólo el texto.
  total: { valor: number; moneda?: string | null } | null
  // Ancho ÷ alto del marco.
  proporcion?: number
  // La miniatura (las listas: 480 px); sin él, la grande. El visor pide siempre la grande.
  ancho?: AnchoDeLaImagen
  // Cómo va la imagen en el marco: entera (`contener`, por defecto) o llenándolo desde arriba a la izquierda (`cubrir`: la tarjeta de la lista; una imagen de la
  // proporción del marco no se recorta, una más alta conserva su cabecera y una más ancha, el título y la columna de conceptos).
  recorte?: 'contener' | 'cubrir'
  // Dónde se dibuja: el visor vive en `?visor=` con una clave por lugar (`claveDelVisorDeLaImagen()`), así la tarjeta y el resumen abierto de la misma cotización
  // no abren dos visores.
  lugar?: LugarDeLaImagen
  // La miniatura de una cabecera (el resumen): su recuadro en letra chica, sin crecer.
  miniatura?: boolean
}

// La variante que se pide: con su moneda o, con el Modo Live, sin ella (`?sin-moneda=1`).
export type VarianteDeLaImagen = 'con' | 'sin'

// La imagen (la miniatura, si se pidió un ancho) y la del visor (siempre la grande), de la variante. «Reintentar» suma `?intento=`: otra URL (la anterior quedó
// fallida en el navegador).
const urlsDeLaImagen = (
  id: string,
  {
    ancho,
    intento,
    variante,
  }: { ancho: AnchoDeLaImagen | undefined; intento: number; variante: VarianteDeLaImagen },
) => {
  const sinMoneda = variante === 'sin'
  return {
    url: rutaDeLaImagen(
      id,
      ancho === undefined ? { intento, sinMoneda } : { ancho, intento, sinMoneda },
    ),
    urlDelVisor: rutaDeLaImagen(id, { intento, sinMoneda }),
  }
}

// La imagen de la tarjeta (`docs/COTIZADOR.md` › «La imagen de la tarjeta»), pedida a su ruta recién a la vista (200 px antes) y con turno en la cola de la página
// (`useCargaDeLaImagen()`: a lo sumo cuatro a la vez; la que sale de la vista antes de su turno deja la fila). Mientras espera, llega o si falla, el recuadro con el
// total en el mismo marco, que crece si el texto no cabe; con turno va `eager` (`lazy` podría no pedirla nunca si sale de la vista, y el turno quedaría tomado). El
// clic la abre en el visor de fotos (su código llega al primer clic; un enlace con la clave de antes, `portada-…`, también lo abre). Con el Modo Live se pide la
// variante sin moneda: la capa lleva `key` por variante (encender o apagar el Modo Live la vuelve a pedir, con su recuadro mientras llega) y el CSS de
// `globals.css` esconde la que no corresponde (`data-imagen-moneda`): con el Modo Live encendido nunca se ve una con moneda.
export function ImagenDeLaTarjeta({
  cotizacionId,
  numero,
  total,
  proporcion = PROPORCION_DE_LA_IMAGEN,
  ancho,
  recorte = 'contener',
  lugar = 'resumen',
  miniatura = false,
}: PropsDeLaImagen) {
  const { live } = useLive()
  const variante: VarianteDeLaImagen = live ? 'sin' : 'con'
  const [observar, aLaVista] = useALaVista<HTMLDivElement>({ seguir: true })
  const visor = useVisorDeLaImagen({ cotizacionId, lugar })
  // El intento de la imagen que se abrió: la del visor sale con el mismo (una URL fallida antes no se repite).
  const [intentoDelVisor, setIntentoDelVisor] = useState(0)
  const texto = `Imagen de la tarjeta de la cotización n.º ${String(numero)}`

  return (
    <div
      ref={observar}
      data-imagen-de-la-tarjeta={cotizacionId}
      className="relative grid w-full overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-paper-dim)"
      style={{ aspectRatio: String(proporcion) }}
    >
      <CapaDeLaImagen
        key={variante}
        cotizacionId={cotizacionId}
        texto={texto}
        total={total}
        ancho={ancho}
        recorte={recorte}
        miniatura={miniatura}
        variante={variante}
        aLaVista={aLaVista}
        alAbrir={(intento) => {
          setIntentoDelVisor(intento)
          visor.abrir()
        }}
      />
      {visor.montar ? (
        <VisorDeLaImagenDiferido
          clave={visor.clave}
          variante={variante}
          titulo={texto}
          url={
            urlsDeLaImagen(cotizacionId, { ancho, intento: intentoDelVisor, variante }).urlDelVisor
          }
          pedidos={visor.pedidos}
        />
      ) : null}
    </div>
  )
}

type PropsDeLaCapa = Required<Pick<PropsDeLaImagen, 'recorte' | 'miniatura'>> &
  Pick<PropsDeLaImagen, 'cotizacionId' | 'total' | 'ancho'> & {
    texto: string
    variante: VarianteDeLaImagen
    aLaVista: boolean
    // El clic en la imagen cargada, con su intento.
    alAbrir: (intento: number) => void
  }

// La imagen de una variante, su carga y su recuadro: otra variante es otra capa (`key`), con su carga desde cero.
function CapaDeLaImagen({
  cotizacionId,
  texto,
  total,
  ancho,
  recorte,
  miniatura,
  variante,
  aLaVista,
  alAbrir,
}: PropsDeLaCapa) {
  const imagen = useCargaDeLaImagen(aLaVista)
  const { url } = urlsDeLaImagen(cotizacionId, { ancho, intento: imagen.intento, variante })
  const lista = imagen.carga === 'lista'
  return (
    <>
      <button
        type="button"
        aria-label={`Ver la ${texto.toLocaleLowerCase('es')} en grande`}
        disabled={!lista}
        onClick={() => {
          alAbrir(imagen.intento)
        }}
        className="absolute inset-0 outline-none focus-visible:shadow-(--shadow-focus) enabled:cursor-zoom-in"
      >
        {imagen.conTurno ? (
          <Image
            key={url}
            src={url}
            alt={texto}
            fill
            unoptimized
            loading="eager"
            sizes="(min-width: 48rem) 32rem, 100vw"
            className={recorte === 'cubrir' ? 'object-cover object-left-top' : 'object-contain'}
            data-imagen
            data-imagen-moneda={variante}
            onLoad={imagen.alCargar}
            onError={imagen.alFallar}
          />
        ) : null}
      </button>
      {lista ? null : (
        <RecuadroDeLaImagen
          total={total}
          fallo={imagen.carga === 'fallo'}
          alReintentar={imagen.reintentar}
          miniatura={miniatura}
        />
      )}
    </>
  )
}

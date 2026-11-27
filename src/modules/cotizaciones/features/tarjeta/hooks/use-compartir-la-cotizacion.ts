'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { useState } from 'react'
import { capacidadesDelNavegador } from '@/shared/lib/compartir'
import { useLive } from '@/shared/ui/live'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import type { FotoParaCompartir } from '../../../entities/tarjeta/compartir/datos-para-compartir'
import {
  motivosDeCompartir,
  type EstadoDeLaParte,
  type OpcionDeImagen,
} from '../../../entities/tarjeta/compartir/motivos-de-compartir'
import {
  textoParaCompartir,
  zonasDisponibles,
  type FormatoDeTexto,
  type ZonaParaCompartir,
} from '../../../entities/tarjeta/compartir/texto-para-compartir'
import {
  CLAVE_DE_LA_PESTANA_DE_COMPARTIR,
  PESTANAS_DE_COMPARTIR,
} from '../../../entities/tarjeta/compartir/url'
import { useFotosMarcadas } from './use-fotos-marcadas'
import { useParaCompartirLaCotizacion } from './use-para-compartir-la-cotizacion'
import type { ParteDeCompartir } from './use-parte-de-compartir'

const SIN_FOTOS: readonly FotoParaCompartir[] = []

const estadoDe = (parte: ParteDeCompartir<unknown>): EstadoDeLaParte =>
  parte.estado === 'listo' ? 'listo' : parte.estado === 'error' ? 'error' : 'leyendo'

// El estado de una apertura de «Compartir la cotización»: la pestaña (en la URL, `?compartir=texto`), lo elegido para este envío (la imagen, el formato, la zona y las
// fotos marcadas: estado local, como las casillas de los tipos de cambio), lo leído, el texto armado y el motivo de cada botón. Con `activo` falso (un id que no
// vale) no pide nada. `texto` es el que se copia y se comparte, siempre con su moneda; `textoALaVista`, el que se muestra: con el Modo Live, sin moneda.
export function useCompartirLaCotizacion(cotizacionId: string, activo: boolean) {
  const [pestana, setPestana] = useQueryState(
    CLAVE_DE_LA_PESTANA_DE_COMPARTIR,
    parseAsStringLiteral(PESTANAS_DE_COMPARTIR).withDefault('imagen'),
  )
  const [opcion, setOpcion] = useState<OpcionDeImagen>('cotizacion')
  const [formato, setFormato] = useState<FormatoDeTexto>('simple')
  const [zonaElegida, setZona] = useState<ZonaParaCompartir>('empresa')
  // Se arma tras abrir, en el navegador (el panel es diferido): no hay hidratación que desparejar.
  const [capacidades] = useState(capacidadesDelNavegador)
  const [ahora] = useState(() => new Date().toISOString())
  const enLinea = useEnLinea()
  const { live } = useLive()
  const lecturas = useParaCompartirLaCotizacion(cotizacionId, {
    activo,
    conFotos: opcion === 'fotos',
    live,
  })
  const { datos, imagen, fotos } = lecturas
  const fotosMarcadas = useFotosMarcadas(
    fotos.parte.estado === 'listo' ? fotos.parte.dato : SIN_FOTOS,
  )
  const leidos = datos.parte.estado === 'listo' ? datos.parte.dato : null
  // La del patio sólo si se ofrece; si no, la de la empresa.
  const zona =
    leidos !== null && zonasDisponibles(leidos).some((z) => z.clave === zonaElegida)
      ? zonaElegida
      : 'empresa'
  const texto = leidos === null ? null : textoParaCompartir(leidos, { formato, zona, ahora })
  const textoALaVista =
    leidos === null || !live
      ? texto
      : textoParaCompartir(leidos, { formato, zona, ahora, sinMoneda: true })
  const motivos = motivosDeCompartir({
    opcion,
    imagen: estadoDe(imagen.parte),
    fotos: { marcadas: fotosMarcadas.cuantas, listas: fotosMarcadas.listas.length },
    texto: estadoDe(datos.parte),
    capacidades,
    enLinea,
  })
  return {
    pestana,
    elegirPestana: (nueva: (typeof PESTANAS_DE_COMPARTIR)[number]) => {
      void setPestana(nueva === 'imagen' ? null : nueva)
    },
    opcion,
    setOpcion,
    formato,
    setFormato,
    zona,
    setZona,
    capacidades,
    enLinea,
    ...lecturas,
    leidos,
    fotosMarcadas,
    live,
    texto,
    textoALaVista,
    motivos,
  }
}

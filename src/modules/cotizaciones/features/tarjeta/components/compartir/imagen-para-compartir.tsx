'use client'

import type { OpcionDeImagen } from '../../../../entities/tarjeta/compartir/motivos-de-compartir'
import type { useCompartirLaCotizacion } from '../../hooks/use-compartir-la-cotizacion'
import { GrillaDeFotos } from './grilla-de-fotos'
import { GrupoDeOpciones } from './grupo-de-opciones'
import { TarjetaParaCompartir } from './tarjeta-para-compartir'

const OPCIONES_DE_IMAGEN = [
  { clave: 'cotizacion', etiqueta: 'Cotización' },
  { clave: 'fotos', etiqueta: 'Fotos' },
] as const

type Props = {
  c: ReturnType<typeof useCompartirLaCotizacion>
  opcion: OpcionDeImagen
  conFotos: boolean
  numero: number
}

// La pestaña «Imagen»: «Cotización» (la imagen de la tarjeta) o «Fotos» (las del vehículo, para marcar), que sólo se ofrece si el vehículo tiene fotos y quien mira lo ve.
export function ImagenParaCompartir({ c, opcion, conFotos, numero }: Props) {
  return (
    <>
      {conFotos ? (
        <GrupoDeOpciones
          etiqueta="Qué imagen"
          opciones={OPCIONES_DE_IMAGEN}
          elegida={opcion}
          alElegir={c.setOpcion}
        />
      ) : null}
      {opcion === 'fotos' ? (
        <GrillaDeFotos
          fotos={c.fotos.parte}
          marcadas={c.fotosMarcadas.marcadas}
          alAlternar={c.fotosMarcadas.alternar}
          alReintentar={c.fotos.reintentar}
        />
      ) : (
        <TarjetaParaCompartir
          imagen={c.live ? c.vistaSinMoneda.parte : c.imagen.parte}
          sinMoneda={c.live}
          numero={numero}
          alReintentar={c.live ? c.vistaSinMoneda.reintentar : c.imagen.reintentar}
        />
      )}
    </>
  )
}

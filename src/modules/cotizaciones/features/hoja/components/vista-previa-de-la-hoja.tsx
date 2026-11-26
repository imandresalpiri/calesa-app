'use client'

import { useContext, useMemo } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  calculoDeLaRespuesta,
  type CalculoDeLaTarjeta,
} from '../../../entities/calculo-de-la-tarjeta'
import type { HojaLista } from '../../../entities/hoja'
import { PANEL_DE_VISTA_PREVIA } from '../hooks/urls-de-la-hoja'
import type { useHoja } from '../hooks/use-hoja'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import type { HermanaEnLaVistaPrevia, PropsDeLaVistaPrevia } from './huecos'
import { useAporteAlMenu } from './menu-de-la-guardada/use-aporte-al-menu'

type Props = Omit<PropsDeLaVistaPrevia, 'abierta' | 'cerrar'>

// «Vista previa» (4.18-2): el modal con su URL (`?panel=vista-previa`; recargar lo abre y «atrás» lo cierra) y, en una guardada, su línea del «⋯» de la cabecera. Lo abre
// también el paso «Vista previa» de los pasos de la hoja (`PasosDeLaHoja`); aquí no se dibuja un botón. Lo dibuja el área `tarjeta` por el hueco `ContextoDeLaVistaPrevia`: sin proveedor no hay paso,
// línea ni nodo. El código del modal se pide la primera vez que se abre. Está también para quien sólo ve la cotización: ver la tarjeta no es guardar. El modal va en un
// portal, fuera de `[data-hoja]` (la hoja está al borde de sus 525 nodos).
export function VistaPreviaDeLaHoja(props: Props) {
  const area = useContext(ContextoDeLaVistaPrevia)
  const panel = usePanelPorUrl(PANEL_DE_VISTA_PREVIA)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  useAporteAlMenu(
    area === null
      ? null
      : {
          'vista-previa': {
            tipo: 'accion',
            abre: true,
            alElegir: () => {
              panel.abrir()
            },
          },
        },
  )
  if (area === null) {
    return null
  }
  return montar ? area.dibujar({ ...props, abierta: panel.abierto, cerrar: panel.cerrar }) : null
}

type PropsDeLaHojaViva = {
  hoja: HojaLista
  h: ReturnType<typeof useHoja>
  // Una guardada dibuja lo guardado (P5 a) y dice, fuera de la tarjeta, si lo de hoy no lo es y si hay cambios sin guardar. Sin `calculo` (la hoja nueva), lo que la hoja calcula ahora.
  calculo?: CalculoDeLaTarjeta
  difiere?: boolean
  hayCambios?: boolean
  // La hoja en par (glosario: «Cotizaciones hermanas»): la opción de esta tarjeta y la columna de la otra, con lo guardado de su cotización si la hay.
  opcion?: string
  hermana?: Omit<HermanaEnLaVistaPrevia, 'calculo' | 'estado'> & {
    h: ReturnType<typeof useHoja>
    calculo?: CalculoDeLaTarjeta | undefined
  }
}

// La tarjeta de la otra opción: lo guardado o lo que su columna calcula ahora.
function useHermana(hermana: PropsDeLaHojaViva['hermana']): HermanaEnLaVistaPrevia | undefined {
  const r = hermana?.h.respuesta ?? null
  const modo = hermana?.h.entradas.modoTc ?? null
  const ver = hermana?.h.verTotalBs ?? false
  const deLaColumna = useMemo(() => calculoDeLaRespuesta(r, modo, ver), [r, modo, ver])
  if (!hermana) return undefined
  const { h, calculo, ...resto } = hermana
  return { ...resto, calculo: calculo ?? deLaColumna, estado: calculo ? null : h.estado }
}

// «Vista previa» con lo que la hoja sabe: la versión de su fórmula, la moneda del total en Bs y los números que dibuja (los de la hoja, o los guardados).
export function VistaPreviaDeLaHojaViva({
  hoja,
  h,
  calculo,
  difiere,
  hayCambios,
  opcion,
  hermana,
}: PropsDeLaHojaViva) {
  const deLaHermana = useHermana(hermana)
  const deLaHoja = useMemo(
    () => calculoDeLaRespuesta(h.respuesta, h.entradas.modoTc, h.verTotalBs),
    [h.respuesta, h.entradas.modoTc, h.verTotalBs],
  )
  const guardada = calculo !== undefined
  return (
    <VistaPreviaDeLaHoja
      formulaId={hoja.formula.id}
      calculo={calculo ?? deLaHoja}
      estado={guardada ? null : h.estado}
      monedaBs={hoja.cabecera.monedaBs}
      avisos={{
        difiere: guardada && difiere === true,
        cambiosSinGuardar: guardada && hayCambios === true,
      }}
      {...(opcion === undefined ? {} : { opcion })}
      {...(deLaHermana ? { hermana: deLaHermana } : {})}
    />
  )
}

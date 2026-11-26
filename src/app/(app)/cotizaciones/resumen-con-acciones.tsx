'use client'

import { useMemo, type ComponentProps } from 'react'
import { ResumenFueraDelListado } from '@/modules/cotizaciones/pantallas/listado-resumen'
import type { MenuDeUnaFila } from '@/modules/cotizaciones/pantallas/listado'
import { HUECOS_DEL_RESUMEN } from './huecos-del-resumen'
import { conLaDelResumen } from './la-del-resumen'
import { useMenusDeLasFilas } from './use-menus-de-las-filas'

type Props = Pick<
  ComponentProps<typeof ResumenFueraDelListado>,
  'origenes' | 'delServidor' | 'quienes' | 'aprobarEn' | 'volverA' | 'vehiculosVisibles'
> & {
  // El menú de la cotización abierta (versión, marcas y lo que ofrece), por id: lo calcula el servidor (`menus-de-la-pagina.ts`). Sin menú, sin «⋯».
  menus: Readonly<Record<string, MenuDeUnaFila>>
}

// El resumen de una cotización abierto fuera del listado (`?cotizacion=` sobre la ficha del lead o la del vehículo): las mismas acciones del «⋯», de «Compartir» y de «De este vehículo»
// que en `/cotizaciones` (`useMenusDeLasFilas()`), sobre la única cotización que leyó el servidor.
export function ResumenConAcciones({ menus, ...props }: Props) {
  const { delServidor } = props
  const filas = useMemo(() => conLaDelResumen([], delServidor), [delServidor])
  const acciones = useMenusDeLasFilas(filas, menus)
  return (
    <ResumenFueraDelListado
      {...props}
      huecos={HUECOS_DEL_RESUMEN}
      compartirDe={acciones.compartirDe}
      alCambiarLaAprobada={acciones.alCambiarLaAprobada}
      menuDeFila={acciones.menuDeFila}
      dialogos={acciones.dialogos}
    />
  )
}

'use client'

import { useMemo, type ComponentProps } from 'react'
import type { MenuDeUnaFila } from '@/modules/cotizaciones/pantallas/listado'
import { ListadoDeCotizaciones } from '@/modules/cotizaciones/pantallas/listado'
import { CompararDelGrupoDiferido } from '@/modules/cotizaciones/pantallas/aprobada-listado'
import { ImagenDeLaTarjeta } from '@/modules/cotizaciones/pantallas/tarjeta-imagen'
import { HUECOS_DEL_RESUMEN } from './huecos-del-resumen'
import { conLaDelResumen } from './la-del-resumen'
import { useMenusDeLasFilas } from './use-menus-de-las-filas'

type Props = Omit<
  ComponentProps<typeof ListadoDeCotizaciones>,
  'menuDeFila' | 'compartirDe' | 'huecos' | 'dialogos' | 'huecosDelResumen' | 'alCambiarLaAprobada'
> & {
  // El menú de cada fila de la página (versión, marcas y lo que ofrece), por id: lo calcula el servidor (`menus-de-la-pagina.ts`). Una fila sin menú no tiene «⋯».
  menus: Readonly<Record<string, MenuDeUnaFila>>
}

// Lo que las áreas `tarjeta` y `aprobada` llenan en la lista: la imagen de cada tarjeta (en frío: se ve al llegar) y «Comparar» del modal de un grupo (diferido).
const HUECOS_DE_LA_LISTA = { Imagen: ImagenDeLaTarjeta, Comparar: CompararDelGrupoDiferido }

// El listado de cotizaciones con su columna de acciones: une el «⋯» de cada fila con lo que hace cada área (compartir, aprobar, marcar final, favorita, reportar, moderar y la papelera: las mismas
// actions y los mismos diálogos de la guardada) y monta los diálogos una vez (`useMenusDeLasFilas()`, el mismo del resumen de una ficha). Es un Client Component porque el «⋯» necesita las filas
// y sus funciones; el servidor sólo manda datos.
export function ListadoConAcciones({ menus, ...props }: Props) {
  // Las cotizaciones que dibuja la página (la cabeza de cada grupo y cada una sola) y la del resumen que no está en ella (una línea del modal de un grupo, otra página):
  // sus diálogos piden sus datos.
  const { pagina, delServidor } = props
  const filas = useMemo(
    () =>
      conLaDelResumen(
        pagina.filas.map((entrada) =>
          entrada.tipo === 'grupo' ? entrada.cabeza : entrada.cotizacion,
        ),
        delServidor,
      ),
    [pagina, delServidor],
  )
  const acciones = useMenusDeLasFilas(filas, menus)
  return (
    <ListadoDeCotizaciones
      {...props}
      huecos={HUECOS_DE_LA_LISTA}
      huecosDelResumen={HUECOS_DEL_RESUMEN}
      compartirDe={acciones.compartirDe}
      alCambiarLaAprobada={acciones.alCambiarLaAprobada}
      menuDeFila={acciones.menuDeFila}
      dialogos={acciones.dialogos}
    />
  )
}

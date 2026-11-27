// Las RPC que reciben un tamaño de página y lo que el código le pide a cada una (9g, `.claude/rules/escala.md`). Es el
// registro que `paginas.test.ts` cruza con las migraciones: la última definición de cada RPC acota ese parámetro con
// `_acotar_pagina(parámetro, por_defecto, máximo)`, y su máximo no es menor que lo que pide el código. Una RPC nueva con
// tamaño que no figura acá rompe `pnpm test`; una que figura y ya nadie llama, también.
import { TOPE_DEL_CONTEO } from '../../src/shared/lib/conteo'
import {
  LOTES_POR_PAGINA,
  PRIMEROS_DEL_LOTE,
  TAMANO_DE_COLUMNA,
  TAMANO_DE_ESTE_VEHICULO,
  TAMANO_DE_LA_FASE,
  TAMANO_DE_PERSONAS_DEL_LIVE,
  TAMANO_DE_VER_MAS,
  TOPE_DE_LO_CARGADO,
  TOPE_DEL_EQUIPO,
} from '../../src/shared/lib/paginacion'
import { MAXIMO_DE_PAGINA_DE_COTIZACIONES } from '../../src/modules/cotizaciones/entities/listado/listado'
import { MAXIMO_DE_PAGINA_DE_VEHICULOS } from '../../src/modules/vehiculos/entities/vehiculo'
import { PRIMEROS_DE_RELACIONADOS } from '../../src/modules/vehiculos/entities/relacionados'
import { RPC_PAGINADAS_DE_LA_PAPELERA } from './paginas-en-la-base-papelera'
import { sumarListas } from './registros-de-carriles'

export type RpcPaginada = {
  rpc: string
  parametro: string
  // Lo que el código le pide (un valor de `shared/lib/paginacion.ts`): el máximo de la base no puede ser menor.
  pideElCodigo: number
  // Una lectura que pide a propósito más que el valor por defecto de la base (hasta su máximo), porque filtra después de leer: el defecto sigue siendo el de la otra
  // lectura de la misma RPC (la del registro sin esta marca) y el máximo de la base no puede ser menor que `pideElCodigo`.
  pideMasQueElDefecto?: true
  // Un selector que pide a propósito menos que el valor por defecto de la base (las primeras opciones; con más, se busca): el defecto sigue siendo el de la otra lectura de
  // la misma RPC (la del registro sin esta marca) y no puede ser menor que `pideElCodigo`.
  pideMenosQueElDefecto?: true
  // Qué lista es, para el mensaje de un fallo.
  lista: string
}

// Las del núcleo. Las de un área van en su archivo (`paginas-en-la-base-papelera.ts`, `areas-*/paginas-en-la-base.ts`) y se suman abajo.
export const RPC_PAGINADAS_DEL_NUCLEO: readonly RpcPaginada[] = [
  {
    // La sección lee la primera página en el servidor con `OPORTUNIDADES_VISIBLES_DEL_LEAD` (10) y «Ver más», desde el navegador, con `TAMANO_DE_VER_MAS` (esto):
    // los dos caben en el máximo de 100, que protege T4 de `supabase/tests/lead-oportunidades-pagina.sql` (`p_tamano` 1000 da 100), en `pnpm db:probar`.
    rpc: 'lead_oportunidades',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: '«Ver más» de oportunidades de un lead',
  },
  // «Relacionados» (T17): el resumen de un bloque trae las primeras `PRIMEROS_DE_RELACIONADOS` filas visibles de cada grupo (la base acota con `_acotar_pagina(…, 3, 5)`) y «Ver todos»
  // pide de a `TAMANO_DE_VER_MAS` (`_acotar_pagina(…, 20, 20)`, y la base trae una de más para saber si hay otra página).
  {
    rpc: 'vehiculo_relacionados',
    parametro: 'p_primeros',
    pideElCodigo: PRIMEROS_DE_RELACIONADOS,
    lista: 'relacionados de un vehículo, las primeras filas de cada grupo',
  },
  {
    rpc: 'lead_relacionados',
    parametro: 'p_primeros',
    pideElCodigo: PRIMEROS_DE_RELACIONADOS,
    lista: 'relacionados de un lead, las primeras filas de cada grupo',
  },
  {
    rpc: 'vehiculo_relacionados_pagina',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: '«Ver todos» de los relacionados de un vehículo',
  },
  {
    rpc: 'lead_relacionados_pagina',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: '«Ver todos» de los relacionados de un lead',
  },
  {
    rpc: 'lead_seguimientos',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: '«Ver más» de seguimientos',
  },
  {
    rpc: 'cotizacion_revisiones',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'panel de revisiones de una cotización',
  },
  {
    rpc: 'lead_recordatorios',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: '«Ver más» de recordatorios',
  },
  {
    // Configuración › Leads › Teléfonos extra: «Ver más» pide de a `TAMANO_DE_VER_MAS` (20); la primera página usa el defecto de la base.
    rpc: 'telefonos_extra_choques',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'choques de teléfonos extra de Configuración › Leads',
  },
  // La papelera pide `LOTES_POR_PAGINA + 1` (una fila de más para saber si hay otra página).
  {
    rpc: 'leads_papelera_listar',
    parametro: 'p_tope',
    pideElCodigo: LOTES_POR_PAGINA + 1,
    lista: 'papelera de leads',
  },
  {
    rpc: 'vehiculos_papelera_listar',
    parametro: 'p_tope',
    pideElCodigo: LOTES_POR_PAGINA + 1,
    lista: 'papelera de vehículos',
  },
  // Y de cada lote, los primeros (cierre 1): el resto llega con «Mostrar los N».
  {
    rpc: 'leads_papelera_listar',
    parametro: 'p_primeros',
    pideElCodigo: PRIMEROS_DEL_LOTE,
    lista: 'papelera de leads, los primeros de un lote',
  },
  {
    rpc: 'vehiculos_papelera_listar',
    parametro: 'p_primeros',
    pideElCodigo: PRIMEROS_DEL_LOTE,
    lista: 'papelera de vehículos, los primeros de un lote',
  },
  {
    rpc: 'embudo_tablero',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_COLUMNA,
    lista: 'kanban, cada columna',
  },
  {
    rpc: 'embudo_tablero',
    parametro: 'p_tope_total',
    pideElCodigo: TOPE_DE_LO_CARGADO,
    lista: 'kanban, total de una columna',
  },
  // La lista del equipo pide `TOPE_DEL_EQUIPO + 1` (una persona de más para saber si hay otras).
  {
    rpc: 'equipo_lista',
    parametro: 'p_limite',
    pideElCodigo: TOPE_DEL_EQUIPO + 1,
    lista: 'lista del equipo',
  },
  // «Ajustes por persona» de Configuración › Modo Live pide `TAMANO_DE_PERSONAS_DEL_LIVE + 1` (la primera página en el servidor y «Ver más» en el navegador).
  {
    rpc: 'live_personas',
    parametro: 'p_limite',
    pideElCodigo: TAMANO_DE_PERSONAS_DEL_LIVE + 1,
    lista: '«Ajustes por persona» del Modo Live',
  },
  {
    rpc: 'embudo_etapa_pagina',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_COLUMNA,
    lista: 'kanban, «Ver más»',
  },
  // El embudo filtrado por lead (`?lead=`): sus propias lecturas, con los mismos topes que el kanban.
  {
    rpc: 'embudo_tablero_del_lead',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_COLUMNA,
    lista: 'kanban de un lead, cada columna',
  },
  {
    rpc: 'embudo_tablero_del_lead',
    parametro: 'p_tope_total',
    pideElCodigo: TOPE_DE_LO_CARGADO,
    lista: 'kanban de un lead, total de una columna',
  },
  {
    rpc: 'embudo_etapa_pagina_del_lead',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_COLUMNA,
    lista: 'kanban de un lead, «Ver más»',
  },
  // La logística para cientos de miles de vehículos (6.03): el número de cada fase es un conteo con tope (`limit tope + 1`, `TOPE_DEL_CONTEO`), no una página; la lista de una fase lee
  // `TAMANO_DE_LA_FASE` por cursor `(fase_desde, id)`. La base acota las dos con `_acotar_pagina`.
  {
    rpc: 'logistica_cadena_resumen',
    parametro: 'p_tope',
    pideElCodigo: TOPE_DEL_CONTEO,
    lista: 'cadena de logística, el número de cada fase',
  },
  {
    rpc: 'logistica_cadena_columna',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_LA_FASE,
    lista: 'cadena de logística, la lista de una fase',
  },
  // «Dónde está» pide 10 (`TOPE_DE_DONDE_ESTA`, un literal de la infra); su máximo en la base lo acota `_acotar_pagina`.
  {
    rpc: 'logistica_donde_esta',
    parametro: 'p_tope',
    pideElCodigo: 10,
    lista: 'dónde está, de logística',
  },
  // El listado `/cotizaciones` (4.16-1): el selector de tamaño llega hasta su máximo medido, y sin pedido la base da ese.
  {
    rpc: 'cotizaciones_listado',
    parametro: 'p_tamano',
    pideElCodigo: MAXIMO_DE_PAGINA_DE_COTIZACIONES,
    lista: 'listado de cotizaciones',
  },
  // La lista de cotizaciones agrupada por vehículo (T319): grupos y sueltas con el mismo máximo del listado. Su lote (`_cotizaciones_lote_del_listado`) sólo lo llama
  // la base: no figura acá (`_acotar_pagina(p_tamano, 404, 2020)`, lo vigila `supabase/tests/escala.sql`).
  {
    rpc: 'cotizaciones_listado_por_vehiculo',
    parametro: 'p_tamano',
    pideElCodigo: MAXIMO_DE_PAGINA_DE_COTIZACIONES,
    lista: 'listado de cotizaciones agrupado por vehículo',
  },
  // «De este vehículo» (las otras cotizaciones del vehículo en una guardada o su resumen): de a 10, y la base acota a 100 (lo que se dibuja como mucho).
  {
    rpc: 'cotizaciones_de_este_vehiculo',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_ESTE_VEHICULO,
    lista: 'De este vehículo',
  },
  // La búsqueda del listado `/cotizaciones` (T15): el mismo tamaño y el mismo máximo que el listado, con su cursor.
  {
    rpc: 'cotizaciones_buscar',
    parametro: 'p_tamano',
    pideElCodigo: MAXIMO_DE_PAGINA_DE_COTIZACIONES,
    lista: 'búsqueda del listado de cotizaciones',
  },
  // El inventario de quien ve «propios» (4.16-2b): la pantalla pide su tamaño de página (hasta 100) y sin pedido la base da 100.
  {
    rpc: 'vehiculos_inventario',
    parametro: 'p_tamano',
    pideElCodigo: MAXIMO_DE_PAGINA_DE_VEHICULOS,
    lista: 'inventario de vehículos de quien ve «propios»',
  },
]

export const RPC_PAGINADAS: readonly RpcPaginada[] = [
  ...RPC_PAGINADAS_DEL_NUCLEO,
  ...RPC_PAGINADAS_DE_LA_PAPELERA,
  ...sumarListas<RpcPaginada>(import.meta.glob('./areas-*/paginas-en-la-base.ts', { eager: true })),
]

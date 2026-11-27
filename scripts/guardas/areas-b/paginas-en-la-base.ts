// Parte del registro de RPC con tamaño de página: los pendientes de la agenda («Sin fecha», vencidas y recordatorios), las secciones del buscador (7.12-2) los embarques y contenedores de logística y el tablero de la cola web (8.04-2). La guarda
// (`paginas-en-la-base.ts`) suma esta parte a `RPC_PAGINADAS` con `import.meta.glob('./areas-*/paginas-en-la-base.ts')` (`registros-de-carriles.ts`).
import { CANDIDATOS_PARA_ELEGIR, POR_SECCION } from '../../../src/modules/buscador/entities/ranking'
import { TOPE_PARA_ELEGIR } from '../../../src/modules/logistica/entities/transporte/filtros-de-embarques'
import {
  TAMANO_DE_PAGINA_POR_DEFECTO,
  TAMANO_DE_VER_MAS,
  TOPE_DEL_EQUIPO,
} from '../../../src/shared/lib/paginacion'
import type { RpcPaginada } from '../paginas-en-la-base'

export const REGISTRO: readonly RpcPaginada[] = [
  // De a `TAMANO_DE_VER_MAS` tareas, por cursor `(creado_en, id)` («Ver más», hasta `TOPE_DE_LO_CARGADO`); la base acota con `_acotar_pagina(…, 20, 50)`.
  {
    rpc: 'agenda_tareas_sin_fecha',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'grupo «Sin fecha» de los pendientes de la agenda, «Ver más»',
  },
  // De a `TAMANO_DE_VER_MAS` por grupo («vencidas» por `(vence_en, id)`, «recordatorios» por `(recordar_en, id)`), «Ver más» hasta
  // `TOPE_DE_LO_CARGADO`; la base acota con `_acotar_pagina(…, 20, 50)`.
  {
    rpc: 'agenda_pendientes',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'pendientes de la agenda (vencidas y recordatorios), «Ver más»',
  },
  // `_acotar_pagina(p_tamano, 5, 20)` en las tres: el defecto es `POR_SECCION` y el máximo deja a 7.10 pedir más sin migración.
  {
    rpc: 'buscador_leads',
    parametro: 'p_tamano',
    pideElCodigo: POR_SECCION,
    lista: 'buscador, sección leads',
  },
  // «Nuevo» de la barra, segundo paso: los candidatos hasta el máximo (20) y, de ellos, los de la cartera.
  {
    rpc: 'buscador_leads',
    parametro: 'p_tamano',
    pideElCodigo: CANDIDATOS_PARA_ELEGIR,
    pideMasQueElDefecto: true,
    lista: 'buscador, elegir un lead de la cartera (Nuevo › seguimiento o recordatorio)',
  },
  {
    rpc: 'buscador_vehiculos',
    parametro: 'p_tamano',
    pideElCodigo: POR_SECCION,
    lista: 'buscador, sección vehículos',
  },
  {
    rpc: 'buscador_cotizaciones',
    parametro: 'p_tamano',
    pideElCodigo: POR_SECCION,
    lista: 'buscador, sección cotizaciones',
  },
  // Los embarques y los contenedores de un origen en `/logistica/embarques`, por cursor (el id del último); la base acota con
  // `_acotar_pagina(p_tope, 50, 100)` y recorre a lo sumo 500 filas por llamada.
  {
    rpc: 'embarques_listar',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_PAGINA_POR_DEFECTO,
    lista: 'embarques de un origen en /logistica/embarques',
  },
  {
    rpc: 'contenedores_listar',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_PAGINA_POR_DEFECTO,
    lista: 'contenedores de un origen en /logistica/embarques?grupo=contenedores',
  },
  // Los selectores de los formularios: «Elegir uno sin embarque» de «Agregar contenedor» y «Embarque» de un contenedor, de a `TOPE_PARA_ELEGIR`; con más, se busca por prefijo.
  {
    rpc: 'contenedores_listar',
    parametro: 'p_tope',
    pideElCodigo: TOPE_PARA_ELEGIR,
    pideMenosQueElDefecto: true,
    lista: 'contenedores sin embarque para sumar a un embarque',
  },
  {
    rpc: 'embarques_listar',
    parametro: 'p_tope',
    pideElCodigo: TOPE_PARA_ELEGIR,
    pideMenosQueElDefecto: true,
    lista: 'embarques del origen para asignar un contenedor',
  },
  // Las habilitadas de la cola web (8.04-2): tabla de configuración, a lo sumo el equipo; la base acota con `_acotar_pagina(p_tope, 100, 200)`.
  {
    rpc: 'cola_web_tablero',
    parametro: 'p_tope',
    pideElCodigo: TOPE_DEL_EQUIPO,
    lista: 'tablero de la cola web (/configuracion/cola-web)',
  },
  // «Sin asignar» de la cola web (8.04-2), de a `TAMANO_DE_VER_MAS` por cursor `(creado_en, id)` hasta `TOPE_DE_LO_CARGADO`; `_acotar_pagina(p_tamano, 20, 50)`.
  {
    rpc: 'cola_web_solicitudes',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'sin asignar de la cola web, «Ver más»',
  },
]

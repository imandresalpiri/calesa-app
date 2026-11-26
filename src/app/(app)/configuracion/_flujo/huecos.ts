import {
  AccionesDeFila,
  AccionesDeLaLista,
  AccionesDelPanel,
  EmpezarElFlujo,
  PestanasDeLaFase,
  ProveedorDeOrden,
  ProveedorDelDiagramaDeFases,
  ReglasDeLaFase,
} from '@/modules/flujos/pantallas/fases'
import type { HuecosDelFlujo } from '@/modules/flujos/pantallas/configuracion'
import { BloqueDeRequisitos } from '@/modules/flujos/pantallas/requisitos'
import { FranjaDeRevisar, ProveedorDeRevisar } from '@/modules/flujos/pantallas/revisar'
import {
  BloqueDeSalidas,
  ProveedorDeSalidasDelDiagrama,
  SalidasDeLaFila,
} from '@/modules/flujos/pantallas/transiciones'

// Lo que cada área de `flujos` pone en el editor del flujo (`HuecosDelFlujo`): «Revisar» (su lectura única y la franja), el orden de las fases, lo que el
// diagrama escribe (posiciones y fase nueva; salidas), la barra,
// el vacío de un flujo sin fases (cómo empezarlo), el «⋯» y las salidas de cada fila de la lista, y el panel de una fase (su «⋯» y sus tres pestañas). Son componentes
// de cliente.
export const HUECOS_DE_FLUJOS: HuecosDelFlujo = {
  proveedorDeRevisar: ProveedorDeRevisar,
  franjaDeRevisar: FranjaDeRevisar,
  ordenDeFases: ProveedorDeOrden,
  diagramaDeFases: ProveedorDelDiagramaDeFases,
  salidasDelDiagrama: ProveedorDeSalidasDelDiagrama,
  accionesDeLaLista: AccionesDeLaLista,
  sinFases: EmpezarElFlujo,
  accionesDeFila: AccionesDeFila,
  salidasDeFila: SalidasDeLaFila,
  bloques: {
    acciones: AccionesDelPanel,
    pestanas: PestanasDeLaFase,
    requisitos: BloqueDeRequisitos,
    salidas: BloqueDeSalidas,
    reglas: ReglasDeLaFase,
  },
}

// En lectura (quien sólo gestiona los catálogos de logística del origen) no se pone ningún hueco: el núcleo dibuja el diagrama y la lista sin escribir nada,
// y el panel de una fase la muestra sin pestañas de edición.
export const HUECOS_DE_LECTURA: HuecosDelFlujo = {}

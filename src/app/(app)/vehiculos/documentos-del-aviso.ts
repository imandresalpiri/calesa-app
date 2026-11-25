import { rutaDeLaUnidad } from '@/modules/logistica'
import { MARCADOR_DE_VEHICULO } from '@/modules/vehiculos'

// «Ver los documentos» de un aviso de un vehículo: la unidad de logística con sus documentos abiertos, como plantilla por vehículo (`vehiculos` no
// conoce `logistica`). La usan la lista y la ficha.
export const DOCUMENTOS_DEL_AVISO = rutaDeLaUnidad(MARCADOR_DE_VEHICULO, 'documentos')

import type { ClaveDePaso, PasoParaCotizar } from '@/modules/origenes'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS, rutaDeParteDelOrigen, rutaDelOrigen, type ParteDelOrigen } from '@/shared/lib/rutas'
import { MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR, MOTIVO_SIN_CONFIGURAR_EL_FLUJO } from './pestanas'

// A dónde lleva cada paso de «Para cotizar y mover» (el inicio de Configuración): a la pestaña del origen donde se arregla, con el permiso que pide en ese
// origen. El Flujo, a Fases; la Fórmula, a la Planilla y la Tarjeta, a la suya (las dos con la fórmula de trabajo); Datos, al drawer de los datos
// (`?panel=datos`). Datos con aviso (un origen de subasta sin apibara) lleva a Empresa › Integraciones, que es donde se activa: los datos no la encienden.
export type PasoConDestino = PasoParaCotizar & {
  ruta: string
  // Sin el permiso, el paso se dice sin enlace y con este motivo.
  motivo: string | null
}

type Destino = { ruta: (origenId: string) => string; permiso: ClavePermiso | null; motivo: string }

const A_LA_PESTANA = (parte: ParteDelOrigen) => (origenId: string) =>
  rutaDeParteDelOrigen(origenId, parte)

export const DESTINOS_DE_PASO: Record<ClaveDePaso, Destino> = {
  datos: {
    ruta: (origenId) => rutaDelOrigen(origenId, { panel: 'datos' }),
    permiso: null,
    motivo: '',
  },
  campos: { ruta: A_LA_PESTANA('campos'), permiso: null, motivo: '' },
  flujo: {
    ruta: A_LA_PESTANA('fases'),
    permiso: 'flujos.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_FLUJO,
  },
  formula: {
    ruta: A_LA_PESTANA('planilla'),
    permiso: 'cotizaciones.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
  tarjeta: {
    ruta: A_LA_PESTANA('tarjeta'),
    permiso: 'cotizaciones.configurar',
    motivo: MOTIVO_SIN_CONFIGURAR_EL_COTIZADOR,
  },
}

const APIBARA: Destino = {
  ruta: () => RUTAS.integracionesDeEmpresa,
  permiso: 'empresa.ajustes.gestionar',
  motivo: 'La activa quien tiene el permiso «Ajustes de la empresa».',
}

export function destinoDelPaso(paso: PasoParaCotizar): Destino {
  return paso.clave === 'datos' && paso.estado !== 'listo' ? APIBARA : DESTINOS_DE_PASO[paso.clave]
}

// Los pasos con su enlace, mirando el permiso en este origen (el de apibara es de la empresa).
export function conDestino(
  pasos: readonly PasoParaCotizar[],
  permisos: Permisos,
  origenId: string,
): PasoConDestino[] {
  return pasos.map((paso) => {
    const destino = destinoDelPaso(paso)
    const enEsteOrigen = destino === APIBARA ? null : origenId
    const abre = destino.permiso === null || puede(permisos, destino.permiso, enEsteOrigen)
    return { ...paso, ruta: destino.ruta(origenId), motivo: abre ? null : destino.motivo }
  })
}

// La pestaña donde se arregla cada paso, para el ⚠ de la barra de pestañas. Datos no tiene pestaña (su aviso, el de apibara, se arregla en Integraciones).
const PESTANA_DEL_PASO: Record<ClaveDePaso, ParteDelOrigen | null> = {
  datos: null,
  campos: 'campos',
  flujo: 'fases',
  formula: 'planilla',
  tarjeta: 'tarjeta',
}

// Lo que le falta a cada pestaña, con la frase del paso (`pasosQueFaltan()`: un origen inactivo no tiene faltas). Sin falta, la pestaña no está.
export function faltaDeCadaPestana(
  faltan: readonly PasoParaCotizar[],
): Partial<Record<ParteDelOrigen, string>> {
  const faltas: Partial<Record<ParteDelOrigen, string>> = {}
  for (const paso of faltan) {
    const pestana = PESTANA_DEL_PASO[paso.clave]
    if (pestana !== null && paso.estado !== 'listo') {
      faltas[pestana] = paso.frase
    }
  }
  return faltas
}

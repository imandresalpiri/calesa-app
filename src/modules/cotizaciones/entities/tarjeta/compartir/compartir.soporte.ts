// Datos de prueba de «Compartir la cotización» (sólo para las pruebas: el sufijo `.soporte.` lo deja fuera del mapa).
import type { DatosParaCompartir } from './datos-para-compartir'

export const DATOS_DE_PRUEBA = {
  numero: 12,
  titulo: { texto: 'Hilux para Juan', fuente: 'titulo' },
  autor: 'Ana Pérez',
  asesor: { nombre: 'Luis Rojas', cargo: 'Asesor comercial', telefono: '+59170000002' },
  vehiculo: {
    titulo: 'Toyota Hilux 2022',
    lote: '4455',
    anio: 2022,
    kilometraje: 45000,
    vin: '1HGCM82633A004352',
    enlace: 'https://www.copart.com/lot/4455',
    // Jueves 19 de noviembre de 2026, 22:00 en Chicago (UTC-6) = viernes 20, 00:00 en La Paz (UTC-4).
    cierre: '2026-11-20T04:00:00.000Z',
    zonaDelPatio: 'America/Chicago',
    hayFotos: true,
  },
  conceptos: [
    {
      concepto: 'Remate',
      monto: '$ 1.000,00',
      segunda: null,
      montoSinMoneda: '1.000,00',
      segundaSinMoneda: null,
    },
    {
      concepto: null,
      monto: '$ 300,00',
      segunda: null,
      montoSinMoneda: '300,00',
      segundaSinMoneda: null,
    },
  ],
  total: {
    concepto: 'TOTAL',
    monto: '$ 1.300,00',
    segunda: 'Bs 9.048,00',
    montoSinMoneda: '1.300,00',
    segundaSinMoneda: '9.048,00',
  },
  modo: 'Oficial',
  zonaDeLaEmpresa: 'America/La_Paz',
  locale: 'es-BO',
} as const satisfies DatosParaCompartir

// Antes del cierre de `DATOS_DE_PRUEBA`.
export const ANTES_DEL_CIERRE = '2026-11-18T12:00:00.000Z'

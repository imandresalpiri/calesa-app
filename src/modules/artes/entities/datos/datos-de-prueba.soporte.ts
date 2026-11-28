// Datos, catálogos y capas de prueba para los tests de los elementos con datos del arte (el sufijo `.soporte.` lo deja fuera del mapa).
import type { CapaDe, CapaDeArte, PaginaDeArte } from '../documento'
import type { DatosDelArte, EmpresaDelArte, TipoDeOrigenDelArte } from './tipos'
import { variablesDelArte, type CampoDelArte, type CatalogoDelArte } from './variables-del-arte'

export const VEHICULO_ID = '11111111-1111-4111-8111-111111111111'
export const FOTO_1 = '22222222-2222-4222-8222-222222222221'
export const FOTO_2 = '22222222-2222-4222-8222-222222222222'
export const COTIZACION_ID = '33333333-3333-4333-8333-333333333333'
export const IMAGEN_ID = '44444444-4444-4444-8444-444444444444'

export const EMPRESA: EmpresaDelArte = {
  nombre: 'Calesa Motors',
  web: 'calesa.bo',
  redes: { instagram: '@calesa' },
  zona: 'America/La_Paz',
  locale: 'es-BO',
}

// «Motor» activo, «Tracción» apagado y uno activo que repite una fija (`vin`).
export const CAMPOS: readonly CampoDelArte[] = [
  { clave: 'motor', etiqueta: 'Motor', activo: true },
  { clave: 'traccion', etiqueta: 'Tracción', activo: false },
  { clave: 'vin', etiqueta: 'VIN de la ficha', activo: true },
]

export function catalogoDe(tipo: TipoDeOrigenDelArte = 'subasta'): CatalogoDelArte {
  return variablesDelArte({ tipo, campos: CAMPOS })
}

// Un vehículo elegido, con su cotización y su lead: todo real.
export function datosReales(cambios: Partial<DatosDelArte> = {}): DatosDelArte {
  return {
    deEjemplo: false,
    vehiculo: {
      id: VEHICULO_ID,
      titulo: 'Nissan Frontier 2019',
      marca: 'Nissan',
      modelo: 'Frontier',
      anio: 2019,
      color: 'Gris',
      kilometraje: 48200,
      vin: '3N6AD33A0KK800000',
      lote: '5678',
      ubicacion: 'Dallas, TX',
      enlace: 'https://subastas.example.com/lote/5678',
      origen: 'Copart',
      cierre: '2026-11-19T19:30:00.000Z',
      zonaDelPatio: 'America/Chicago',
      ficha: { motor: '2.5 L diésel' },
      fotos: [
        { id: FOTO_1, ancho: 1600, alto: 1200 },
        { id: FOTO_2, ancho: 1200, alto: 1600 },
      ],
    },
    cotizacion: {
      id: COTIZACION_ID,
      numero: 128,
      total: { conMoneda: 'USD 21.300,00', sinMoneda: '21.300,00' },
      modo: 'Paralelo',
      venceEl: '2026-12-05',
      celdas: { Flete: { conMoneda: 'USD 1.800,00', sinMoneda: '1.800,00' } },
      imagen: {
        src: `/cotizaciones/${COTIZACION_ID}/imagen`,
        srcSinMoneda: `/cotizaciones/${COTIZACION_ID}/imagen?sin-moneda=1`,
      },
    },
    lead: { nombre: 'Lucía Paz' },
    asesor: { nombre: 'Teo Vargas', cargo: 'Asesor comercial', whatsapp: '+591 71111111' },
    empresa: EMPRESA,
    ...cambios,
  }
}

const BASE = {
  nombre: null,
  grupoId: null,
  x: 0,
  y: 0,
  ancho: 100,
  alto: 100,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
  sombra: null,
}
const SIN_MARCO = { radio: 0, borde: null, grosor: 0 }

export function capaDeTexto(id: string, texto: string): CapaDe<'texto'> {
  return {
    ...BASE,
    id,
    tipo: 'texto',
    texto,
    fuente: 'Inter',
    tamano: 48,
    peso: 400,
    interlineado: 1.2,
    color: '#111111',
    alineacion: 'izquierda',
    borde: null,
    grosor: 0,
  }
}

export function capaDeFoto(id: string, indice: number): CapaDe<'foto'> {
  return {
    ...BASE,
    ...SIN_MARCO,
    id,
    tipo: 'foto',
    indice,
    ajuste: 'cubrir',
    foco: { x: 0.5, y: 0.5 },
  }
}

export function capaDeTarjeta(id: string): CapaDe<'tarjeta'> {
  return { ...BASE, ...SIN_MARCO, id, tipo: 'tarjeta' }
}

export function capaDeLogo(id: string, varianteId: string | null): CapaDe<'logo'> {
  return { ...BASE, ...SIN_MARCO, id, tipo: 'logo', varianteId }
}

export function capaDeImagen(id: string, imagenId = IMAGEN_ID): CapaDe<'imagen'> {
  return { ...BASE, ...SIN_MARCO, id, tipo: 'imagen', imagenId, ajuste: 'cubrir' }
}

export function capaDeForma(id: string): CapaDe<'forma'> {
  return {
    ...BASE,
    id,
    tipo: 'forma',
    forma: 'rectangulo',
    lados: null,
    relleno: '#000000',
    borde: null,
    grosor: 0,
    radio: 0,
  }
}

export function paginaCon(capas: CapaDeArte[], grupos: PaginaDeArte['grupos'] = []): PaginaDeArte {
  return { id: 'p', fondo: { tipo: 'color', color: '#ffffff' }, capas, grupos }
}

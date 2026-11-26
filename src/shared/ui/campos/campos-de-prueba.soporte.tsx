// Lo que comparten las pruebas del editor de campos: un campo, un módulo con un texto propio en el hueco y unas ediciones que salen bien.
import { vi } from 'vitest'
import type { CampoBase } from '@/shared/lib/campos'
import { ok } from '@/shared/lib/errores'
import { Campo } from '@/shared/ui/campo'
import type { ConfiguracionDeCampos, EdicionesDeCampos, GruposDelEditor } from './tipos'

export type Cambios = { etiqueta?: string }
export type Nuevo = { etiqueta: string }

export const CAMPO: CampoBase = {
  id: 'c1',
  clave: 'color',
  etiqueta: 'Color',
  tipo: 'texto',
  opciones: [],
  requerido: false,
  valorDefecto: null,
  minimo: null,
  maximo: null,
  grupoId: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
  grupo: 'Datos',
  ordenDelGrupo: 10,
  orden: 1,
  esSistema: false,
  activo: true,
  actualizadoEn: 'v1',
}

// Un módulo con un texto propio en el hueco, como los de leads y de orígenes.
export const configuracion: ConfiguracionDeCampos<CampoBase, Cambios, Nuevo> = {
  textos: {
    titulo: 'Campos',
    vacioTitulo: '',
    vacioDescripcion: '',
    motivoSinPermiso: 'Sin permiso.',
    panelNuevo: 'Campo nuevo',
    panelDescripcionNuevo: '',
    panelDescripcionExistente: '',
    claveDuplicada: 'Repetido.',
    borrador: 'prueba-campo',
  },
  banderas: [],
  tipos: ['texto'],
  textosLibres: ['nota'],
  valoresIniciales: (campo) => ({
    etiqueta: campo?.etiqueta ?? '',
    clave: campo?.clave ?? '',
    tipo: campo?.tipo ?? 'texto',
    opciones: [],
    grupoId: campo?.grupoId ?? null,
    activo: true,
    valorDefecto: null,
    minimo: null,
    maximo: null,
    banderas: {},
    textos: { nota: 'Una nota' },
  }),
  claveDe: (etiqueta) => etiqueta.toLowerCase(),
  paraCrear: (valores) => ({ etiqueta: valores.etiqueta.trim() }),
  cambiosDe: (campo, valores) =>
    valores.etiqueta.trim() === campo.etiqueta ? {} : { etiqueta: valores.etiqueta.trim() },
  necesitaVistaPrevia: () => false,
  resumenDeImpacto: () => ({ bloquea: false, avisos: [] }),
  resumenDeEliminacion: () => ({ bloquea: false, avisos: [] }),
  hueco: ({ valores, cambiarTexto }) => (
    <Campo
      nombre="nota"
      etiqueta="Nota"
      value={valores.textos['nota'] ?? ''}
      onChange={(evento) => {
        cambiarTexto('nota', evento.target.value)
      }}
    />
  ),
}

export function ediciones(parcial: Partial<EdicionesDeCampos<Cambios, Nuevo>> = {}) {
  const listo = () => Promise.resolve(ok(undefined))
  const edicion: EdicionesDeCampos<Cambios, Nuevo> = {
    crear: vi.fn(listo),
    guardar: vi.fn(listo),
    cambiarActivo: vi.fn(listo),
    mover: vi.fn(listo),
    eliminar: vi.fn(listo),
    vistaPrevia: vi.fn(() =>
      Promise.resolve(
        ok({ total: 0, conValor: 0, sinValor: 0, porOpcion: {}, fueraDeRango: null }),
      ),
    ),
    enCurso: false,
    errores: { crear: undefined },
  }
  return { ...edicion, ...parcial }
}

// El catálogo de grupos del editor: vacío y con permiso para crear; `crear` devuelve el grupo con ese nombre.
export function grupos(parcial: Partial<GruposDelEditor> = {}): GruposDelEditor {
  return {
    lista: [],
    hayMas: false,
    puedeCrear: true,
    crear: vi.fn((nombre: string) =>
      Promise.resolve(
        ok({
          id: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2f',
          nombre,
          orden: 10,
          activo: true,
          actualizadoEn: 'v1',
        }),
      ),
    ),
    ...parcial,
  }
}

import { describe, expect, it } from 'vitest'
import {
  MOTIVO_DE_OTRA_PERSONA,
  MOTIVO_SIN_GESTIONAR,
  puedeCambiarLaVisibilidad,
  puedeEditarLaPlantilla,
  puedeEliminarLaPlantilla,
  puedeGestionarLaImagen,
  puedeSubirALaEmpresa,
  type Permiso,
} from './permisos-de-artes'
import type { VisibilidadDeArte } from './tipos'

const YO = 'yo'
const OTRA = 'otra'
const SI: Permiso = { ok: true }
const SIN_GESTIONAR: Permiso = { ok: false, motivo: MOTIVO_SIN_GESTIONAR }
const DE_OTRA: Permiso = { ok: false, motivo: MOTIVO_DE_OTRA_PERSONA }

type Caso = [autor: string, visibilidad: VisibilidadDeArte, gestiona: boolean]

const casos: [Caso, editar: Permiso, visibilidad: Permiso][] = [
  [[YO, 'privada', false], SI, SIN_GESTIONAR],
  [[YO, 'privada', true], SI, SI],
  [[YO, 'empresa', false], SIN_GESTIONAR, SIN_GESTIONAR],
  [[YO, 'empresa', true], SI, SI],
  [[OTRA, 'privada', false], DE_OTRA, SIN_GESTIONAR],
  [[OTRA, 'privada', true], DE_OTRA, DE_OTRA],
  [[OTRA, 'empresa', false], SIN_GESTIONAR, SIN_GESTIONAR],
  [[OTRA, 'empresa', true], SI, SI],
]

describe('permisos de una plantilla de arte', () => {
  it.each(casos)('autor %j', ([autorId, visibilidad, gestiona], editar, cambiarVisibilidad) => {
    const quien = { yo: YO, gestiona }
    const plantilla = { autorId, visibilidad }
    expect(puedeEditarLaPlantilla(quien, plantilla)).toEqual(editar)
    expect(puedeEliminarLaPlantilla(quien, plantilla)).toEqual(editar)
    expect(puedeCambiarLaVisibilidad(quien, plantilla)).toEqual(cambiarVisibilidad)
  })
})

describe('permisos de la biblioteca de imágenes', () => {
  it('subir a la empresa pide gestionar', () => {
    expect(puedeSubirALaEmpresa({ yo: YO, gestiona: true })).toEqual(SI)
    expect(puedeSubirALaEmpresa({ yo: YO, gestiona: false })).toEqual(SIN_GESTIONAR)
  })

  it('la personal, su dueño; la de la empresa, quien gestiona', () => {
    const mia = { ambito: 'personal' as const, duenoId: YO }
    const ajena = { ambito: 'personal' as const, duenoId: OTRA }
    const deLaEmpresa = { ambito: 'empresa' as const, duenoId: null }
    expect(puedeGestionarLaImagen({ yo: YO, gestiona: false }, mia)).toEqual(SI)
    expect(puedeGestionarLaImagen({ yo: YO, gestiona: true }, ajena)).toEqual(DE_OTRA)
    expect(puedeGestionarLaImagen({ yo: YO, gestiona: false }, deLaEmpresa)).toEqual(SIN_GESTIONAR)
    expect(puedeGestionarLaImagen({ yo: YO, gestiona: true }, deLaEmpresa)).toEqual(SI)
  })
})

'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { accionesConOrden } from '@/shared/ui/lista-de-catalogo/acciones-de-orden'
import { useRegional } from '@/shared/ui/regional'
import type { CambioDeAtajo, DireccionDelAtajo } from '../../../entities/asistente-ia/atajos'
import {
  LARGO_MAXIMO_INSTRUCCION,
  LARGO_MAXIMO_NOMBRE_DE_ATAJO,
  type AtajoDelAsistente,
} from '../../../entities/asistente-ia/config'
import { claveDelCampoDelAtajo } from '../schemas/asistente'
import { CampoDeTextoLargo } from './campo-de-texto-largo'

export const PREFIJO_DE_ATAJOS = 'atajo'

type Props = {
  atajo: AtajoDelAsistente
  puedeSubir: boolean
  puedeBajar: boolean
  // El recién sumado: su nombre recibe el foco.
  nuevo: boolean
  errores: Record<string, string>
  deshabilitado: boolean
  alCambiar: (cambio: CambioDeAtajo) => void
  alMover: (direccion: DireccionDelAtajo) => void
  alQuitar: () => void
}

// Un atajo del asistente: su nombre (el botón al compartir), su instrucción y si se ofrece; en su «⋯», Subir, Bajar y Quitar.
export function FilaDeAtajo(props: Props) {
  const { atajo, errores, deshabilitado, alCambiar } = props
  const { locale } = useRegional()
  const id = `${PREFIJO_DE_ATAJOS}-${atajo.id}`
  const acciones: AccionDeMenu[] = [
    ...accionesConOrden(
      {
        id: atajo.id,
        nombre: atajo.nombre,
        icono: null,
        activo: atajo.activo,
        insignias: [],
        uso: '',
        acciones: [],
        puedeSubir: props.puedeSubir && !deshabilitado,
        puedeBajar: props.puedeBajar && !deshabilitado,
      },
      props.alMover,
    ),
    {
      tipo: 'accion',
      clave: 'quitar',
      etiqueta: 'Quitar',
      destructiva: true,
      deshabilitada: deshabilitado,
      alElegir: props.alQuitar,
    },
  ]
  return (
    <li className="grid min-w-0 gap-3 rounded-(--radius-md) border border-(--color-line) p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <Campo
          nombre={`${id}-nombre`}
          etiqueta="Nombre"
          value={atajo.nombre}
          autoComplete="off"
          autoFocus={props.nuevo}
          disabled={deshabilitado}
          error={errores[claveDelCampoDelAtajo(atajo.id, 'nombre')]}
          ayuda={`${formatearNumero(atajo.nombre.trim().length, { locale, decimales: 0 })} de ${String(LARGO_MAXIMO_NOMBRE_DE_ATAJO)}`}
          onChange={(evento) => {
            alCambiar({ nombre: evento.target.value })
          }}
        />
        <div className="pt-6">
          <MasAcciones
            nombre={`atajo ${atajo.nombre.trim() || 'sin nombre'}`}
            id={`${id}-mas`}
            acciones={acciones}
          />
        </div>
      </div>
      <CampoDeTextoLargo
        nombre={`${id}-instruccion`}
        etiqueta="Instrucción"
        value={atajo.instruccion}
        largoMaximo={LARGO_MAXIMO_INSTRUCCION}
        disabled={deshabilitado}
        error={errores[claveDelCampoDelAtajo(atajo.id, 'instruccion')]}
        onChange={(evento) => {
          alCambiar({ instruccion: evento.target.value })
        }}
      />
      <Interruptor
        titulo="Activo"
        ayuda={atajo.activo ? 'Se ofrece al compartir.' : 'No se ofrece al compartir.'}
        valor={atajo.activo}
        alCambiar={(activo) => {
          alCambiar({ activo })
        }}
        deshabilitado={deshabilitado}
      />
    </li>
  )
}

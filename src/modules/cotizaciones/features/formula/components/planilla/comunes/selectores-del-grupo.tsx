'use client'

import type { ComponentType } from 'react'
import { Button } from '@/shared/ui/button'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { OpcionDeTipoDeCambio } from '../../../../../entities/formula/buckets'
import type { CampoDelGrupo } from '../../../../../entities/formula/grupos'
import type { ColorCreado, PropsDelNuevoColor } from '../../../../../entities/nuevo-color'
import type { EstadoDeLosTonos } from '../../../hooks/use-tonos'
import { NuevoColorDelGrupo } from './nuevo-color-del-grupo'

function opcionesDeTono(tonos: EstadoDeLosTonos, actual: string) {
  if (tonos.tipo === 'leyendo') return [{ valor: actual, etiqueta: 'Cargando los colores…' }]
  if (tonos.tipo === 'error') return [{ valor: actual, etiqueta: actual }]
  const opciones = tonos.tonos.map((t) => ({ valor: t.clave, etiqueta: t.nombre }))
  // Un tono que ya no está en el catálogo se ve por su clave y no deja aplicar hasta elegir otro.
  return tonos.claves.has(actual) ? opciones : [{ valor: actual, etiqueta: actual }, ...opciones]
}

export function EstadoDeLosTonosDelFormulario({
  tonos,
  alReintentar,
}: {
  tonos: EstadoDeLosTonos
  alReintentar: () => void
}) {
  if (tonos.tipo === 'listo') return null
  if (tonos.tipo === 'leyendo') {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Esperando los tonos de la empresa.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-peligro-ink)">
      <p role="alert">No se pudieron leer los colores de la empresa.</p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        onClick={alReintentar}
      >
        Reintentar
      </Button>
    </div>
  )
}

// El color y el tipo de cambio de una banda. Con `NuevoColor` (sólo con `cotizaciones.configurar`), «+ Nuevo color» bajo el color crea uno y lo deja elegido.
export function SelectoresDelGrupo(p: {
  uid: string
  tono: string
  tipoDeCambio: string
  tonos: EstadoDeLosTonos
  tiposDeCambio: readonly OpcionDeTipoDeCambio[]
  conModos: boolean
  deError: (campo: CampoDelGrupo) => string | undefined
  alCambiarTono: (tono: string) => void
  alCambiarTipoDeCambio: (id: string) => void
  NuevoColor: ComponentType<PropsDelNuevoColor> | null
  alCrearColor: (color: ColorCreado) => void
}) {
  return (
    <>
      <CampoSeleccion
        nombre={`${p.uid}-tono`}
        etiqueta="Color"
        opciones={opcionesDeTono(p.tonos, p.tono)}
        value={p.tono}
        disabled={p.tonos.tipo !== 'listo'}
        error={p.deError('tono')}
        ayuda="La tarjeta usa el color que elija su plantilla, si elige uno."
        onChange={(evento) => {
          p.alCambiarTono(evento.target.value)
        }}
      />
      {p.NuevoColor === null ? null : (
        <NuevoColorDelGrupo
          NuevoColor={p.NuevoColor}
          tonos={p.tonos}
          idDelSelector={`${p.uid}-tono`}
          alCrear={(color) => {
            p.alCrearColor(color)
            p.alCambiarTono(color.clave)
          }}
        />
      )}
      <CampoSeleccion
        nombre={`${p.uid}-tipo_de_cambio`}
        etiqueta="Tipo de cambio"
        opciones={p.tiposDeCambio.map((o) => ({
          valor: o.id,
          etiqueta: `${o.etiqueta} (${o.clave})`,
          ...(o.motivo === null ? {} : { deshabilitada: true }),
        }))}
        value={p.tipoDeCambio}
        error={p.deError('tipo_de_cambio')}
        ayuda={
          p.conModos ? 'En la hoja, cada modo elige el tipo de cambio de cada banda.' : undefined
        }
        onChange={(evento) => {
          p.alCambiarTipoDeCambio(evento.target.value)
        }}
      />
    </>
  )
}

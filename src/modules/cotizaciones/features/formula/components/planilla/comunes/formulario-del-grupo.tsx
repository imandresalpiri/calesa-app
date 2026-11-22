'use client'

import { useEffect, useId, useState, type ComponentType } from 'react'
import { Campo } from '@/shared/ui/campo'
import type { Grupo } from '../../../../../entities/formula'
import type { OpcionDeTipoDeCambio } from '../../../../../entities/formula/buckets'
import type {
  CambiosDelGrupo,
  CampoDelGrupo,
  ContextoDelGrupo,
  ErrorDelGrupo,
} from '../../../../../entities/formula/grupos'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { useMiembrosDelGrupo } from '../../../hooks/use-miembros-del-grupo'
import type { EstadoDeLosTonos } from '../../../hooks/use-tonos'
import type { ColorCreado, PropsDelNuevoColor } from '../../../../../entities/nuevo-color'
import { EstadoDeLosTonosDelFormulario, SelectoresDelGrupo } from './selectores-del-grupo'
import { FilasDelGrupo, type FilaCandidata, type FilaDelGrupo } from './filas-del-grupo'

type Props = {
  grupo: Grupo
  // Sus filas al abrir y todas las que pueden sumar, en el orden de la fórmula.
  miembros: readonly FilaDelGrupo[]
  candidatas: readonly FilaCandidata[]
  errores: readonly ErrorDelGrupo[]
  tonos: EstadoDeLosTonos
  tiposDeCambio: readonly OpcionDeTipoDeCambio[]
  // El diseño de la versión leída tiene modos de tipo de cambio: la hoja usa los del modo.
  conModos: boolean
  alAplicar: (cambios: CambiosDelGrupo, contexto: ContextoDelGrupo) => void
  alCancelar: () => void
  alReintentarTonos: () => void
  // «+ Nuevo color» (área `diseno`, por el hueco); nulo sin `cotizaciones.configurar`. Lo creado se suma al catálogo leído.
  NuevoColor: ComponentType<PropsDelNuevoColor> | null
  alCrearColor: (color: ColorCreado) => void
  // «Crear banda» al crearla.
  etiquetaDeAplicar?: string
}

const ORDEN: CampoDelGrupo[] = ['etiqueta', 'plazo', 'tono', 'tipo_de_cambio', 'miembros']

function CamposDeTexto(p: {
  uid: string
  etiqueta: string
  plazo: string
  deError: (campo: CampoDelGrupo) => string | undefined
  alCambiarEtiqueta: (etiqueta: string) => void
  alCambiarPlazo: (plazo: string) => void
}) {
  return (
    <>
      <Campo
        nombre={`${p.uid}-etiqueta`}
        etiqueta="Etiqueta"
        value={p.etiqueta}
        error={p.deError('etiqueta')}
        onChange={(evento) => {
          p.alCambiarEtiqueta(evento.target.value)
        }}
      />
      <Campo
        nombre={`${p.uid}-plazo`}
        etiqueta="Plazo de pago"
        placeholder="2 días"
        value={p.plazo}
        error={p.deError('plazo')}
        ayuda="Opcional."
        onChange={(evento) => {
          p.alCambiarPlazo(evento.target.value)
        }}
      />
    </>
  )
}

const mismos = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i])

// Lo que se va eligiendo y si difiere de lo que tenía al abrir.
function useEstadoDelGrupo({ grupo, miembros, candidatas, tiposDeCambio }: Props) {
  const filas = useMiembrosDelGrupo(miembros, candidatas)
  const [etiqueta, setEtiqueta] = useState(grupo.etiqueta)
  const [plazo, setPlazo] = useState(grupo.plazo ?? '')
  const [tono, setTono] = useState(grupo.tono)
  const [inicial] = useState(
    () => tiposDeCambio.find((o) => o.buckets.includes(grupo.bucket))?.id ?? '',
  )
  const [tipoDeCambio, setTipoDeCambio] = useState(inicial)
  const hayCambios =
    etiqueta !== grupo.etiqueta ||
    plazo !== (grupo.plazo ?? '') ||
    tono !== grupo.tono ||
    tipoDeCambio !== inicial ||
    !mismos(
      filas.ids,
      miembros.map((m) => m.id),
    )
  return {
    filas,
    etiqueta,
    setEtiqueta,
    plazo,
    setPlazo,
    tono,
    setTono,
    tipoDeCambio,
    setTipoDeCambio,
    hayCambios,
  }
}

// El formulario de una banda (el panel de la banda, D13): etiqueta, plazo de pago, color, tipo de cambio y sus filas, sin campo de id. «Aplicar» (o Enter en un campo)
// aplica; un error queda junto a su campo, con lo escrito y el foco en el primero. Sin el catálogo de colores leído, «Aplicar» espera. Cerrar con algo cambiado
// pregunta (no tiene borrador).
export function FormularioDelGrupo(props: Props) {
  const { grupo, miembros, errores, tonos, tiposDeCambio, conModos, alCancelar } = props
  const uid = useId()
  const e = useEstadoDelGrupo(props)
  const { filas, etiqueta, plazo, tono, tipoDeCambio } = e
  const deError = (campo: CampoDelGrupo) => errores.find((e) => e.campo === campo)?.mensaje
  useCambiosSinGuardar(e.hayCambios, undefined, { preguntaAlCerrar: true })

  // Al abrir el foco va a la etiqueta; con errores nuevos, al primero.
  useEffect(() => {
    const primero = ORDEN.find((c) => errores.some((e) => e.campo === c)) ?? 'etiqueta'
    document.getElementById(`${uid}-${primero}`)?.focus()
  }, [uid, errores])

  const listo = tonos.tipo === 'listo'
  return (
    <form
      id={`${uid}-formulario`}
      aria-label={grupo.etiqueta === '' ? 'Nueva banda' : `Banda ${grupo.etiqueta}`}
      className="grid min-w-0 gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        if (tonos.tipo !== 'listo') return
        props.alAplicar(
          { etiqueta, plazo, tono, tipoDeCambio, miembros: filas.ids },
          { tonos: tonos.claves, conModos },
        )
      }}
    >
      {deError('grupo') ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {deError('grupo')}
        </p>
      ) : null}
      <CamposDeTexto
        uid={uid}
        etiqueta={etiqueta}
        plazo={plazo}
        deError={deError}
        alCambiarEtiqueta={e.setEtiqueta}
        alCambiarPlazo={e.setPlazo}
      />
      <SelectoresDelGrupo
        uid={uid}
        tono={tono}
        tipoDeCambio={tipoDeCambio}
        tonos={tonos}
        tiposDeCambio={tiposDeCambio}
        conModos={conModos}
        deError={deError}
        alCambiarTono={e.setTono}
        alCambiarTipoDeCambio={e.setTipoDeCambio}
        NuevoColor={props.NuevoColor}
        alCrearColor={props.alCrearColor}
      />
      <FilasDelGrupo
        uid={uid}
        originales={miembros}
        quedan={filas.quedan}
        candidatas={filas.libres}
        error={deError('miembros')}
        alQuitar={filas.quitar}
        alSumar={filas.sumar}
      />
      <EstadoDeLosTonosDelFormulario tonos={tonos} alReintentar={props.alReintentarTonos} />
      <PieDelPanel
        idFormulario={`${uid}-formulario`}
        enCurso={false}
        alCancelar={alCancelar}
        etiquetaDeGuardar={props.etiquetaDeAplicar ?? 'Aplicar'}
        sinPuedeEnviar={!listo}
      />
    </form>
  )
}

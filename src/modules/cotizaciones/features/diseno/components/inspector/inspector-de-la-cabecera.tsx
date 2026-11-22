'use client'

import { useMemo } from 'react'
import { Interruptor } from '@/shared/ui/interruptor'
import { porDefectoDe } from '../../../../entities/cabecera-por-defecto'
import type { Diseno } from '../../../../entities/diseno'
import { tiposDeCambio } from '../../../../entities/diseno/edicion-de-la-cabecera'
import { CamposPorDefectoDeLaCabecera } from '../../../hoja/components/por-defecto/campos-por-defecto-de-la-cabecera'
import type { EdicionesDelDiseno } from '../../hooks/use-ediciones-del-diseno'
import { CamposDelAspectoDeLaCabecera } from '../aspecto'
import { ModoEditable } from '../modo-editable'
import { SumarUnModo } from '../sumar-un-modo'
import { errorDelAspecto, type ApoyoDelInspector } from './apoyo-del-inspector'

export const SIN_TOTAL_EN = 'Esta fórmula no divide el total en Bs: sin eso no hay modos.'
export const SIN_TIPOS_DE_CAMBIO = 'La fórmula no tiene tipos de cambio para un modo.'

// Lo que la cabecera trae por defecto, con los campos del núcleo (los del ⚙ de la cabecera); sin modos no hay qué configurar.
function PorDefectoDelDiseno({
  cabecera,
  ediciones,
  ocupado,
}: {
  cabecera: Diseno['cabecera']
  ediciones: EdicionesDelDiseno
  ocupado: boolean
}) {
  const porDefecto = porDefectoDe({
    modos: cabecera.modos,
    modoPorDefecto: cabecera.modo_por_defecto ?? null,
    verTotalBsPorDefecto: cabecera.ver_total_bs_por_defecto ?? false,
    modosVisibles: cabecera.modos_visibles ?? null,
  })
  if (porDefecto === null) return null
  return (
    <div
      data-por-defecto-del-diseno=""
      className="rounded-(--radius-md) bg-(--color-surface-2) p-3"
    >
      <CamposPorDefectoDeLaCabecera
        modos={cabecera.modos}
        valor={porDefecto}
        alCambiar={ediciones.ponerPorDefecto}
        ofreceVerTotalBs={cabecera.ver_total_bs}
        moneda={null}
        deshabilitado={ocupado}
      />
    </div>
  )
}

// La cabecera elegida: si ofrece «Ver total en moneda local», los modos de tipo de cambio, lo que trae por defecto (los mismos campos y textos que el ⚙ de la
// cabecera en la hoja; la moneda no se sabe acá: «moneda local») y su aspecto. Los modos que ya hubiera siguen editables aunque la fórmula ya no los admita.
export function InspectorDeLaCabecera({ apoyo }: { apoyo: ApoyoDelInspector }) {
  const { editor, ediciones } = apoyo
  const { definicion, ocupado } = editor
  const cabecera = editor.trabajo.cabecera
  const tipos = useMemo(() => tiposDeCambio(definicion), [definicion])
  const sinTipos = tipos.length === 0 || Object.keys(definicion.buckets ?? {}).length === 0
  const motivo =
    definicion.total_en === undefined ? SIN_TOTAL_EN : sinTipos ? SIN_TIPOS_DE_CAMBIO : null
  return (
    <div className="grid min-w-0 gap-3" data-cabecera-del-diseno="">
      <Interruptor
        titulo="Ofrecer «Ver total en moneda local»"
        ayuda="La hoja lo muestra apagado; quien cotiza lo enciende."
        valor={cabecera.ver_total_bs}
        deshabilitado={ocupado}
        alCambiar={ediciones.ponerVerTotalBs}
      />
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {cabecera.modos.map((modo) => (
          <ModoEditable
            key={modo.clave}
            modo={modo}
            tipos={tipos}
            ocupado={ocupado}
            alPonerModo={(cambios) => {
              ediciones.ponerModo(modo.clave, cambios)
            }}
            alQuitar={() => {
              ediciones.quitarModo(modo.clave)
            }}
          />
        ))}
      </ul>
      <SumarUnModo motivo={motivo} ocupado={ocupado} alSumar={ediciones.sumarModo} />
      <PorDefectoDelDiseno cabecera={cabecera} ediciones={ediciones} ocupado={ocupado} />
      <CamposDelAspectoDeLaCabecera
        cabecera={cabecera}
        catalogo={apoyo.catalogo}
        colores={apoyo.colores}
        ocupado={ocupado}
        error={errorDelAspecto(editor, { pieza: 'cabecera' })}
        alPoner={ediciones.ponerAspectoDeLaCabecera}
      />
    </div>
  )
}

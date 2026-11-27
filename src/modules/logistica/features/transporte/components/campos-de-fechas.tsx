'use client'

import type { ReactNode } from 'react'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE } from '../../../entities/transporte/transporte'
import { ATRIBUTO_DE_CLAVE_DE_DATO } from '../../../entities/nucleo/paneles-de-la-unidad'
import type { PropsDeCampos } from './campos-de-ruta'

// El envoltorio de un campo que cumple una clave de dato de un requisito: «Completar» de «Qué falta» le lleva el foco. `contents`: no cambia la grilla.
export function CampoDeLaClave({ clave, children }: { clave: string; children: ReactNode }) {
  return (
    <div className="contents" {...{ [ATRIBUTO_DE_CLAVE_DE_DATO]: clave }}>
      {children}
    </div>
  )
}

// «Fechas» del vehículo sin embarque (con embarque son las del embarque): son `date` (sin hora, D18) y viajan `AAAA-MM-DD` tal cual.
export function CamposDeFechas({ prefijo, valores, errores, escribir, apagado }: PropsDeCampos) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <CampoDeLaClave clave="transporte.zarpe">
        <Campo
          nombre={`${prefijo}-zarpe`}
          etiqueta="Zarpe"
          type="date"
          value={valores.zarpe}
          onChange={(e) => {
            escribir('zarpe', e.target.value)
          }}
          error={errores.zarpe}
          disabled={apagado}
        />
      </CampoDeLaClave>
      <CampoDeLaClave clave="transporte.eta">
        <Campo
          nombre={`${prefijo}-eta`}
          etiqueta="ETA"
          type="date"
          value={valores.eta}
          onChange={(e) => {
            escribir('eta', e.target.value)
          }}
          error={errores.eta}
          disabled={apagado}
        />
      </CampoDeLaClave>
      <CampoDeLaClave clave="transporte.arribo">
        <Campo
          nombre={`${prefijo}-arribo`}
          etiqueta="Arribo"
          type="date"
          value={valores.arribo}
          onChange={(e) => {
            escribir('arribo', e.target.value)
          }}
          error={errores.arribo}
          disabled={apagado}
        />
      </CampoDeLaClave>
    </div>
  )
}

// Las notas del vehículo: van siempre (también con embarque, que tiene las suyas en su página).
export function CampoDeNotasDelTransporte({
  prefijo,
  valores,
  errores,
  escribir,
  apagado,
}: PropsDeCampos) {
  const idDeNotas = `${prefijo}-notas`
  return (
    <>
      <div className="grid gap-1.5">
        {/* El grupo ya se titula «Notas»: el campo dice de quién son. */}
        <Label htmlFor={idDeNotas} className="sr-only">
          Notas del vehículo
        </Label>
        <Textarea
          id={idDeNotas}
          name={idDeNotas}
          maxLength={LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE}
          value={valores.notas}
          onChange={(e) => {
            escribir('notas', e.target.value)
          }}
          aria-invalid={errores.notas ? true : undefined}
          aria-describedby={errores.notas ? `${idDeNotas}-error` : undefined}
          disabled={apagado}
        />
        {errores.notas ? (
          <p
            id={`${idDeNotas}-error`}
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {errores.notas}
          </p>
        ) : null}
      </div>
    </>
  )
}

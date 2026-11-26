'use client'

import { useMemo } from 'react'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { ClaveDePieza } from '../../../../entities/diseno'
import { apartesPosibles, totalesPosibles } from '../../../../entities/diseno/edicion-de-la-tarjeta'
import { admiteElTotal, dondeVaElTotal } from '../../../../entities/diseno/total-de-la-hoja'
import { CamposDelAspectoDelItem } from '../aspecto'
import { errorDelAspecto, type ApoyoDelInspector } from './apoyo-del-inspector'

export const TEXTO_DE_LA_TARJETA =
  'Lo que muestra la tarjeta del resumen y el PDF. Repite lo que la hoja ya dibuja.'
export const SIN_LUGAR_PARA_EL_TOTAL =
  'Va al costado de la hoja. «Ubicar en la hoja» la pone al final de la primera sección principal sin nivel.'
export const SIN_SECCION_PARA_EL_TOTAL =
  'Ninguna sección la admite: suma una sección principal que vean todos.'

// Qué nodo es el total y qué se muestra junto a él. Un secundario elegido que ya no es «aparte» (un diseño de antes) se muestra igual, para poder quitarlo.
function CamposDeLaTarjeta({ apoyo }: { apoyo: ApoyoDelInspector }) {
  const { editor, ediciones } = apoyo
  const { definicion, nombresDeNodos: etiquetas, ocupado } = editor
  const tarjeta = editor.trabajo.tarjeta_total
  const totales = useMemo(() => totalesPosibles(definicion), [definicion])
  const apartes = useMemo(() => apartesPosibles(definicion), [definicion])
  const totalesConActual = totales.some((t) => t.id === tarjeta.nodo)
    ? totales
    : [...totales, { id: tarjeta.nodo, etiqueta: etiquetas.get(tarjeta.nodo) ?? tarjeta.nodo }]
  const visibles = [
    ...apartes,
    ...tarjeta.secundarios
      .filter((s) => !apartes.some((a) => a.id === s))
      .map((s) => ({ id: s, etiqueta: etiquetas.get(s) ?? s })),
  ]
  return (
    <>
      <CampoSeleccion
        nombre="tarjeta-total"
        etiqueta="Total"
        opciones={totalesConActual.map((t) => ({ valor: t.id, etiqueta: t.etiqueta }))}
        value={tarjeta.nodo}
        disabled={ocupado || totalesConActual.length < 2}
        onChange={(evento) => {
          ediciones.ponerTotal(evento.target.value)
        }}
      />
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {visibles.map((nodo) => (
          <li key={nodo.id} className="min-w-0" data-secundario={nodo.id}>
            <label className="flex min-w-0 items-center gap-2 text-(length:--text-sm) break-words text-(--color-ink)">
              <Checkbox
                aria-label={`Mostrar «${nodo.etiqueta}» junto al total`}
                checked={tarjeta.secundarios.includes(nodo.id)}
                disabled={ocupado}
                onCheckedChange={() => {
                  ediciones.alternarSecundario(nodo.id)
                }}
              />
              {`Mostrar «${nodo.etiqueta}» junto al total`}
            </label>
          </li>
        ))}
      </ul>
    </>
  )
}

// Sin la pieza en una sección (un diseño de antes), «Ubicar en la hoja»; apagado si ninguna sección la admite.
function UbicarEnLaHoja({ apoyo, alUbicar }: { apoyo: ApoyoDelInspector; alUbicar: () => void }) {
  const hayDonde = apoyo.editor.trabajo.secciones.some(admiteElTotal)
  return (
    <div className="grid min-w-0 gap-2 rounded-(--radius-md) bg-(--color-surface-2) p-3">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {hayDonde ? SIN_LUGAR_PARA_EL_TOTAL : SIN_SECCION_PARA_EL_TOTAL}
      </p>
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        disabled={apoyo.editor.ocupado || !hayDonde}
        onClick={alUbicar}
      >
        Ubicar en la hoja
      </Button>
    </div>
  )
}

// La tarjeta del total elegida: qué es el total y qué va junto a él; dónde está (o «Ubicar en la hoja», si todavía no está en una sección) y, ya en una sección,
// su aspecto (su ancho, también con el borde o Alt+Shift+←/→).
export function InspectorDelTotal({
  apoyo,
  alUbicar,
}: {
  apoyo: ApoyoDelInspector
  alUbicar: () => void
}) {
  const { editor, ediciones } = apoyo
  const donde = dondeVaElTotal(editor.trabajo)
  const seccion =
    donde === null ? undefined : editor.trabajo.secciones.find((s) => s.id === donde.seccion)
  const item = seccion?.items[donde?.indice ?? -1]
  const clave: ClaveDePieza | null =
    seccion === undefined ? null : { tipo: 'total', seccion: seccion.id }
  return (
    <div className="grid min-w-0 gap-3" data-tarjeta-del-diseno="">
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">{TEXTO_DE_LA_TARJETA}</p>
      <CamposDeLaTarjeta apoyo={apoyo} />
      {clave === null || item === undefined ? (
        <UbicarEnLaHoja apoyo={apoyo} alUbicar={alUbicar} />
      ) : (
        <CamposDelAspectoDelItem
          base={`${clave.seccion}__total`}
          item={item}
          ocupado={editor.ocupado}
          error={errorDelAspecto(editor, { pieza: 'item', clave })}
          alPoner={(cambios) => {
            ediciones.ponerAspectoDeItem(clave, cambios)
          }}
        />
      )}
    </div>
  )
}

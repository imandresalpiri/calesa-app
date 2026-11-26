'use client'

import { Fragment } from 'react'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import {
  cambiosDeLaRevision,
  type Cambio,
  type DeLosCalculos,
} from '../../../entities/cambios-de-la-revision'
import { autorDeLaRevision, type RevisionDeLaCotizacion } from '../../../entities/revisiones'
import { ValorDeNodo } from '../../hoja/components/valor-de-nodo'

type Props = {
  revision: RevisionDeLaCotizacion
  // Las etiquetas de los nodos que nombran los diffs leídos: sin etiqueta, el id.
  etiquetas: ReadonlyMap<string, string>
  // Los cálculos que quien mira ve, con su formato y sus decimales: lo pisado y lo devuelto se dicen con sus montos. Sin ellos, «Cambió «X»».
  calculos?: DeLosCalculos | undefined
}

const claveDe = (cambio: Cambio) =>
  typeof cambio === 'string' ? cambio : `${cambio.tipo}:${cambio.etiqueta}`

// Un cambio: su texto o, el de un cálculo, «Pisó «X»: $480 → $500» (el dinero por `<Monto>`) y «Volvió al calculado «X»».
function TextoDelCambio({ cambio }: { cambio: Cambio }) {
  if (typeof cambio === 'string') {
    return <span>{cambio}</span>
  }
  if (cambio.tipo === 'devuelto') {
    return <span>Volvió al calculado «{cambio.etiqueta}»</span>
  }
  const { valores, formato, decimales } = cambio
  return (
    <span>
      Pisó «{cambio.etiqueta}»
      {valores === null ? null : (
        <>
          : <ValorDeNodo valor={valores.de} formato={formato} decimales={decimales} /> →{' '}
          <ValorDeNodo valor={valores.a} formato={formato} decimales={decimales} />
        </>
      )}
    </span>
  )
}

// Lo de una revisión sin su marco (la lista del panel y la línea de tiempo del resumen le ponen cada una el suyo, una caja `grid` con `gap-1`; un nodo de más por fila cuenta en el
// presupuesto de nodos del panel): quién y cuándo, qué cambió (las primeras tres cosas y «y N más») y,
// si el nivel de quien mira lo deja ver, el total antes y después.
export function ContenidoDeLaRevision({ revision, etiquetas, calculos }: Props) {
  const { zonaHoraria } = useRegional()
  const cambios = cambiosDeLaRevision(revision.diff, etiquetas, revision.vehiculo, calculos)
  return (
    <>
      <p className="font-medium [overflow-wrap:anywhere] text-(--color-ink)">
        {autorDeLaRevision(revision)} · {fechaRelativa(revision.creadoEn, { zona: zonaHoraria })}
      </p>
      {cambios.sinCambios ? (
        <p className="text-(--color-ink-soft)">Sin cambios que puedas ver.</p>
      ) : (
        <>
          {cambios.vistos.length === 0 ? null : (
            <p className="[overflow-wrap:anywhere] text-(--color-ink-soft)">
              {cambios.vistos.map((cambio, i) => (
                <Fragment key={`${String(i)}:${claveDe(cambio)}`}>
                  {i === 0 ? null : ' · '}
                  <TextoDelCambio cambio={cambio} />
                </Fragment>
              ))}
              {cambios.masN > 0 ? (
                <>
                  {' · '}
                  <span>y {cambios.masN} más</span>
                </>
              ) : null}
            </p>
          )}
          {cambios.total === null ? null : (
            <p className="text-(--color-ink)">
              Total: <Monto valor={cambios.total.de} moneda="USD" /> →{' '}
              <Monto valor={cambios.total.a} moneda="USD" />
            </p>
          )}
        </>
      )}
    </>
  )
}

// Una revisión de la lista del panel.
export function Revision(props: Props) {
  return (
    <li className="grid min-w-0 gap-1 rounded-(--radius-md) border border-(--color-border) p-3 text-(length:--text-sm)">
      <ContenidoDeLaRevision {...props} />
    </li>
  )
}

'use client'

import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { EstadoError } from '@/shared/ui/estados'
import { Monto } from '@/shared/ui/monto'
import { avisosDelTerreno } from '../../../../entities/formula/terreno-de-prueba'
import type { LineaDeTotales } from '../../../../entities/formula/totales-de-la-planilla'
import type { VistaPrevia } from '../../../../entities/formula/vista-previa'
import type { RechazoEnElEditor } from '../../hooks/use-editor-de-la-formula'
import type { LecturaDelTerreno } from '../../hooks/use-terreno-de-prueba'

type Props = {
  lectura: LecturaDelTerreno
  vista: VistaPrevia | null
  // Las líneas, con la vista calculada.
  lineas: readonly LineaDeTotales[]
  rechazo: RechazoEnElEditor | null
  nombreDelOrigen: string
  alReintentar: () => void
}

const SIN_CIFRA = 'Sin cifra: falta algo en las filas.'

// Dónde dice el rechazo qué corregir: su fila, la banda de su grupo o el aviso de arriba de la planilla.
function textoDelRechazo(rechazo: RechazoEnElEditor | null): string {
  if (rechazo?.grupoId) return 'la banda del grupo dice qué corregir.'
  return rechazo?.filaId === null
    ? 'el aviso de arriba de la planilla dice qué corregir.'
    : 'la fila marcada dice qué corregir.'
}

function Linea({ linea }: { linea: LineaDeTotales }) {
  return (
    <div className="grid gap-0.5 border-b border-(--color-line) pb-2 last:border-b-0 last:pb-0">
      <dt className="text-(--color-ink-soft)">{linea.titulo}</dt>
      <dd className="font-semibold text-(--color-ink)">
        {linea.tipo === 'apagada' ? (
          <span className="font-normal text-(--color-ink-soft)">{linea.motivo}</span>
        ) : linea.valor === null ? (
          SIN_CIFRA
        ) : (
          <Monto
            valor={linea.valor}
            {...(linea.moneda === undefined ? {} : { moneda: linea.moneda })}
          />
        )}
      </dd>
      {linea.comoSale === '' ? null : (
        <dd className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
          {linea.comoSale}
        </dd>
      )}
    </div>
  )
}

function Cuerpo(p: Props) {
  if (p.lectura.tipo === 'error') {
    return (
      <EstadoError
        titulo="No pudimos leer los tipos de cambio y las tablas."
        alReintentar={p.alReintentar}
      />
    )
  }
  if (p.lectura.tipo === 'leyendo' || p.vista === null)
    return <EsqueletoListado filas={3} columnas={1} />
  if (p.vista.tipo === 'no_valida') {
    return (
      <p className="text-(--color-ink-soft)">
        La vista previa espera una fórmula válida: {textoDelRechazo(p.rechazo)}
      </p>
    )
  }
  if (p.vista.tipo === 'no_calcula') {
    return (
      <p className="text-(--color-ink-soft)">
        No se pudo calcular con estas cifras: revisa la variante por defecto o los modos de la hoja.
      </p>
    )
  }
  const avisos = avisosDelTerreno(p.lectura.terreno, p.nombreDelOrigen)
  return (
    <>
      <dl role="status" className="grid gap-2">
        {p.lineas.map((l) => (
          <Linea key={l.titulo} linea={l} />
        ))}
      </dl>
      {avisos.length > 0 ? (
        <ul className="grid gap-1 text-(--color-aviso-ink)">
          {avisos.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

// «Totales» de la planilla, con la unidad de ejemplo y el modo elegido (como «TOTALES» de V1): el total en dólares y en la moneda local, la base imponible y lo que va
// aparte, cada uno con `<Monto>` y cómo sale. Cada estado dice qué pasa; el bloque se anuncia (`role="status"`) cuando un cambio lo mueve. Va en el panel al costado
// «Totales» (`?costado=totales`), que pone el título.
export function TotalesDeLaUnidad(p: Props) {
  return (
    <section aria-label="Totales" className="grid min-w-0 gap-2 text-(length:--text-sm)">
      <Cuerpo {...p} />
    </section>
  )
}

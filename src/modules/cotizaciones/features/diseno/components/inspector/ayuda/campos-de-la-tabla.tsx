'use client'

import { Aviso } from '@/shared/ui/aviso'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Interruptor } from '@/shared/ui/interruptor'
import type { TablaDelCatalogoDelOrigen } from '../../../../../entities/catalogo-de-tablas'
import type {
  BloqueDeTabla,
  CeldaQueAceptaValor,
} from '../../../../../entities/diseno/tabla-del-bloque'
import { AbrirEnTablas } from './abrir-en-tablas'
import { ColumnasDelBloque } from './columnas-del-bloque'

// Lo que el editor hace con un bloque de tabla (las columnas, con las de la tabla del catálogo ya atadas).
export type AccionesDeLaTabla = {
  ponerTabla: (tabla: string) => void
  mostrar: (columna: string, mostrar: boolean) => void
  llenar: (columna: string, llena: string | null) => void
  resaltar: (resaltar: boolean) => void
}

type Props = {
  nombre: string
  bloque: BloqueDeTabla
  origen: { id: string; nombre: string }
  // El catálogo de tablas del origen; nulo si no se leyó: el select ofrece las que nombra la fórmula (`deLaFormula`) y las columnas no se eligen.
  catalogo: readonly TablaDelCatalogoDelOrigen[] | null
  deLaFormula: readonly string[]
  celdas: readonly CeldaQueAceptaValor[]
  ocupado: boolean
  acciones: AccionesDeLaTabla
}

export const SIN_CATALOGO = 'No pudimos leer las tablas del origen.'
export const ELIGE_UNA_TABLA = 'Elige una tabla.'
export const TABLA_QUE_FALTA = 'Esa tabla no está en el catálogo del origen.'
export const RESALTAR = 'Resaltar la fila del vehículo'

const opcion = (t: TablaDelCatalogoDelOrigen) => ({ valor: t.clave, etiqueta: t.nombre })

// Si la tabla que el bloque nombra está entre las que se ofrecen y, si no, qué se dice (sin catálogo no se sabe si existe: nada).
function laTablaQueFalta(
  tabla: string,
  catalogo: Props['catalogo'],
  deLaFormula: readonly string[],
): { falta: boolean; error: string | null } {
  if (tabla === '') return { falta: false, error: ELIGE_UNA_TABLA }
  if (catalogo === null) return { falta: !deLaFormula.includes(tabla), error: null }
  const falta = !catalogo.some((t) => t.clave === tabla)
  return { falta, error: falta ? TABLA_QUE_FALTA : null }
}

// Las del origen y las compartidas, cada grupo si tiene alguna.
function gruposDelCatalogo(catalogo: Props['catalogo'], nombreDelOrigen: string) {
  const propias = (catalogo ?? []).filter((t) => !t.compartida)
  const compartidas = (catalogo ?? []).filter((t) => t.compartida)
  return [
    { etiqueta: `De ${nombreDelOrigen}`, opciones: propias.map(opcion) },
    { etiqueta: 'Compartidas', opciones: compartidas.map(opcion) },
  ].filter((g) => g.opciones.length > 0)
}

// El select de la tabla: las del origen y las compartidas en dos grupos (sin catálogo, las claves que nombra la fórmula). La que el bloque nombra y no está
// se ve igual, con su error.
function TablaDelBloque({
  nombre,
  bloque,
  origen,
  catalogo,
  deLaFormula,
  ocupado,
  acciones,
}: Props) {
  const { tabla } = bloque
  const { falta, error } = laTablaQueFalta(tabla, catalogo, deLaFormula)
  return (
    <CampoSeleccion
      nombre={`${nombre}-tabla`}
      etiqueta="Tabla"
      value={tabla}
      disabled={ocupado}
      opciones={[
        ...(tabla === '' ? [{ valor: '', etiqueta: 'Elige una tabla', deshabilitada: true }] : []),
        ...(falta ? [{ valor: tabla, etiqueta: tabla }] : []),
        ...(catalogo === null ? deLaFormula.map((t) => ({ valor: t, etiqueta: t })) : []),
      ]}
      grupos={gruposDelCatalogo(catalogo, origen.nombre)}
      {...(error === null ? {} : { error })}
      onChange={(e) => {
        acciones.ponerTabla(e.target.value)
      }}
    />
  )
}

// Un bloque de tabla en el inspector: la tabla («Abrir en Tablas» abre el drawer de tablas de la pestaña con ella), sus columnas con la celda que llena
// cada una, y «Resaltar la fila del vehículo». Sin catálogo, el aviso y «Todas las columnas» (o las que el bloque ya nombra).
export function CamposDeLaTabla(props: Props) {
  const { nombre, bloque, catalogo, celdas, ocupado, acciones } = props
  const delCatalogo = catalogo?.find((t) => t.clave === bloque.tabla)
  return (
    <div className="grid min-w-0 gap-2">
      {catalogo === null ? <Aviso tono="aviso">{SIN_CATALOGO}</Aviso> : null}
      <TablaDelBloque {...props} />
      {delCatalogo === undefined ? null : <AbrirEnTablas tablaId={delCatalogo.id} />}
      {delCatalogo === undefined ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {bloque.columnas === undefined
            ? 'Todas las columnas.'
            : `Columnas: ${bloque.columnas.map((c) => c.columna).join(', ')}.`}
        </p>
      ) : (
        <ColumnasDelBloque
          nombre={nombre}
          bloque={bloque}
          columnas={delCatalogo.columnas}
          celdas={celdas}
          ocupado={ocupado}
          alMostrar={acciones.mostrar}
          alLlenar={acciones.llenar}
        />
      )}
      <Interruptor
        titulo={RESALTAR}
        ayuda="En la hoja, la fila que coincide con los datos del vehículo se marca como «Tu vehículo»."
        valor={bloque.resaltar === true}
        deshabilitado={ocupado}
        alCambiar={acciones.resaltar}
      />
    </div>
  )
}

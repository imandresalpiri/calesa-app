'use client'

import { useRef, useState } from 'react'
import { cn } from 'cn'
import { textoDelTope } from '@/shared/lib/conteo'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useRegional } from '@/shared/ui/regional'
import { useDesborde } from '@/shared/ui/use-desborde'
import {
  celdaDeTabla,
  type ColumnaDeTabla,
  type TablaDeAyuda,
} from '../../../entities/tabla-de-ayuda'

export type PropsDeLaTablaDeLaAyuda = {
  tabla: TablaDeAyuda
  // Las que dibuja el bloque (`columnasDelBloque`), en su orden.
  columnas: readonly ColumnaDeTabla[]
  // Si la celda que abre la ayuda es dinero (P13): sus cifras pasan por `<Monto>` con la moneda de la celda (nula, la de la empresa) y el Modo Live las tapa. Nulo, a la vista.
  dinero: { moneda: string | undefined } | null
}

const esCifra = (columna: ColumnaDeTabla) => columna.tipo === 'numero'

// Lo que hay debajo de las filas: «Ver más filas» mientras queden leídas sin dibujar y, dibujadas todas, el tope de la lectura si había más (el camino es la configuración).
function PieDeLaTabla({
  tabla,
  dibujadas,
  alVerMas,
}: {
  tabla: TablaDeAyuda
  dibujadas: number
  alVerMas: () => void
}) {
  if (dibujadas < tabla.filas.length) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-fit md:min-h-9"
        onClick={alVerMas}
      >
        Ver más filas
      </Button>
    )
  }
  return tabla.hayMas ? (
    <AvisoDeTope
      texto={textoDelTope(tabla.filas.length, { articulo: 'las', orden: 'primeras filas' })}
      camino="Hay más filas: mira la tabla en la configuración."
    />
  ) : null
}

// La tabla de referencia de un bloque de la ayuda, de sólo lectura: un encabezado por columna (fijo arriba al desplazar), las filas en el orden que llegan, de a
// `TAMANO_DE_VER_MAS` con «Ver más filas» (hasta las 1.000 que lee). El texto se parte y una cifra no; lo que aún no entra se desplaza de costado dentro de su propio
// contenedor, nunca la página.
export function TablaDeLaAyuda({ tabla, columnas, dinero }: PropsDeLaTablaDeLaAyuda) {
  const { locale } = useRegional()
  const contenedor = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(contenedor)
  const [dibujadas, setDibujadas] = useState(TAMANO_DE_VER_MAS)
  const filas = tabla.filas.slice(0, dibujadas)
  return (
    <div className="grid min-w-0 gap-3">
      <div className="relative min-w-0">
        <div
          ref={contenedor}
          role="region"
          aria-label={`Tabla ${tabla.nombre}`}
          tabIndex={0}
          className="max-h-[60dvh] min-w-0 overflow-auto rounded-md border border-(--color-line)"
        >
          <table className="w-full border-collapse text-(length:--text-sm) text-(--color-ink)">
            <thead>
              <tr>
                {columnas.map((columna) => (
                  <th
                    key={columna.clave}
                    scope="col"
                    className={cn(
                      'sticky top-0 border-b border-(--color-line) bg-(--color-surface) px-3 py-2 font-medium wrap-anywhere',
                      esCifra(columna) ? 'text-right' : 'text-left',
                    )}
                  >
                    {columna.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i} className="border-b border-(--color-line) last:border-b-0">
                  {columnas.map((columna) => {
                    const celda = celdaDeTabla(fila[columna.clave], columna.tipo, locale)
                    return (
                      <td
                        key={columna.clave}
                        className={cn(
                          'px-3 py-2 align-top',
                          celda.tipo === 'cifra'
                            ? 'text-right whitespace-nowrap tabular-nums'
                            : 'wrap-anywhere',
                        )}
                      >
                        {celda.tipo === 'cifra' && dinero !== null ? (
                          <Monto valor={celda.valor} moneda={dinero.moneda} />
                        ) : (
                          celda.texto
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PistaDeDesborde {...desborde} />
      </div>
      <PieDeLaTabla
        tabla={tabla}
        dibujadas={filas.length}
        alVerMas={() => {
          setDibujadas((n) => n + TAMANO_DE_VER_MAS)
        }}
      />
    </div>
  )
}

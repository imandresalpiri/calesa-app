'use client'

import { destinoDeMovimiento, idDeFila, type CampoBase } from '@/shared/lib/campos'
import type { Envoltorios, PropsDelCuerpo, TextosDeCasilla } from './cuerpo'

type Props = Pick<
  PropsDelCuerpo,
  | 'grupos'
  | 'todos'
  | 'insignias'
  | 'llaves'
  | 'casillas'
  | 'puedeGestionar'
  | 'conAsa'
  | 'alElegir'
> & { envoltorios: Envoltorios }

// El id de la lista de un grupo para el arrastre: un campo sólo se ordena dentro del suyo.
export const idDeGrupo = (nombre: string | null) => `grupo:${nombre ?? ''}`

function textosDe(casillas: NonNullable<Props['casillas']>): TextosDeCasilla {
  const { insignia, hacer, quitar, motivoTope, notaAlDesactivar, zona } = casillas
  return { insignia, hacer, quitar, motivoTope, notaAlDesactivar, zona }
}

// Los campos activos, un bloque por grupo, en el orden del layout; desde 64 rem, en dos columnas.
export function GruposDeCampos(props: Props) {
  const { grupos, todos, insignias, llaves, casillas, puedeGestionar, conAsa, alElegir } = props
  const { Lista, Fila } = props.envoltorios
  const enCasillas = new Set(casillas?.lista.map((casilla) => casilla.llave))
  const textos = casillas ? textosDe(casillas) : null
  const topeLleno = casillas !== null && casillas.lista.length >= casillas.tope
  const casillaDe = (campo: CampoBase) => {
    const llave = llaves.get(campo.id)
    return textos === null || llave === undefined
      ? null
      : { textos, es: enCasillas.has(llave), topeLleno }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 @min-[64rem]/campos:grid-cols-2">
      {grupos.map((grupo) => (
        <div key={grupo.nombre ?? 'sin-grupo'} className="grid min-w-0 gap-2">
          <h3 className="text-(length:--text-sm) font-medium text-(--color-ink-soft)">
            {grupo.nombre ?? 'Sin grupo'}
          </h3>
          <Lista id={idDeGrupo(grupo.nombre)} ids={grupo.campos.map((campo) => idDeFila(campo.id))}>
            <ul className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line) rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
              {grupo.campos.map((campo) => (
                <Fila
                  key={campo.id}
                  campo={campo}
                  insignias={insignias.get(campo.id) ?? []}
                  puedeGestionar={puedeGestionar}
                  puedeSubir={destinoDeMovimiento(todos, campo.id, 'subir') !== null}
                  puedeBajar={destinoDeMovimiento(todos, campo.id, 'bajar') !== null}
                  casilla={casillaDe(campo)}
                  conAsa={conAsa}
                  alElegir={alElegir}
                />
              ))}
            </ul>
          </Lista>
        </div>
      ))}
    </div>
  )
}

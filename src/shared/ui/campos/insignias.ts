import type { CampoBase } from '@/shared/lib/campos'
import { banderaDe, type BanderaDeCampo, type CasillasDelEditor } from './tipos'

type Args<Campo extends CampoBase> = {
  campos: readonly Campo[]
  delModulo: ((campo: Campo) => readonly string[]) | undefined
  banderas: readonly BanderaDeCampo[]
  casillas: CasillasDelEditor | null
}

// Las llaves de casilla de los campos activos (por id): sólo un activo puede ser dato clave.
export function llavesDeLosCampos<Campo extends CampoBase>(
  campos: readonly Campo[],
  casillas: CasillasDelEditor | null,
): Map<string, string> {
  if (casillas === null) {
    return new Map()
  }
  return new Map(
    campos.filter((campo) => campo.activo).map((campo) => [campo.id, casillas.llaveDeCampo(campo)]),
  )
}

// Lo que dice cada fila con texto, en su orden: lo del módulo («Principal»), «Dato clave» y las banderas encendidas que van en la fila.
export function insigniasDeLosCampos<Campo extends CampoBase>(
  args: Args<Campo>,
): Map<string, string[]> {
  const { campos, delModulo, banderas, casillas } = args
  const enFila = banderas.filter((bandera) => bandera.enFila)
  const llaves = llavesDeLosCampos(campos, casillas)
  const enCasillas = new Set(casillas?.lista.map((casilla) => casilla.llave))
  return new Map(
    campos.map((campo) => {
      const llave = llaves.get(campo.id)
      return [
        campo.id,
        [
          ...(delModulo?.(campo) ?? []),
          ...(casillas !== null && llave !== undefined && enCasillas.has(llave)
            ? [casillas.insignia]
            : []),
          ...enFila
            .filter((bandera) => banderaDe(campo, bandera.clave))
            .map((bandera) => bandera.etiqueta),
        ],
      ]
    }),
  )
}

'use client'

import { use } from 'react'
import { createPortal } from 'react-dom'
import { modosDelEncabezado, ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import type { HojaLista } from '../../../entities/hoja'
import { AjusteDeLaCabeceraEnLaHoja } from './ajuste-de-la-cabecera-en-la-hoja'
import { claseDeLaCabecera } from './clases-de-la-rejilla'
import { ContextoDelAjuste } from './hueco-del-ajuste'
import { PiezasDeLaCabecera } from './piezas-de-la-cabecera'
import { useRanuraDeLaCabecera } from './ranura-de-la-cabecera'

type Props = {
  cabecera: HojaLista['cabecera']
  modoElegido: string | null
  alElegirModo: (clave: string) => void
  verTotalBs: boolean
  alCambiarVerTotalBs: (valor: boolean) => void
  // Sólo lectura (una cotización guardada que quien mira no puede guardar): los modos y «Ver total Bs» se ven y no se tocan.
  deshabilitado?: boolean
  // Para el ⚙ de la cabecera: el nombre del origen y la versión que dibuja la hoja. Sin ellos (la vista previa del diseño) no hay ⚙.
  origen?: string
  formula?: HojaLista['formula']
}

// El panel del ⚙ de la cabecera que llenó el área, si la base dio `ajustes` y la hoja sabe su origen y su versión; si no, nulo.
function useAjusteDeLaCabecera(
  cabecera: HojaLista['cabecera'],
  origen: string | undefined,
  formula: unknown,
) {
  const AjusteDeLaCabecera = use(ContextoDelAjuste)?.AjusteDeLaCabecera
  return cabecera.ajustes && origen !== undefined && formula !== undefined
    ? (AjusteDeLaCabecera ?? null)
    : null
}

// Lo que es de la hoja entera (`docs/UX.md` › «Cotizar»), en una fila chica: los modos de tipo de cambio como un control segmentado, «Ver total en moneda local» como un
// interruptor chico y el ⚙. Los modos que se dibujan son los visibles más el elegido (`modosDelEncabezado()`), y sólo si quedan dos o más: con uno no hay qué elegir y sin
// modos no hay nada. «Ver total» sólo si el diseño lo ofrece y hay con qué moneda escribirlo (P6). El ⚙ va al final, como en V1, si la base dio `ajustes` y un área
// llenó el hueco. Si nada se dibuja, tampoco la caja. Su aspecto (tono, relleno, letra y énfasis) va en clases sobre el mismo nodo.
// **Dónde va:** con la ranura de la cabecera (glosario: «Ranura de la cabecera», la pone `src/app` en la fila de las barras del vehículo y del cliente), por un portal;
// mientras la ranura no se montó, en ningún lado (la ranura guarda su alto); sin proveedor (el lienzo del editor, las pruebas), en su lugar, arriba de las secciones.
export function CabeceraDeHoja({
  cabecera,
  modoElegido,
  alElegirModo,
  verTotalBs,
  alCambiarVerTotalBs,
  deshabilitado = false,
  origen,
  formula,
}: Props) {
  const AjusteDeLaCabecera = useAjusteDeLaCabecera(cabecera, origen, formula)
  const ranura = useRanuraDeLaCabecera()
  const modos = modosDelEncabezado(cabecera, modoElegido)
  const conModos = modos.length >= 2
  const conTotalBs = ofreceVerTotalBs(cabecera)
  if ((!conModos && !conTotalBs && AjusteDeLaCabecera === null) || ranura === null) {
    return null
  }
  const contenido = (
    <div data-cabecera="" data-tono={cabecera.tono} className={claseDeLaCabecera(cabecera)}>
      <PiezasDeLaCabecera
        modos={conModos ? modos : []}
        modoElegido={modoElegido}
        alElegirModo={alElegirModo}
        verTotalBs={conTotalBs ? verTotalBs : null}
        alCambiarVerTotalBs={alCambiarVerTotalBs}
        deshabilitado={deshabilitado}
      />
      {AjusteDeLaCabecera !== null && origen !== undefined && formula !== undefined ? (
        <AjusteDeLaCabeceraEnLaHoja
          AjusteDeLaCabecera={AjusteDeLaCabecera}
          origen={origen}
          hoja={{
            formula,
            cabecera,
            modoElegido,
            verTotalBs,
            soloLectura: deshabilitado,
            alElegirModo,
            alCambiarVerTotalBs,
          }}
        />
      ) : null}
    </div>
  )
  return ranura === undefined ? contenido : createPortal(contenido, ranura)
}

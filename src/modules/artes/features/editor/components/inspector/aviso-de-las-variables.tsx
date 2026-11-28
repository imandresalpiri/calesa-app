'use client'

// La línea de abajo de «Texto» en el inspector del editor de artes, de alto reservado: cómo se escriben los datos (`{marca}`) o, si el texto
// lleva una variable que el arte no puede llenar, el aviso en rojo («{x} no es un dato que el arte pueda llenar.»: no se guarda); si nombra una
// de subasta en un origen que no lo es, «{lote} no aplica en <origen>: no es de subasta.» (su línea se quita).
import {
  desconocidasDelTexto,
  noAplicanDelTexto,
  textoDeLasQueNoAplican,
  textoDeVariablesDesconocidas,
} from '../../../../entities/datos/resolver-texto'
import type { CatalogoDelArte } from '../../../../entities/datos/variables-del-arte'

const AYUDA_DE_LOS_DATOS = 'Los datos van entre llaves, como {marca} o {modelo}.'

type Props = { texto: string; catalogo: CatalogoDelArte; origen: string }

export function AvisoDeLasVariables({ texto, catalogo, origen }: Props) {
  const desconocidas = textoDeVariablesDesconocidas(desconocidasDelTexto(texto, catalogo))
  const noAplican = textoDeLasQueNoAplican(noAplicanDelTexto(texto, catalogo), origen)
  const clase = 'min-h-8 text-(length:--text-xs) leading-4'
  if (desconocidas === null && noAplican === null) {
    return (
      <p role="status" className={`${clase} text-(--color-ink-faint)`}>
        {AYUDA_DE_LOS_DATOS}
      </p>
    )
  }
  return (
    <div role="status" className={`${clase} grid gap-1`}>
      {desconocidas === null ? null : (
        <p data-variables-desconocidas className="text-(--color-peligro-ink)">
          {desconocidas}
        </p>
      )}
      {noAplican === null ? null : <p className="text-(--color-aviso-ink)">{noAplican}</p>}
    </div>
  )
}

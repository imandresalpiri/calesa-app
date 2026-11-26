'use client'

import { conteoAcotado, conteoCorto } from '@/shared/lib/conteo'
import { useRegional } from '@/shared/ui/regional'
import { ListaCorta, TarjetaTocable } from '@/shared/ui/tarjetas-de-ajustes'
import {
  armarMisElementos,
  cuantosPropios,
  enlacesDelMenu,
  type MisEnlacesLeidos,
} from '../../../entities/mis-enlaces-de-ayuda'
import {
  PANELES_DEL_PERFIL,
  textoDelTopeDePropios,
} from '../../../entities/paneles-de-enlaces-de-ayuda'
import { useFamiliaDeEnlaces } from '../../enlaces-de-ayuda/hooks/use-familia-de-enlaces'
import { usePanelDeEnlacePropio } from '../hooks/use-modal-de-propio'
import { EditorDeMisEnlacesDiferido } from './diferidos'

const EN_LA_TARJETA = 3
const TOPE_DEL_CONTEO = 20

// La tarjeta «Ayuda» de Perfil: los primeros enlaces que quien mira ve en su menú y cuántos; tocarla abre la lista en su modal
// (`?panel=enlaces-de-ayuda`) y «Agregar enlace propio», en el «⋯», el formulario de uno propio.
export function TarjetaDeMisEnlaces({ leidos }: { leidos: MisEnlacesLeidos }) {
  const familia = useFamiliaDeEnlaces(PANELES_DEL_PERFIL)
  const panel = usePanelDeEnlacePropio()
  const { locale } = useRegional()
  const elementos = armarMisElementos(leidos)
  const visibles = enlacesDelMenu(elementos)
  const ocultos = elementos.filter((uno) => uno.tipo === 'empresa' && uno.oculto).length
  const motivoDelTope =
    cuantosPropios(elementos) >= leidos.topePropios
      ? textoDelTopeDePropios(leidos.topePropios)
      : null
  const conteo = conteoCorto(conteoAcotado(visibles.length, TOPE_DEL_CONTEO), { locale })
  return (
    <>
      <TarjetaTocable
        titulo="Ayuda"
        accion="Elegir mis enlaces de ayuda"
        etiquetaDelMenu="Elegir mis enlaces…"
        motivo={null}
        abrir={familia.abrir}
        extra={[
          {
            tipo: 'accion',
            clave: 'nuevo',
            etiqueta: 'Agregar enlace propio',
            despuesDeCerrar: true,
            deshabilitada: motivoDelTope !== null,
            alElegir: panel.abrirNuevo,
          },
          ...(motivoDelTope === null
            ? []
            : [{ tipo: 'nota', clave: 'tope', texto: motivoDelTope } as const]),
        ]}
      >
        <ListaCorta
          filas={visibles.map((enlace) => ({
            id: enlace.clave,
            nombre: enlace.titulo,
            activo: true,
          }))}
          tope={EN_LA_TARJETA}
          vacio="Todavía no hay enlaces de ayuda."
        />
        {visibles.length > 0 || ocultos > 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {conteo} en tu menú
            {ocultos > 0 ? ` · ${String(ocultos)} ${ocultos === 1 ? 'oculto' : 'ocultos'}` : ''}.
          </p>
        ) : null}
      </TarjetaTocable>
      {familia.montar ? <EditorDeMisEnlacesDiferido leidos={leidos} /> : null}
    </>
  )
}

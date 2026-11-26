'use client'

import { conteoAcotado, conteoCorto } from '@/shared/lib/conteo'
import { useRegional } from '@/shared/ui/regional'
import { ListaCorta, TarjetaEditable } from '@/shared/ui/tarjetas-de-ajustes'
import {
  alTopeDeLaEmpresa,
  textoDelTopeDeLaEmpresa,
  type ListaDeEnlacesDeLaEmpresa,
} from '../../../entities/enlaces-de-ayuda'
import { PANELES_DE_LA_EMPRESA } from '../../../entities/paneles-de-enlaces-de-ayuda'
import { useFamiliaDeEnlaces } from '../hooks/use-familia-de-enlaces'
import { usePanelDeEnlaceDeLaEmpresa } from '../hooks/use-modal-de-enlace'
import { EditorDeEnlacesDeAyudaDiferido } from './diferidos'

// Cuántos se nombran en la tarjeta y desde cuántos se dice «20+».
const EN_LA_TARJETA = 3
const TOPE_DEL_CONTEO = 20

type Props = {
  lista: ListaDeEnlacesDeLaEmpresa
  // Sin `empresa.ajustes.gestionar`: la tarjeta no abre y el «⋯» lo dice.
  motivo: string | null
}

// La tarjeta «Enlaces de ayuda» de Configuración › Empresa: los primeros activos y cuántos hay; tocarla abre la lista en su modal
// (`?panel=enlaces-de-ayuda`) y «Nuevo enlace», en el «⋯», el formulario de uno nuevo. El editor se pide recién al abrir algún panel suyo.
export function TarjetaDeEnlacesDeAyuda({ lista, motivo }: Props) {
  const familia = useFamiliaDeEnlaces(PANELES_DE_LA_EMPRESA, motivo)
  const panel = usePanelDeEnlaceDeLaEmpresa()
  const { locale } = useRegional()
  const cuantos = lista.enlaces.length
  const conteo = conteoCorto(conteoAcotado(cuantos, TOPE_DEL_CONTEO), { locale })
  const motivoDelTope = alTopeDeLaEmpresa(lista) ? textoDelTopeDeLaEmpresa(lista.tope) : null
  return (
    <>
      <TarjetaEditable
        titulo="Enlaces de ayuda"
        motivo={motivo}
        abrir={familia.abrir}
        extra={
          motivo === null
            ? [
                {
                  tipo: 'accion',
                  clave: 'nuevo',
                  etiqueta: 'Nuevo enlace',
                  despuesDeCerrar: true,
                  deshabilitada: motivoDelTope !== null,
                  alElegir: panel.abrirNuevo,
                },
                ...(motivoDelTope === null
                  ? []
                  : [{ tipo: 'nota', clave: 'tope', texto: motivoDelTope } as const]),
              ]
            : []
        }
      >
        <ListaCorta
          filas={lista.enlaces.map((enlace) => ({
            id: enlace.id,
            nombre: enlace.titulo,
            activo: enlace.activo,
          }))}
          tope={EN_LA_TARJETA}
          vacio="Todavía no hay enlaces de ayuda."
        />
        {cuantos > 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            {conteo} {cuantos === 1 ? 'enlace' : 'enlaces'} en «Ayuda», desde el menú del perfil.
          </p>
        ) : null}
      </TarjetaEditable>
      {familia.montar && motivo === null ? <EditorDeEnlacesDeAyudaDiferido lista={lista} /> : null}
    </>
  )
}

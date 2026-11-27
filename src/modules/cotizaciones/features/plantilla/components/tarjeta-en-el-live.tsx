'use client'

import { useMemo, type ComponentType } from 'react'
import { lecturaEnCuadricula } from '../../../entities/plantilla/lectura-en-cuadricula'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import type { ReferenciaDeLaTarjeta } from '../../../entities/referencia-de-la-tarjeta'
import { SOLO_LECTURA_EN_EL_LIVE } from '../../../entities/solo-lectura-en-el-live'
import type { PropsDelLienzoDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'
import { useReferenciaDelLienzo } from '../hooks/use-referencia-del-lienzo'
import { AvisoDePantallaChica } from './cuadricula'

type Props = {
  editor: Pick<PropsDelEditor, 'inicial' | 'contexto' | 'tonos'>
  referencia: ReferenciaDeLaTarjeta
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
}

// La pestaña «Tarjeta» con el Modo Live encendido (Configuración de orígenes en «Sólo lectura»): en todo ancho, la tarjeta en sólo lectura de las pantallas chicas
// (el lienzo sin capa, con la referencia elegida) y su aviso; sin el editor (su código no se pide) ni los modales de publicar, descartar e información.
export function TarjetaEnElLive({ editor, referencia, Lienzo }: Props) {
  const { ejemplo } = useReferenciaDelLienzo()
  const lectura = useMemo(
    () => lecturaEnCuadricula(editor.inicial, editor.contexto, editor.tonos),
    [editor.inicial, editor.contexto, editor.tonos],
  )
  return (
    <AvisoDePantallaChica
      lectura={lectura}
      referencia={referencia}
      ejemplo={ejemplo}
      Lienzo={Lienzo}
      aviso={SOLO_LECTURA_EN_EL_LIVE}
    />
  )
}

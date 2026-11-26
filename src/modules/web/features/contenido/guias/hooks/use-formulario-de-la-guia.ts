'use client'

import { useId, useRef, useState } from 'react'
import { useRegional } from '@/shared/ui/regional'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { useSalidaConCambios } from '@/shared/ui/use-salida-con-cambios'
import {
  MOTIVO_SUBIENDO_IMAGENES,
  accionesDeLaBarra,
  estadoDeGuia,
  motivoDelCuerpo,
  motivoDePublicacion,
  tieneCuerpo,
  type GuiaCompleta,
} from '../../../../entities/contenido/guias'
import { useHaySubiendo } from '../../editor/bloques/subidas.client'
import { useEditorDeLaGuia } from '../../editor/use-editor-de-la-guia'
import { useAccionesDeLaGuia } from './use-acciones-de-la-guia'
import { useGuardarGuia } from './use-guardar-guia'
import { usePanelLateral } from './use-panel-lateral'
import { usePestanaDelPanel } from './use-pestana-del-panel'
import { useValoresDeGuia } from './use-valores-de-guia'
import { useVistaPreviaPorUrl } from './use-vista-previa-por-url'

type Opciones = { guia: GuiaCompleta; ahora: string; puedePublicarGuias: boolean }

// Todo lo que la página de una guía junta: lo escrito (con su borrador), guardar, el editor, el panel y su pestaña, la vista previa, la salida con
// cambios y las acciones de la barra. `FormularioDeGuia` sólo lo reparte entre sus partes.
export function useFormularioDeLaGuia({ guia, ahora, puedePublicarGuias }: Opciones) {
  const idDelTexto = useId()
  const enLinea = useEnLinea()
  const { zonaHoraria: zona } = useRegional()
  const valoresDeLaGuia = useValoresDeGuia(guia)
  const { valores, cambiar, hayCambios, descartar } = valoresDeLaGuia
  const guardado = useGuardarGuia({ guia, valores, alGuardar: valoresDeLaGuia.borrador.limpiar })
  const panel = usePanelLateral()
  const [pestana, ponerPestana] = usePestanaDelPanel()
  const vista = useVistaPreviaPorUrl()
  const [senalDeFoco, setSenalDeFoco] = useState(0)
  const refDeLasAcciones = useRef<HTMLDivElement>(null)
  const subiendo = useHaySubiendo()
  // Una foto que aún sube no cambia el documento, pero salir ahora la perdería: cuenta como cambio.
  const salida = useSalidaConCambios(hayCambios || subiendo, descartar, refDeLasAcciones)

  const rechazo = motivoDelCuerpo(valores.cuerpo)
  const errorDelCuerpo = guardado.errores['cuerpo'] ?? rechazo ?? undefined
  const editor = useEditorDeLaGuia({
    cuerpo: valores.cuerpo,
    alCambiar: (cuerpo) => {
      cambiar({ cuerpo })
    },
    deshabilitado: guardado.enCurso,
    etiquetaId: `${idDelTexto}-etiqueta`,
    errorId: errorDelCuerpo ? `${idDelTexto}-error` : undefined,
    invalido: errorDelCuerpo !== undefined,
  })

  const estado = estadoDeGuia(guia.publicadaEn, new Date(ahora))
  const situacion = {
    permitido: puedePublicarGuias,
    conCuerpo: tieneCuerpo(valores.cuerpo),
    enLinea,
    motivoDelCuerpo: rechazo ?? (subiendo ? MOTIVO_SUBIENDO_IMAGENES : null),
  }
  const abrirEnElPanel = (pestanaPedida: 'publicacion' | 'bloque') => {
    ponerPestana(pestanaPedida)
    panel.abrir()
  }
  const acciones = useAccionesDeLaGuia({
    guardar: guardado.guardar,
    enLinea,
    zona,
    alPedirProgramar: () => {
      abrirEnElPanel('publicacion')
      setSenalDeFoco((antes) => antes + 1)
    },
  })

  return {
    ...valoresDeLaGuia,
    guardado,
    panel,
    pestana,
    ponerPestana,
    vista,
    senalDeFoco,
    refDeLasAcciones,
    salida,
    editor,
    estado,
    zona,
    enLinea,
    idDelTexto,
    errorDelCuerpo,
    accionesDeLaBarra: accionesDeLaBarra(estado, situacion),
    motivoDePublicacion: motivoDePublicacion(estado, situacion),
    alAbrirOpciones: () => {
      abrirEnElPanel('bloque')
    },
    ...acciones,
  }
}

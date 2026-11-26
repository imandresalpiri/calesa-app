'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { GuiaCompleta, OpcionesDeGuia } from '../../../../entities/contenido/guias'
import { useFormularioDeLaGuia } from '../hooks/use-formulario-de-la-guia'
import { ArticuloDeLaGuia } from './articulo-de-la-guia'
import { BarraDeLaGuia } from './barra-de-la-guia'
import { ConfirmarEliminarGuia } from './confirmar-eliminar-guia'
import { VistaPreviaDeLaGuiaDiferida } from './diferidos-de-la-guia'
import { PanelDeLaGuia } from './panel-de-la-guia'
import type { PropsDePublicacion } from './pestana-publicacion'
import { PanelEnDrawer } from './panel-en-drawer'

type Formulario = ReturnType<typeof useFormularioDeLaGuia>

// Lo que la pestaña «Publicación» toma de la página.
function datosDePublicacion(
  f: Formulario,
  guia: GuiaCompleta,
  opciones: OpcionesDeGuia,
  ahora: string,
): PropsDePublicacion {
  return {
    guia,
    estado: f.estado,
    ahora,
    zona: f.zona,
    valores: f.valores,
    cambiar: f.cambiar,
    errores: f.guardado.errores,
    opciones,
    deshabilitado: f.guardado.enCurso,
    motivo: f.motivoDePublicacion,
    puedeProgramar: f.accionesDeLaBarra.enElMenu.some((a) => a.accion === 'programar'),
    alProgramar: f.alProgramar,
    senalDeFoco: f.senalDeFoco,
  }
}

export type PropsDeLaGuia = {
  guia: GuiaCompleta
  opciones: OpcionesDeGuia
  // El instante de la lectura (ISO): de él sale el estado de la guía.
  ahora: string
  // Tiene `web.guias.publicar` (lo decide la página con `puede()`); la base lo repite.
  puedePublicarGuias: boolean
}

// La página de una guía como un editor de bloques: la barra de arriba, el artículo (título y texto) y el panel con la publicación y las opciones del
// bloque. Quien la usa le pone de `key` la versión de la guía: lo guardado (aquí o por otra persona) la vuelve a montar desde la base, y con ello
// el deshacer y rehacer empiezan de nuevo.
export function FormularioDeGuia({ guia, opciones, ahora, puedePublicarGuias }: PropsDeLaGuia) {
  const f = useFormularioDeLaGuia({ guia, ahora, puedePublicarGuias })
  const conVistaPrevia = useAbiertoAlgunaVez(f.vista.abierto)
  const panel = (
    <PanelDeLaGuia
      pestana={f.pestana}
      alCambiarPestana={f.ponerPestana}
      editor={f.editor}
      deshabilitado={f.guardado.enCurso}
      publicacion={datosDePublicacion(f, guia, opciones, ahora)}
    />
  )
  return (
    <div className="grid">
      <BarraDeLaGuia
        editor={f.editor}
        publicadaEn={guia.publicadaEn}
        ahora={ahora}
        zona={f.zona}
        acciones={f.accionesDeLaBarra}
        motivo={f.motivoDePublicacion}
        enCurso={f.guardado.enCurso}
        panelAbierto={f.panel.abierto}
        salida={f.salida}
        refDeLasAcciones={f.refDeLasAcciones}
        alEjecutar={f.alEjecutar}
        alVerVistaPrevia={f.vista.abrir}
        alAlternarPanel={f.panel.abierto ? f.panel.cerrar : f.panel.abrir}
      />
      <div className="flex items-start">
        <div className="min-w-0 flex-1">
          <ArticuloDeLaGuia
            titulo={f.valores.titulo}
            alCambiarTitulo={(titulo) => {
              f.cambiar({ titulo })
            }}
            errorDelTitulo={f.guardado.errores['titulo']}
            editor={f.editor}
            deshabilitado={f.guardado.enCurso}
            etiquetaId={`${f.idDelTexto}-etiqueta`}
            errorDelCuerpo={f.errorDelCuerpo}
            idDelErrorDelCuerpo={`${f.idDelTexto}-error`}
            conflicto={f.guardado.conflicto}
            alRecargar={f.guardado.recargar}
            enLinea={f.enLinea}
            alAbrirOpciones={f.alAbrirOpciones}
          />
        </div>
        {f.panel.alLado ? (
          <aside
            data-panel-de-la-guia
            aria-label="Panel de la guía"
            inert={!f.panel.abierto}
            className={`sticky top-14 max-h-[calc(100dvh-3.5rem)] shrink-0 overflow-x-hidden overflow-y-auto border-s border-(--color-line) transition-[width] duration-200 motion-reduce:transition-none ${f.panel.abierto ? 'w-[320px]' : 'w-0 border-s-0'}`}
          >
            <div className="w-[320px] p-4">{panel}</div>
          </aside>
        ) : (
          <PanelEnDrawer abierto={f.panel.abierto} alCerrar={f.panel.cerrar}>
            {panel}
          </PanelEnDrawer>
        )}
      </div>
      {conVistaPrevia ? (
        <VistaPreviaDeLaGuiaDiferida
          abierto={f.vista.abierto}
          alCerrar={f.vista.cerrar}
          valores={f.valores}
        />
      ) : null}
      <ConfirmarEliminarGuia guia={guia} />
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { useAgregar } from '../hooks/use-agregar'
import { useAtajosDelEditor } from '../hooks/use-atajos-del-editor'
import { useCamara } from '../hooks/use-camara'
import { useDocumentoDelEditor } from '../hooks/use-documento-del-editor'
import { useHerramientaDelEditor } from '../hooks/use-herramienta-del-editor'
import { useMenuDelEditor } from '../hooks/use-menu-del-editor'
import { useTamanoDelLienzo } from '../hooks/use-tamano-del-lienzo'
import type { ManejoDelLienzo, PropsDelEditorDeArtes } from '../tipos'
import { AvisosEncimaDelLienzo } from './avisos-encima-del-lienzo'
import { AbiertoDesdeElMenu } from './barra/abierto-desde-el-menu'
import { BarraDelEditor } from './barra/barra-del-editor'
import { Herramientas } from './herramientas'
import { Inspector } from './inspector'
import { Lienzo } from './lienzo/lienzo'
import { PanelIzquierdo } from './panel-izquierdo'
import { CELDAS_DEL_EDITOR, REJILLA_DEL_EDITOR } from './rejilla'

// El editor de artes a pantalla completa (la raíz diferida): arma el estado y lo reparte por props. La barra arriba; abajo el riel de
// herramientas, «Agregar» y «Capas», el lienzo y el inspector «Diseño», con las medidas de `rejilla.ts` (las mismas que en frío).
export function EditorDeArtes(props: PropsDelEditorDeArtes) {
  const { plantilla, logos, motivoDeSoloLectura, personaId } = props
  const soloLectura = motivoDeSoloLectura !== null
  const lienzo = useRef<ManejoDelLienzo>(null)
  const documento = useDocumentoDelEditor({ plantilla, personaId, soloLectura, lienzo })
  const { editor, medidas, nombre, cambiarNombre, guardado, borrador } = documento
  const h = useHerramientaDelEditor(soloLectura)
  const [contenedor, setContenedor] = useState<HTMLElement | null>(null)
  const tamano = useTamanoDelLienzo(contenedor)
  const camara = useCamara(tamano, medidas)
  const agregar = useAgregar({ editor, camara, tamano, alAgregar: h.volverAMover })
  const menu = useMenuDelEditor(lienzo, nombre)
  useAtajosDelEditor({
    editor,
    lienzo,
    camara,
    alElegirHerramienta: h.elegir,
    alManoTransitoria: h.setManoTransitoria,
  })

  return (
    <div className={REJILLA_DEL_EDITOR}>
      <BarraDelEditor
        plantilla={plantilla}
        nombre={nombre}
        alCambiarNombre={cambiarNombre}
        motivoDeSoloLectura={motivoDeSoloLectura}
        guardado={guardado}
        hacer={menu.hacer}
      />
      <div className={CELDAS_DEL_EDITOR.riel}>
        <Herramientas herramienta={h.herramienta} alElegir={h.elegir} soloLectura={soloLectura} />
      </div>
      <div className={CELDAS_DEL_EDITOR.izquierda}>
        <PanelIzquierdo
          editor={editor}
          logos={logos}
          pestana={h.pestana}
          alCambiarPestana={h.setPestana}
          alAgregar={agregar}
          pedidoDeLaBiblioteca={h.pedidoDeLaBiblioteca}
        />
      </div>
      <section ref={setContenedor} aria-label="Lienzo" className={CELDAS_DEL_EDITOR.lienzo}>
        {tamano ? (
          <Lienzo
            ref={lienzo}
            editor={editor}
            logos={logos}
            herramienta={h.herramienta}
            manoTransitoria={h.manoTransitoria}
            alUsarHerramienta={h.volverAMover}
            camara={camara}
            tamano={tamano}
          />
        ) : null}
        <AvisosEncimaDelLienzo
          hayCambios={guardado.hayCambios}
          conflicto={guardado.estado === 'conflicto'}
          ofrecido={borrador.ofrecido !== null}
          alRecuperar={borrador.recuperar}
          alDescartarOfrecido={borrador.descartarOfrecido}
          alDescartarAlSalir={borrador.olvidar}
        />
      </section>
      <div className={CELDAS_DEL_EDITOR.derecha}>
        <Inspector editor={editor} logos={logos} formato={plantilla.formato} />
      </div>
      <AbiertoDesdeElMenu
        menu={menu}
        fuente={{ id: plantilla.id, nombre, formato: plantilla.formato }}
        documento={() => editor.estado.documento}
      />
    </div>
  )
}

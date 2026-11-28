'use client'

import { useConsultaDeMedios } from '@/shared/ui/use-consulta-de-medios'
import { textoDelFormato } from '../../../entities/formatos'
import type { PropsDelEditorDeArtes } from '../tipos'
import { AvisoDePantallaChica } from './aviso-de-pantalla-chica'
import { EditorDeArtesDiferido } from './diferidos'
import { MarcoDelEditor } from './marco-del-editor'

// `/artes/<id>`: debajo de 1024 px, el aviso (el editor se usa en una computadora); desde ahí, el editor. Lo decide el CSS (`lg:`) antes de
// hidratar, así nada salta; el código del editor se pide sólo si la pantalla es ancha (`useConsultaDeMedios`, falso en el servidor: ahí y al
// hidratar se dibuja el marco en frío).
export function PantallaDelEditor(props: PropsDelEditorDeArtes) {
  const ancha = useConsultaDeMedios('(min-width: 64rem)')
  const { plantilla } = props
  return (
    <>
      <div className="lg:hidden">
        <AvisoDePantallaChica nombre={plantilla.nombre} />
      </div>
      <div className="hidden lg:block">
        {ancha ? (
          <EditorDeArtesDiferido {...props} />
        ) : (
          <MarcoDelEditor
            nombre={plantilla.nombre}
            formato={textoDelFormato(plantilla.formato, plantilla)}
          />
        )}
      </div>
    </>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { avisarExito } from '@/shared/ui/toasts'
import { ConfirmarQuitar } from './confirmar-quitar'
import { filasDelCatalogo } from './filas-del-catalogo'
import { FormularioDelCatalogo } from './formulario-del-catalogo'
import { ListaDelCatalogo } from './lista-del-catalogo'
import { yaNoEsta } from './frases'
import type { PropsDelCatalogo } from './tipos'
import { useCatalogoEnDrawer } from './use-catalogo-en-drawer'
import { useQuitarPorUrl } from './use-quitar-por-url'

// El cuerpo del panel de un catálogo: el nombre (agregar o renombrar), la lista con su «⋯» y el diálogo de quitar. Sin permiso, la
// lista de sólo lectura con el motivo arriba: sin formulario ni Subir y Bajar. Viaja diferido.
export function CuerpoDelCatalogo(props: PropsDelCatalogo) {
  const { panel, catalogo, usos, operaciones, textos, maximoDelNombre, motivoSinPermiso } = props
  const prefijo = `catalogo-${panel}`
  const router = useRouter()
  const estado = useCatalogoEnDrawer(catalogo.lista, operaciones, textos)
  const quitar = useQuitarPorUrl(catalogo.lista, yaNoEsta(textos))
  useFocoTrasMover(prefijo, estado.movimiento)
  const soloLectura = motivoSinPermiso !== null

  const filas = filasDelCatalogo({
    lista: catalogo.lista,
    usos,
    textos,
    motivoSinPermiso,
    quehaceres: {
      alRenombrar: estado.nombre.empezarARenombrar,
      alActivar: (elemento, activo) => void estado.cambiarActivo(elemento, activo),
      alPedirQuitar: quitar.abrir,
    },
  })

  return (
    <div className="grid gap-4">
      {soloLectura ? <Aviso>{motivoSinPermiso}</Aviso> : null}
      {estado.conflicto ? (
        <AvisoDeConflicto
          mensaje={estado.conflicto}
          detalle="No se guardó nada. Recargar trae la lista de ahora; lo que escribiste en el nombre sigue acá."
          alRecargar={() => {
            estado.olvidarConflicto()
            router.refresh()
          }}
        />
      ) : null}
      {soloLectura ? null : (
        <FormularioDelCatalogo
          nombre={estado.nombre.nombre}
          alCambiar={estado.nombre.cambiar}
          editando={estado.nombre.editando}
          error={estado.nombre.error}
          enCurso={operaciones.enCurso}
          maximo={maximoDelNombre}
          alEnviar={() => void estado.nombre.enviar()}
          alCancelar={estado.nombre.cancelar}
        />
      )}
      <ListaDelCatalogo
        filas={filas}
        lista={catalogo.lista}
        hayMas={catalogo.hayMas}
        prefijo={prefijo}
        textos={textos}
        soloLectura={soloLectura}
        alAbrir={estado.nombre.empezarARenombrar}
        alMover={(elemento, direccion) => void estado.mover(elemento, direccion)}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {estado.anuncio}
      </p>
      <ConfirmarQuitar
        url={quitar}
        lista={catalogo.lista}
        usos={usos}
        textos={textos}
        prefijo={prefijo}
        enCurso={operaciones.enCurso}
        alQuitar={async (elemento, destino) => {
          const envio = await operaciones.quitar(elemento, destino)
          if (envio.ok) {
            avisarExito(textos.hechos.quitado)
          }
          return envio
        }}
      />
    </div>
  )
}

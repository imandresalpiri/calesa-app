import type { Metadata } from 'next'
import { leerDatosNuevosDeApibara, leerGruposDelOrigen, leerLayout } from '@/modules/origenes'
import { DatosNuevosDeApibara, EditorDeCampos } from '@/modules/origenes/pantallas/origen-campos'
import { datosO } from '@/shared/lib/errores'
import { abrirOrigen } from '../../abrir-origen'
import { NoSeAbre } from '../../no-se-abre'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Campos del origen' }

// Configuración › Orígenes › un origen › Campos: las casillas de dato clave, los datos comunes y los campos por grupo, con los desactivados
// a la vista, al final.
// En un origen de subasta, quien gestiona ve además lo que apibara trajo y el origen todavía no tiene como campo.
export default async function PaginaCamposDelOrigen({
  params,
}: PageProps<'/configuracion/origenes/[id]/campos'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const abierto = await abrirOrigen((await params).id, 'campos')
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  const { origen, puedeGestionar } = abierto
  const [layout, grupos, nuevos] = await Promise.all([
    leerLayout(origen.id, { conUso: false }),
    leerGruposDelOrigen(origen.id),
    origen.tipo === 'subasta' && puedeGestionar ? leerDatosNuevosDeApibara(origen.id) : null,
  ])
  const { campos } = datosO(layout)
  // Si no se pudo averiguar, el editor sigue: es un aviso, no la pantalla.
  const datosNuevos = nuevos?.ok ? nuevos.data : []
  return (
    <div className="grid min-w-0 gap-6">
      {datosNuevos.length > 0 ? (
        <DatosNuevosDeApibara origenId={origen.id} datos={datosNuevos} />
      ) : null}
      <EditorDeCampos
        origenId={origen.id}
        tipoDeOrigen={origen.tipo}
        campos={campos}
        grupos={datosO(grupos)}
        puedeGestionar={puedeGestionar}
        datosClave={origen.datosClave}
        versionDelOrigen={origen.actualizadoEn}
      />
    </div>
  )
}

'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import type { Permisos } from '@/shared/lib/permisos'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  cambiosDelCuadro,
  conSelectorDeLugar,
  filaDelCuadro,
} from '../../../../entities/cuadro-de-cotizaciones'
import type { OrigenDeLaMatriz } from '../../../../entities/matriz'
import type { RolConConcesiones } from '../../../../entities/rol'
import { useCuadro, type AvisoDelCuadro } from '../../hooks/use-cuadro'
import type { VersionesDeRoles } from '../../hooks/use-versiones-de-roles'
import { LeyendaDelCuadro } from './leyenda-del-cuadro'
import { ListaDelCuadro } from './lista-del-cuadro'
import { SelectorDelLugar } from './selector-del-lugar'
import { TablaDelCuadro } from './tabla-del-cuadro'
import type { AlCambiarDelCuadro, RolDelCuadro } from './tipos'

type Props = {
  roles: readonly RolConConcesiones[]
  origenes: readonly OrigenDeLaMatriz[]
  // Con qué se dibuja la dominancia: lo que la persona no tiene, no lo puede dar.
  misPermisos: Permisos
  puedeGestionar: boolean
  // Las versiones de los roles que comparte con la matriz (si no llegan, las suyas).
  versiones?: VersionesDeRoles
}

function detalleDelAviso(aviso: AvisoDelCuadro, rolNombre: string): string {
  return aviso.tipo === 'conflicto'
    ? `No se guardó nada en «${rolNombre}». Recargar trae cómo quedó.`
    : `En el rol «${rolNombre}».`
}

// «Quién crea y quién ve» (Configuración › Roles, resumen plegable del bloque «Cotizaciones»): por rol, si crea cotizaciones y cuáles ve, en «Todos los orígenes» o en un origen
// (`?origen=`). Cada elección escribe en la matriz de Roles por las mismas RPC; las reglas, en `entities/cuadro-de-cotizaciones.ts`.
// `?origen=` es `shallow`: la página no lo lee, y releerla entera por cambiar de origen no aporta nada.
export function QuienCreaYQuienVe({
  roles,
  origenes,
  misPermisos,
  puedeGestionar,
  versiones,
}: Props) {
  const [{ origen }, setParametros] = useQueryStates({ origen: parseAsString })
  const { aplicar, enCurso, aviso, recargar, recargando } = useCuadro(versiones)
  // Una sola vista, la que dice el ancho: la tabla desde 768 px y, por debajo, un renglón por rol.
  const enTabla = useAlMenos(CORTE_DE_LA_TABLA)
  const conSelector = conSelectorDeLugar(origenes.length, roles)
  const lugar = conSelector ? (origenes.find(({ id }) => id === origen)?.id ?? null) : null

  if (roles.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay roles"
        descripcion="Crea uno con «Nuevo rol» para decidir quién crea y quién ve cotizaciones."
      />
    )
  }

  const filas: RolDelCuadro[] = roles.map((rol) => {
    const fila = filaDelCuadro(misPermisos, puedeGestionar, rol.concesiones, lugar)
    const ocupado = enCurso?.rolId === rol.id
    return {
      rol,
      // Mientras guarda, lo elegido: un control controlado volvería al valor de antes hasta que llegue la pantalla nueva.
      fila: ocupado ? { ...fila, celda: { ...fila.celda, ...enCurso.objetivo } } : fila,
      ocupado,
      motivo: puedeGestionar ? fila.sinCambiar : null,
    }
  })
  const alCambiar: AlCambiarDelCuadro = (rol, objetivo) => {
    const cambios = cambiosDelCuadro(rol.concesiones, lugar, objetivo)
    if (cambios) void aplicar(rol, objetivo, cambios)
  }
  const rolDelAviso = aviso ? roles.find(({ id }) => id === aviso.rolId) : undefined

  return (
    <div className="grid gap-4">
      {conSelector ? (
        <SelectorDelLugar
          origenes={origenes}
          valor={lugar}
          alCambiar={(origenId) => void setParametros({ origen: origenId })}
        />
      ) : null}
      {aviso && rolDelAviso ? (
        <AvisoDeConflicto
          mensaje={aviso.mensaje}
          detalle={detalleDelAviso(aviso, rolDelAviso.nombre)}
          alRecargar={recargar}
          enCurso={recargando}
        />
      ) : null}
      <div className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        {enTabla ? (
          <TablaDelCuadro filas={filas} alCambiar={alCambiar} />
        ) : (
          <ListaDelCuadro filas={filas} alCambiar={alCambiar} />
        )}
      </div>
      <LeyendaDelCuadro enUnOrigen={lugar !== null} />
    </div>
  )
}

import type { ReactNode } from 'react'
import { puede } from '@/modules/equipo'
import {
  CLAVE_DE_PROYECTO_DE_LA_CADENA,
  esquemaDeLaCadena,
  destinoDelPanelDe,
  itemAbiertoDe,
  leerCadenaDeRepuestos,
  pedidoDeLaCadena,
} from '@/modules/repuestos'
import { CadenaDeRepuestos } from '@/modules/repuestos/pantallas/flujo-cadena'
import { datosO } from '@/shared/lib/errores'
import { leerFiltros } from '@/shared/lib/filtros'
import type { GrupoDeVistaYOpciones } from '@/shared/ui/filtros'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { PanelDelItem } from './panel-del-item'

type Props = {
  parametros: Record<string, string | string[] | undefined>
  permisos: Permisos
  // «Qué ver» en «Vista y opciones» (lo arma la página).
  opciones: readonly GrupoDeVistaYOpciones[]
  // Lo que va en la fila de filtros, junto a «Vista y opciones» (el ⚙ «Configurar»).
  acciones: ReactNode
}

// La vista «Cadena» de `/repuestos` (8.13-3): una lectura por fase con la sesión de quien mira (la página ya cortó sin `repuestos.ver`) y, con `?item=`, el panel del ítem. Una lectura que
// falla sube al `error.tsx` de `(app)` con «Reintentar». El instante de la lectura va al cliente: los días en la fase se cuentan contra él.
export async function ListadoDeLaCadena({ parametros, permisos, opciones, acciones }: Props) {
  const esquema = esquemaDeLaCadena()
  const filtros = pedidoDeLaCadena(
    leerFiltros(esquema, parametros),
    unParametro(parametros[CLAVE_DE_PROYECTO_DE_LA_CADENA]),
  )
  const cadena = datosO(await leerCadenaDeRepuestos(filtros))
  return (
    <>
      <CadenaDeRepuestos
        cadena={cadena}
        filtros={filtros}
        esquema={esquema}
        ahora={new Date().toISOString()}
        enlaceAFlujos={puede(permisos, 'repuestos.configurar')}
        opciones={opciones}
        acciones={acciones}
      />
      <PanelDelItem
        itemId={itemAbiertoDe(parametros)}
        destino={destinoDelPanelDe(parametros)}
        permisos={permisos}
      />
    </>
  )
}

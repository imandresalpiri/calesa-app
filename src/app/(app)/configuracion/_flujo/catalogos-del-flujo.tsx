'use client'

import { AnchorIcon, FileTextIcon, ReceiptIcon, ShipIcon, type LucideIcon } from 'lucide-react'
import { parseAsString, useQueryStates } from 'nuqs'
import { useEffect, type ReactNode } from 'react'
import {
  ACCION_NUEVO_TIPO,
  CLAVE_DE_ACCION,
  CLAVES_DEL_DRAWER_DE_CATALOGO,
  consultaParaAbrirUnCatalogo,
  queHacerConElPanel,
} from '@/modules/flujos/pantallas/catalogos-del-flujo'
import {
  CrearTipoDeDocumentoDiferido,
  type QuienCambiaLosTipos,
} from '@/modules/flujos/pantallas/documentos-nuevo'
import { CATALOGOS_DE_DINERO } from '@/modules/logistica/pantallas/dinero-catalogos'
import { CATALOGOS_DE_TRANSPORTE } from '@/modules/logistica/pantallas/transporte-catalogos'
import { esPanelDeCatalogo, type PanelDeCatalogo } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

const CLAVE_DEL_PANEL = 'panel'
const PARAMETROS = Object.fromEntries(
  [...CLAVES_DEL_DRAWER_DE_CATALOGO, 'fase', 'seccion'].map((clave) => [clave, parseAsString]),
)
const SIN_EL_DRAWER = Object.fromEntries(
  CLAVES_DEL_DRAWER_DE_CATALOGO.map((clave) => [clave, null]),
)

const BOTON = 'h-11 md:h-8'

// Los de logística, con su componente (de cliente, diferido); «Tipos de documento» es contenido de servidor (`children`).
const DE_LOGISTICA = [...CATALOGOS_DE_TRANSPORTE, ...CATALOGOS_DE_DINERO]
const TITULOS: Record<PanelDeCatalogo, string> = {
  puertos: 'Puertos',
  navieras: 'Navieras',
  'categorias-de-gasto': 'Categorías de gasto',
  'tipos-de-documento': 'Tipos de documento',
}
const ICONOS: Record<PanelDeCatalogo, LucideIcon> = {
  puertos: AnchorIcon,
  navieras: ShipIcon,
  'categorias-de-gasto': ReceiptIcon,
  'tipos-de-documento': FileTextIcon,
}

type Props = {
  // Los catálogos de esta pantalla, en orden: los cuatro en un origen; sólo «Tipos de documento» en el flujo de repuestos.
  disponibles: readonly PanelDeCatalogo[]
  // El origen de la pestaña (nulo en el flujo de repuestos) y si quien mira gestiona ahí los catálogos de logística.
  origen: { id: string; nombre: string } | null
  puedeCambiar: boolean
  // Quién cambia cada grupo de tipos: lo pregunta «Nuevo tipo de documento».
  quien: QuienCambiaLosTipos
  // Los tipos de documento: los dibuja el servidor sólo con `?panel=tipos-de-documento`; si no, su esqueleto.
  children: ReactNode
}

// Los catálogos arriba del diagrama: un botón por catálogo y **un** `<Drawer>` siempre montado (así se desliza) que muestra el de `?panel=`. Puertos,
// navieras y categorías se leen en el cliente al abrir (`shallow`); los tipos van al servidor. Abrir uno cierra la fase o la sección abierta; cerrar quita
// todas las claves del drawer. Un `?panel=` de un catálogo que esta pantalla no tiene, o de un modal viejo de los tipos, se limpia (sólo `panel`). «Nuevo tipo de
// documento» se monta aquí una vez (lo abre también un requisito de documento), la primera vez que la URL lo pide.
export function CatalogosDelFlujo({ disponibles, origen, puedeCambiar, quien, children }: Props) {
  const [url, escribir] = useQueryStates(PARAMETROS)
  const valor = url[CLAVE_DEL_PANEL] ?? null
  const que = queHacerConElPanel(valor, disponibles)
  const abierto = que === 'abrir'
  const mostrado = useUltimo(abierto && esPanelDeCatalogo(valor) ? valor : null)
  const nuevoTipo = useAbiertoAlgunaVez(url[CLAVE_DE_ACCION] === ACCION_NUEVO_TIPO)
  useVueltaDelFoco(CLAVE_DEL_PANEL, abierto)

  useEffect(() => {
    if (que === 'limpiar') {
      // Sólo `panel`: otra `?accion=` abierta (un tipo pedido desde un requisito) sigue.
      void escribir({ [CLAVE_DEL_PANEL]: null }, { history: 'replace', scroll: false })
    }
  }, [que, escribir])

  const abrir = (panel: PanelDeCatalogo) => {
    abrirConVuelta(
      CLAVE_DEL_PANEL,
      () =>
        escribir(consultaParaAbrirUnCatalogo(panel), {
          history: 'push',
          shallow: panel !== 'tipos-de-documento',
          scroll: false,
        }),
      abierto,
    )
  }

  return (
    <>
      <div role="group" aria-label="Catálogos" className="flex min-w-0 flex-wrap items-start gap-2">
        {disponibles.map((panel) => {
          const Icono = ICONOS[panel]
          return (
            <Button
              key={panel}
              type="button"
              variant="outline"
              aria-haspopup="dialog"
              className={BOTON}
              onClick={() => {
                abrir(panel)
              }}
            >
              <Icono aria-hidden />
              {TITULOS[panel]}
            </Button>
          )
        })}
      </div>
      <Drawer
        abierto={abierto}
        alCerrar={() => {
          void escribir(SIN_EL_DRAWER, { scroll: false })
        }}
        titulo={mostrado === null ? 'Catálogos' : TITULOS[mostrado]}
        ancho="amplio"
      >
        {mostrado === null ? null : (
          <ContenidoDelCatalogo
            panel={mostrado}
            origen={origen}
            puedeCambiar={puedeCambiar}
            tipos={children}
          />
        )}
      </Drawer>
      {nuevoTipo ? (
        <CrearTipoDeDocumentoDiferido origen={origen?.nombre ?? null} quien={quien} />
      ) : null}
    </>
  )
}

function ContenidoDelCatalogo({
  panel,
  origen,
  puedeCambiar,
  tipos,
}: {
  panel: PanelDeCatalogo
  origen: { id: string; nombre: string } | null
  puedeCambiar: boolean
  tipos: ReactNode
}) {
  if (panel === 'tipos-de-documento') {
    return tipos
  }
  const catalogo = DE_LOGISTICA.find((c) => c.clave === panel)
  if (catalogo === undefined || origen === null) {
    return null
  }
  const Componente = catalogo.componente
  return <Componente origen={origen} puedeCambiar={puedeCambiar} />
}

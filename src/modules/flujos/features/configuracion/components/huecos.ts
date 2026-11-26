import type { ComponentType, ReactNode } from 'react'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import type { SeccionDelPanel } from '../../../entities/panel-del-flujo'

type DelFlujo = { flujo: FlujoParaConfigurar }
type DelFlujoConHijos = DelFlujo & { children: ReactNode }
type DeUnaFase = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }
// Las salidas nombran roles: los lee `src/app` (`flujos` no importa `equipo`) y los entrega el panel (5.06).
type DeUnaFaseConRoles = DeUnaFase & { roles: readonly RolLeido[] }

// Los huecos de la pantalla de flujos (5.02): cada área de `flujos` llena el suyo en su paso, sin editar la pantalla. Son componentes **de cliente**
// opcionales (D14): lo que cruza de `src/app` a la pantalla sólo es serializable si lo es; vacío = nada dibujado. Los junta `src/app/(app)/configuracion/_flujo/huecos.ts`.
export type HuecosDelFlujo = {
  // Envuelve la franja y el flujo: lee «Revisar» una vez y da las marcas de cada fase (`ContextoDeMarcasDelDiagrama`).
  proveedorDeRevisar?: ComponentType<DelFlujoConHijos>
  // Sobre el flujo, la franja de avisos de «Revisar» (5.12).
  franjaDeRevisar?: ComponentType<DelFlujo>
  // Envuelve el flujo abierto: ordenar las fases con «Mover antes/después» (`ContextoDeOrdenDeFases`).
  ordenDeFases?: ComponentType<DelFlujoConHijos>
  // Envuelve el flujo abierto: guardar las posiciones de las fases en el diagrama y pedir una fase nueva en un punto (`ContextoDeFasesDelDiagrama`).
  diagramaDeFases?: ComponentType<DelFlujoConHijos>
  // Envuelve el flujo abierto: vincular dos fases arrastrando el asa, abrir y pedir quitar una salida desde su flecha (`ContextoDeSalidasDelDiagrama`).
  salidasDelDiagrama?: ComponentType<DelFlujoConHijos>
  // En la barra del flujo («Nueva fase» y sus modales, 5.04; también el de «Empezar con las fases de…»).
  accionesDeLaLista?: ComponentType<DelFlujo>
  // En lugar del vacío de un flujo sin fases: «Empezar con las fases de…» y «Empezar en blanco». Sin él, el vacío de siempre. De dónde copiar lo da
  // `useFlujosParaCopiar()`.
  sinFases?: ComponentType<DelFlujo & { nombreDelFlujo: string }>
  // El «⋯» de cada fila de la lista (5.04).
  accionesDeFila?: ComponentType<DeUnaFase>
  // Bajo el nombre de cada fila: las salidas como chips (5.06).
  salidasDeFila?: ComponentType<DeUnaFase>
  // Dentro del panel de una fase.
  bloques?: {
    // El «⋯» arriba a la derecha del panel (lo dibuja el `<Drawer>`): «Mover antes», «Mover después» y «Jubilar o eliminar».
    acciones?: ComponentType<DeUnaFase>
    // El cuerpo del panel en tres pestañas: «Reglas» (abre primero; lleva `reglas`, lo que dibujan los huecos de requisitos, salidas y reglas), «Identidad» y
    // «Ajustes» (un solo formulario). Sin él, el panel muestra `reglas` y una lectura de los datos, sin pestañas.
    pestanas?: ComponentType<DeUnaFase & { reglas: ReactNode }>
    salidas?: ComponentType<DeUnaFaseConRoles>
    requisitos?: ComponentType<DeUnaFase>
    // «Reglas que la afectan».
    reglas?: ComponentType<DeUnaFase>
  }
}

// Lo del flujo entero que se abre en el panel desde la barra (`?seccion=reglas|documentos`): su título y lo que dibuja el servidor (el esqueleto, si la URL
// todavía no lo pide). Sólo las que esta persona ve.
export type SeccionesDelPanel = Partial<
  Record<SeccionDelPanel, { titulo: string; contenido: ReactNode }>
>

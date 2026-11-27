// Todo `<Modal>` de `src/` que no es `ModalDeFormulario`, con lo que hace si se cierra con algo escrito (`.claude/rules/ui.md`,
// cierre 4). Un `ModalDeFormulario` pregunta («Tienes cambios sin guardar.»), no se cierra mientras guarda y dice sin conexión por
// construcción; un `<Modal>` suelto no hace nada de eso. Así que un `<Modal>` con un campo que se teclea o es `propio` (pregunta él:
// `useCierreConCambios()`, `<ConfirmarDescarte>` en su pie y `bloqueado` mientras actúa) o pasa a `ModalDeFormulario`; el que no
// guarda nada tipeado se registra con su motivo. `scripts/guardas/modales-con-salida.test.ts` falla si aparece un `<Modal>` que no
// está acá, si uno registrado ya no lo es, si un `propio` no hace las tres cosas, o si uno `sinFormulario` dibuja un `<form>`.
//
// `propio`: el modal pregunta por su cuenta.
// `sinFormulario`: por qué ese modal no guarda nada tipeado; `tambien` lista los componentes locales que dibuja (un `<form>` ahí
// también cuenta).
export type RegistroDeModal =
  { propio: true } | { sinFormulario: string; tambien?: readonly string[] }

export const MODALES: Record<string, RegistroDeModal> = {
  // --- web
  'src/modules/web/features/contenido/guias/components/vista-previa-de-la-guia.tsx': {
    sinFormulario:
      'sólo muestra cómo quedaría la guía (título, resumen y texto); lo escrito vive en la página de la guía, que guarda su borrador y pregunta al salir',
  },
  // --- leads
  'src/modules/leads/features/etiquetas/components/dialogo-de-etiquetas.tsx': { propio: true },
  'src/modules/leads/features/portal/components/dialogo-de-otorgar.tsx': { propio: true },
  'src/modules/leads/features/origenes/components/editor-de-origenes.tsx': {
    sinFormulario:
      'la lista de los orígenes del lead: «Nuevo», «Editar» y «Eliminar» abren su propio modal (con su aviso de cambios); nada tipeado en éste',
  },
  'src/modules/leads/features/tipos/components/editor-de-tipos.tsx': {
    sinFormulario:
      'la lista de los tipos de lead: «Nuevo», «Editar» y «Eliminar» abren su propio modal (con su aviso de cambios); nada tipeado en éste',
  },
  'src/modules/leads/features/tipos-de-seguimiento/components/editor-de-tipos-de-seguimiento.tsx': {
    sinFormulario:
      'la lista de los tipos de seguimiento: «Nuevo», «Editar» y «Eliminar» abren su propio modal (con su aviso de cambios); nada tipeado en éste',
  },
  'src/modules/leads/features/plantillas/components/modal-de-numeros-repetidos.tsx': {
    sinFormulario:
      'sólo lee los números repetidos de los leads (la lista y «Ver más»); nada tipeado que se pierda al cerrar',
  },
  'src/modules/leads/features/exportar/components/dialogo-de-exportar.tsx': {
    sinFormulario:
      'elige el separador del archivo y descarga: un selector, nada tipeado que se pierda al cerrar',
  },
  'src/modules/leads/features/oportunidades/components/aviso-de-oportunidades.tsx': {
    sinFormulario:
      'sólo lista las oportunidades que el lead ya tiene antes de crear: «Crear igual» sigue al formulario (ModalDeFormulario) y «Cancelar» cierra; nada tipeado',
  },
  'src/modules/leads/features/ficha/components/modal-de-datos-del-lead.tsx': {
    sinFormulario:
      '«Ver más» de la ficha: los datos del lead de sólo lectura; «Editar» abre el panel de edición (con su propio aviso de cambios)',
    tambien: ['src/modules/leads/features/ficha/components/telefonos-de-la-ficha.tsx'],
  },
  'src/modules/leads/features/listado/components/modal-de-accion-de-fila.tsx': {
    sinFormulario:
      'sólo dibuja los estados de carga, error y sin tipos; los formularios de anotar y agendar son ModalDeFormulario',
  },
  // --- logistica
  'src/modules/logistica/features/dinero/components/desglose-del-margen.tsx': {
    sinFormulario:
      'sólo muestra las cifras del margen de la unidad y lo real por categoría, como lo da la base; nada tipeado que se pierda al cerrar',
  },
  'src/modules/logistica/features/dinero/components/modal-de-pago.tsx': {
    sinFormulario:
      'el `<Modal>` es la lectura de un pago confirmado (sólo «Cerrar» y «Anular pago», que abre su drawer con el motivo); el pago que se edita va en un ModalDeFormulario',
    tambien: ['src/modules/logistica/features/dinero/components/lectura-del-pago.tsx'],
  },
  'src/modules/logistica/features/documentos/components/vista-previa-del-documento.tsx': {
    sinFormulario:
      'sólo mira el archivo de un documento; lo único tipeado es el motivo de un rechazo, una línea del pie que se reescribe y no cambia nada hasta enviarla',
  },
  'src/modules/logistica/features/documentos/components/vista-previa-local.tsx': {
    sinFormulario:
      'sólo mira un archivo de la bandeja de subida antes de confirmar; no hay nada tipeado que se pierda al cerrar',
  },
  // --- repuestos
  'src/modules/repuestos/features/items/components/modal-del-grupo.tsx': {
    sinFormulario:
      'un grupo de campos del ítem (`?editar=<grupo>`): cada celda guarda al pulsar Enter o al salir de ella (Esc la devuelve) y «Listo» sólo cierra; no hay borrador que se pierda',
  },
  // --- vehiculos
  'src/modules/vehiculos/features/subasta/components/actualizar-los-datos.tsx': {
    sinFormulario:
      'sólo confirma una consulta a apibara («Sí, actualizar» / «No, volver»); nada tipeado que se pierda al cerrar',
  },
  // --- shell
  'src/shared/ui/modal-del-enlace.tsx': {
    sinFormulario:
      'muestra el enlace de esta página, de sólo lectura, para copiarlo a mano cuando el portapapeles falla: nada tipeado que se pierda al cerrar',
  },
  'src/app/(app)/_shell/nuevo/modal-de-nuevo.tsx': {
    sinFormulario:
      '«Nuevo» de la barra: lista lo que se puede crear y, para un seguimiento o un recordatorio, busca y elige un lead; el texto de búsqueda no se guarda y elegir actúa al instante',
    tambien: ['src/modules/buscador/features/elegir-lead/components/elegir-lead.tsx'],
  },
  'src/app/(app)/_shell/ayuda/modal-de-ayuda.tsx': {
    sinFormulario:
      '«Ayuda» del menú del perfil: sólo lista los enlaces de ayuda de quien mira, que se abren en otra pestaña; nada tipeado',
    tambien: ['src/app/(app)/_shell/ayuda/lista-de-ayuda.tsx'],
  },
  // --- origenes
  'src/modules/origenes/features/campos/components/datos-nuevos-de-apibara.tsx': {
    sinFormulario:
      '«Ver cuáles» de los datos nuevos de apibara: sólo lista las rutas y un ejemplo de cada una; «Agregarlos» está en el aviso, fuera del modal',
  },
  // --- equipo
  'src/modules/equipo/features/equipo/components/invitar-persona.tsx': {
    sinFormulario:
      'dice qué pasó con la invitación y ofrece copiar el enlace; el formulario es un ModalDeFormulario aparte',
    tambien: [
      'src/modules/equipo/features/equipo/components/resultado-invitacion.tsx',
      'src/modules/equipo/features/equipo/components/enlace-invitacion.tsx',
    ],
  },
  'src/modules/equipo/features/equipo/components/enlace-de-persona.tsx': {
    sinFormulario: 'muestra un enlace generado para pasarlo a mano: de sólo lectura',
    tambien: ['src/modules/equipo/features/equipo/components/enlace-invitacion.tsx'],
  },
  'src/modules/equipo/features/perfil/components/modal-de-preferencias.tsx': {
    sinFormulario:
      '«Preferencias» del perfil: cada opción se aplica y se guarda al elegirla; no hay nada tipeado que se pierda al cerrar («Listo» sólo cierra)',
  },
  'src/modules/equipo/features/roles/components/avisos-de-roles.tsx': {
    sinFormulario:
      '«Avisos de <rol>» de la matriz de Roles: de sólo lectura, sin un campo que perder',
  },
  'src/modules/equipo/features/roles/components/modal-de-quien-crea.tsx': {
    sinFormulario:
      '«Quién crea y quién ve» de la matriz de Roles: cada elección (un interruptor o un selector) guarda al instante por las actions de la matriz; no hay nada tipeado que perder',
  },
  // --- flujos
  'src/modules/flujos/features/fases/components/resultado-de-la-copia.tsx': {
    sinFormulario:
      'lo que no se copió tras «Empezar con las fases de…»: de sólo lectura, la copia ya se hizo («Listo» sólo cierra)',
  },
  // --- notificaciones
  'src/modules/notificaciones/features/push/components/modal-de-notificaciones.tsx': {
    sinFormulario:
      '«Notificaciones» del perfil: cada interruptor y cada «Quitar» actúa al instante; no hay nada tipeado que se pierda al cerrar («Listo» sólo cierra)',
  },
  // --- cotizaciones
  'src/modules/cotizaciones/features/diseno/components/colores-del-catalogo.tsx': {
    sinFormulario:
      'la lista de los colores: «Nuevo color», «Editar» y «Eliminar» abren su propio modal (con su aviso de cambios); nada tipeado en éste',
  },
  'src/modules/cotizaciones/features/formula/components/informacion/modal-de-la-informacion.tsx': {
    sinFormulario:
      'sólo lee la publicada, el borrador y los avisos de la copia: «Descartar el borrador…» abre su <Confirmar> con URL y «Ocultar» borra los avisos; nada tipeado',
    tambien: [
      'src/modules/cotizaciones/features/formula/components/informacion/seccion-de-la-publicada.tsx',
      'src/modules/cotizaciones/features/formula/components/informacion/seccion-del-borrador.tsx',
      'src/modules/cotizaciones/features/formula/components/informacion/seccion-de-los-avisos.tsx',
    ],
  },
  'src/modules/cotizaciones/features/plantilla/components/modal-de-la-informacion-de-la-tarjeta.tsx':
    {
      sinFormulario:
        'sólo lee de dónde nace lo que se edita y la publicada del editor de la tarjeta; nada tipeado',
    },
  'src/modules/cotizaciones/features/historial/components/modal-del-historial.tsx': {
    sinFormulario:
      'el historial de cotizaciones del vehículo elegido, de sólo lectura: cada fila es un enlace a su cotización y «Ver más» agrega',
    tambien: ['src/modules/cotizaciones/features/historial/components/lista-del-historial.tsx'],
  },
  'src/modules/cotizaciones/features/listado/components/grupo/modal-del-grupo.tsx': {
    sinFormulario:
      'lista las cotizaciones de un vehículo, de sólo lectura; las casillas de «Comparar» no se guardan y elegir una línea abre su resumen',
    tambien: ['src/modules/cotizaciones/features/listado/components/grupo/linea-del-grupo.tsx'],
  },
  // El modo «Retocar» de la vista previa pregunta en el pie (useCierreConCambios, ConfirmarDescarte) y no se cierra mientras guarda.
  'src/modules/cotizaciones/features/tarjeta/components/vista-previa-de-la-tarjeta.tsx': {
    propio: true,
  },
  'src/modules/cotizaciones/features/tarjeta/components/compartir/panel-de-compartir.tsx': {
    sinFormulario:
      '«Compartir cotización»: la imagen y el texto de sólo lectura, con botones que eligen (imagen, formato, zona, fotos) y copian, descargan o comparten al instante; nada tipeado',
    tambien: [
      'src/modules/cotizaciones/features/tarjeta/components/compartir/texto-para-compartir.tsx',
      'src/modules/cotizaciones/features/tarjeta/components/compartir/imagen-para-compartir.tsx',
      'src/modules/cotizaciones/features/tarjeta/components/compartir/acciones-para-compartir.tsx',
    ],
  },
  'src/modules/cotizaciones/features/hoja/components/modal-de-avanzado.tsx': {
    sinFormulario:
      'dibuja celdas tipeables de la hoja, que confirman en la hoja y su borrador; cerrar o «atrás» las desmonta sin confirmar: un número abierto se confirma al perder el foco, lo demás se descarta, y Esc con una celda abierta cancela sólo la celda',
  },
  // --- empresa
  'src/modules/empresa/features/tipos-cambio/components/modal-de-monedas.tsx': {
    sinFormulario:
      'sólo lista las monedas de hoy: elegir una cierra el modal y abre su panel (con su propio aviso de cambios); nada tipeado',
  },
  'src/modules/empresa/features/enlaces-de-ayuda/components/editor-de-enlaces-de-ayuda.tsx': {
    sinFormulario:
      'la lista de los enlaces de ayuda de la empresa: «Nuevo enlace», «Editar» y «Quitar» abren su propio modal (con su aviso de cambios); nada tipeado en éste',
    tambien: ['src/modules/empresa/features/enlaces-de-ayuda/components/catalogo-de-enlaces.tsx'],
  },
  'src/modules/empresa/features/mis-enlaces-de-ayuda/components/editor-de-mis-enlaces.tsx': {
    sinFormulario:
      'la lista de los enlaces de ayuda de una persona: «Mostrar» y mover guardan al instante, y agregar o editar uno propio abren su propio modal (con su aviso de cambios); nada tipeado en éste',
    tambien: [
      'src/modules/empresa/features/mis-enlaces-de-ayuda/components/lista-de-mis-enlaces.tsx',
      'src/modules/empresa/features/mis-enlaces-de-ayuda/components/fila-de-mi-enlace.tsx',
    ],
  },
  // --- chat
  'src/modules/chat/features/conversaciones/components/modal-de-directa.tsx': {
    sinFormulario:
      'busca y elige a una persona: el texto de búsqueda no se guarda y elegir actúa al instante',
    tambien: ['src/modules/chat/features/conversaciones/components/buscador-de-personas.tsx'],
  },
  // --- tablero
  'src/modules/tablero/features/metricas/graficas/modal-de-la-tabla.tsx': {
    sinFormulario: 'sólo muestra en una tabla los números de una gráfica del tablero; nada tipeado',
  },
}

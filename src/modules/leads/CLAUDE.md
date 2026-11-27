# leads

Leads (prospectos y clientes) con teléfono principal único y enmascarado salvo cartera, **campos configurables** con quién los ve, seguimientos, recordatorios, etiquetas, favoritos/tachados, la cartera (compartir, transferir, quitar acceso y salir), la papelera, oportunidades en embudos, portal del cliente y limbo.

## Entra y sale

- Depende de `equipo` y `shared/lib/campos` + `shared/ui/campos`. **No** importa `origenes`, `empresa`, `cotizaciones`, `chat` ni `web`: lo que
  cruza módulos lo compone `src/app` por props o promesas.
- `index.ts` (sin componentes): `leerListadoDeLeads`, `leerFichaDeLead`, `leerLayoutDeLeads`, `leerVistaDeEmbudo`, `exportarLeadsEnCsv`,
  `leerPapeleraDeLeads`, `accionesDeCartera`, `puedeEditarLead`, `puedeGestionarPortal`; para «exportar todo» de `datos`: `leerCatalogosDeLead`,
  `camposDeExportacion`, `telefonoDeExportacion`, `valorDeExportacion`, `ENCABEZADO_DEL_NUMERO_GLOBAL` (una sola regla por tipo de campo).
  - `leerNombresDeLeads(ids)`: nombres de una página de `/cotizaciones` por `leads_vista_por_ids()` (invocadora: el que no se ve no se distingue del
    que no existe), hasta 100 ids, una vez por página.
  - `leerClienteElegido(id)`: `ok(null)` sólo si no se ve; un error es un error.
  - `leerLeadParaEnlazar(id)`: `{ id, nombre, numeros, enCartera }` de `leads_vista` por la clave primaria (`limit 1`), **nunca el teléfono**; `ok(null)`
    si no existe, está en la papelera o en el limbo, o no se ve (no se distinguen). La usan la cabecera de `/repuestos/[id]` y el `?lead=` de «Nuevo
    proyecto». Aparte de `leerClienteElegido` para no tocar la hoja de cotizar.
  - Bandeja de Inicio (`tablero`): `leerRecordatoriosDeHoy({ hasta, tope })` (mis pendientes, `recordatorios_vista`) y
    `leerLeadsSinSeguimiento({ creadosAntesDe, tope })` (mi cartera sin seguimiento y de más de 24 h, `leads_cartera_vista`); piden `tope + 1` y
    devuelven `{ filas, hayMas }` (`entities/bandeja.ts`: `finDeHoy()`, `creadoAntesDe()`, `rutaDeSeguimientos()`); `rutaDeLeadsSinSeguimiento()` (`/leads?sin_seguimiento=si`: el «Ver todos» de «Leads sin seguimiento»,
    sin `alcance`: abre «míos») es el filtro «Sin seguimiento» del listado (`entities/filtro-sin-seguimiento.ts`: la misma definición, sobre `leads_vista` y `leads_cartera_vista`; con «Todos» elegido a mano filtra lo que esa persona ve).
- Pantallas por `pantallas/<pantalla>.ts` (`listado`, `ficha`, `importar`, `papelera`, `configuracion`, `cotizar`,
  `turno`, `relacionados`, `proyecto-de-repuestos`; sólo `src/app`).
- `client.ts`: reglas puras, tipos, `<AltaDeLead>`, `normalizarTelefono()`, `interpretarBusqueda()`, `MINIMO_DE_BUSQUEDA` (para `buscador`), la
  action `completarRecordatorio` (panel `?recordatorio=` de `/agenda`; la RPC exige que sea de quien actúa) y lo puro de la importación de `datos`
  (`prepararFilas`, `preparadorDeFilas` por tramos con el mismo resultado que una pasada, `emparejarColumnas`, `convertir*`, `fecha*`, `usePaises`…):
  la importación total no tiene otras reglas.
- `shell.ts`: `<AltaDeLead>` (el drawer y la tecla `N`; el botón es «Nuevo» de la barra, `src/app/(app)/_shell/nuevo/`), `<ProveedorDeEscribirPorChat>`; `shell.client.ts`: `useAbrirNuevoLead()` (paleta y «Nuevo»; no `usePanelDeAlta()`) y `rutaDeAccionSobreUnLead()` (la ficha con su modal de seguimiento o recordatorio abierto, a donde «Nuevo» lleva tras elegir un lead).
- Rutas: `/leads`, `/leads/[id]` (`leads.ver`; la ficha en dos columnas, `FichaEnDosColumnas` de `shared`: a la izquierda, con su desplazamiento, la cabecera (el «⋯» a
  la derecha del nombre y `textoDeLaCartera()` debajo; `useCartera` vive en `lateral-de-la-ficha.tsx` y alimenta la línea y «Quién lo tiene»), «Datos» (los
  datos clave del lead, `entities/datos-clave-del-lead.ts`, y «Ver más» en `?ver=datos`: `modal-de-datos-del-lead.tsx`, diferido, con los grupos y los
  teléfonos de sólo lectura), «Quién lo tiene» y «Acceso al portal» (`accionesDelPortal()`: un botón principal y el resto en su «⋯»); a la derecha el índice y los cuatro bloques compactos de
  `entities/bloques-de-la-ficha.ts`, en orden de uso, cada uno por su permiso, tras su `<Suspense>` y con su propio `h2` (`tabIndex={-1}`) y una sola acción
  en él: «Seguimiento» (`ResumenDeSeguimientos`: el «+» de `mas-del-seguimiento.tsx` con `lineasDelMas()`, que sólo escribe el `?panel=`; el «⋯» con «Ver tus
  recordatorios»; tu recordatorio más próximo, `PRIMEROS_DE_RECORDATORIOS` = 1; los últimos 3 en línea de tiempo, `fila-de-seguimiento.tsx`; «Ver todos» es un
  drawer en `?todos=seguimientos|recordatorios`, con su propia clave), «Cotizaciones», «Vehículos» (el compacto de Relacionados, ancla `relacionados`) y
  «Oportunidades» (el **embudo del lead**, `entities/tablero-del-lead.ts`: una columna por etapa del embudo elegido con las oportunidades de este lead, hasta 3 por columna,
  que se arrastran de una columna a otra —`@dnd-kit` con mouse y teclado, en `tablero-del-lead.tsx` detrás de `diferido()`— o se mueven con «Mover a» del «⋯» de cada tarjeta, la
  única forma en el celular; el selector de embudo sólo con más de uno y su elección se recuerda por persona en `leads.embudo_de_la_ficha`; «Nueva» en el título y, a su lado, el «⋯» del bloque
  con «Ver en el embudo», el embudo filtrado por el lead, que también va al pie si algo no se dibuja).
  `?seccion=datos|seguimientos|vehiculos|oportunidades|cotizaciones|portal` lleva al bloque (`anclaDeLaSeccion()`: «vehiculos» es «Vehículos») y le da el foco
  al título; «Cotizaciones» (con `cotizaciones.ver` en algún origen, sin mirar la cartera) la compone `src/app` con su título y «Cotizar»
  (`leads/[id]/bloque-cotizaciones.tsx`) y `cotizaciones/pantallas/lead`; la composición vive en `src/app/(app)/leads/[id]/bloques.tsx`), `/leads/papelera`,
  `/leads/importar` (`leads.crear`), `POST /leads/exportar` (`leads.exportar`), `/configuracion/leads` (`leads.configurar`: `ConfiguracionDeLeads`, seis tarjetas con su modal por `?panel=`, `features/configuracion/` y los `features/` de cada una;
  Tipos de lead, Orígenes, Seguimientos, Embudo, Mensaje del portal y Teléfonos extra con su «Números repetidos») y `/configuracion/leads/campos` (`EditorDeCamposDeLead`,
  `leads.campos.gestionar` con las `lead_campo_*`; el grupo de un campo se elige del catálogo `leads_campos_grupos`, que la página lee con
  `leerGruposDeCampos()` y el combo amplía con `crearGrupoDeCampos`, sin revalidar: `hooks/use-grupos-de-campos.ts`; el drawer «Grupos»,
  `?panel=grupos&quitar=<id>`, con `agregarGrupoDeCampos`, `guardarGrupoDeCampos`, `moverGrupoDeCampos` y `quitarGrupoDeCampos`, que revalidan
  `/configuracion/leads`). Los paneles de cada tarjeta, por familia: `entities/paneles-de-la-configuracion.ts`. El Mensaje del
  portal usa `EditorConVariables` de `shared`.
  Los teléfonos se administran en el panel de edición (la ficha sólo los lee, en los datos clave y en «Ver más»): «Cambiar el principal» (cartera y `leads.editar`, sólo en la ficha;
  apagado con cambios escritos) pasa a `?panel=cambiar-telefono` reemplazando la entrada; «Agregar teléfono» es `?extra=nuevo` dentro del panel. Con la cartera y
  `leads.telefonos_extra.editar` sin `leads.editar`, «Editar teléfonos» abre el mismo panel en modo teléfonos («Teléfonos de <nombre>», sólo los teléfonos).
  Todo modal en `?panel=` (`PANEL_*`); los de una fila llevan `para=<id>`.
- La lista lleva a la ficha, sin resumen: la fila, la tarjeta y la tarjeta del kanban (a `?seccion=oportunidades`) son enlaces (`EnlaceDeLaFila` en el nombre,
  `href` en `FilaDeLista`/`TarjetaDeLista`, `manejadoresDelClic` en el kanban, cuyo `<Link>` lleva `data-enlace-de-la-fila`). Con `?vista=embudo`, `?lead=`
  es el **embudo filtrado por lead** (`entities/embudo-del-lead.ts`, `rutaDelEmbudoDelLead()`); en la lista, `?lead=` no hace nada.
  `leerVistaDeEmbudo` lo valida con `leerLeadParaEnlazar` (el que no se ve vuelve `leadIgnorado` y la vista lo quita con `replace`); el chip
  (`ChipDelLead`) ocupa el lugar de la búsqueda, que no aplica.
- «Nueva oportunidad…» del «⋯» (`?panel=oportunidad-rapida&para=<id>` en la lista y el kanban; sin `para` en la ficha, `NuevaOportunidadDelLead`;
  `features/oportunidades/components/modal-de-oportunidad-rapida.tsx`): sólo `leads.editar` y el lead en la cartera, como anotar y agendar. Primero el aviso de las que el lead
  ya tiene (`leerOportunidadesDelAviso`: `lead_oportunidades` con `LEIDAS_PARA_EL_AVISO` = 6, al abrir, sin cuenta; «Crear igual» sigue y si no lee, igual deja crear;
  con una abierta en el embudo por defecto, `crearIgual()` lo apaga con su motivo y «Abrir esa» al lado: `entities/oportunidad-unica.ts`) y
  después título (el nombre del lead) y monto; la base pone el embudo por defecto de quien mira (lo crea si no lo tiene) y su etapa inicial. Sin vehículo ni notas: el
  listado no lee los vehículos del lead (`entities/oportunidad-rapida.ts`). «Ver oportunidades» (lead en la cartera, sin `leads.editar`): `rutaDeLasOportunidadesDe()`.
- Hoja de cotizar: `<BarraDelCliente>` (baja, como la del vehículo: 44 px, 36 con puntero fino, en la fila de la cabecera de la hoja; con `obligatorio`: sin cliente elegido, una etiqueta «Obligatorio» propia, no `<Badge>`, que arrastra Base UI a la carga en frío; `pantallas/cotizar` también saca `PANEL_DEL_CLIENTE`, que la página pasa a la hoja para su «Elegir el cliente») y su panel (`features/panel-para-cotizar/`, `?panel=cliente&clase=&buscar=&cursor=`: «míos» por
  `reciente_en` o búsqueda por nombre o `#n`; elegir escribe `?lead=` con `history: 'replace', shallow: false`; lecturas del navegador en
  `infra/panel-para-cotizar.client.ts`). Con el Modo Live (`enElLive`, lo decide `src/app` con `barraDelClienteEnElLive()` de `equipo`): `'apagado'`, la misma
  caja con `aria-disabled` y «Se elige al salir del Modo Live», sin panel; `'nombres'`, el panel con `soloNombres` (pide sólo `id, nombre` y el instante del
  cursor, sin pestañas de clase, sin buscar por número y sin «Nuevo lead»). El «+» del panel abre el alta con `?panel=nuevo-lead&elegir=<clave>` (`claveParaElegir()`: 1 a 20 minúsculas, ni
  `panel` ni `elegir`): `usePanelDeAlta()` entrega `paraElegir` y `elegirElCreado(id)`, el aviso va sin «Abrir ficha» y el foco vuelve a la barra
  (`data-elige`); si el teléfono ya es de un lead que se ve, su aviso ofrece «Elegir» (`alElegir` = `elegirElCreado`). «Cotizar lead» del «⋯» de la ficha:
  `paraCotizar`, de `src/app`.
- «Nuevo lead» del formulario «Nuevo proyecto» de repuestos: `pantallas/proyecto-de-repuestos` saca `useAbrirAltaParaElegir(clave)`, que escribe
  `?panel=nuevo-lead&elegir=<clave>` con `replace` y adelanta el alta (una clave que `claveParaElegir()` no acepta no abre nada). La pantalla deja antes
  su `?nuevo=proyecto` para volver a dibujarse; el creado vuelve en `?lead=<id>`. No suma JS: el alta ya viaja con el shell.
- «Vincular a lead» de un turno de la web (`features/vincular-turno/`, `?panel=vincular-turno&turno=<id>`): elegir llama `alElegir(leadId)` y decide
  `src/app/(app)/_inicio/vincular-turno.tsx`; «+» abre el alta con `?elegir=vincular` y vuelve con `?vincular=<id>`.
- «Escribirle por chat» (`features/chat/`): en el aviso «Lo tiene <persona>» del teléfono principal, enlace a `/chat?con=<duenoId>` sólo si el layout
  dijo `chat.participar` (falso por omisión) y la base mandó `dueno_id`. La base decide si se puede (`chat_directa`).
- **«Relacionados» en el lead** (`vehiculos` lo dibuja con el título «Vehículos» y «Vincular o marcar»; `leads` no lo importa): `FichaDeLead` recibe el nodo `relacionados` (el bloque «Vehículos» de la columna derecha, con `GestionDeVehiculosDelLead` al pie).
  `pantallas/relacionados.ts` reexporta el selector de leads (`PanelParaVincularDiferido`, con `titulo?`) para «Vincular a un lead» y «Marcar un interesado» de un vehículo.
- Sin código: `getLead()`, `buscarLeads()`, `<ChipLead>`, `telefonoDe(leadId)`.

## Archivos clave

- `entities/campo.ts` (`CampoDeLead`, con `minimo`/`maximo`; `CLAVES_RESERVADAS_DE_LEAD`, espejo de `_lead_clave_reservada()`),
  `entities/telefono.ts` (espejo de la SQL, probado en PGlite), `entities/documento.ts` (lista blanca, espejo de `_seguimiento_detalle()`).
- Alta: `entities/alta.ts` (`validarAlta()`), `features/alta/` (un drawer; contexto al abrirse, `infra/contexto-de-alta.client.ts`). El aviso de
  guardado sale cuando el envío terminó (`useTrasElEnvio()` encola, `useSoltarTrasElEnvio(tras, enCurso)` suelta; también el panel de etapas;
  `vehiculos` tiene una copia).
- Listado: `entities/filtros.ts`, `fuente-del-listado.ts`, `candidatos.ts`, `infra/queries/listado.ts` (`buscarLeads`, `contarLeadsHasta`). Ficha:
  `entities/ficha.ts`, `edicion.ts`, `infra/ficha.ts`.
- `features/seguimientos/`, `features/recordatorios/`, `features/marcas/components/menu-de-lead.tsx` (el «⋯», que dibuja la lista única
  de `entities/acciones-de-lead.ts` con `lineas-del-menu-de-lead.tsx`; fila y tarjeta de la lista por `listado/components/menu-de-la-fila.tsx`, kanban por
  `menu-de-lead-del-embudo.tsx`, ficha por `acciones-de-la-ficha.tsx`). «Cotizar lead» y «Ver actividad» llevan a otros módulos que `leads` no conoce:
  `src/app/(app)/leads/rutas-del-menu.ts` arma sus rutas una vez por página con `MARCADOR_DE_LEAD` en el lugar del id y cada fila pone el suyo
  (`rutaDelLead()`, `entities/ruta-por-lead.ts`). «Editar lead» fuera de la ficha: `?panel=editar-lead&para=<id>` (`useEdicionDesdeLaLista`,
  `<EdicionDesdeLaLista>`, diferido) lee el lead al abrirse (`infra/ficha.client.ts`, `lead_ficha`) y dibuja el panel de la ficha; cartera, papelera, portal, embudo, oportunidades: `entities/<x>.ts` + `infra/<x>.ts`.
- «Visto»: el listado y el kanban del embudo marcan el lead (`ProveedorDeMarcasDeVisto` de `equipo/client`, contexto leads); la tarjeta del kanban lleva `data-visto` y el sufijo en el enlace al lead
  (`idsDeLeadsDelTablero`: los primeros 200 leads del tablero). La ficha del lead lo registra (`RegistrarVisto`).
- CSV: `entities/exportacion.ts`, `entities/importacion/`, `infra/importacion.ts`. Catálogos: `leads_catalogos()`, una llamada para listado, ficha y
  exportación. Números: `@/shared/lib/numeros-de-lead`.

## Tablas

`leads` (`atributos`, `atributos_publicos`, `cartera`), `leads_campos`, `leads_campos_grupos` (glosario «Grupo de campos»), `leads_telefonos`, `leads_asesores`, `leads_favoritos`, `leads_tachados`,
`etiquetas`, `leads_etiquetas`, `tipos_seguimiento`, `seguimientos`, `recordatorios`, `embudos`, `embudos_etapas`, `oportunidades`, `accesos_portal`,
`origenes_lead`, `tipos_lead`, `importaciones`, `ajustes_leads` (fila única: plantillas del embudo y del mensaje del portal, y los teléfonos extra:
máximo y regla); `lotes_papelera` es compartida.

**Papelera con causa:** `_lead_bloqueo(l, al_enviar) → {causa, motivo}` (`_lead_motivo_de_bloqueo` es su texto); el 23514 de `leads_papelera_enviar` lleva
la causa en `hint` (`errorConCausa()`), y `entities/avisos-de-lead.ts` la vuelve acciones del aviso («Ver los vehículos» con un solo lead).

**Sólo se leen; se escriben por RPC:** `leads` (`crear_lead`, `lead_guardar`; `telefono_principal` sólo `crear_lead` y `cambiar_telefono_lead`),
`leads_telefonos` (`lead_telefono_*`), `leads_asesores` (`lead_compartir|transferir|revocar_acceso|salir`), marcas (`lead_*_poner`, `etiqueta_*`), y
`seguimiento_*`, `recordatorio_*`, `embudo_*`, `oportunidad_*`, `origen_lead_*`, `tipo_lead_*`, `tipo_seguimiento_*`, `lead_campo_*` (con
`lead_campo_grupo_crear|guardar|mover|eliminar`),
`leads_papelera_*`, `leads_importar_lote`, `otorgar_portal`, `ajustes_leads` (`embudo_plantilla_guardar`, `portal_mensaje_guardar`,
`telefonos_extra_ajustes_guardar`: `leads.configurar`, PT409 con versiones independientes `embudo_actualizado_en`, `portal_actualizado_en` y
`telefonos_actualizado_en`). Lecturas: `ajustes_leads_leer()` (sin permiso), `lead_telefonos_leer()` (sin uso en la app; sus pruebas SQL siguen),
`verificar_telefono_extra()` (al tipear un extra), `telefonos_extra_choques()` (`leads.configurar`: por cursor sobre `leads_telefonos_pkey`, hasta 10.000
filas por llamada, enmascarada), `leads_vista`, `leads_cartera_vista`, `lead_ficha()`, `leads_candidatos()` + `leads_vista_por_ids()`, `lead_oportunidades()` (invocadora,
por cursor, de a 20 y hasta 100, por `oportunidades_lead_abiertas_idx` y `oportunidades_lead_cerradas_idx`; la ficha lee la primera página de 10 (abiertas primero) y
las reparte por etapa del embudo elegido; en la primera página, `abiertas_por_embudo`), `embudo_tablero_del_lead()` y `embudo_etapa_pagina_del_lead()` (invocadoras, el embudo filtrado por lead, por
`oportunidades_lead_etapa_idx`).

## No se rompe

- **Último contacto del listado:** `leads_vista` (y `leads_cartera_vista`) trae `ultimo_seguimiento_visible` `{tipo_id, titulo}` y `proximo_recordatorio`
  `{id, titulo, recordar_en}`: subconsultas con `limit 1` por `seguimientos_lead_fecha_idx` (igualdad con `ultimo_seguimiento_en`) y
  `recordatorios_lead_pendientes_idx`, invocadoras (la RLS decide). Sólo se entrega el seguimiento si es el que marca `ultimo_seguimiento_en`; un último
  privado ajeno deja la fecha y nada más (`entities/ultimo-contacto.ts`, `supabase/tests/areas/leads/ultimo-contacto.sql`). El tipo se nombra con
  `leads_catalogos().tipos_de_seguimiento`. Una columna más a `leads_vista` pasa por `medir-leads-ultimo-contacto.sql`. El listado no ordena por esto.
- **Privados recortados en la base:** un campo `solo_cartera` y el teléfono completo sólo llegan a quien tiene el lead en su cartera, también con
  «todos» (incluido el dueño: deliberado). `leads.atributos` y `telefono_principal` sin grant: la app lee `leads_vista`. Falla cerrada: a un ajeno
  sólo llegan claves que el layout conoce como no privadas. Un privado ajeno no se encuentra filtrando.
- **Clase 1** (editar, teléfonos, seguimientos, recordatorios, portal, vehículos): cartera **y** permiso, vía `puede_actuar_lead()` o `_lead_mio()`,
  nunca `puede_lead(…, 'leads.editar')`; limbo, papelera, ajeno e inexistente dan el mismo `42501`. **Clase 2** (compartir, transferir, quitar,
  salir): el dueño o, con «todos», quien lo ve; nadie se da acceso a sí mismo (salvo `crear_lead` con `adoptar`). **Clase 3** (papelera): el permiso
  con su alcance; purgar pide `leads.papelera.purgar`. Toda RPC que recibe un lead figura en `supabase/tests/auditoria-leads.sql`.
- **`lead_guardar` es la única puerta de edición** y exige `actualizado_en` (`PT409`). La versión la mueven sólo nombre, tipo, origen, atributos,
  teléfono o papelera (`lead_version()`): una columna derivada nueva se suma fuera. `atributos` es un parche y nunca guarda un nulo.
- **`crear_lead(p_id, …)`:** con la oportunidad base (`_lead_oportunidad_base`, también en las importaciones); idempotente por `p_id`; un duplicado es un valor (`existe`, `de_otro`, `limbo`); adoptar exige `adoptar: true`.
- **Teléfono:** único entre vivos; se busca por nombre y por número (`#124`), **nunca por teléfono** (oráculo). El máximo de extras
  (`ajustes_leads.telefonos_extra_maximo`, 0 a 20, 6 de fábrica) lo aplica «agregar», no el cambio ni rotular ni quitar. Con «Extras como el
  principal» (`telefonos_extra_como_principal`) un extra es único entre vivos: lo valida `_lead_verificar` (que heredan alta, importar, cambiar el
  principal, verificar y restaurar) con un candado por número, siempre después del de la fila del lead y sólo con la regla encendida; los duplicados
  de antes quedan. Los extras piden `leads.telefonos_extra.editar` + cartera (clase 1); el principal, `leads.editar`.
- **Marcas:** de quien mira, `poner(valor)` y nunca alternar, sin versión, sin tocar `leads`. Embudos personales; oportunidades clase 1.
- **Una abierta y viva por lead y embudo:** la guarda `_oportunidad_abierta_unica` (22023, `hint` `embudo_id`, el id de la abierta en `detail`) en
  `oportunidad_crear`, `oportunidad_mover` (al reabrir) y `oportunidad_restaurar` (una abierta). Candados: lead → embudo → oportunidad → (lead,
  embudo). La base del alta no falla (si ya hay una abierta, no crea otra); transferir y guardar etapas no pasan por la guarda; `oportunidad_guardar`
  no cambia de embudo. Las duplicadas de antes quedan. `lead_oportunidades` trae en su primera página `abiertas_por_embudo`.
- **Un origen o tipo de lead con leads se desactiva, no se elimina.** Siempre queda un tipo activo de cada clase; la clase no cambia. **Se razona
  por la clase, nunca por nombre o clave**. Un campo con datos no cambia de tipo ni se elimina.
- **Seguimientos:** privado = sólo su autor; el detalle es un documento validado contra la lista blanca, nunca HTML ni `innerHTML`.
- **CSV:** exportar sólo la cartera (`en_cartera = true`), tope 5.000, 5 por hora, apóstrofo ante `= + - @`. Importar pasa cada fila por
  `validarAlta()` y no adopta del limbo. `FILAS_POR_LOTE` (50) lo vigila `scripts/guardas/lote-de-importacion.test.ts`.
- **Portal:** la clave se ve una vez y nunca cruza registro, URL ni almacenamiento (`logging.serverFunctions` apagado); `otorgado_en` es la versión.
  El texto para WhatsApp sale de `ajustes_leads.portal_mensaje` (`aplicarMensaje()`, una pasada; `validarMensajeDelPortal()`, espejo de
  `_portal_mensaje_normalizar`); nulo = el de fábrica de `entities/portal-mensaje.ts`. Lo lee `leerAjustesDeLeads()`.
- **Visibilidad:** `_lead_visible_para(eliminado_en, cartera, alcance, yo, fuera)`; una función que lee `leads_asesores … revocado_en is null` entra
  al inventario de `humo.sql` o filtra con `_bajas_en_curso()`.
- **`leads_asesores.lead_reciente_en`** copia `coalesce(ultimo_seguimiento_en, creado_en)` en **todas** las filas del lead, también las revocadas
  (compartir revive por `on conflict`). La llena `leads_asesores_creado_en()`, la sigue `leads_reciente_seguir()` y
  nadie más la escribe (`leads_asesores_creado_en_guarda()`); las vistas la exponen como `reciente_en`. Un `insert` con triggers apagados nombra las
  dos copias.
- Ningún componente decide qué número mostrar: el global si llegó, si no el propio.
- **Recordatorios:** avisa el job `recordatorios-notificar` (cada minuto, `recordatorios_notificar()`), una vez por hora fijada. La `ruta` nombra el
  lead sólo si su dueño aún lo tiene vivo en la cartera; si no, `/agenda?recordatorio=<id>`. Cambiar la hora reemplaza el aviso abierto.
- **La cartera avisa:** `lead_compartir` deja `lead_compartido` a quien recibe; `lead_transferir`, `lead_transferido` al destino; `sin_cambios` no
  avisa y repetir reemplaza el abierto. Ningún aviso lleva teléfono, número ni nombre del lead
  (`supabase/tests/areas/notificaciones/avisos-de-cartera.sql`).

## Ojo

- Un resultado de RPC se pone sólo dentro de lo cargado (`ponerEnLaVentana()`).
- Búsqueda y campos van por `leads_candidatos()` (`security definer`): `condicionesDeLaPagina()` **quita** lo que ya cumplen (repetirlo cambia el
  plan). `_leads_vista_crear()` define `leads_vista` y `leads_cartera_vista`: nada de `drop view` a mano. `atributos_lead()` lleva `COST 20000`.
- La tabla de países (`entities/paises/`) sólo con `import()`; un lead no cambia de país al cambiar un teléfono.
- Los e2e que insertan leads con el cliente de servicio completan los requeridos (`e2e/soporte/leads.ts`).
- Las carreras se prueban en `pnpm db:carreras`, no en `db:probar`.

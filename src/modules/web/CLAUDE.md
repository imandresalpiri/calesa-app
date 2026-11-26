# web

Lo que el CRM configura para la web pública y el portal del cliente: ajustes del sitio, guías, FAQs, testimonios con consentimiento, cola web round-robin («turnos»), vistas y RPC del esquema `web`, revalidación on-demand.

Abiertos que la tocan: la IP real tras la reescritura del sitio, **8-05a** (vincular una solicitud ya contactada) y **8-14a** (los turnos de Inicio con
sólo `web.cola.participar`), en `docs/PENDIENTES.md`.

## Entra y sale

- Entra: Configuración › Sitio web, editor de guías y legales (un documento de ProseMirror con lista blanca: el HTML lo deriva la base, nunca se guarda HTML escrito), «Contacté» desde la campana, disponibilidad desde el perfil; desde afuera, el repo del sitio llama `web.solicitar_asesor`, `web.portal_login`, `web.portal_snapshot`.
- Sale: `leerDireccionPublica()` (`ajustes_web.direccion_publica`, nula si nadie la configuró; la usa el WhatsApp del portal en la página del lead).
  `areas/sitio/index.ts`: `leerAjustesDelSitio()`, `leerVehiculosQueDejanDeVerse(orígenes)`, `AjustesDelSitio`. `areas/portal/index.ts` (para
  `app/api/portal/*`): `ipDelPedido()`, `mismoOrigenDelPortal()`, `portalDisponible()`, `firmarSesionDelPortal()`, `leerSesionDelPortal()`,
  `contarIntentoDelPortal()`, `ingresarAlPortal()`, `leerEstadoDelPortal()`, `urlDeDocumentoDelPortal()`, `cambiarClaveDelPortal()`,
  `direccionDelSitioParaElPortal()`, `COOKIE_DEL_PORTAL`, `DURACION_DE_LA_SESION_S`, `opcionesDeLaCookieDelPortal()`, `SesionDelPortal`.
  `areas/turnos/index.ts`: `leerMisTurnos({ tope, desde? })` (por cursor `(vence_en, id)`: `CursorDeMisTurnos`, `cursorDelTurno()`), `rutaDelPanelDeTurnos()` (`/?panel=turnos`), `confirmarContacto`;
  `areas/turnos/client.ts`: `<TarjetaTurno>`, `<ActualizarAlVolver>`, `confirmarContacto`, `PANEL_DE_TURNOS` y las claves de URL del panel (los usan el bloque de Inicio de `tablero` y la campana).
  **Panel de turnos** (`features/turnos/panel/`, `pantallas/turnos-inicio.ts`: `PanelDeTurnosDiferido`; `src/app/(app)/_inicio/panel-de-turnos.tsx` lo monta con `?panel=turnos`): el «Ver todos» del bloque
  «Turnos de la web sin confirmar». Lee en el navegador (`infra/turnos/mis-turnos.client.ts`, la misma `consulta-de-mis-turnos.ts` que el servidor) todos mis turnos `asignada` y `vencida` de a 20 con «Ver más» por cursor,
  hasta 200 (`TOPE_DE_TURNOS_CARGADOS`) y entonces `<AvisoDeTope>`; relee la primera página al volver a la pestaña; cada turno es una `<TarjetaTurno>` con «Contacté» (lo quita de la lista) y «Vincular a lead»
  (reemplaza `?panel=turnos` por `?panel=vincular-turno`).
- Depende de: `vehiculos`, `leads`, `equipo`.

## Archivos clave

- **Áreas**: `sitio`, `contenido`, `cola`, `turnos`, `portal` y el `nucleo`, en `features|entities|infra/<área>/`, `areas/<área>/{index,client,composicion}.ts`
  y `pantallas/<área>.ts`; las entradas de la raíz sólo hacen `export *` de cada área. Lo nuevo va en su área; **un área no importa otra y el núcleo no
  importa ningún área** (lo vigila `scripts/guardas/areas-b/areas-de-web.test.ts`). Una pantalla cuyo nombre no dice su área (`perfil` → `turnos`,
  `sitio-legales|guias|faqs|testimonios` → `contenido`) va en `PANTALLAS_DE_AREA` de la guarda.
- **Sub-rutas de Configuración › Sitio web**: una por parte (`/configuracion/web/{ajustes,legales,guias,faqs,testimonios}`), registradas en
  `src/app/(app)/configuracion/web/seccion.ts` (menú, frase y permisos); cada una importa su pantalla de `pantallas/sitio-{ajustes,legales,guias,faqs,testimonios}.ts`.
  `/configuracion/web` abre la primera que la persona puede. Ajustes y Legales son tarjetas con lo
  guardado a la vista y un modal por tarjeta (`?panel=`; `@/shared/ui/tarjetas-de-ajustes`, `useEnvioConVersion()`), igual que la política de la cola
  (`TarjetaDeLaPolitica` y su modal, abajo). Ajustes y Legales comparten la versión de `ajustes_web`: cada action revalida las dos rutas.
- `turnos`: `infra/turnos/mis-turnos.ts` lee `limit 6` **filtrado por `usuario_id` a mano** (la RLS deja ver todas a quien gestiona la cola); el título sale
  de `web.vehiculos` (un vehículo que dejó de ser público va sin título). «Contacté» va en un toque sin «Deshacer»; «Vincular a lead» por
  `?panel=vincular-turno&turno=`, montado en `src/app/(app)/_inicio/vincular-turno.tsx` con el panel de `leads`. En `/perfil` (`pantallas/perfil.ts`; las tarjetas «Turnos de la web» y «Tu ficha en la web», esta con su modal `?panel=ficha`):
  `cambiarDisponibilidad` escribe sólo `cola_web_asesores.disponible` de la fila propia (apagado con `motivoSinInterruptor`); `guardarFicha` escribe
  directo bajo la RLS seis columnas de `perfiles` con `actualizado_en` como versión; `entities/turnos/ficha.ts` (`esWhatsapp`, `esHandle`) espeja el
  check de la base.
- `contenido`: `entities/contenido/doc.ts` (+ `doc-nodos.ts`): `htmlDelDocumento()`, espejo de `_web_doc_html()` (la lista blanca del documento y su
  HTML); `doc.casos.ts` corre contra los dos en `doc.test.ts` (PGlite). Imagen = `{ruta, alt}` relativa al bucket `web`: sale `<img data-ruta alt>` y el
  sitio arma la URL. `documento-limpio.ts` reduce lo de Tiptap a esa lista (la frontera sigue siendo la base). **El editor** es propio del área
  (`features/contenido/editor/`, `EditorDeDocumento`, diferido; no importa el de `leads`; los legales lo usan con `imagenes={false}`): la imagen sólo va en
  el primer nivel y sólo lee `img[data-ruta]`. **Dos modos**: el de los legales (texto, títulos, listas, citas y enlaces) y el de la **guía**
  (`use-editor-de-la-guia.ts`, `extensiones.ts` con `modo === 'guia'`), que suma cuatro bloques de primer nivel con su forma JSON: `horizontalRule`,
  `gallery {imagenes: [{ruta, alt}]}` (1 a 12), `button {texto, href}` y `video {url}` (sólo el enlace canónico de YouTube o Vimeo, sin `<iframe>`). Sus
  nodos están en `editor/bloques/`; el catálogo de lo que «/» ofrece es `entities/contenido/bloques-de-la-guia.ts` (`BLOQUES_DE_LA_GUIA`,
  `filtrarBloques`, `destinoAlMover`) y la vista previa es `entities/contenido/vista-previa.ts` (`htmlParaLaVistaPrevia`, el mismo HTML que da la
  base). **La lista blanca está espejada TS↔SQL** (`doc.ts`/`doc-nodos.ts`/`doc-bloques.ts` y `_web_doc_html()`, `_web_doc_galeria|boton|video`): un
  bloque nuevo se suma en los dos y en `doc.casos.ts`. Los legales no llevan separador, galería, botón ni video (la base los rechaza con hint
  `legales`). Las imágenes de una galería cuentan en `storage_refcount('web', …)` y `quitarSiHuerfano` las limpia al guardar o eliminar. Las subidas
  pendientes viven fuera del documento (`subidas.client.ts`, de a 2): una imagen sin `ruta` no se guarda y «Guardar» espera a que terminen.
- `contenido` › guías: `/configuracion/web/guias/[id]` (`pantallas/guia.ts`, `web.contenido.gestionar`; publicar, programar y despublicar piden además
  `web.guias.publicar`, que la action comprueba antes). **La pantalla es un editor de bloques** (`features/contenido/guias/components/formulario-de-guia.tsx`,
  `use-formulario-de-la-guia.ts`): `BarraDeLaGuia` fija arriba (volver, deshacer/rehacer, estado, «Vista previa», `AccionesDePublicacion`: la principal, la de
  al lado y el «⋯»; `accionesDeLaBarra()` de `entities/contenido/guias.ts` dice cuáles y su motivo), `ArticuloDeLaGuia` (el título grande sin etiqueta visible,
  su nombre es «Título», y `LienzoDeLaGuia`) y `PanelDeLaGuia` con las pestañas «Publicación» (`?pestana=`) y «Bloque». El panel va al lado con
  `localStorage` `guia:panel` (`panel-lateral.ts`) y debajo de 1024 px es un `<Drawer>` `?panel=lateral`; la vista previa, un `<Modal ancho="completa">`
  `?panel=vista-previa`. **`key={guia.actualizadoEn}` en la página reinicia el editor tras guardar: deshacer y rehacer no cruzan un guardado.**
  `motivoDelCuerpo` (la misma regla de la base) frena el guardado y la publicación en el cliente: un botón o un video mal escritos no viajan. Salir con
  cambios pregunta en la propia barra (`useSalidaConCambios`). `infra/contenido/guias-escritura.ts`: `update … where actualizado_en = <esperado>` (cero filas =
  conflicto o «ya no existe»), nunca manda `cuerpo_html` ni `minutos_lectura`. Al guardar o eliminar se quitan del bucket `web` las imágenes y la portada
  que ya no están (`quitarSiHuerfano`); una subida nunca guardada queda huérfana (deuda aceptada). Categorías: panel `?panel=categorias` de «Guías»
  (el campo de la guía es un `<ComboDeCatalogo>` que también la crea: `crearCategoriaDesdeLaGuia`, sin revalidar);
  legales: `/configuracion/web/legales` (`web.ajustes.gestionar`, `guardarLegales`: uno o los dos documentos; cada modal manda el suyo).
- `contenido` › FAQs y testimonios: lecturas con tope 100 + 1; actions con `web.contenido.gestionar`. La categoría de una FAQ se elige del
  catálogo `web_categorias_faqs` (`leerCategoriasDeFaq()`, `<ComboDeCatalogo>` con «Crear categoría «x»»: `crearCategoriaDeFaq`, sin revalidar); el
  drawer «Categorías» (`?panel=categorias&quitar=<id>`, `features/contenido/categorias-de-faq/`) con `agregar|guardar|mover|quitarCategoriaDeFaq`, que
  revalidan: escritura directa con la versión, mover por `ordenesTrasMover()` y quitar por `web_categoria_faq_eliminar`. La foto de un testimonio
  (`foto-de-testimonio.client.ts`) va a WebP, sube por hash al bucket `web` y se limpia con `quitarSiHuerfano`.
- `cola`: `/configuracion/cola-web` (`pantallas/cola.ts`): una página a todo el ancho con «Sin asignar», «En la rueda» (con «Agregar a la rueda» junto al título y, dentro, los
  grupos de las habilitadas que hoy no reciben turnos) y «Política de la cola», cada una con su título (`SeccionDeLaCola`) y sus tarjetas en `REJILLA_DE_TARJETAS`
  (`auto-fill`; el esqueleto de `src/app` repite la clase porque no importa `@/modules/web`). `entities/cola/orden-de-la-rueda.ts` (`ordenDeLaRueda`) es **espejo documentado** del paso 5
  de `web.solicitar_asesor`, con test: la base decide, esto sólo dibuja. La política se lee en `infra/cola/` porque un área no importa `sitio`. **Todo se edita en un
  modal por URL**, pedido con `diferido()` al abrirse por primera vez: la política (`?panel=politica`, `TarjetaDeLaPolitica`: tarjeta clicable con un botón sr-only y su «⋯»
  «Editar política…»; `ModalDeLaPolitica` con `useEnvioConVersion`, siempre las cinco claves), la persona (`?panel=editar-en-la-rueda&para=<usuarioId>`, `ModalDeEditarEnLaRueda`) y
  «Quitar de la rueda» (`?panel=quitar-de-la-rueda&para=<usuarioId>`, `<Confirmar>`; `usePanelesDeLaRueda(filas)` resuelve la fila de `para` y avisa «Esa persona ya no está en la
  rueda» si ya no está). La tarjeta de una persona (`TarjetaDeLaPersona`) sólo lleva su «⋯»; las de «Sin asignar» no llevan «⋯» ni clic hasta que haya una acción.
  «Agregar a la rueda» (`?panel=agregar-a-la-rueda&q=`; la búsqueda la lee `src/app` con `leerEquipo` sólo con el panel abierto y si quien mira ve el equipo) y
  «Quitar» con «Deshacer» van por `cola_web_configurar`, que acepta todo `smallint` en prioridad y orden (los rangos angostos son del formulario).
- `portal`: `infra/portal/{cookie,secreto,rpc}.ts`, `entities/portal/{sesion,ip}.ts`; rutas `app/api/portal/{ingresar,estado,documentos/[id],clave,salir}`
  (con `_comun.ts`; las recorre `e2e/portal-api.spec.ts`).
- Revalidar lo hace la base (cola `interno.web_revalidar_pendiente`, triggers `web_revalidar`, job `web-revalidar`); sin `infra/revalidar.ts` ni variables
  de entorno. Dirección (`integraciones.config.revalidar_url`) y secreto (Vault `integracion:web_publica`) se cargan en Configuración › Empresa ›
  Integraciones › Web pública (módulo `empresa`, que también hace «Probar»).
- **Contrato con el sitio** (revalidar): `POST <revalidar_url>` con `Content-Type: application/json` y `Authorization: Bearer <secreto>`; cuerpo
  `{"etiquetas": [...]}` con `guias|faqs|testimonios|ajustes|asesores|vehiculos`, ordenadas y sin repetir; `{"etiquetas": []}` es «Probar». El receptor
  compara el secreto en tiempo constante y responde 2xx. A lo sumo un pedido por minuto y sólo a `https://`; sin reintentos; apagar la integración no avisa.

## Tablas

`ajustes_web`, `web_categorias_guias`, `web_guias`, `web_faqs`, `web_categorias_faqs`, `web_testimonios`, `cola_web_asesores`, `solicitudes_contacto_web`, `eventos_web`; `interno.portal_intentos` (el límite por IP del portal: huella con sal, sin la IP). Vistas `web.vehiculos`, `web.asesores`, `web.guias`, `web.faqs`, `web.testimonios`, `web.ajustes`; `public.estado_cola_web`.
RPC: `web_ajustes_guardar`, `web_categoria_faq_eliminar` (quita una categoría de FAQ; con preguntas, las mueve antes), `web_testimonio_consentir`, `web_testimonio_retirar`, `puede_estar_en_la_rueda(uuid)`, `web.solicitar_asesor`, `web.registrar_evento`, `web.portal_login/snapshot/documento_ruta/cambiar_clave`, `web.portal_intento(ip)` y `web.portal_direccion_publica()` (sólo `service_role`), `portal_intentos_purgar` (job `portal-intentos-purgar`, cada 5 min), `web_confirmar_contacto` (sólo escribe `lead_id` en `asignada`/`vencida`), `web_expirar_solicitudes` (job `web-expirar-solicitudes`, cada 5 min, 200 por corrida; desde la app sólo `service_role`), `cola_web_configurar`, `cola_web_tablero` y `cola_web_solicitudes(estado, cursor)` (las dos con `web.cola.gestionar`, `{filas, hay_mas}`; el tablero trae **todas** las habilitadas con `en_la_rueda` y `cuenta_activa` aparte, sin el WhatsApp; las solicitudes por `solicitudes_contacto_web_estado_creado_idx`, título desde `web.vehiculos`, sin token, UTM ni lead).

## No se rompe

- El `WHERE` y la lista de columnas de cada vista `web.*` **son** la frontera de seguridad (security_invoker = false, grant a `anon`): nunca exponer costos,
  teléfono, VIN ni rutas de un bucket privado. Las rutas que sí salen (`imagen`, `miniatura`, `logo_ruta`, avatares, portadas) son de buckets públicos. Las
  RPC del portal sólo a `service_role`.
- `web.vehiculos` es `interno.vitrina_vehiculos where visible`: esa vista interna es la única definición de «qué es público de un vehículo», y de ella sale
  también la vista previa del CRM (`vehiculo_vitrina_previa()`). Columnas: `id, numero, origen, origen_nombre, titulo, marca, modelo, anio, categoria,
precio, precio_hasta, precio_nota, destacado, atributos` (sólo los campos `publico_web` activos del layout), `imagen` y `miniatura` (la portada),
  `actualizado_en`. Una columna más es una columna a la vista de cualquiera: va con su razón en `docs/DECISIONES.md`.
- Un vehículo se ve si está publicado (`vehiculo_vitrina()`, de `vehiculos`), no está en la papelera, su fase está activa y publica, su origen está activo
  y en `ajustes_web.origenes_visibles`, y la integración `web_publica` está activa.
- La rueda avanza al asignar; quien no confirma en `ajustes_web.ttl_contacto_minutos` pierde el turno y se reasigna a quien no estuvo en la cadena.
  `unassigned` es la métrica que más importa.
- Guías, FAQs y testimonios nacen despublicados. Un testimonio exige consentimiento: `consent_*` sólo lo escriben `web_testimonio_consentir` y
  `web_testimonio_retirar` (con versión; retirar despublica), y `trg_web_testimonio_consentimiento` rechaza publicar sin el trío (22023 hint `publicado`).
  Cambiar `cliente`, `texto` o `foto_ruta` de uno consentido anula el consentimiento y lo despublica; cambiar `ciudad` o `vehiculo` apaga su permiso. La
  interfaz avisa antes y no manda `publicado` en ese caso (lo apaga el trigger). Sin orden manual ni trigger de limpieza de la foto.
- **Los ajustes de la web se escriben sólo por `web_ajustes_guardar(versión, cambios)`** (`authenticated` no tiene `update` sobre `ajustes_web`): claves
  ausentes no cambian; las del sitio piden `web.ajustes.gestionar`, las de la política de la cola (`cola_activa`, `ttl_contacto_minutos`, `dias_pegajoso`,
  `max_abiertas_default`, `max_intentos`) `web.cola.gestionar` o `web.ajustes.gestionar`; `PT409`; errores 22023 con la clave en `hint`. `legales` =
  `{terminos|privacidad: {titulo, doc, html, actualizado_en}}`: `trg_web_ajustes_legales` rehace `html` y `actualizado_en`, escriba quien escriba.
- Cada formulario manda sólo sus claves y comparten la versión de la fila (guardar en otra pestaña da conflicto y «Recargar»): **la política de la cola**,
  siempre sus cinco y ninguna del sitio (`cambiosDePolitica`: con sólo `web.cola.gestionar`, una clave del sitio daría 42501); **cada legal**, sólo
  `legales` y sólo su documento (el otro no viaja: la base conserva su texto y su fecha; un documento ya guardado no se puede vaciar); **cada tarjeta de
  «Ajustes»**, todas las claves del sitio (`entradaDeAjustes()` parte de lo guardado y la tarjeta cambia lo suyo: la base reemplaza `redes` y `seo`
  enteras), conservando un origen visible inactivo (`origenesAGuardar`). Una tarjeta sin cambios no escribe: guardar cierra. La versión llega por props al
  abrir el modal y nunca va en su `key`; el `PT409` deja «Recargar» (`useEnvioConVersion`) y conserva lo tipeado. El aviso de un origen apagado (Vitrina)
  cuenta de `web.vehiculos` (`limit 51`: con la web apagada no avisa). Los legales guardan borrador en `sessionStorage` (un texto largo). Un legal está
  «Publicada» al guardarse y «Sin publicar» si nunca se escribió: no hay borrador ni programación (las guías sí).
- «Agregar a la rueda» relee `puede_estar_en_la_rueda` tras `cola_web_configurar` para avisar «Quedó habilitada, pero su rol no recibe turnos de la web.»
- El **orden de las categorías** reescribe `orden` 0..n−1 con un `upsert` sin versión (la última gana); borrar una categoría con guías lo impide la action,
  no la base (`on delete set null`).
- **El HTML de una guía lo deriva la base**: el editor escribe `web_guias.cuerpo_doc` y `trg_web_guia_cuerpo` pone `cuerpo_html` y `minutos_lectura` con
  `_web_doc_html()` y `_web_doc_minutos()` (lo que llegue en `cuerpo_html` se pisa; publicar recalcula). Una guía sin documento conserva su HTML
  despublicada. Las imágenes del cuerpo cuentan en `storage_refcount('web', …)`.
- **FAQs y testimonios se escriben directo bajo la RLS con la versión esperada** (`.eq('actualizado_en', …)`; 0 filas = relee y dice conflicto, ya no
  existe o sin permiso), salvo `consent_*`. La respuesta de una FAQ es texto plano (el sitio la escapa) y la categoría, una categoría de FAQ del catálogo (nombre único normalizado
  por `trg_catalogo_nombre`, igual que en `web_categorias_guias`; `web.faqs` sigue entregando el nombre); mover renumera 0…n−1
  en el servidor (no atómico).
- `eventos_web` no guarda IP ni user agent: sólo el token anónimo; purga a 12 meses.
- **El límite por IP del portal no guarda la IP**: `web.portal_intento(p_ip)` la guarda como huella HMAC-SHA256 con la sal `portal:sal` de Vault, que
  nunca sale de la base; 10 intentos por ventana fija de 15 min (cuenta todo intento, también los buenos), el 11.º da `false`. Lo prueba
  `supabase/tests/areas/portal/limite-por-ip.sql`. La IP es la primera de `x-forwarded-for` (`ipDelPedido`): **supone Vercel** o un proxy que pise la
  cabecera; con otro alojamiento el cliente la elige y el límite se salta.

## Ojo

- El sitio es otro repo (`sitio-marketing`) sobre el mismo Supabase; cambiar una columna de `web.*` rompe su tipado a propósito: avisar en `docs/DECISIONES.md`.
- El esquema `interno` no se expone en PostgREST y ningún rol de la app tiene `usage`: ahí vive lo que comparten la web y el CRM. Nada de `interno` se lee
  desde la app si no es por una función `definer` o una vista de `web`.
- **El contrato del portal** (firmas de `web.portal_*`, la cookie con `otorgado_en`, las respuestas idénticas del login, lo que el cliente nunca ve) está
  en `docs/DECISIONES.md`. Las cuatro reciben el `otorgado_en` del login y no entregan nada si el acceso cambió; `portal_documento_ruta` devuelve una ruta
  privada: `urlDeDocumentoDelPortal` la firma por 60 s y la ruta nunca va en un cuerpo ni en un error (sí dentro de la URL firmada).
- **`infra/portal/rpc.ts` es el único archivo del portal con el cliente admin** (lo cuida el lint): sólo `web.portal_*` y la URL firmada de `documentos`;
  un admin nuevo por llamada. El secreto de la cookie lo ata `areas/portal/composicion.ts` y no sale del área.
- **El contrato HTTP del portal**: el sitio reescribe `/api/portal/*` hacia el CRM (cookie de primera parte); los POST exigen el `Origin` del CRM o el de
  `ajustes_web.direccion_publica`; todo fallo de `ingresar` da el mismo 401, el 11.º intento 429 con `Retry-After: 900`; una sesión que no vale, 401 y la
  cookie borrada; sin `PORTAL_COOKIE_SECRETO`, 503. Cada handler llama `connection()` antes que nada (si no, con `cacheComponents` un GET se
  prerenderizaría con el 503 del build).
- **La cookie lleva `otorgado_en` como texto**, tal cual lo dio `portal_login`: nunca por `Date` (perdería los microsegundos y `_portal_vigente` compara por
  igualdad). La firma se compara como texto base64url. La IP del límite se agrupa en `contarIntentoDelPortal` (IPv6 a su /64).
- **Quién está en la rueda** = `habilitado` (sobre la persona, de `cola_web_configurar`) **y** `web.cola.participar` por alguno de sus roles, con la cuenta
  activa y sin bloqueo, WhatsApp cargado y, para un turno nuevo, `disponible`. La regla del rol y de la cuenta es **una sola función**,
  `puede_estar_en_la_rueda(uuid)`: la consultan la rueda (5), el pegajoso (4), la reasignación al vencer, el turno ya abierto (3: si quien lo tiene no
  puede, el reloj no se reinicia y vence a su hora) y `estado_cola_web`. Se evalúa **al repartir**: quitar el permiso saca a la persona al instante sin
  tocar `habilitado`. Un turno ya asignado sigue hasta su cierre (`web_confirmar_contacto` no mira el permiso). El contacto directo por handle
  (`es_directa`) no es la rueda: lo gobierna `publico_web`. Una función nueva que reparta a alguien **debe** llamar `puede_estar_en_la_rueda` (lo comprueba
  `supabase/tests/rueda-por-rol.sql`).
- **`web.solicitar_asesor` responde lo que escribió**: con un turno abierto, el paso 3 reinicia `vence_en` con `returning * into s` y `expira_en` sale de
  esa fila, no de la leída antes; una rama que reinicie un reloj lo hace igual (`rueda-por-rol.sql` exige `expira_en` = `vence_en` de la tabla).
- **La ficha de la web comparte versión con «Tus datos»** (`perfiles.actualizado_en`): el modal «Tú» y el de la ficha reciben la versión por props al abrir (nunca en su `key`) y cada apertura parte de lo guardado, o el segundo guardado daría conflicto. `handle` va a minúsculas y pide 3 a 30 de `a-z0-9._-` (la base sólo pide unicidad; 23505 →
  «Ese identificador ya está en uso.»); `publico_web` sin WhatsApp lo rechaza el formulario, no la base. Con «Ver como» el interruptor y «Editar…» (en el «⋯») de la ficha quedan de
  sólo lectura: escribirían en la cuenta real.

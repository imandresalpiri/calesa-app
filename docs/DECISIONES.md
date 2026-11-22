# Decisiones

Las decisiones de diseño **vigentes**, agrupadas por área: lo que una sesión podría deshacer o volver a discutir si no lo supiera. No es
un registro: cuando una decisión cambia, se edita o se quita su viñeta (la historia está en git; la anterior a 2026-11-13, en la
etiqueta `fases-0-9`). Lo que es regla de construcción está en `.claude/rules/*`; el contrato de cada módulo, en su `CLAUDE.md`;
las trampas, en `docs/LECCIONES.md`.

**Una decisión nueva** va en su área, en una viñeta: `- **Título corto.** Qué se eligió y por qué (y qué se descartó, si evita reabrirlo).`

## Stack y arquitectura

- **Lo descartado del arranque.** TS 7, Biome, husky y Serwist se descartaron a propósito; boundaries va con la sintaxis v7 (`policies`, elementos como carpetas): la legacy muere en la v8.
- **Sin paquetes nuevos para lo que se resuelve con lo que hay.** Gráficas en HTML y SVG propio, la cookie del portal con `node:crypto`, el barrido AA por CDP (sin `@axe-core/playwright`). Una sesión agrega sólo lo que está en `scripts/orquestador/dependencias-aprobadas.txt` (lo vigila `.claude/hooks/bloquear-peligrosos.sh`: con pnpm, sin `cd`, `-C`/`--filter` ni variables delante, nombre o nombre@versión, sin alias, git ni tarballs); fuera de ella, como último recurso, la suma a la lista en el mismo PR con la sección «Dependencias nuevas» (por qué no alcanza lo que hay, peso gzip, licencia, mantenimiento, versión verificada hoy), con versión exacta y nunca dos librerías para lo mismo. Aunque esté en la lista, la versión se verifica el día que se agrega. Actualizar o quitar dependencias lo decide la persona. Sin lista legible, el hook no deja agregar nada. Una orden de pnpm que cambia dependencias dentro de otro comando, aunque sea el texto de un grep o de un mensaje de commit, también se bloquea (se busca por «dependencia»; el mensaje va por `git commit -F`). El hook frena el descuido (otro paquete, otro gestor, otra carpeta, una versión que es una ruta), no a una sesión que edite la lista: eso lo frena la regla del prompt y queda a la vista en la sección «Dependencias nuevas» del PR.
- **Fuera a propósito.** Editor de artes (Konva) y directorio de contactos: navieras es un catálogo plano y los proveedores son texto en gastos.
- **Componer desde `src/app` por ranuras.** Un módulo no importa otro para dibujar algo ajeno: la página pasa un `ReactNode` o datos serializables (el historial en la barra del vehículo, el lector de opciones de cotizaciones).
- **El motor de campos es de `shared`.** `shared/lib/campos` (puro) y `shared/ui/campos`; en SQL, `_campo_*` sin leer tablas. Cada módulo conserva su política; `shared` no sabe qué es un lead. Íconos: catálogo cerrado en `shared/lib/iconos.ts`.
- **Una action desde una pantalla a medio tipear no revalida ni refresca.** En Next 16, `revalidatePath`/`revalidateTag`/`updateTag`/`refresh` redibujan la página que llama y la `key` remonta la hoja o el editor (el ⚙, crear cotización, comentarios, la hoja de ítems de repuestos). Excepción a «revalidar tras mutar».
- **Una regla que vive en SQL y en TS se prueba como espejo.** Los mismos casos corren en Vitest y en `db:probar` (fórmula del cotizador y de repuestos, `shared/lib/campos/rango.ts`, `portal-mensaje.ts`, `normalizar_telefono`); decide la base. Cambiar un lado exige cambiar el otro.
- **Las funciones edge (Deno) no importan de `src/`: llevan una copia exacta.** `importar-csv` con `leer.ts` y `plantillas.ts`; una guarda exige copias idénticas y la misma versión de `papaparse`.
- **Stack local por variables de entorno.** La CLI lee `SUPABASE_PROJECT_ID` y los puertos del entorno (`.env.carril`); no se genera un `config.toml` por worktree.
- **Los PR entran por la cola de integración de GitHub.** Un PR en verde entra a la cola con su auto-merge y GitHub lo prueba una vez,
  combinado con `main` y los PR de delante (`merge_group`), y no una vuelta entera del CI por cada PR que entra antes. Nadie trae `main` a la rama: el orden de migraciones lo valida el CI del grupo contra `HEAD^1` (también entre dos PR de
  la misma cola), y el grupo corre lo mismo que pidió el PR (los dirigidos de `HEAD^1...HEAD`, o el completo). Un grupo que cae con el
  PR en verde lo rompe la combinación con lo de delante: cuenta como choque (`MAX_CHOQUES`), no como arreglo. La cola pide squash (por
  eso `HEAD^1` es la base) y un repo de una organización; sin ella el auto-merge integra sin probar combinado, y `main` en rojo frena lo
  nuevo hasta la urgente que lo arregla (`scripts/orquestador/main-en-tanda.sh`), que queda de red de seguridad.
- **El orquestador escribe en GitHub como una GitHub App.** Ni un PAT ni una cuenta máquina: la app es gratis, no ocupa un asiento,
  su token dura una hora, se ve como bot y sus PRs sí disparan los workflows (el `GITHUB_TOKEN` de Actions no). Sin la clave, la sesión
  de gh de la persona. La app no va en ningún bypass de `main` (`scripts/orquestador/README.md` › «Como la app de GitHub»).
- **Un e2e que cae en `main` y no es de la rama se espera, no se arregla ni se traba.** La sesión de arreglo termina en `RESULTADO: AJENO — <spec>:<línea> [<proyecto>] — <evidencia>`:
  el orquestador crea una sola urgente por `<spec>:<línea>` (`plantillas/e2e-roto-en-main.md`), la tarea que lo encontró la suma a su `depende` y sigue
  `esperando_ci` (sin estado nuevo, sin retener sus llaves de área, sin gastar `MAX_ARREGLOS`), y al integrarse la urgente se pone al día con main sin
  sesión. Sólo vale desde un arreglo con PR y con un spec y línea válidos; `MAX_AJENOS` (3) corta el ciclo si el spec sigue cayendo
  (`scripts/orquestador/ajeno-de-main.sh`).
- **Las esperas que sondean se rechazan en el hook.** Decirlo en el prompt no alcanza (cada vuelta de sondeo relee todo el contexto): `bloquear-esperas.sh` rechaza un Bash en primer plano con un bucle con `sleep` o un `sleep` de más de 5 s, y un Monitor que sólo cuenta tiempo; `run_in_background` pasa. Lee el texto del comando como el resto del hook: un mensaje o un `grep` que nombre las dos cosas juntas también cae (el texto largo va por Write o `-F`), y un bucle dentro de un guion no se ve.

## Base de datos y permisos

- **Las migraciones son la única fuente.** Se descartó conservar `supabase/schemas/` como estado declarativo: dos fuentes, y el diff declarativo no lleva policies ni grants.
- **Catálogo de permisos fijo, roles libres.** `roles_permisos(rol, clave, origen_id NULL=todos, alcance propios|todos)`, unión sin herencia, dominancia y guardián diferido; `dueno` nunca pierde `equipo.*` y un permiso nuevo de `equipo` se le otorga en la misma migración.
- **`puede()` vive en `shared/lib/permisos.ts`.** Misma semántica que `tiene_permiso()`/`alcance_de()`; un test compara el catálogo con la base. Los niveles de cotización se reconocen por patrón (`esClaveDeNivel()`), no por lista.
- **Un solo orden de candados entre RPC.** Lead (`for no key update`) → vehículo (`for key share`) → cotización y sus vivas por id → hijas (la cotización antes que sus reportes, la raíz antes que la respuesta). Purgar y restaurar toman en el mismo orden; invertirlo da 40P01.
- **«No existe» y «no la ves» dan el mismo error.** Una lectura o escritura por id de algo que quien llama no puede ver responde igual que si no existiera (P0002, 42501 o PT409 según el área), para no filtrar que existe.
- **Escritura directa bajo RLS en tablas que no otorgan permisos.** FAQs, testimonios (salvo `consent_*`), guías, categorías, tramos, cajas, preferencias y catálogos de logística van sin RPC; con versión, `.eq('actualizado_en', esperado)` y 0 filas se relee: conflicto, «ya no existe» o sin permiso.
- **Sin versión, gana la última escritura.** Categorías, tramos, cajas, puertos, navieras y `cola_web_asesores` no tienen `actualizado_en`: decenas de filas que edita una persona a la vez. Ponerles versión es otra RPC; no se reabre sin un caso real.
- **Reordenar renumera 0…n−1 y escribe sólo las filas que cambian.** Con todas en 0 por defecto, intercambiar dos no ordenaría. No es atómico (aceptado); si la lista está cortada por el tope, mover se apaga con su motivo.
- **La base no guarda secretos para llamar afuera.** `storage-gc` y `push` se disparan desde la base con un pase de un uso; las claves viven en Vault o en la función.
- **RLS no esconde claves de un jsonb.** No hay marca «sensible» en campos: ocultar un dato exige columna más vista o RPC que recorte. Los costos van por logística bajo sus permisos.
- **Las funciones `sql` que se inlinean quedan sin `set search_path`**, con motivo (`_lead_visible_para`, `_motor_*`): un `SET` impide inlinear. `storage_refcount()` conserva `execute` para `authenticated` mientras `quitarSiHuerfano()` corra en el navegador.
- **Advisors en cero con una sola lista de motivos.** `supabase/tests/advisors-con-motivo.json`, la misma para PGlite y la base real; splinter con los schemas de `[api]` (si no, no ve `web`). Único ERROR admitido: `security_definer_view` de `web`. Las RPC de `anon` van fijadas por `md5(prosrc)`.
- **La semilla analiza.** `seed.sql` termina con `analyze` de `public` y `web`: sin estadísticas, la primera importación es lenta.

## Interfaz (transversal)

- **Una sola vista por lista, elegida en el servidor.** Cookie `ancho` (o user-agent), `anchoDeEstaPeticion()` y `useAlMenos(corte)`; cortes 640/768/1024.
- **Paginación por cursor sin «página N».** Arriba se dice «Los más recientes» o «Creados hasta el …» con «Volver al principio».
- **La navegación se declara entera.** `navegacion.ts` lista todas las pantallas; un test falla si `disponible` no coincide con la existencia de `page.tsx`.
- **El «⋯» con sprite SVG.** `<svg><use/></svg>` con `<SimbolosDeLista>` montado una vez en el layout: 3 nodos por botón.
- **El «⋯» siempre visible arriba a la derecha, espejo de la casilla; en la tabla, sombra por consulta `scroll-state`.** Vale para toda lista:
  en la tarjeta, `<EsquinaDeAcciones>` (sobre la foto si la hay, con fondo translúcido y borde; la casilla va en la esquina izquierda con el
  mismo tratamiento y 44 px también en escritorio); el «⋯» de toda tarjeta mide 44 px (`--tamano-del-mas`), el de la fila de la tabla 32 desde
  `md`. La columna pegada de la tabla lleva sombra sólo mientras se puede desplazar más hacia la derecha: el contenedor de la tabla es
  `container-type: scroll-state` y la celda se consulta con `@container scroll-state(scrollable: inline-end)`, que dibuja un `::before` con degradado a
  todo el alto de la celda; sin JS, sin estado por fila y sin nodos. Un navegador sin `scroll-state` deja la línea de 1 px. Descartados: un `box-shadow` por celda (con extensión negativa casi no se ve, y sin ella se corta o se
  derrama en cada fila), una animación ligada al desplazamiento (deja una animación
  por fila que nunca termina, y las esperas de los e2e y las capturas esperan a que terminen), un observador por tabla (suma JS en frío), la
  sombra siempre (ruido cuando no hay nada detrás), aparecer al pasar el mouse (se pierde en pantallas táctiles) y la columna al costado de la
  foto (la achica).
- **Formularios que aparecen al pulsar algo son `ModalDeFormulario`.** Un envío a la vez, conflicto hasta la versión nueva, revisión al abrir; la guarda `modales-con-salida.ts` registra todo `<Modal>` que no lo es.
- **Vuelta del foco tras recargar y «atrás».** `abrirConVuelta()` deja la ficha en `history.state` (respaldo en `sessionStorage`) y `useVueltaDelFoco` la recuerda; desde un menú vuelve al «⋯». La guarda `paneles-con-vuelta` lo exige en todo `history: 'push'`.
- **Reintento sólo al volver la conexión.** `useReintentoAlVolver` reenvía en la transición sin red → con red; con red presente se ofrece «Reintentar»: no se martilla un servidor caído.
- **Al volver la red, la suscripción se remonta con `key`.** `useVueltaDeLaRed` (campana y chat): una barra «Sin conexión» que no se va tapa la pantalla. Se arregla en la app, no esperando en el spec.
- **Números tipeados.** Un solo lector `leerNumeroTipeado(texto, locale)` y escritores con `formatearParaEditar(n, { locale })`; el CSV es la excepción.
- **Un monto o una cifra desconocidos son nulos, nunca 0.** Se dicen con «Sin datos», «Sin venta registrada» o «Sin precio en N ítems»; una tasa nula nunca es «0 %». `<Monto moneda={null}>` dibuja el número sin inventar moneda.
- **Foco visible.** `--shadow-focus` = 2 px de `primario-ink` y `--ring` en `.dark` = `primario-ink` (el `-soft` daba 1,2:1). Los tokens se corrigen hacia la tinta en los dos temas, nunca hacia el fondo.
- **El `h1` de un listado es `sr-only` y va en el `page.tsx`, fuera del `<Suspense>`.** Está también cargando y sin permiso. Toda página lleva su `loading.tsx` con la forma de su `<Suspense>` (lo vigila `scripts/guardas`).
- **Barrido de accesibilidad por CDP con reglas propias.** Las rutas salen de `src/app/**/page.tsx` (el mapa no existe en CI). 44 px es regla del proyecto (AA pide 24); los blancos chicos de `shared/ui` viven en `BLANCOS_CONOCIDOS` con `max` por ruta.
- **Tonos de las papeleras.** «Enviar a la papelera» es `outline` (reversible); «Purgar» es `destructive` en las tres papeleras, siempre después de «Restaurar».
- **Visor de imágenes: uno solo, con su URL aparte (`?visor=`).** Así se abre sobre un drawer o un panel sin cerrarlos. En su lugar se ve la portada que ya trae la fila y el resto se pide recién al acercarse (puntero, foco o toque), una vez; la grande, sólo al abrir, la actual y sus vecinas. Donde el lugar mide menos de 160 px (la fila de la tabla, la tarjeta de hoy) no caben flechas de 44 px: la foto abre el visor directo. La barra de la hoja de cotizar sigue con la miniatura fija (su JS está en el tope).
- **Avisos con acciones: la base dice la causa con una clave, la UI la traduce.** El rechazo lleva la causa en `hint` (`_vehiculo_bloqueo()` → `{causa, motivo}`) y cada módulo la convierte en acciones en `entities/` (`resolverAcciones()`): de 1 a 3, **la que destraba primero** («Quitar el vínculo» antes que «Ver el lead»). Sin permiso para la que resuelve, el aviso dice «pídeselo a quien administra los roles» (no hay una persona a quien pedirle en todos los casos); la que sólo informa se oculta. En un lote no hay acciones: se listan los motivos. Tras «Quitar el vínculo» (`?luego=papelera`) el aviso **ofrece** la papelera, no la envía solo.
- **«Nuevo» de la barra: un modal con URL (`?panel=crear`), claves y no permisos.** El servidor calcula con `puede()` las claves de lo que se puede crear (`opcionesDeNuevo()`) y sólo ellas cruzan al navegador (el catálogo con títulos y destinos viaja diferido con el modal): el layout no lleva `permisos.ts` en el documento de cada pantalla. Cada opción reusa su puerta (drawer del lead, `?panel=` de otra pantalla), sin formularios nuevos; «Evento» y «Tarea» van siempre porque para uno mismo no piden permiso (publicar y asignar sólo amplían). Seguimiento y recordatorio llevan a la **ficha** del lead (bloque «Seguimiento», `rutaDeAccionSobreUnLead()`), no al listado: el modal del listado (`?para=`) sólo abre filas de la página visible y un lead elegido en una búsqueda puede no estar en ella. `Shift+N` abre «Nuevo» (en `combinacionDe`, Mayús cuenta sólo con una letra suelta) y no hace nada con otro diálogo abierto; `N` abre lo propio de la pantalla.
- **«Vista y opciones»: un popover desde 768 px y una hoja inferior por debajo, sin URL.** La barra de un listado deja a la vista el buscador (que crece), «Filtros» y «Nuevo»; la vista, el alcance, «Ítems por página», las vistas guardadas, exportar, importar y la papelera van en un botón que dice lo activo. Es un menú, no un panel: sin URL, cerrarlo no escribe nada y no pisa la navegación de la opción recién elegida (la carrera de `cerrarPanel` de la ficha de `shared`); por eso la hoja se arma con `sheet.tsx` y no con `<Drawer>`, que exige URL y registro. Se pierde que «atrás» la cierre en Android. El panel viaja con `diferido()` (la carga paga sólo el botón: `/leads` y `/cotizaciones` están al borde de su JS) y lo que abre otro panel («Exportar…», «Etapas…», «Nuevo embudo…») corre cuando el panel terminó de cerrarse (`cerrarYLuego`, `onOpenChangeComplete`), con el foco ya en el botón. Las vistas guardadas e «Ítems por página» entran al grupo: ningún atajo ni tarea de oro los usa y cuestan los mismos clics; el menú de vistas (≈ 70 KB gz) llega tras hidratar, también diferido (`VistasDeCotizacionesDiferido`). En el embudo entran «Lista | Embudo», «Etapas…» y «Nuevo embudo…» (configuran la vista; a la vista quedan el selector de embudo y la búsqueda); en repuestos, «Proyectos | Cadena | Stock» como «Qué ver». No se tocan las listas con menos de tres botones de vista u opciones (logística, actividad, equipo, notificaciones, papeleras). En la agenda entran «Qué agenda ver» (Mi agenda | De todos) y «Qué ver» (las clases); «Día | Semana | Mes» quedan a la vista porque se usan a cada rato. Descartados: un modal (tapa la lista y no deja ver el cambio), un drawer lateral (pide URL y registro y en escritorio le quita ancho a la lista), un `DropdownMenu` (no admite un `select` ni el formulario de vistas con buena accesibilidad) y una barra que se desplaza (esconde piezas sin decirlo).
- **Un hueco de Server Component dice si dibuja algo.** `HuecosDelListado.hayJunto(permisos)`: la página de `/cotizaciones` pasa `Junto` (la papelera) sólo si quien mira lo vería, porque un Server Component que devuelve `null` dejaría vacío el grupo «Más» de «Vista y opciones» y el panel no puede saberlo.
- **Configuración: un registro único de secciones y sub-rutas.** `src/app/(app)/configuracion/secciones.ts` (`SECCIONES`, `GRUPOS`) dice cada sección con su grupo, su frase y sus sub-secciones (ruta, título y permisos); el inicio, el menú de Configuración, el selector de sección y la paleta lo leen, y cada página que crea una sub-ruta la suma ahí. `secciones.test.ts` falla si una sub-ruta no tiene su `page.tsx` o una sección sin índice no tiene su `page.tsx` o su `route.ts`. Los grupos son «Grupo de Configuración», no «área».
- **Una sub-sección puede vivir en la ruta de su sección (la índice).** El menú la marca sólo en su ruta exacta y el selector no repite la sección (dos opciones con el mismo valor). La sub-sección que alguien no puede abrir va apagada con su motivo sólo si lo declara; la que no, no se ve.
- **Una sección sin sub-sección índice redirige su ruta, en el servidor, a la primera sub-sección que se puede abrir** (Catálogos,
  Repuestos y Sitio web: ninguna parte es «la de la ruta»). Una índice fija no sirve cuando cada sub-sección pide otro permiso: quien no
  gestiona los campos no podría abrirla. El `?seccion=` viejo va a su sub-ruta con todos los demás parámetros (ningún enlace profundo se
  pierde), salvo si apunta a una apagada: entonces a la primera abierta sin ellos, que eran de otra parte. Una sub-ruta sin su permiso
  redirige a la primera abierta, nunca a la raíz (sería un bucle). Su título en la pestaña del navegador no repite el de otra pantalla
  («Campos de los leads», no «Campos»). La sub-ruta de un catálogo de logística en Catálogos sale de la `clave` del catálogo que llena cada área
  (`CATALOGOS_DE_LOGISTICA`), así un catálogo nuevo no toca el registro.
- **Configuración › Leads es una página de seis tarjetas, y «Campos» su única sub-ruta.** Tipos de lead, Orígenes del lead, Tipos de seguimiento, Embudo (la plantilla como mini-kanban), Mensaje del portal y Teléfonos extra caben en una pantalla; cada una con su «Editar» en un modal por `?panel=<clave>`. Una tarjeta resume (hasta 5 ítems y «y N más», `resumirLista()` de `shared`) y el catálogo entero vive en su modal: la tarjeta no carga la lista de miles que no hay, pero tampoco la lee dos veces. Un ítem (Nuevo, Editar, Eliminar) es un modal **hermano** del de la lista, no uno encima: el de la lista se cierra y, al cerrarse el del ítem, la URL vuelve a `?panel=<lista>` en una sola escritura (`useFamiliaDelPanel()`). Se descartaron los acordeones (esconden lo que la tarjeta resume), las pestañas (otra sub-ruta por parte), un drawer (los modales de la sección ya son modales) y el catálogo entero dentro de la tarjeta. «Campos» sigue aparte porque pide otro permiso y es una pantalla de lista y de formulario largo.
- **Las seis sub-rutas viejas de Leads y su `?seccion=` redirigen conservando el `?panel=` y el resto de la consulta.** Cada sub-ruta es un `route.ts` (308, no depende de quién pide); la raíz resuelve `?seccion=` con `redirigir()`. La regla vive en `leads/entities/paneles-de-la-configuracion.ts` (`destinoDeLaSubrutaVieja()`, `destinoDeLaSeccionVieja()`) para probarla sin el barril de servidor: un `?panel=` de la misma tarjeta se conserva entero; otro se cambia por el de la tarjeta; un `?seccion=` desconocido se descarta.
- **El editor de un texto con variables es de `shared/ui/editor-con-variables` y es una `<textarea>` nativa.** Los botones de variable insertan `{clave}` en el cursor, las variables se ven como pastillas en un espejo bajo el texto transparente, la vista previa usa datos de ejemplo y una `{variable}` que el texto no acepta se avisa al escribirla. Se descartó `contenteditable` con fichas (rompe deshacer, el IME y el celular). La regex de variable (`PATRON_DE_VARIABLE`) es la misma que la de la base. Hoy sólo lo usa el Mensaje del portal.
- **«Números repetidos» tiene su propio modal (`?panel=numeros-repetidos`)**, abierto desde la tarjeta de Teléfonos extra sólo con la regla encendida y guardada; su primera página se lee desde el navegador al abrirlo.
- **La barra de cambios sin guardar de un formulario que no es lo último de la página va como hermana con `order-last`.** `sticky` sólo se pega dentro de su padre: dentro del bloque se quedaría junto al campo. Como hermana en la grilla de la página queda pegada al final de toda ella y, en el DOM, después de su formulario (el Tab llega a «Descartar» y «Guardar» desde el último campo). Descartado: una barra dentro de cada bloque.
- **El origen como centro de la configuración.** Todo lo que depende de un origen vive en su página, `/configuracion/origenes/<id>/fases|planilla|hoja|tarjeta|campos|categorias` (los datos, en su drawer; «La página del origen en pestañas planas»): dejar un origen listo no pide saltar entre secciones. No hay secciones Cotización, Flujos ni Logística: lo de toda la empresa está en Catálogos y el flujo de repuestos en Repuestos. Las pestañas son sub-rutas de un layout en `[id]` (el marco con las migas, la cabecera y el «⋯» se lee una vez y queda al cambiar de pestaña), cada página comprueba sola su permiso en ese origen y la que no abre va apagada con su motivo (una URL vieja nunca parece rota). La lista, el menú y la página muestran sólo los orígenes que la persona abre (`origenes_resumen()` pide el permiso en algún origen: el filtro por origen es de la app). El menú nombra cada origen como sub-ítem de Orígenes, inyectado al pedir la página (el registro sigue estático), con una `marca` que lo marca en cualquiera de sus pestañas; hasta 20 y «Ver todos los orígenes». Las actions de la fórmula, la hoja, la tarjeta, las tablas y el flujo revalidan `/configuracion/origenes` con `'layout'` (todas las páginas de origen: una tabla compartida o un tipo de documento cambian lo de varios); las de colores, niveles y tipos de documento, además, `/configuracion/catalogos`. Descartada: una columna de pasos al costado (quita ancho a la planilla y la tarjeta, que van a todo el ancho). El marco suma ≈ 40 KB fijos al primer HTML de cada pestaña (el tope de la Tarjeta con volumen, en `docs/RENDIMIENTO.md`): no crece con los datos, y achicarlo sería quitar lo que la persona pidió ver.
- **La vista previa de la hoja va al costado desde `xl` sólo abierta.** Cerrada, el botón queda en su lugar; no se abre sola en `xl` (dibujarla cuesta y el e2e de escritorio corre a 1280 px, que ya es `xl`).
- **«Publicar cambios» de la fórmula de repuestos no usa la barra de cambios sin guardar.** Publicar agrega una versión al historial (no «guarda» sobre la anterior) y su botón sigue junto a los campos, apagado mientras nada cambie. Los catálogos y los tramos y cajas se editan en modales, que ya preguntan antes de descartar.
- **El menú de Configuración va en toda página, el inicio incluido (salvo la página de un origen, a todo el ancho); el inicio vive en `/configuracion/inicio`.** Para navegar sin perder el menú y encontrar un ajuste escribiendo: `/configuracion` redirige en el servidor (`next.config.ts`, 308, con su consulta) y `RUTAS.inicioDeConfiguracion` es la única ruta que se enlaza. El layout dibuja siempre el menú; sólo la vuelta «‹ Configuración» y el buscador del celular dependen de la ruta (`usePathname()`, porque un layout no se vuelve a dibujar al pasar a una página hermana). El menú y la cabecera se arman en el servidor y sólo cruzan títulos, rutas y palabras (`paraElNavegador()`); el ícono de cada sección se dibuja en el servidor (`ICONO_DE_SECCION`) y cruza ya hecho, para que el navegador no cargue el catálogo de íconos. Tres niveles distintos: grupo (rótulo en mayúscula chica, no enlace), sección (ícono + nombre) y sub-sección (sangrada bajo una línea guía, sólo la de la sección abierta). El menú mide 10 rem: con menos, el ícono y la sangría le quitan ancho a los títulos; a 1280 px `equipo-200` sigue dejando el correo de 38 letras entero. Descartados: pestañas horizontales de secciones (once desbordan y quedan dos barras de pestañas apiladas con las de cada página), sólo una miga de pan (no deja saltar de sección) y un menú sin buscador (once secciones con hasta siete sub-secciones no se recorren con la vista).
- **El buscador de Configuración lee el registro, no la base.** Filtra en el navegador lo que el menú ya recibe, más las `palabras` que declara cada sección y sub-sección (`secciones.ts`): ≈ 2 KB sin comprimir más en el HTML de cada página de Configuración, a cambio de no pedir nada al escribir. «Ajustes» es la sub-sección: no se indexan los campos de cada pantalla. Cada palabra escrita tiene que ser el comienzo de una del título o de las palabras («logo» no encuentra «Catálogos»), y el orden va por qué tanto se parece al título; la sección y su sub-sección índice, que abren lo mismo, salen como la sub-sección («Empresa › Datos de la empresa»). Tope de lo que se dibuja: 12. Un solo campo a la vista en cada pantalla: en el inicio el de la página (el del menú no se dibuja), en una sección el de arriba del menú o, donde no hay menú, el del panel; `/` enfoca el que se ve. Los resultados reemplazan lo que está debajo (tarjetas o menú, que siguen montados) en vez de abrir una ventana, salvo en el celular, donde el menú no existe y el panel cae sobre la página.
- **El inicio de Configuración en mampostería.** Columnas CSS (`columns`) en vez de una rejilla: las tarjetas por grupo tienen alturas muy distintas (Ventas lleva seis secciones, Web dos) y la rejilla deja huecos bajo las bajas. Dos columnas desde 40 rem de contenedor (con el menú al lado, el contenido a 1024 px mide menos de 48 rem); el orden de lectura baja por la primera columna y sigue por la segunda. Cada tarjeta lleva `break-inside-avoid`.
- **Lo que falta en el inicio de Configuración: sólo lo accionable, una línea por origen.** Los pasos de «Para cotizar y mover» de cada origen activo que la persona puede hacer (`conDestino()` sin motivo) van en una sola línea en la tarjeta de Orígenes («China: falta configurar el flujo y publicar la fórmula», con infinitivos para que la frase concuerde con uno o varios), enlazada a la pestaña del primero; apibara, una vez en Empresa, donde se activa. Si la integración no se puede leer, apibara cuenta como activa: no se inventa una falta.
- **La barra de cambios sin guardar no frena el «atrás» del navegador.** Frena los enlaces (en la fase de captura), las salidas por `salirSinPerder()` y, con la pregunta del navegador, recargar y cerrar. El App Router no ofrece cómo frenar el «atrás» sin parchear el historial, y parchearlo rompe la vuelta del foco.
- **PWA.** `id: '/'` igual que `start_url` (cambiarlo reinstala la app a todos); sin aviso que invite a instalar; los atajos del manifest no se filtran por permiso (se pide sin sesión). Íconos, tarjeta y PDF salen del logo normal; el oscuro lo elige el CSS.
- **El menú lateral se pliega a sólo íconos, por persona y sin animar.** El botón «Plegar menú» va abajo de la barra (no junto a la marca: ahí compite con el logo y, plegada, el logo es lo único que cabe) y `Ctrl/Cmd+B` hace lo mismo; la tecla no responde mientras se escribe (en un editor es la negrita) ni en el celular. El tooltip es el `title` nativo: un tooltip propio se recortaría contra el desplazamiento de la barra y suma JS a toda pantalla. Plegar mueve el ancho de la columna (15,5 → 3,5 rem) de golpe: animarlo reacomoda la página de al lado en cada cuadro y el lienzo de la tarjeta recalcula su escala. La preferencia `menu.plegado` (booleano, con su `check`) la lee el servidor, así que la barra llega dibujada como quedó; una cookie `menu-plegado` es sólo su copia para la cáscara estática de carga, que no ve la sesión. Los avisos no se mueven con la barra: siguen abajo a la izquierda con su ancho de siempre. El menú plegable suma ≈ 1,5 KB al documento de toda pantalla (el árbol de la barra se repite en el escritorio y en el menú del celular): entra en el tope del documento de `/perfil` (`docs/RENDIMIENTO.md`). Descartadas: plegar al pasar el puntero (se abre sola y tapa), un ancho que se arrastra (otra preferencia y otro control para algo que son dos estados) y plegar también el menú del celular (ya está plegado detrás de su botón).
- **Las páginas de ajustes son tarjetas resumen que se editan en un modal.** Empresa, Integraciones, Comprobantes, Monedas, Sitio web (Ajustes y Legales), Cola web (la política) y el perfil (Tú, Preferencias, Turnos de la web, Tu ficha en la web y Notificaciones)
  muestran lo guardado como texto en `<TarjetaDeAjustes>` y editan en un `ModalDeFormulario` por tarjeta (`?panel=<tarjeta>`), sin acordeones ni
  barra de cambios sin guardar: de un vistazo se ve qué está configurado y la página entra sin desplazar. Mampostería con columnas CSS (`columns-1
@2xl:columns-2 @5xl:columns-3`, `break-inside-avoid`) sobre un contenedor con nombre: sin JavaScript, sin huecos, y manda el ancho de la página, no el de la
  pantalla (el menú de Configuración se lo quita). **Una escritura por modal** (la clave de una integración no va con su dirección: las dos usan la
  misma versión de la fila y encadenadas la segunda chocaría consigo misma). La versión llega por props al abrir y nunca va en la `key` (guardar
  remontaría el modal y borraría lo tipeado); la `key` es por apertura. `useEnvioConVersion()` (`@/shared/ui`): el conflicto deja «Recargar» y
  «Guardar» apagado hasta que llega la versión nueva; sin red espera y reenvía al volver. Los interruptores de una tarjeta guardan al instante; un modal de puros ajustes que se aplican al elegirlos (Preferencias y Notificaciones del perfil) no lleva «Guardar», sólo «Listo».
  Descartados: el formulario largo en bloques plegables, la edición en el lugar (sin versión por campo), un drawer al costado (tapa lo que se
  edita) y la mampostería con JavaScript (suma bytes en frío y parpadea). En esas páginas no rige la regla de los bloques plegables.
  **Cola web** no es de ajustes puros: su política es una tarjeta del patrón, pero «En la rueda» y «Sin asignar» son listas de tarjetas (`TarjetaDeLista`, rejilla `auto-fill`), cada persona con su «⋯» y su modal (`?panel=editar-en-la-rueda&para=`). Descartados: la barra fija de cambios sin guardar (el modal ya trae su versión y su aviso al cerrar), la tabla con la fila editable (una persona tiene tres campos y un estado: cabe mejor en tarjeta) y un tope de ancho (a 1920 px dejaba dos tercios vacíos).

### La página del origen en pestañas planas

- **Seis pestañas planas: Fases · Planilla · Hoja · Tarjeta · Campos · Categorías.** Lo que más se toca va primero y la fórmula queda a un clic: no hay
  una lista de fórmulas en medio ni pestañas dentro de pestañas. Cada una es su sub-ruta (`PARTES_DEL_ORIGEN`), así un enlace dice qué se abre y la
  fórmula elegida va en `?formula=` (sin ella, la de trabajo). Descartadas: la pestaña «Fórmulas» con su lista y cada fórmula en su ruta (dos niveles de
  pestañas y un clic de más para llegar a la planilla) y la edición a pantalla completa (escondía el marco y duplicaba la barra de cada editor).
- **La página va a todo el ancho**, sin el menú de Configuración ni su cabecera (`FueraDeLaPaginaDelOrigen`, `esLaPaginaDelOrigen()`): la planilla y la
  tarjeta necesitan el ancho, y las migas («Configuración › Orígenes › <origen> ▾») hacen de vuelta. El selector de origen conserva la pestaña si la persona la abre
  en el otro (si no, la primera que abre) y suelta la consulta: `?formula=` y `?tabla=` son del origen de antes. Descartado: el selector con `cmdk`
  (suma su JS a las seis pestañas para una lista que rara vez pasa de diez; desde 11 lleva un buscador simple).
- **Los datos del origen van en un drawer** (`?panel=datos`), no en una pestaña: se cambian poco y no merecen el primer lugar. «Guardar» lo cierra;
  «Cancelar» descarta; cerrar con cambios pregunta en el pie del drawer (`useCambiosSinGuardar(…, { preguntaAlCerrar: true })`, y el pie del formulario se
  esconde mientras pregunta: una sola pregunta a la vez). Un PT409 deja «Recargar», que trae lo guardado y conserva lo escrito. En el celular «Datos» va
  dentro del «⋯» (`useAlMenos(768)`): la cabecera no cabe con tres botones.
- **«Para cotizar y mover» se ve en las pestañas, no en una tira:** la que tiene algo pendiente lleva ⚠ con su frase en un tooltip y en el nombre
  accesible (`faltaDeCadaPestana()`), y «Seguir la puesta en marcha» va en la cabecera mientras el origen no la termina
  (`siguePendienteLaPuestaEnMarcha()`). El ⚠ no mira apibara (`apibaraActiva: true`): se arregla en Integraciones, no en una pestaña, y así la página no
  lee la integración. El inicio de Configuración conserva su línea por origen.
- **Entrar a un origen abre la última pestaña que la persona abrió ahí** (`origenes.ultima_pestana`, glosario): `/configuracion/origenes/<id>` responde 308
  por persona (`private, no-store`); la barra de pestañas la recuerda en cada cambio de segmento. Si ya no la abre, la primera que abre.
- **La barra de la fórmula es una sola para Planilla, Hoja y Tarjeta** (`ConLaBarraDeLaFormula`): el editor de cada pestaña manda Guardar y Publicar a su
  ranura con un portal (`<AccionesEnLaBarra>`) y sigue siendo dueño de su estado; fuera de la página (la puesta en marcha) los dibuja en su lugar. El estado
  es lo no guardado, después el borrador y después la publicada (`estadoDeUnaPieza()`); la hoja y la tarjeta que no conocen la versión publicada dicen
  «Publicada» sin número.
- **«Versiones» vive en la Planilla**, en un drawer (`?panel=versiones`); desde Hoja y Tarjeta el botón lleva ahí. Las versiones son de la planilla y
  leerlas en las tres pestañas sumaría una lectura a cada una. Descartado: leerlas desde el navegador en todas.
- **«Tablas» es un drawer sobre la pestaña abierta** (`?panel=tablas`), leído sólo al abrirlo; el panel de una tabla va en `accion` porque `panel` ya es
  del drawer. Una URL vieja con `?panel=publicar-tabla` se traduce a `&accion=`. La redirección vieja `/configuracion/cotizacion/<o>/tablas?panel=x` la
  hace `next.config.ts`, que junta el `panel` repetido: se acepta (abre el drawer sin el panel de adentro).
- **Las URLs viejas responden 308 con su consulta**, cada una con su test: `/datos` a la entrada con `?panel=datos`, `/flujo` a `/fases`, `/formulas` y
  `/formula` a `/planilla`, `/formulas/<f>[/<parte>]` a `/<parte>?formula=<f>`, `/tablas` a `/planilla?panel=tablas` y `?editar=si` sin el parámetro.

## Equipo

- **«Visto» en su tabla, no en `visitados`.** `visitados` es la lista corta del buscador (tope 50, cualquier módulo); `vistos` es por módulo y
  crece con lo que cada persona abre: PK `(usuario, módulo, tipo, id)`, escritura por RPC con antirrebote de 30 s en la base y un techo de
  20.000 filas por persona (el id no se valida contra su tabla), lectura de los ids de la página que se dibuja (una llamada) y purga cada hora
  por la retención de cada persona, en un orden que rota. Qué está
  visto lo pone `equipo` en un contexto de `@/shared/ui/lista`; la fila y la tarjeta lo leen con `idDeVisto`, sin pasar props por cada nivel.
  Retención de 7 días por defecto y el nombre «Último visto», confirmados por la persona. La marca del último es borde de acento (`--color-primario-ink`, ≥ 3:1 en claro y oscuro) más un ojo de 14 px del sprite de `simbolos-de-lista.tsx` (un `<use>`), con `title` y texto `sr-only`: sin insignia de texto (ocuparía un renglón).
- **Dónde se marca «visto».** Vehículos, leads (lista y kanban), cotizaciones, proyectos de repuestos, los chips de la agenda y las listas de logística. **No** las
  notificaciones (su «leída» ya es eso), ni aduana (su fila es una declaración, sin tipo en la lista cerrada, y sus vehículos son texto sin enlace), ni
  los bloques de Inicio, las papeleras y las listas de configuración. Embarques marca las unidades de un grupo (no la fila del grupo: su clave no es un uuid) y
  los pendientes de la agenda quedan sin marcas (son una lista de cosas por hacer; los vistos van en los chips de la hoja, la semana y el mes). El contexto logística es la página `/logistica/vehiculo/[id]` o el panel de gastos.
- **La E/S de «visto» se pide al usarse y no por Server Action.** Una lista no carga supabase-js en frío (`import()` desde `pedidos-de-vistos.ts`, sólo con «Vistos»
  encendido); el router ejecuta las actions de a una y una lectura por montaje haría esperar a las mutaciones reales. Las marcas se montan desde `src/app` por una
  entrada chica de `pantallas/` (no por el barril de `client.ts`, que trae el menú de vistas). Un registro por apertura: el resumen o panel por URL (`parametro`) o la
  página, nunca los dos.
- **«Visto» se lee como un correo: lo no visto en negrita, lo visto en peso normal.** La marca tiene un tercer valor, `nuevo`, que `useVistos` sólo da con «Vistos»
  encendido, la lectura de esa página ya llegada y el id dentro de lo que se leyó (tope de 200 por tipo): antes de leer, tras una lectura fallida o fuera del tope no
  hay marca y el nombre queda en su peso de siempre (así nunca parpadea una negrita falsa ni se castiga a quien no usa «Vistos»). El peso es una clase sobre el
  `[data-abre-resumen]` de la fila o tarjeta (`CLASES_DE_VISTO`, `pesoDelNombre()`), no un nodo. El chip de la agenda conserva la tilde: su etiqueta de clase ya va en
  negrita y la del título se confundía con ella.
- **El último visto es el del módulo, de cualquiera de sus tipos** (`TIPOS_DEL_MODULO`): en la agenda, un evento o una tarea, nunca dos «Último visto». «Ver como» no
  registra a nombre del otro (`visto_registrar` escribe con `auth.uid()`).
- **El guardián cuenta la unión de roles.** Debe quedar una persona operativa (activa, sin bloqueo, invitación aceptada) cuyos roles sumen los permisos de administración.
- **Dominancia sobre la persona.** Bloquear, desbloquear, dar de baja y asignar/quitar roles exigen dominarla (`rol_dominado()`); el dueño (rol de clave `dueno`) domina a todos. Orden: `_dominancia_tomar()` → permiso → propia → perfil `for update` → dominancia (42501) → estado (PT409).
  `_dominancia_tomar()` es un candado de transacción común, el primero de toda RPC que comprueba la dominancia y de `nivel_crear` (suma
  permisos al rol `dueno`, que además toma `for no key update`): lo de quien llama puede cambiar mientras actúa (dos que se bloquean o se
  recortan los roles a la vez), y un candado por fila de quien llama y de lo que toca formaría ciclos (40P01). Dar de baja lo toma
  compartido, para que dos bajas sigan corriendo a la vez, y entre bajas toma las dos cuentas por id (la propia `for share`).
- **Lo no dominado se dibuja apagado con motivo, nunca escondido.** `dominada` se lee con `personas_dominadas(p_ids)`, no dentro de `equipo_lista()`; si falla, las acciones se apagan (un error nunca habilita). Sobre la propia cuenta no se mira.
- **La matriz de Roles no dice nada en línea: sus avisos viven en un «!».** Cada rol con avisos (no lo dominas, de sistema, con personas) lleva junto a su nombre un
  botón «!» («Avisos de <rol>», con la cantidad si son varios) y la página otro junto al título; abren un modal por URL (`?panel=avisos&rol=`;
  la página, `?panel=avisos-de-la-pagina` o `?panel=avisos` sin `rol`). La de la página no puede ser `?panel=avisos` a secas: en el celular `rol`
  es el rol a la vista y siempre está. Sin el filtro por rol en Equipo, «Quítaselo a las personas…» no lleva botón. El motivo de una celda apagada y el de
  la papelera siguen en su descripción accesible.
- **«Ver como» sólo dibuja.** Cookie `perspectiva`; `mi_sesion(p_perspectiva)` da `permisos_efectivos()` (míos ∩ del rol) sólo con `equipo.roles.gestionar`. RLS, RPC y `actionClient` siguen con los reales; lo que escribe en la cuenta real (`/perfil`) queda de sólo lectura.
- **`mi_sesion()`: la sesión en una ida.** RPC definer con cuenta, perfil, roles, concesiones y preferencias, envuelta en `cache()`. Un dato nuevo del shell sobre la persona se suma ahí.
- **La versión de un rol cubre sus concesiones.** `roles.actualizado_en` la reciben otorgar, revocar y eliminar (PT409); asignar/quitar rol es idempotente; bloquear y baja usan el estado de la cuenta como precondición.
- **Baja en dos tiempos.** `equipo_dar_de_baja` hace lo instantáneo y el primer lote; el job `equipo-bajas` sigue con `skip locked`. Mientras dura, `_bajas_en_curso()` hace que toda regla vea el estado final (lo vigila `humo.sql`).
- **La vista previa de una baja sólo cuenta.** `equipo_vista_previa_baja()` comparte `_leads_al_limbo_de()` con la baja; nadie confirma sin ver el número.
- **Invitación.** Un solo enlace vigente por persona; si el correo falla se muestra el enlace; «Copiar enlace» genera uno nuevo, invalida el anterior y exige dominar sus roles. Vence a las 24 h en la nube (1 h local).
- **Registro cerrado al cerrar la transacción.** `auth_registro_permitido()` es constraint trigger diferido (Auth pone `app_metadata` después del insert); `registroDisponible()` lo repite en TS.
- **Auth sin variables de la app.** `/auth/callback` acepta `code` (Google) y `token_hash` (correos); el botón de Google sale sólo si `/auth/v1/settings` dice que está encendido.
- **Los formularios de auth van con `method="post"`.** Enviados antes de hidratar irían por GET, con la contraseña en la URL.
- **`handle` en minúsculas, 3 a 30 de `a-z0-9._-`.** La base sólo pide unicidad; el formato lo da la app.

## Empresa

- **Empresa se escribe sólo por RPC.** `ajustes_empresa`, `monedas`, `tipos_cambio` e `integraciones` sin policies de escritura; cada edición es una RPC definer con permiso y versión. Monedas y tipos se desactivan, no se borran.
- **Monedas se ordena por par de monedas.** Arriba la moneda base, luego un grupo por par (el de la base primero) con una tarjeta grande por tipo de cambio, y al pie, secundarias, las monedas activas y «Al compartir». Descartado el grupo por tipo (oficial, paralelo…): el par es lo que se compara. La moneda base se elige en Monedas (un solo lugar; con `empresa.ajustes.gestionar`, otro permiso que el de los tipos de cambio). «Quién y cuándo» sale de `tipos_cambio_vigentes()`, no del historial: lo ve toda persona activa. «En la barra» se guarda al tocar el interruptor de la tarjeta; el panel conserva el suyo. Una moneda abierta desde «Gestionar» cierra el modal y abre su panel (un modal no abre otro). La leyenda se edita en un modal, sin barra de cambios sin guardar.
- **Lo que se ve sin sesión sale de `web.ajustes_acceso()`.** Nombre, logo, locale, moneda, registro abierto y `primer_registro`; lo que haga falta antes de ingresar se suma ahí.
- **Secretos de la interfaz en Vault.** `integracion_guardar_secreto()` con permiso e `integracion_secreto()` sólo para `service_role`; la app lee `secreto_guardado_en`. La dirección de apibara sólo puede ser de `apibara.tech`.
- **Color de marca con contraste.** Se rechaza el color sobre el que ni blanco ni tinta oscura llegan a 4,5:1; el mejor va a `--color-sobre-primario`. Entra por un `<style>`, no por `<html style>`.
- **Íconos y logo.** Íconos dibujados con Canvas en el navegador, subidos a `marca/iconos/<hash>.png` y servidos por el manifest (sin `sharp`). El logo no se comprime como foto: SVG sin código ≤ 200 KB; raster ≤ 1024 px o PNG sin pérdida; tope 1 MB.
- **Monedas y tipos de cambio.** Moneda base + N tipos de cambio nombrados con historial; la fórmula declara buckets → clave de TC y la cotización congela los TC usados. El modo Live oculta cifras y símbolos en toda la app.
- **La barra la elige la empresa.** «En la barra» es una columna de `tipos_cambio` escrita por `tipo_cambio_guardar(p_en_la_barra)` (un solo «Guardar» y una versión por fila, no una RPC gemela que daría PT409 contra el panel), con tope de 3 activos tras un candado consultivo tomado antes que la fila. Desactivar no desmarca y la barra filtra activos: reactivar uno marcado con 3 ya a la vista no se rechaza ni lo desmarca; la barra corta en 3 por el orden de `vigentes()` (el por defecto, `orden`, `nombre`) y el panel del que queda afuera lo dice. Sin ninguno, el por defecto. El último cambio de cada tipo (del historial, no de `actualizado_*`) lo ve toda persona activa por `tipos_cambio_vigentes()` (definer); el historial entero sigue siendo de quien gestiona. El conflicto del popover se arma en el cliente con lo releído, porque el monto va por `<Monto>`; el PT409 de la RPC no cambia. Con el Modo Live el popover no ofrece cambiar el valor.
- **Compartir los tipos de cambio sale del servidor.** El texto y la imagen (`ImageResponse` de `next/og`, Geist en `infra/compartir/fuentes/`, sin `html-to-image` ni JS en el marco) los arman `/tipos-de-cambio/texto` e `/imagen` con la sesión de quien pide, de la misma lectura (`tipos_cambio_vigentes()` y la fila de `ajustes_empresa`): la zona, el locale, el logo y la leyenda son los de la empresa, no los del navegador, y las dos salidas dicen lo mismo. Las pide el panel diferido al elegir los tipos (con 250 ms de espera) y guarda el resultado: copiar, descargar y el menú del sistema son síncronos con el gesto (Safari no deja escribir el portapapeles tras un `await`). No hay permiso de «ver»: lo comparte toda persona activa, como ve el popover. Con el Modo Live no se ofrece (llevan cifras). El logo se baja en el servidor (hasta `PESO_MAXIMO_LOGO`, PNG, JPEG, GIF o SVG); uno que no se puede traer deja sólo el nombre. La leyenda comparte la versión de la fila de `ajustes_empresa` con el formulario de Empresa (como la vigencia): guardar una deja con `PT409` a la otra.
- **Ajustes de cotización aparte.** La vigencia la cambia sólo `cotizaciones.configurar` concedida sin origen, por `empresa_guardar_ajustes_de_cotizacion` (dos permisos no se mezclan en una RPC; el vehículo y el lead obligatorios no son ajuste de empresa sino por rol y origen: Cotizaciones › La hoja); comparte versión con Empresa y revalida las dos pantallas.
- **Sitio web: cinco tarjetas en Ajustes y una por documento en Legales.** Ajustes: Identidad del sitio, Contacto, Redes, SEO y Vitrina, cada una con su modal.
  La RPC `web_ajustes_guardar` reemplaza `redes` y `seo` enteras, así que cada tarjeta manda todas las claves del sitio (lo guardado más lo suyo, `entradaDeAjustes()`) con la
  versión de la fila: el esquema y la action no cambian. Las redes sin dirección no se listan en la tarjeta. Legales: cada modal manda sólo su documento (la base
  conserva el otro y su fecha) y guarda borrador en `sessionStorage`; el editor de las guías se pide recién al abrir el modal (`ancho="grande"`). **El estado de un legal es
  «Publicada» o «Sin publicar»**: guardar publica (la web lee `legales` tal cual) y no hay modelo de borrador ni de programación (sólo las guías lo tienen); inventarlo
  pide una migración y una regla de publicación que nadie decidió.
- **Datos de la empresa: un modal por tarjeta, sólo lo que cambió.** Cada tarjeta guarda con `empresa_guardar_ajustes()` mandando únicamente las claves distintas de lo guardado (la RPC no toca lo ausente), así que dos modales sucesivos no se pisan salvo por la versión de la fila, que viaja por props al abrir. Sin cambios, guardar cierra. La moneda base con datos cargados no viaja. Los logos se suben al guardar y los íconos se dibujan desde el logo guardado en su propio modal.

## Orígenes

- **Comunes como columnas, el resto en `atributos`.** `vehiculos` tiene columnas para lo común y `atributos jsonb` validado por trigger; un campo que necesite índice o unicidad se promueve a columna por migración.
- **El tipo de un origen (subasta o manual) no cambia.** Lo impide un trigger; decide campos preconfigurados, regla `aduana` y `clave_apibara`. Uno equivocado y sin uso se elimina y se recrea.
- **Desactivar antes que eliminar.** Un origen con uso se desactiva; se elimina sólo sin vehículos (papelera incluida), cotizaciones ni fórmula publicada, tipeando el nombre. Un campo con datos se desactiva: no cambia de tipo ni se elimina.
- **Nombre, sustantivo y género son datos de la fila.** La concordancia sale de reglas puras (`pluralDe`, `contados`, `frasePorVacio`…); no hay columna de plural.
- **Orden por botones y movimiento relativo.** «Subir/Bajar» con la RPC recibiendo «después de X» (nulo = primero), renumerando 10, 20, 30 bajo candado; los campos no se arrastran.
- **Sin `origenes.ver`.** Configuración › Orígenes la abre `origenes.gestionar`; `flujos.configurar` o `cotizaciones.configurar` la ven de sólo lectura. Sin enforcement no se crea permiso.
- **«De fábrica», no «de sistema».** Un campo preconfigurado (`es_sistema`) se edita, apaga y renombra pero no se elimina ni cambia de tipo; «Sistema» nombra al rol dueño.
- **Campo principal.** Marcar otro desmarca el anterior en la misma llamada; un campo `moneda` no puede ser principal. Acompaña al título en logística y lo reemplaza en fila, tarjeta y resumen; la página del vehículo, el PDF, la web, la hoja y la bandeja siguen con el título.
- **Orden de candados origen → campo (`for no key update`)** al guardar, crear, mover y eliminar campos: sin 40P01 y sin frenar el `key share` de las FK.
- **Los datos clave son del origen.** Hasta 4, en orden, en `origenes.datos_clave` (`{"comun": columna}` o `{"campo": clave}`), con la versión del origen; los escribe sólo `origen_datos_clave_guardar()`. Los de fábrica de cada tipo los pone un trigger `before insert` (no `origen_crear()`: el seed, los e2e y las pruebas insertan directo) y una lista vacía se guarda vacía (la lectura devuelve los de fábrica). Desactivar o eliminar un campo que es dato clave lo quita en la misma llamada; reactivarlo no lo vuelve a sumar. En «Campos» se guardan al instante, de a un cambio, con «Subir/Bajar/Quitar» (sin arrastrar: menos JS y mejor con teclado). Las claves comunes viven espejadas en `origenes` (no depende de `vehiculos`) con un test en `src/app` contra `camposComunes()`.
- **Las redirecciones que dependen de la consulta o de la persona van en un `route.ts` con 308.** Las fijas, en `next.config.ts` (`:origen` restringido a un uuid, para no tragarse `general`); las de las raíces sin índice (`/configuracion/catalogos`, `/configuracion/origenes/<id>`) y las URL viejas (`/configuracion/cotizacion|flujos|logistica`), en un `route.ts` con su `url-vieja.ts` puro y probado, que conserva la consulta salvo lo que la ruta nueva ya dice (`seccion`, `origen`, `ambito`). Una que depende de los permisos lleva `Cache-Control: private, no-store` (`redireccionPermanente(destino, { porPersona: true })`): un 308 se cachea y otra persona en el mismo navegador iría al destino de la primera. Lo que no se resuelve va a la lista de orígenes o al inicio de Configuración, nunca a un error.
- **Catálogos: lo de toda la empresa, en tramos del menú y sin pestañas.** Niveles y Quién crea y quién ve (de las cotizaciones), Puertos, Navieras, Categorías de gasto y Tipos de documento (de la logística) y las Tablas compartidas, cada uno su sub-ruta `/configuracion/catalogos/<clave>`; el menú los agrupa con un rótulo por tramo («Cotizaciones», «Logística») y las Tablas compartidas van sin rótulo (uno de un solo ítem repite el nombre). Tipos de documento conserva sus tres permisos: los cambia quien gestiona los catálogos de logística y los leen quien configura un flujo o los repuestos. Las tablas compartidas se editan también desde el drawer de las tablas de un origen que las usa, con el aviso de a quién le cambian.
- **Colores y Vigencia viven en Orígenes, en «Para todos los orígenes».** Lo que vale para todas las cotizaciones de la empresa se configura donde la persona ya busca «de dónde vienen y cómo se cotizan»: arriba de la lista de orígenes, dos tarjetas de ajustes (Colores y Vigencia) con su modal por `?panel=colores|vigencia`, no catálogos con página. Cada tarjeta lleva sólo su «⋯» y tocarla la abre: una tarjeta tocable es un botón que la cubre (`absolute inset-0`) con las acciones `relative` por encima, para que ningún interactivo quede dentro de otro y el teclado vea un botón con nombre («Editar colores») y el «⋯» aparte. La lista de colores es el modal «Colores»; «Nuevo», «Editar» y «Eliminar» son ventanas hermanas que vuelven a la lista al cerrar (`usePanelPorUrl` con `volverA`, como la familia de Leads) y conservan sus nombres de `?panel=` técnicos. Cada tarjeta lee lo suyo tras su `<Suspense>` y su límite de error: una lectura que falla deja esa tarjeta con «Reintentar» y la lista de orígenes sigue. Sin `cotizaciones.configurar` el bloque no se dibuja; por URL el panel no abre y se limpia. Las URLs viejas (`/catalogos/colores|vigencia`, `/cotizacion/general[/…]`, `?seccion=tonos|colores|ajustes|vigencia`) redirigen con 308 a `/configuracion/origenes?panel=…`, y si traen su propio `?panel=` manda ése. El buscador de Configuración los sigue encontrando por una lista de «destinos de búsqueda» (`destinos-de-busqueda.ts`) que viaja como campo opcional de cada sección en lo que recibe el navegador: el menú y el selector la ignoran. `src/app` repite como literales los dos nombres de panel que sus módulos exportan (no puede importar sus `entities`); el e2e los cubre.
- **El flujo de repuestos se configura en Repuestos.** `/configuracion/repuestos/flujo`, primera sub-sección de la sección (sin `?seccion=` ni panel, la raíz abre ahí), con el mismo editor que la pestaña Fases de un origen (`fijo`, sin selector: una página nunca abre otro flujo).
- **La lista de orígenes son tarjetas con lo que les falta.** Tipo, activo o inactivo y las faltas en corto (`faltasDeLaTarjeta()`): sin el paso de los permisos (aviso blando, como en el inicio) y nada en un origen inactivo. Descartada una tabla compacta: no deja ver las faltas sin ruido.
- **La puesta en marcha es una página por paso, derivada de lo que hay** (sin preguntar). «Nuevo origen» abre `/configuracion/origenes/nuevo` (el drawer
  se quita; `?panel=nuevo` responde 308) y, creado, cada paso es `/<id>/puesta-en-marcha/<paso>` con el mismo editor de su pestaña: un solo editor por
  cosa, y la planilla y la tarjeta necesitan el ancho que un modal o un drawer no da. Qué está hecho se deriva de lo que hay (`estadoDeLaPuestaEnMarcha()`:
  campos activos, fases, fórmula de trabajo, fórmula activa), no de un «paso actual» guardado: no pide migración, lo hecho fuera del paso a paso cuenta y
  deshacer algo vuelve a dejarlo pendiente. «Seguir» no guarda ni exige (cada editor guarda con sus botones): con lo de por omisión se puede seguir. Las
  pestañas van bajo el grupo `[id]/(pestanas)/` para que los pasos no lean ni dibujen el marco (un solo `h1`, el del paso, `sr-only`; el título visible
  de la cabecera es un `<p>`). El paso a paso se dibuja en cada página y no en el layout: al saltar de paso, el layout queda y sus insignias no se
  releerían. En «Para cotizar y mover», Publicar es el paso Fórmula (los dos miran la fórmula activa), y «Ir a la celda» de un rechazo al activar
  sigue llevando al editor de la fórmula: se vuelve con «Seguir la puesta en marcha». Descartados: el paso a paso en un modal o drawer (sin ancho para
  la planilla y sin URL por paso), una columna `origenes.paso_actual` (migración y un dato que se desfasa de lo hecho) y saltar los pasos hechos al
  seguir (quien vuelve a mirar un paso no tiene por qué perderlo).

## Vehículos

- **Una sola situación real, guardada.** `vehiculos.situacion` (texto con `check`, no enum: bajo RLS la igualdad de un enum no es condición de
  índice) la calcula la base en `trg_0_situacion`, al cambiar `fases.es_subasta` y con el job `situacion-al-cerrar` (10 min de desfase son
  aceptables). Nada se mueve solo: lo ambiguo queda «Sin resolver». «En subasta» y «Sin resolver» sólo existen en el tramo de subasta: una
  subasta viva de un vehículo que ya pasó a «Comprado» es un dato viejo y manda la fase.
- **El resultado vive en la fila** (`subasta_resultado`, `subasta_resuelta_por|en`) para calcular la situación dentro del trigger. Resolver no
  mueve la versión ni pasa por la auditoría genérica (como mover): la constancia la deja la RPC (`vehiculo.subasta_resuelta`). Sin versión
  esperada: el estado hace de versión, como `cambiar_fase` y `vehiculo_conservar`. Si la subasta vuelve a estar viva, el trigger limpia el
  resultado (lo audita el refresco o la edición de fechas, que sí mueven la versión).
- **«No ganada» deja de contar** en la cadena, la bandeja de Inicio, las alertas y el inventario por defecto. El tablero no se toca: sus
  números salen de pagos confirmados y esconder dinero confirmado sería peor.
- **Fuera del tramo de subasta manda la fase, también sobre el resultado.** Una no ganada que alguien mueve a una fase real vuelve a
  contar (su situación es la fase; el resultado queda guardado), y la vuelta a subasta sólo limpia el resultado de una unidad que sigue en el
  tramo: una ganada que ya pasó a otra fase y cuyo lote se relista conserva «ganada». Así nada queda oculto por un dato que ya no aplica.
- **«No ganada» en femenino**: concuerda con la subasta, no con el sustantivo del origen. En el filtro, plural («No ganadas»): habla de vehículos.
- **El aviso de subasta cerrada al cotizar sale de la situación real**, no de una fecha comparada en la pantalla: avisan «Sin resolver» y «No
  ganada» (más «En subasta» con el cierre vencido, los hasta 10 min que tarda el job). Un vehículo en su fase ya se ganó o salió del tramo:
  cotizarlo es lo normal y avisar sería ruido. Si el origen no tiene fase de subasta, nada figura «Sin resolver» y no hay aviso (lo dice
  «Revisar»). La fecha sale de `subasta_fin_en` o `subasta_en` (la columna `cierre_subasta_en` es nula con la subasta cerrada).
- **«Refrescar la subasta» del aviso pide un toque** porque cada consulta a apibara gasta cuota; «Reintentar» sólo se ofrece si el fallo es del
  momento (`sePuedeReintentar`), nunca con la cuota agotada. Las acciones del aviso (refrescar, resolver, cotizar igual) son botones locales:
  el patrón `AccionDelAviso` no tiene «refrescar» ni «cerrar» y ampliar `src/shared` por esto dispararía el e2e completo.
- **El inventario filtra por «Subasta» y por «Fase», por separado.** Mezclados en una lista («Situación»), «En subasta» saldría dos veces (la fase y la
  situación) y no cabrían las ventanas del cierre. «Subasta» es una a la vez (`eleccion`): cuándo cierra, las vivas, sin resolver o no ganadas; «Fase» son
  casillas y filtra la columna `fase_id`, así que la fase de la subasta trae todo lo que está en ella (la situación la dice «Subasta»). Descartados: «Situación»
  con subgrupos (repite «En subasta»), «Orden» en «Vista y opciones» (el orden cambia lo que se ve: va con los filtros, en la URL y en la vista
  guardada) y «Subasta» como botones en la barra (no cabe en el celular junto al atajo). El atajo «Sin resolver» cuenta con `tope + 1` por
  `vehiculos_situacion_idx`, lo dice «99+» y cambia sólo «Subasta».
- **El por defecto de «Subasta» se llama «Cualquiera».** «Todas» se confunde con «Todas las vivas».
- **Las ventanas del cierre empiezan ahora y sólo traen vivas.** Una subasta que ya cerró no «cierra hoy» aunque el job que la pasa a «Sin resolver» corra con
  desfase; `cierre_entre` pide `situacion = 'en_subasta'`, así que una viva fuera del tramo (en una fase que no es la subasta) tampoco entra. «Esta semana» es
  lunes a domingo en la zona de la empresa. La página calcula `ahora` una vez por pedido; la base sólo compara.
- **«Cierre más próximo» va por tramos, en la base.** Primero las vivas por `cierre_subasta_en` (`vehiculos_subasta_viva_cierre_idx`), después las vivas sin
  fecha y al final el resto por alta (las cerradas no tienen un cierre que ordenar: `cierre_subasta_en` es nula). PostgREST no puede ordenar por tramos: con
  ese orden la página va siempre por `vehiculos_inventario()`, y si la base rechaza los filtros es un error con «Recarga», no la tabla. Es el orden de
  siempre cuando «Subasta» tiene valor (el por defecto de «Orden» depende de «Subasta»: la página lo resuelve antes de armar el esquema).
- **Un `?situacion=` viejo redirige con 308; las vistas guardadas se leen traducidas.** No se migran datos: `conSituacionTraducida()` al leerlas. Si venían
  varias situaciones propias gana la primera (vivas › sin resolver › no ganadas), porque «Subasta» es una a la vez; el cursor se suelta.
  El 308 lo responde `/vehiculos/enlace-viejo` (un route handler), adonde `src/proxy.ts` reescribe el pedido: desde la página saldría 200, y el proxy no importa
  las reglas de un módulo (sólo su `index.ts`, que le arrastraría las lecturas del inventario a cada pedido).
- **`situacion_en` arma una igualdad por situación propia, no un `= any`.** Una sola igualdad con el valor plegado deja que `vehiculos_situacion_idx` conduzca el orden; el
  arreglo de una subconsulta no (el planificador no sabe que trae uno). Por eso `_vehiculos_inventario_condicion` recibe la condición entera (`p_filtro`).
- **Se escriben sólo por RPC.** `vehiculo_crear(p_id…)` idempotente con id del navegador y `vehiculo_guardar` con versión; el alta entra a la fase inicial sólo si no hay nada que decidir (si no, «Sin fase»).
- **El alta dice desde dónde (`p_contexto`) y la base exige el permiso de ese contexto.** `vehiculos.crear` (alta suelta) y
  `vehiculos.crear.desde_cotizar` son dos claves por origen; `vehiculo_crear(…, p_contexto)` pide la que corresponde y la deja en
  `creado_desde`. Es un límite de flujo, no de seguridad dura: quien tiene la de cotizar crea vehículos marcados «cotizar» (queda en la columna y
  en la actividad). Se descartó crear el vehículo recién al guardar la cotización (`cotizacion_crear(p_vehiculo_nuevo)`, que también pasa
  `'cotizar'`): la hoja necesita el vehículo elegido antes. Sin la suelta pero con la de cotizar, «Nuevo» se ve apagado con «Cotizar un vehículo nuevo».
- **Un esquema Zod desde el layout.** `esquemaDeVehiculo(fuentes)` lo usan formulario y action. Tipo de campo nuevo = `ESQUEMA_POR_TIPO`, `CONTROL_DE_TIPO`, `LECTOR_POR_TIPO` y `FILTRO_POR_TIPO`.
- **VIN único global entre vivos.** La RPC responde con `hint = 'vin'`; el mensaje dice que existe, no de cuál vehículo.
- **Fotos.** Bucket público `vehiculos/<vehiculo_id>/<sha-256>`; dos tamaños hechos en el navegador (≤ 1600 y miniatura 480) sin optimizador; versión propia (`vehiculos_imagenes_version`), tope 24; duplicado por hash del original.
- **Storage de vehículos se limpia por cola.** La app no borra objetos de `vehiculos`; la limpieza reclama con candado y recuento y borra con ≥ 24 h; el barrido de huérfanos va por cursor por bucket.
- **Vitrina: una sola definición de lo público.** `interno.vitrina_vehiculos` calcula condiciones y `visible`; `web.vehiculos` y `vehiculo_vitrina_previa()` salen de ella. Publicar lleva versión y manda el estado entero; despublicar apaga el destacado.
- **Vitrina desde la lista: el panel completo de la ficha, sin salir de la lista.** «Publicar en la web…» del «⋯» y el «Publicar» de la fila abren el mismo
  panel de la ficha (`?panel=vitrina&para=<id>`: interruptor, precio, rango, nota, destacado y la vista previa); no hay un panel chico que pida sólo el precio.
  «Sacar de la web» sigue de un toque con «Deshacer» (sacar no pide nada). Un `?panel=vitrina-rapida&para=` viejo redirige en el servidor
  (`destinoDeLaVitrinaRapida()`), con el resto de la consulta.
- **Un solo «⋯» del vehículo, con «Cotizar vehículo» primero.** La fila, la tarjeta y la ficha dibujan la misma lista (`accionesDeVehiculo()`):
  «Cotizar vehículo» sola y destacada; «Editar», «Editar imágenes», «Publicar en la web…» y «Actualizar los datos»; «Ver actividad»; la papelera al final.
  Cuándo se ofrece cada una lo dice una función pura con test (`ofertasDelMenuDeVehiculo()`). Editar, imágenes y actualizar comparten la regla: con
  `vehiculos.editar` en el origen y un vehículo que no edita («propios»), apagadas con el motivo; sin la clave en el origen, ocultas (un lector no ve un «⋯»
  lleno de apagadas). «Actualizar los datos» sin enlace, lote ni VIN se ve apagada con el motivo, no oculta. En la lista, publicar sin el permiso no está
  (en la ficha, apagado con el motivo). La ficha conserva además el botón «Editar» de su cabecera. «Cotizar vehículo» suma `returnTo` = la URL de ese
  momento (la hoja ya lo lee: `volver-de-la-hoja.tsx`) y «Ver actividad» llega a cada fila como plantilla con `MARCADOR_DE_VEHICULO` (`vehiculos` no
  conoce `actividad`). Descartados: «Cotizar» como botón fuera del «⋯» (repite y suma nodos por fila).
- **Los paneles del «⋯» en la lista se leen en el servidor al abrirse.** «Editar imágenes» y «Publicar en la web…» escriben `?panel=…&para=<id>` con
  `shallow: false`, como `?editar=`: la página lee sólo el panel que la URL nombra (`src/app/(app)/vehiculos/paneles.ts`). Así las fotos que faltan de la
  subasta salen del bruto sin que el bruto cruce al navegador, cada cambio de fotos redibuja la galería y la lista por `revalidatePath`, y un vehículo que no
  está en la página también abre. El costo: abrir pide la página de la lista otra vez (el documento del inventario crece unos bytes con los mismos nodos). Un hook por panel y por lista (`useMenuDeLaLista()`): ninguna fila
  suma hooks ni nodos. Descartado: leer en el navegador (no trae las fotos de la subasta sin el bruto y la galería no se refresca sola).
- **«Actualizar los datos» es «Refrescar» con confirmación y las fotos que faltan.** Mismo motor (`useRefrescoDeSubasta`, `fusionarRefresco()`); la action
  devuelve además las fotos de esa respuesta que el vehículo no tiene (ya filtradas en el servidor) y las trae sin otra consulta. Pide confirmar en un
  `<Modal>` propio con «Sí, actualizar» / «No, volver» (`<Confirmar>` fija «Cancelar» y cambiarlo tocaría `src/shared`). Se ofrece sólo en un origen de
  subasta con apibara encendida.
- **Papelera.** Una sola lista de bloqueo (`_vehiculo_motivo_de_bloqueo`) para enviar y purgar; envío por lote con versión por vehículo y resultado parcial; restaurar vuelve sin publicar. Purga manual y automática son la misma función.
- **apibara: la llamada vive en la edge function y la hace el navegador.** La función guarda el bruto en `apibara_consultas` y el navegador manda una referencia (de quien llama, < 24 h). Ningún test llama a la API real.
- **La zona de una subasta sale del estado del patio, en el navegador.** apibara no da la zona de la subasta, pero sí el estado de la ubicación
  (`location.state` → `ubicacion_estado`); `zonaDelPatio()` lo traduce (estados de EE. UU., Canadá, Puerto Rico; uno con dos zonas, la de la
  mayoría) y la pantalla dice «hora del patio». Sin estado, sólo la zona de quien mira y la de la empresa: nunca una inventada.
  `vehiculos.subasta_zona` no tiene uso. Las fechas de subasta se ven en la zona de quien mira (`/perfil`), con su abreviatura; lo demás,
  en la de la empresa.
- **Las fechas de subasta se escriben a mano en la zona de quien edita.** «Editar fechas de subasta» del «⋯» de la ficha (no el panel de edición: el
  alta no las pide, las trae apibara) manda el instante con su zona y `vehiculo_guardar` lo acepta sólo en un origen de subasta; un texto
  sin zona se rechaza, para no depender de la hora del servidor. Refrescar desde apibara sigue mandando sobre lo escrito.
- **Refrescar no pisa lo editado.** `fusionarRefresco(previo, nuevo, actual)` toma el valor nuevo sólo si lo guardado es lo que la API dijo antes; los campos de subasta siempre se actualizan.
- **Fotos de subasta en primer plano.** Sólo de `cs.copart.com`/`vis.iaai.com`, por la tubería del navegador; primeras 24 y «Traer las que faltan». Sin job en segundo plano (se reabre sólo con reportes de fotos perdidas).
- **Los textos dicen «subasta».** «apibara» aparece sólo donde se configura; el nombre de la plataforma sale del dato.
- **Limpieza automática en SQL.** La regla vive sólo en `_limpieza_*` y `limpieza_el(vehiculos)`; día local desde las 03:00, una vez por día, lotes ≤ 200 con `skip locked`. «Conservar» es marca aparte sin versión; aviso con 3 días; interruptor apagado lo borra todo.
- **`cotizado_en` no mueve la ficha.** La escribe sólo el trigger de `cotizaciones` y nunca retrocede; `trg_actualizado_en` y `trg_auditar_cambio` la excluyen para no dar PT409 a quien edita ni mover la vitrina.
- **«Cierre subasta» es columna generada.** `cierre_subasta_en`, porque PostgREST no ordena por expresión; descartados RPC invocadora e índice de expresión.
- **Inventario de «propios» por rutas.** `vehiculos_inventario()` plpgsql invocadora (origen / creado / cartera corta), filtros en SQL dinámico con valores por `using`; filtros rechazados (22023) van por la tabla.
- **Sin Zod para `p_filtros`.** Excepción a «Zod en todo límite»: las condiciones salen de un esquema ya validado y la base las valida; un contrato de tipos en `inventario.test.ts` ata cada `Condicion['tipo']` a su `when` en SQL.
- **La puja no se hace pasar por el precio.** En un origen de subasta con el campo de `pricing.current_bid_usd`, la columna «Precio» muestra la
  puja como «Puja actual» (USD, «final» si la subasta terminó o se vendió) y, sin puja, «—»: nunca el precio en su lugar. Sin ese campo en el
  layout, sigue el precio. El campo se busca por su ruta de apibara, no por su clave (cada empresa la nombra).
- **«Relacionados»: un mismo bloque arriba de cada detalle, leído con una `security definer` que copia el predicado de las policies.** Cuatro RPC (`vehiculo_relacionados()`, `lead_relacionados()` y sus `*_pagina()`) resuelven el alcance una vez: bajo RLS, cada fila de `vehiculos_interesados` paga dos `puede_*` y un recorrido con muchas ocultas no tiene tope. Una definer además **cuenta lo oculto sin devolver sus datos** («1 que no puedes ver»: ni id, ni nombre, ni nota, tampoco el uuid del lead de un vínculo oculto); su equivalencia con la RLS la ata `supabase/tests/areas/vehiculos/relacionados*.sql` (R1). Lo que está en una papelera no se relaciona ni se cuenta; un lead en limbo sí cuenta como oculto (sigue frenando vincular). «Cotizado» es una fila por contraparte, con su cotización activa visible más nueva (_activa_ = viva y `activa|reportada`); sin `cotizaciones.ver` el grupo no existe. Los cuatro llevan `set random_page_cost = 1.1`: con el costo por defecto el plan genérico prefería un bitmap y ordenar todo lo de un vehículo caliente. En la unidad de logística, lo que abre un panel o «Ver todos» lleva a la ficha con eso abierto, mientras «Quitar interés» y «Cotizar» se hacen en el lugar.
- **«Relacionados» sin ruido: en una línea en los drawers y en logística, compacto en las fichas; un grupo vacío no se dibuja.** Dos presentaciones, que cada lugar nombra (`presentacion` sin valor por defecto): la línea de chips con un popover por grupo (página de la unidad de logística y drawer de gastos: ahí un bloque alto no cabe sin desplazar) y la compacta (las dos columnas de las fichas). Los chips y el popover son de `vehiculos`; `logistica` no los conoce. En la compacta la leyenda es el `title` del título y la descripción del grupo para el lector, sin ícono de ayuda (tres íconos son ruido y un popover de ayuda suma JS); las acciones del grupo, en su «⋯». Las de un grupo que no se dibuja van al «⋯» «Relacionados» (`accionesFueraDeLosGrupos()`); con todo vacío se ve la frase y una sola acción (la primera, vincular) y el resto va al «⋯». El popover de un chip conserva la leyenda y los botones: es a pedido. Descartadas: una pestaña propia (suma navegación y pierde el vistazo), una sección plegada (esconde los conteos y suma un toque), una barra lateral (no existe en el celular), chips también en las fichas (ahí hay lugar: las filas a la vista ahorran un toque) y tres tarjetas con los vacíos colapsados (siguen repitiendo leyendas y botones).
- **La ficha del vehículo, en dos columnas: lo clave a la izquierda** (el marco y el criterio de la del lead). A la izquierda, con su propio desplazamiento (ver «La ficha en dos columnas: la página quieta, cada columna por dentro»), sólo lo clave y
  lo que sirve para mostrarle el vehículo a un cliente: la foto con su tira de miniaturas y, sobre su esquina, la vitrina y el «⋯» (como en la tarjeta de
  la lista; «Editar» va en el «⋯»), título, número, origen, situación y los enlaces cortos a logística y repuestos; después la subasta y el costo (la cuenta regresiva y las filas de la tarjeta de la lista: puja,
  compra directa y «Costo estimado», sin título) y «Datos principales» (sólo los datos clave del origen) con «Ver más», que abre la
  **ficha completa** en un modal grande de sólo lectura y con tipografía de vitrina (`?ver=ficha`; sus fotos no abren el visor encima: un solo nivel de
  modal). Ningún bloque de la izquierda entra al índice. Sin tope de ancho propio (con `max-w-4xl` nunca habría dos columnas). Descartados: la tira vertical al costado de la foto (en 24 rem
  le roba ancho y no entra al 200 %), puntos en vez de tira (no dejan elegir entre 24), «Ver más» como acordeón (alarga la columna), la ficha completa como
  drawer (poco lugar para fotos grandes), la subasta como tabla de datos, pestañas, tres columnas, índice vertical y un bloque «Lead» aparte.
- **A la derecha de la ficha del vehículo, sólo lo de ventas**, sin repetir la izquierda: «Cotizaciones de este vehículo», «Relacionados», «Actividad
  reciente», con el índice pegajoso; cada uno por su permiso (sin ninguno, la derecha queda vacía y sin índice). La vitrina no es un bloque: se publica en el
  panel «Publicar en la web…» (`?panel=vitrina`) y se ve en el ícono de la foto (ficha y lista) y en la insignia de la izquierda; `?seccion=vitrina` abre ese
  panel. La ficha entera está en «Ver más» de la izquierda; lo de logística (fase, qué falta, documentos) y lo de repuestos tiene su página y se
  llega por los enlaces cortos de la cabecera. Los enlaces viejos redirigen reemplazando la entrada (`secciones-viejas.ts`): `?seccion=ficha` a
  `?ver=ficha`, `vitrina` a `?panel=vitrina`, `fotos` al visor, `documentos` y `fase` a la unidad (con `logistica.ver` del origen), `repuestos` al proyecto (con `repuestos.ver` y si
  tiene); sin el permiso o sin proyecto, la ficha se queda arriba (no hay destino que mostrar). «Crear proyecto de repuestos» no se ofrece en la ficha:
  vive en `/repuestos?panel=nuevo-proyecto&vehiculo=<id>`. Las cotizaciones son la fila de tarjetas (ver «Las cotizaciones de las fichas, en una fila de tarjetas»), no el historial de 500. Descartados: un bloque «Vitrina» (repite el panel y el ícono de la foto), «Comparar» junto a «Cotizar» en el título (dos acciones en un título; va en su fila, con su ayuda) y mantener el historial
  de 500 (otra lista para lo mismo).
- **Las cotizaciones de las fichas, en una fila de tarjetas.** La ficha del lead y la del vehículo muestran las últimas 10 que quien mira ve como
  `TarjetaEnLaLista` (la del listado) en una fila con desplazamiento horizontal, y una última tarjeta «Ver más» a `/cotizaciones?lead=` o `?vehiculo=`: la
  imagen y el total dicen más que una fila de texto, y el listado ya sabe filtrar. Una sola lectura con tope (`TARJETAS_EN_LA_FICHA`, 10 + 1 para saber si
  hay más), sin cursor ni «cargar más»: lo que sigue es el listado. Sin «⋯» en la tarjeta (el resumen que abre el clic lo trae) y el total sin moneda
  aparte (`<Monto>` con su modo). El lead lee `cotizaciones_listado(p_lead)` y el vehículo `cotizaciones_de_este_vehiculo()`, que devuelve `vence_el` para la
  vigencia. Descartados: las filas de «De este vehículo» (sin imagen ni «Compartir» a la vista), paginar dentro de la fila (otra lista infinita) y una
  cuadrícula (alarga la columna).
- **Aprobar desde la ficha del vehículo refresca la página.** El «Costo estimado» de la izquierda se lee en el servidor y no escucha a las islas: tras
  aprobar o deshacer, «Cotizaciones de este vehículo» hace `router.refresh()` en una transición. En la ficha no hay nada tipeado y la isla no se vuelve a
  montar (no cambian ni su posición ni su `key`); la isla ya apaga sus filas mientras relee.
- **«Actividad reciente» de la ficha del vehículo se lee desde el navegador al acercarse**, con su código por `diferido()`: dibujada en el servidor,
  sus cinco frases sumaban unos 13 KB al documento de la ficha (RSC y HTML) y lo pasaban de su presupuesto. La pieza del servidor sigue para
  `/actividad/reciente`; las dos comparten el marco y las filas.
- **La izquierda de la ficha dice lo mismo que la tarjeta de la lista sobre la subasta y el costo.** Un solo bloque dice la subasta y el costo: la cuenta regresiva del cierre (sólo «En subasta»; el mismo componente y un solo temporizador por página) y filas fijas con los mismos
  componentes de la lista (`RotuloDePrecioDeTarjeta`, `CeldaDeCompraDirecta`, `CostoEstimado`), así que nada se dice dos veces distinto. La puja y la compra
  directa salen de los atributos del vehículo (ya viajan con él), sin leer la subasta; el costo, de `cotizaciones_aprobadas_de_vehiculos()` con un solo id (la
  lectura del inventario, con el modo). No se muestra el aviso de «subasta vieja» ni la frase «Ganada / No ganada»: la situación ya la dice la cabecera.
  «Editar fechas de subasta» va en el «⋯» del vehículo y sólo la ofrece la ficha de un origen de subasta (su modal vive ahí; la fila y la tarjeta no la
  ofrecen). Descartado: dos tarjetas (cuenta aparte del costo; más ruido) y la imagen de la aprobada (la imagen de la tarjeta no se guarda: se arma para quien la pide).
- **La lista abre la ficha; no hay resumen.** Un toque en la fila o la tarjeta de
  `/vehiculos` lleva a `/vehiculos/<id>`, como un enlace de verdad. El nombre es el `<a>` (`<EnlaceDeLaFila>` de `shared`, con `data-abre-resumen` para el peso
  de «visto» y el color de la fila con el foco) y el resto de la fila le pasa el clic (`href` en `<FilaDeLista>`/`<TarjetaDeLista>`): Ctrl, Cmd o Shift + clic y
  el botón del medio abren otra pestaña, con texto elegido (copiar el VIN) no navega, y la casilla, el «⋯», «Publicar» y la foto siguen siendo suyos
  (`esClicPropio`). Sin prefetch: cien filas serían cien pedidos de una ruta dinámica, y la ficha tiene su `loading.tsx`. «Cotizar vehículo» va en el «⋯» de la
  fila (ver «Un solo «⋯» del vehículo»). Un `?vehiculo=<id>` viejo redirige en el servidor (`destinoDelEnlaceViejo()`, `redirect()`: no
  suma al historial) a la ficha con el `?panel=` que la ficha abre, el visor de sus fotos (`<id>-resumen` y `?pestana=fotos` pasan a `?visor=<id>`) y
  `?editar=` del mismo vehículo; lo demás (origen, filtros, cursor) se quita, porque la ficha tiene «volver al origen». Descartados: un «stretched link» (un
  `::after` absoluto queda encerrado en la celda pegajosa, que es `sticky`, y en la tarjeta tapa la selección de texto y obliga a subir cada botón con
  `z-index`), un `<a>` que envuelve el `<tr>` o `display: contents` (rompen la semántica de la tabla) y un botón «Abrir ficha» por fila (suma una parada de
  Tab y nodos).
- **Las tarjetas de la lista miden todas lo mismo, sólo con CSS.** La `<ul>` lleva `auto-rows-fr` (todas las filas de la grilla miden lo que la más alta de
  la página) y cada tarjeta se estira a su fila (`TarjetaDeLista estirada`); adentro, el título reserva dos líneas (`line-clamp-2` y `min-h-[2lh]`), la línea de
  datos una, y las filas de datos van pegadas abajo (`mt-auto`), fijas para toda la pestaña y con «—» si falta el dato, así quedan alineadas aunque las
  insignias de una se partan. El `dt` y el `dd` de cada fila van directo en la grilla (`grid-flow-row-dense`, la columna por clase), sin envoltorio, y el «—» es
  texto: cien tarjetas en el celular entran así en el tope de nodos del inventario. Descartados: `subgrid` (iguala sólo dentro de cada fila visual y obliga a contar las filas de cada tarjeta), un alto fijo en rem
  (recorta o desborda con el texto al 200 %) y medir con JS.
- **Una sola tarjeta para escritorio y celular: la de la foto arriba.** En el celular la grilla da una columna con el mismo orden. La miniatura de 80 px a la
  izquierda no admite el chip del lote ni la casilla y el «⋯» sobre la foto; con una sola, además, no hay salto de layout al hidratar.
- **El chip del lote, oscuro y con tokens propios.** `--color-velo-de-foto` (oscuro translúcido) y `--color-sobre-velo` (blanco), fijos en los dos temas: se lee
  sobre cualquier foto (el par entra en `design/tokens.test.ts` sobre blanco). Va abajo a la izquierda sin recibir el puntero (el carrusel sigue siendo de la
  foto) y, en la tarjeta, los puntos del carrusel van a la derecha (`puntos="derecha"`) para que nunca se toquen.
- **«Costo estimado» es la cotización aprobada con otro nombre en la lista.** El mismo dato (el primer resultado con su moneda), con el modo de tipo de cambio de
  su cotización dentro del mismo botón; los tipos siguen llamándose «aprobada» y sólo cambia el rótulo de la UI (`ROTULO_DEL_COSTO_ESTIMADO`). No enlaza a la
  cotización: abre «Compartir la cotización» de la aprobada sobre la lista (`?panel=compartir&para=<id>`); en Modo Live es texto. `vehiculos` no conoce
  `cotizaciones`: el diálogo y el hook que lo abre los une `src/app/(app)/vehiculos/listado-con-compartir.tsx` y llegan a cada dato por contexto.
- **La cuenta regresiva de la lista sale de `vehiculos_inventario()` y de la tabla, no de otra consulta.** Esas dos lecturas traen `cierre_subasta_en` (la columna
  generada de la base) y la lista cuenta con un solo temporizador por página (módulo `use-cuenta-del-cierre.ts`: cada segundo, o cada minuto con
  `prefers-reduced-motion`, y entonces sin segundos). Pasadas las 0, «Cerrando…» un minuto y después «Cerró hace…». Sólo en un vehículo en subasta de un origen
  de subasta. El servidor manda su instante (`ahora`) para que el primer texto sea el mismo al hidratar.
- **«Compra directa» se busca por la ruta de apibara (`pricing.buy_now_usd`), no por la clave del campo**, como la puja: un origen puede tener ese campo con
  otra clave. Sólo en un origen de subasta, en USD, y ese campo sale de los «en tarjeta» del layout (sería el mismo dato dos veces); la puja no cambia.

## Leads

### Identidad y alta

- **Teléfono único global y enmascarado.** Índice único parcial entre vivos; `leads_vista` enmascara con `telefono_lead()` incluso al dueño. El código de país es de la empresa y no se adivina un «+».
- **Alta en una sola RPC.** `crear_lead(p_id, p_lead, p_seguimiento, p_recordatorio)` idempotente; existe/de_otro/limbo son valores. Tomar un lead del limbo exige `adoptar = true` y no pisa datos.
- **Dos números.** Propio (consecutivo del creador, nunca reutilizado) y global, sólo con `leads.numero_global.ver`; `#n` se resuelve con `leads_ids_del_numero()`. Nunca se busca por teléfono.
- **Teléfonos extra por función.** `leads_telefonos` sin grant, se lee por `lead_telefonos()`; el principal cambia con `cambiar_telefono_lead` y el anterior queda como «Anterior». El máximo es de la empresa (`ajustes_leads.telefonos_extra_maximo`, 0 a 20, 6 de fábrica, con versión propia) y lo aplica «agregar»: rotular y quitar no lo miran, y quien ya tiene más conserva los suyos.
- **«Extras como el principal» se valida en `_lead_verificar`, con un candado por número, no con un índice.** Un índice único no abarca dos tablas y los duplicados que ya existen al encenderla deben quedar (rige para altas y ediciones desde ahí; «Choques» los lista). Orden de candados: la fila del lead y después el número, y sólo con la regla encendida. Apagada, un extra repetido sólo avisa y un `limbo` no se nombra. Restaurar de la papelera la mira sólo para el principal.
- **Los choques muestran el número enmascarado aunque el lead no se vea** (los tres primeros y los dos últimos dígitos, como el principal fuera de la cartera); el nombre y el enlace sólo salen de un lead que quien configura ve.
- **`leads.telefonos_extra.editar` es independiente de `leads.editar`** (cambiar el principal sigue con `leads.editar`).
- **Tipos de lead con clase fija.** Clase «prospecto»/«cliente» inmutable; el sistema razona por la clase, nunca por nombre; siempre queda uno activo de cada clase.
- **Alta rápida.** Un solo `<Drawer>` montado cerrado que cambia de cuerpo; el primer seguimiento es opcional; Ctrl/Cmd+Enter avanza, Ctrl/Cmd+S guarda. `N` abre lo propio de la pantalla y cae a «Nuevo lead».

### Campos y visibilidad

- **Seis columnas pasaron a atributos.** Edad, ciudad, país, dirección, género y notas son campos de fábrica; `leads_vista` nace en `_leads_vista_crear()`. Tipos propios `correo` y `documento`; nacen «solo la cartera».
- **Privados recortados al leer.** `leads.atributos` sin grant; `atributos_lead()` da todo a la cartera, lo no privado a quien sólo ve y nada a quien no ve. La visibilidad se escribe una vez en `_lead_visible_para()` sobre copias derivadas por trigger.
- **«La de la empresa» es columna.** `leads_campos.valor_defecto_empresa` (ciudad o país), resuelto al leer el layout; «País» sigue al teléfono mientras esté vacío o puesto por el sistema.
- **El rango se valida sólo en lo que cambia.** Un valor igual al guardado no se rechaza por rango ni por opción retirada (`_atributos_rango`, `esquemaDeValor` con lo guardado); el impacto avisa cuántos quedan fuera, sin bloquear.
- **El impacto de un campo privado no lee valores ajenos.** `lead_campo_impacto` cuenta la presencia (con valor, sin valor) en todos los leads, porque frena cambiar el tipo o eliminar; fuera de rango y por opción de un campo `solo_cartera`, sólo en la cartera de quien llama, como `atributos_lead()`.
- **`leads.configurar` gobierna toda la configuración de leads.** Orígenes de lead, tipos y tipos de seguimiento por RPC con tope 100; el origen por defecto no se apaga ni elimina; el CSV nunca crea orígenes.

### Escritura y acceso

- **`lead_guardar` es la única puerta.** Atributos como parche (`{clave: null}` quita); inexistente, limbo, papelera y sin acceso dan el mismo 42501. `lead_version()` se mueve sólo por lo que la ficha edita.
- **Tres clases de RPC que reciben un lead.** 1 contenido (cartera + permiso, `puede_actuar_lead`), 2 quién lo tiene (dueño o «todos»), 3 papelera; `auditoria-leads.sql` falla si una no está clasificada. La clase 1 autoriza, bloquea el lead y vuelve a autorizar.
- **`lead_id` en otras tablas se valida por trigger.** `lead_visible_al_escribir` en pagos, tareas, eventos, mensajes, repuestos y testimonios.
- **Seguimientos.** Sólo por RPC idempotentes; privado = sólo su autor; público lo ven quien ve el lead y el portal. El detalle es JSON de ProseMirror validado contra lista blanca en la base, nunca HTML; la actividad registra sin contenido.
- **Recordatorios.** Crear exige la cartera; si se pierde el lead, sigue siendo de su dueño con lead nulo. `vehiculo_id` se valida sólo cuando cambia; si deja de verse, se conserva.
- **Marcas por persona.** Favorito, tachado y etiquetas son «poner(valor)» que exigen ver el lead (no la cartera); `leads_vista` las expone como columnas de quien mira. Tachados se ocultan salvo al buscar. Paleta de ocho claves en tokens.

### Listas, embudos y plantillas

- **El embudo del lead en la ficha se arrastra con el mouse y el teclado, no con el dedo.** `MouseSensor` (a partir de 5 px, así un clic en el «⋯» no arranca nada) y
  `KeyboardSensor` con flechas que pasan a la columna vecina (`crearTecladoDelArrastre()`); no hay sensor táctil: en una pantalla que se desplaza con el dedo arrastrar
  pelearía con el desplazamiento, y «Mover a» del «⋯» ya existe. La tarjeta sigue siendo un `article` con su nombre (no un botón), enfocable para el teclado; soltar en una
  perdida abre el modal del motivo de siempre (`?panel=mover-oportunidad`) y la tarjeta se queda en su columna hasta confirmar. El selector de embudo sólo con más de uno; si
  se crea una oportunidad en otro embudo que el que se ve, el bloque pasa a ése y lo recuerda como si lo hubiera elegido con el selector (se ve entrar lo que se creó, y la próxima vez se abre ahí). Descartadas: arrastrar sólo desde un asa (un blanco más para un bloque angosto), «Mover a» como única
  forma (no es lo pedido), conteos por columna (serían totales: la ficha lee 10).
- **Los grupos de «Vehículos» llenan el ancho con `auto-fit`.** En la grilla compacta de Relacionados, `auto-fill` deja pistas vacías a la derecha con un solo grupo en
  una pantalla grande; `auto-fit` las colapsa, y las filas de cada grupo van en la misma grilla, así una fila sola o un grupo solo ocupan todo el bloque.
- **La ficha del lead en dos columnas: la izquierda, lo clave; la derecha, cuatro bloques compactos en orden de uso.** A la izquierda (`minmax(0, 24rem)`, se desplaza
  sola si no cabe), lo que identifica, como la ficha del vehículo: el nombre con el «⋯» arriba a la derecha (sin «Cotizar» ni «Editar» sueltos: están en
  el «⋯»), quién lo tiene en una línea bajo el nombre, los datos clave del lead (tipo, origen, país, teléfono principal y «Notas» a lo ancho) con «Ver más»
  (un modal por la URL, `?ver=datos`, con los grupos del layout y los teléfonos), «Quién lo tiene» con «Compartir» y «Transferir» a todo el ancho y
  «Acceso al portal» con una línea de estado y un botón principal (lo demás en su «⋯»); a la derecha un índice pegajoso de anclas y los bloques en su orden.
  El «⋯» va en la fila del nombre y no flotando en la esquina (taparía un nombre largo al 200 %); «Ver más» es un modal y no un acordeón en el lugar
  (el acordeón metería los grupos en el documento, que está al borde de su tope). «Compartir acceso» copia el código y no usa la hoja de compartir del
  navegador: la clave de un acceso que ya existe no se conoce (se vio una vez, al otorgarlo). «Cambiar la clave» es volver a otorgar (el mismo
  diálogo). El país del teléfono se resuelve con la tabla de países después de hidratar: hasta que llega se ve «—». El corte lo decide el contenedor (56 rem, el
  de la unidad de logística): a 1280 px dos columnas, a 1024 y en el celular una, y con el texto al 200 % vuelve a una sin ensanchar. El marco vive en
  `shared` (`ficha-en-bloques`) para que la ficha del vehículo use el mismo. **El portal va en la izquierda**, bajo «Quién lo tiene»: desde «Saltar al
  contenido» se llega a «Dar acceso» sin pasar por el índice ni navegar. **La derecha** son cuatro bloques, de lo más usado a lo menos:
  **Seguimiento → Cotizaciones → Vehículos → Oportunidades**, cada uno compacto (3 a la vista y «Ver todos» o «Ver todas», sin número, sólo si hay algo
  que no se ve), con un solo título, **una sola acción en el título** y lo demás en su «⋯» (el del bloque o el de cada fila); ningún subtítulo repite lo
  que dice el título o el botón, y los vacíos son de una línea. **Seguimiento**: un «+» que despliega anotar y agendar, tu recordatorio más próximo
  arriba (leído de a 1: completarlo, editarlo o eliminarlo vuelve a leer la ficha, que trae el siguiente) y los últimos 3 seguimientos en línea de
  tiempo; «Ver todos» y «Ver tus recordatorios» (en el «⋯») abren la lista completa en un drawer con su propia clave (`?todos=`), que convive con los
  modales de `?panel=`; con él abierto los modales del bloque no responden (un solo dueño). Lo que el servidor manda de nuevo se siembra sin volver a
  montar el bloque (el foco no se pierde tras guardar). **Cotizaciones**: «Cotizar» en el título (lo dibuja el servidor) y las 3 más recientes, leídas
  desde el navegador al acercarse a la vista (200 px), sin clic. **Vehículos** es el compacto de Relacionados (vinculados e interesados con sus acciones
  en el «⋯» de cada fila, «Ver todos» hasta 500) con «Vincular o marcar» en el título, y al pie sólo lo que no repite (los anteriores plegados tras su
  botón, el panel y la confirmación). **Oportunidades**: el embudo de este lead, no una lista: una columna por etapa del embudo elegido (el último
  que la persona dejó, recordado por persona en `leads.embudo_de_la_ficha`, o el por defecto) con las oportunidades de este lead en cada una, también ganadas y perdidas; arrastrar una a otra
  columna la mueve (`@dnd-kit`, mouse y teclado, detrás de `diferido()`) y «Mover a» del «⋯» queda para el teclado y el celular, que no arrastra. La lectura sigue trayendo 10 (abiertas primero:
  cubre todas las abiertas posibles, una por embudo); cada columna dibuja hasta 3 y lo que no se ve está en «Ver en el embudo», el embudo filtrado por el lead (en el «⋯» del bloque y al pie
  si algo no se dibuja), sin número. Los menús del «+» y de los «⋯» no van con `diferido()`: usan
  `DropdownMenu` y `MasAcciones`, que ya viajan en frío con el «⋯» de la cabecera; diferirlos sumaría una espera de red al primer toque sin bajar KB.
  `?seccion=` sigue valiendo: lleva al bloque y le da el foco a su título; si los bloques de arriba crecen mientras llegan, la vuelve a llevar (hasta 4 s)
  salvo que la persona ya se haya movido. Descartadas: pestañas con un resumen arriba (sigue la navegación), pestañas dentro de la derecha (se queda el
  índice que baja), tarjetas por ítem (más alto y más scroll), «Seguimiento» en dos columnas (divide la mirada y pide subtítulos), una barra fija con
  todas las acciones (vuelve el ruido de botones), un mini kanban de oportunidades (crece sin tope y repite el embudo), acordeones (esconden y suman toques), tres columnas
  (no entran a 1280 px con la lateral de la app), el índice a la izquierda (compite con la columna de datos), el portal al final de la derecha (alarga la
  tarea de oro: hay que pasar por el índice o bajar) y un bloque «Vehículos» aparte de Relacionados (dibuja lo mismo dos veces).
- **La ficha en dos columnas: la página quieta, cada columna por dentro.** Desde 56 rem de contenedor (`@container/ficha`) la ficha mide el alto de la ventana bajo la barra superior y el relleno de `<main>` (`calc(100dvh - var(--topbar) - 5rem)`, `ALTO_DE_LA_FICHA`, con un mínimo de 28 rem: una ventana muy baja vuelve a desplazar la página antes que aplastar las columnas); lo que va arriba (volver, avisos) ocupa su alto natural y las dos columnas, el resto. La izquierda se desplaza sola si no cabe; la derecha lleva el índice quieto arriba y sus bloques se desplazan debajo. Cada columna con desborde recibe `tabindex="0"`, `role="region"`, su nombre y su pista de degradado (la derecha con el fondo de la página, la izquierda con el de la tarjeta). «Ir al bloque» (`irAlBloque()`, `?seccion=`) desplaza la columna que lleva el bloque (un bloque queda 1 rem bajo su borde: el índice no tapa nada) y el bloque a la vista se mide sobre esa columna. Cada columna recuerda su posición por ruta mientras dure la pestaña (se guarda al desplazar y se repone al montar o al volver a mostrarse la pantalla, insistiendo mientras llega el contenido, salvo que otro ya la moviera o la persona hiciera algo). Por debajo de 56 rem (el celular y el texto al 200 %) una sola columna con el desplazamiento de la página y el índice pegajoso. La izquierda no se pega: la página no se mueve. Con el banner de «ver como» (que ocupa 2,25 rem en el flujo) la página se desplaza ese poco: es un aviso de quien se hace pasar por otra persona, no el uso normal. Descartado: columnas `sticky` con la página desplazándose (la persona pierde la izquierda al bajar y el índice depende de la ventana); un alto fijo en `src/app` como el de la unidad de logística (la ficha es un marco compartido: sabe su alto sin que cada pantalla lo repita).
- **Los teléfonos de la ficha son de sólo lectura; se editan en el panel de edición.** Así no hay dos lugares para lo mismo y no se pierde ningún permiso:
  «Cambiar el principal» va en el bloque de teléfonos del panel (sólo en la ficha; con algo escrito en el formulario se apaga: cambiar el número mueve la
  versión y dejaría la edición con la vieja) y quien sólo tiene `leads.telefonos_extra.editar` abre el mismo panel en «modo teléfonos». Un
  `?panel=agregar-telefono` o `?extra=nuevo` (clave propia: `?panel=` ya lo ocupa la edición) lleva a la edición con «Agregar teléfono» abierto.
- **La lista de leads lleva a la ficha; no hay resumen.** El nombre de la fila y de la tarjeta es un enlace real (`<EnlaceDeLaFila>`, `prefetch={false}`:
  cien filas serían cien pedidos de una ruta dinámica) y el resto de la fila o la tarjeta navega igual (`href` en `<FilaDeLista>`/`<TarjetaDeLista>`); la
  tarjeta del kanban toma los mismos manejadores (`manejadoresDelClic`) y lleva a `?seccion=oportunidades`. Lo que el resumen ofrecía ya está en el «⋯» de la
  fila o en la ficha, a un toque. Un `?lead=` viejo redirige en el servidor (`destinoDelEnlaceViejo()`) a la ficha **sin leer el lead**: con los permisos de
  la sesión (supuesta la cartera) se quitan los paneles que no podría abrir, y la cartera la decide la ficha, que no abre un panel de un lead ajeno (como con un
  `?panel=` directo). Un `lead` que no es un id también redirige: la ficha dice lo mismo para todo. «Un arrastre no navega» se cumple como «elegir texto no
  navega»: el kanban de `/leads` no se arrastra («Mover a…» es un menú); el embudo del lead en la ficha sí, con el mouse y el teclado, en una fila de columnas de un solo lead (pocas tarjetas). Descartados: un `<a>` que envuelve la fila (no puede envolver un `<tr>` y anidaría el «⋯» y
  los enlaces de la fila), un «stretched link» (encerrado por la celda pegajosa) y conservar el resumen junto al enlace.
- **El «⋯» del lead lleva a otros módulos sin conocerlos y sin un pedido por fila.** «Cotizar lead» y «Ver actividad» apuntan a `cotizaciones` y `actividad`,
  que `leads` no importa: `src/app` arma cada ruta una vez por página (permisos y `getOrigenes()` de esa request) con `MARCADOR_DE_LEAD`, un uuid que no es de
  nadie, en el lugar del id, y la fila lo reemplaza (`rutaDelLead()`); el `returnTo` se suma al elegir, con la URL de ese momento. «Editar lead» fuera de la
  ficha abre el mismo panel por `?panel=editar-lead&para=<id>` y lee el lead al abrirse (`lead_ficha`, un pedido por apertura). La acción principal se destaca
  en negrita, sola en su bloque y primera con el teclado (`principal` de `AccionDeMenu`), no con color: el «⋯» sigue siendo un menú y el color de marca es de
  los botones. Descartados: pasar cada ruta armada en la fila (crece con la página), un botón «Cotizar» al lado del «⋯» en cada fila (ruido y bytes por fila)
  y navegar a la ficha para editar (pierde la lista y sus filtros).
- **La ficha se mide entera.** `?seccion=` no cambia el documento: un solo presupuesto (`PRESUPUESTO_DE_LA_FICHA_EN_KB`) sobre
  `/perfil` con 10 oportunidades, seguimientos y recordatorios, vínculos y portal, igual con 1.000 (lo que crece va por «Ver todos»), y el JS en frío
  de `/leads/[id]` tiene su tope (`docs/RENDIMIENTO.md`).
- **Todo lead nuevo nace con su oportunidad base**, en la misma transacción (`_lead_crear` → `_lead_oportunidad_base`): etapa inicial del embudo por
  defecto de quien lo crea (que nace ahí si no existía), título = el nombre del lead. Un lead adoptado del limbo no es nuevo: no suma una. Deshacer
  una importación no cuenta la base intacta (abierta, con alta y versión a la misma hora) como trabajo; otra oportunidad, o la base tocada, sí.
  Basta `leads.crear`: la base es parte del alta, no una oportunidad que alguien abre (`oportunidad_crear` sigue pidiendo `leads.editar`).
  Consecuencia: la etapa inicial de un embudo no se quita mientras tenga bases abiertas (`embudo_guardar` ya frena quitar una etapa con
  oportunidades); se mueven primero.
- **«Nueva oportunidad…» se crea desde el «⋯», no desde un botón de la fila, y antes avisa de las que el lead ya tiene.** Todo lead nace con su
  oportunidad base y la persona prefiere no crear otra sin saber: un toque más (el «⋯», «Nueva oportunidad…», «Crear igual»;
  el aviso sólo se salta si el lead no tiene ninguna que quien mira vea) es el precio. Es el modal corto de las acciones de fila (`?panel=oportunidad-rapida&para=`),
  no un popover: ya hay un patrón con URL, foco de vuelta y atajos; en la ficha, donde el lead ya es el de la pantalla, es `?panel=oportunidad-rapida` sin
  `para`. Sin vehículo ni notas: el listado no lee los vehículos del lead y `leads` no importa `vehiculos`; se agregan con «Editar» en la ficha. Sin elegir embudo: el de
  por defecto. El aviso lista sólo las que quien mira ve (una oportunidad es de su dueña con el lead en su cartera: no se insinúan las ajenas), hasta 5, con «Ver»
  cada una y «Ver todas» si hay más; lee 6 al abrir el modal (una por apertura, por los índices de la ficha) y nunca cuenta. Si la lectura falla lo dice con
  «Reintentar» y deja «Crear igual»: no poder leer no impide crear. **«Ver oportunidades»** del «⋯» aparece con el lead en la cartera de quien mira (la única que ve
  oportunidades) y no pide `leads.editar`: la lista no sabe si hay alguna sin una lectura por fila, así que no la promete; sin ninguna, la ficha lo dice en su estado vacío.
- **Una oportunidad abierta por lead y embudo** (lo decidió la persona). Los embudos son personales, así que la regla es por lead y
  embudo de quien mira: una sola guarda, `_oportunidad_abierta_unica` (candado de transacción por lead y embudo, 22023 con `hint` `embudo_id` y el id
  de la abierta en `detail`), en `oportunidad_crear`, `oportunidad_mover` al reabrir y `oportunidad_restaurar` de una abierta. **No es un índice único
  parcial**: las duplicadas que ya existen lo harían caer al migrar en la nube; quedan, se ven y se editan, y sólo reabrir una cerrada con otra
  abierta se rechaza. `oportunidad_guardar` no la necesita porque no cambia de embudo (rechaza `embudo_id`). **La base del alta no falla nunca**: si ya
  hay una abierta en ese embudo, no crea otra y sigue (el alta, la importación y el turno de la web no caen por esto). **Transferir un lead y guardar
  las etapas de un embudo no pasan por la guarda**: son de cartera y de configuración, en masa, no un acto de crear; pueden juntar dos abiertas, que
  valen como las duplicadas que ya existen. La interfaz lo dice antes de enviar con `abiertas_por_embudo` de la primera página de `lead_oportunidades` (una sonda por
  embudo): «Crear igual» del aviso apagado con su motivo y «Abrir esa» al lado; en el panel de la ficha, los embudos ocupados apagados.
- **El embudo filtrado por lead son lecturas aparte** (`embudo_tablero_del_lead`, `embudo_etapa_pagina_del_lead`, por
  `oportunidades_lead_etapa_idx`): `embudo_tablero` no cambia de plan (el «mover» de las tareas de oro) y con lead y sin lead son dos consultas. Con
  lead **la búsqueda (`?q=`) no aplica** y el chip ocupa su lugar: las de un lead en un embudo son pocas. `lead=` se valida en el servidor como
  cualquier enlace a un lead (`leerLeadParaEnlazar`); el que no se ve se quita de la URL sin otra lectura. `?vista=embudo&lead=` es un enlace válido y
  no se redirige a la ficha, salvo que pida algo del resumen, que no existe (una pestaña vieja, sus modales, «Agregar teléfono»): ése va a la ficha.
- **Anotar o agendar desde la lista: una sola puerta, el «⋯», y la fila se relee al guardar.** Las celdas «Último seguimiento» y «Recordatorio» vacías son texto
  («Sin seguimientos», «—»), no botones: la acción no vive en dos lugares. Al guardar, el listado hace `router.refresh()` (relee la página con la URL tal cual)
  en vez de inventar el dato en el cliente: la fila muestra lo que la vista dice, con la visibilidad de quien mira. El embudo no relee: su tarjeta no muestra
  seguimientos ni recordatorios y releer reiniciaría las columnas cargadas.
- **El último contacto del listado va en la vista, no por fila ni en una columna mantenida.** `leads_vista` suma dos subconsultas escalares con `limit 1`
  por índice (`seguimientos_lead_fecha_idx` por igualdad con `ultimo_seguimiento_en` para el último seguimiento, y
  `recordatorios_lead_pendientes_idx` para su próximo recordatorio): se calculan sólo para las filas de la página y no crecen con los seguimientos de cada
  lead. Una columna por trigger habría escrito `leads` en cada seguimiento y no sabría de quien mira. Invocador, sin `security definer`: la RLS de
  `seguimientos` decide qué ve cada quien; la fecha pública sale de `ultimo_seguimiento_en` y, si el último seguimiento no es uno que quien mira ve,
  la fila trae la fecha sin tipo ni título. El tipo se nombra con `leads_catalogos()` (`tipos_de_seguimiento`, también los apagados), no por fila.
- **El listado no se ordena por último seguimiento ni por recordatorio.** Todos sus caminos (cursor, ventanas de candidatos, «míos» por la cartera, conteos)
  están atados a `creado_en`; ordenar por otra columna pide una clave de cursor y una ruta nuevas en cada uno, y el recordatorio (personal) no tiene índice
  por lead que ordene la tabla. Para ver lo que lleva más tiempo sin contacto sirve «Sin seguimiento» de Inicio; un orden propio entra con su índice y su medición.
- **«Hace 3 días» siempre con número.** La fecha relativa de la fila usa `fechaRelativa(…, { numerico: true })`: «hace 1 día» y «en 2 días», no «ayer» ni
  «pasado mañana» (no dicen cuánto); pasada una semana, la fecha. Se refresca cada minuto con un solo reloj por lista (`useAhora`).
- **«Míos» y búsqueda por candidatos.** «Propios» lee por `leads_cartera_vista`; «todos» por la cartera si es corta (`leads_cartera_corta()`, ≤ 5.000). Nombre desde 3 alfanuméricos seguidos; no se paga índice de n-gramas cortos.
- **Oportunidades y embudos.** Embudos personales (3–12 etapas, ≥ 1 ganada y ≥ 1 perdida) por RPC; una oportunidad sólo la ve su dueña con el lead en su cartera. Transferir lleva las abiertas al embudo del destino; la baja las cancela.
- **Kanban con tope.** 50 por columna con «Ver más», hasta 500; lo antiguo se busca con «Buscar en el embudo» (`p_buscar`).
- **Plantillas por empresa con dos versiones.** `embudo_actualizado_en` y `portal_actualizado_en`, secciones independientes. Null = la de fábrica; guardar el texto de fábrica tal cual envía null para que le llegue un cambio futuro.
- **El mensaje del portal rechaza toda `{…}` desconocida.** Una errata no sale literal al cliente; `{codigo}` y `{clave}` obligatorias. Decide `_portal_mensaje_normalizar`; TS es su espejo.
- **CSV.** Exportar fuerza la cartera, tope 5.000, 5 por hora. Importar se valida en el navegador con `validarAlta()` en lotes de 50; no adopta ni nombra a nadie. Deshacer: sólo lo intacto, 24 h, quien importó.

## Cotizaciones

### Estructura y reglas de base

- **Áreas y núcleo.** El módulo se parte en `areas/<área>/{index,client,composicion}.ts` más un núcleo que no importa áreas (guarda en `areas-de-cotizaciones.test.ts`); segundas pantallas en `pantallas/<área>-<pantalla>.ts`.
- **Reglas de base.** Vencida = `creado_en` + `vigencia_dias` por día en la zona de la empresa (sin estado); desactualizada al publicar una fórmula nueva; vehículo y lead obligatorios por rol y origen (abajo, «La hoja»); número global por empresa.
- **Lo que no se ve no viaja.** `cotizaciones` con grant por columna; `cotizacion_leer/revisiones/tabla/evaluar` recortan por nivel sin ser oráculo; un detector sobre `pg_proc` exige registrar toda función que devuelva contenido.
- **Niveles.** `cotizaciones.nivel.<clave>.ver|editar`, tope 10, sólo estrechan; recortan con `_nodos_visibles()`; ver restringido + editar abierto se rechaza. La fórmula sólo viaja a `cotizaciones.configurar`.
- **Crear y guardar sólo por RPC.** `cotizacion_crear` (única alta) y `cotizacion_guardar` (calcula con SU versión, conserva lo oculto, intento + huella). `_cotizacion_puede_guardar()` decide antes y después del candado; quien no ve recibe 42501 antes de todo.
- **Buscar cotizaciones: una función aparte, invocadora, con tope por fuente.** `cotizaciones_buscar()` no toca `cotizaciones_listado()`: cada fuente (número, título, cliente, vehículo, autor) es una ruta por su índice y el texto sobre `cotizaciones` no es condición de índice bajo la RLS (`ilike` no es seguro), así que nombra ids (clientes por `leads_candidatos()`, vehículos por origen, autores por `perfiles`) y de cada uno lee una página por su índice. Hasta 50 por fuente (`acotada` si se pasa). Quien no ve al lead o al vehículo no encuentra por él. El título de la cotización se busca por un ayudante `security definer` (`_cotizaciones_ids_por_titulo()`: bajo la RLS el `ilike` no usa `cotizaciones_titulo_trgm`) con la regla de `buscador_cotizaciones()` —hasta 1.000 candidatas de los orígenes que se ven, más las propias donde sólo se ve «propios», la policy tal cual sobre ellas— que nombra hasta 50 de las que quien busca ve (recibe el texto, no un patrón, y usa el plan genérico); la página se lee por la PK bajo la RLS, en la función invocadora. Por autor, la cotización de otra persona sólo se busca donde se ve «todos»: con «propios» costaba un `en_cartera()` por cada una (98 ms con 7.000) para no encontrar nada que el listado de siempre no muestre por su cartera.
- **Título de la cotización: automático o manual, y qué se muestra si falta.** La base decide el automático (el título del vehículo, cortado a 120) al crear y en cada guardado: no se confía en el cliente y el título nunca queda viejo tras guardar; no sigue solo a un cambio posterior del nombre del vehículo. `titulo_manual` dice si lo escribió una persona. Sin vehículo no hay automático: el texto que llega es manual, y sin texto la base rechaza (también en guardar). `p_titulo_manual` de guardar va al final con default nulo («manual si trae texto»): las llamadas posicionales conservan su sentido. Lo que se muestra cuando falta sale de una sola función (`tituloDeLaCotizacion()`): el del vehículo y, sin vehículo, «Cotización n.º N» (el término de toda la app). El buscador global lo escribe sin el vehículo (no lo devuelve) y sin importar `cotizaciones`. **El automático es un dato de la cotización:** quien la ve lee su título aunque no vea el vehículo (se guarda para buscarse y nombrarla en toda superficie, como lo pidió la persona); lo que se muestra de respaldo con el vehículo, en cambio, sale sólo del vehículo que quien mira ve. Las viejas sin título no se rellenan: toman el automático en su primer guardado.
- **El título se escribe arriba del panel del vehículo, y la guardada lo muestra en la barra de su cabecera.** Como V1: un campo en el panel, la barra con el título grande y el vehículo debajo. `vehiculos` no conoce `cotizaciones`: la barra recibe el título resuelto y un hueco arriba del panel (`arribaDelPanel`) que llena `src/app`. En la guardada la barra reemplaza «Vehículo: X» bajo el h1 «Cotización n.º N» (un solo bloque, el título no se repite); su panel no elige vehículo (`modo='ver_elegido'`) y quien sólo ve la tiene sin botón. «Escribir el título» pide el foco por el proveedor, no por la URL, y el buscador del panel no se lo quita: con vehículo nadie lo pide y el foco sigue en el buscador. La barra de la guardada va con `diferido()` y un contenedor que reserva su alto desde el HTML (`diferido()` no dibuja nada en el servidor: sin él la hoja salta al llegar); su tope de JS, en `docs/RENDIMIENTO.md`.
- **El «⋯» del listado de cotizaciones se compone en `src/app`.** Un área no importa otra: la lista única (`accionesDeCotizacion()`) vive en el núcleo (`entities/acciones-de-cotizacion.ts`); quién ve qué lo calcula el servidor con las reglas de cada área sobre lo que la página leyó (`menus-de-la-pagina.ts`; sin permisos al navegador) y las actions y los diálogos son los de la guardada. Las marcas y la versión de la página salen de tres lecturas por clave primaria; una fila sin ellas no tiene «⋯» (no se ofrece lo que depende de una versión que no se leyó). «Enviar a la papelera» se ofrece con el espejo de `_cotizacion_puede_guardar()` (editar por alcance, o es suya); la cartera del lead no se adivina: la dice la base.
- **El «⋯» del detalle y el de la lista ofrecen lo mismo en el mismo orden.** Una sola lista (`accionesDeCotizacion()`, `BLOQUES_DEL_MENU_DE_COTIZACION`), ampliada con lo que sólo tiene el detalle (vista previa, PDF, revisiones, emitir el comprobante, cotizar encima); el detalle pasa `aLaVista` (`A_LA_VISTA_EN_LA_GUARDADA`: «Compartir» y «Aprobar», que su cabecera muestra a la vista) y un test compara las dos secuencias. La cabecera de una guardada deja a la vista sólo «Guardar», «Compartir», «Aprobar» o «Aprobada», las insignias y la cadena; lo demás va al «⋯», como en las fichas del vehículo y del lead. «Emitir comprobante…» lleva «…» porque abre una confirmación; «Vista previa», «Descargar PDF», «Revisiones» y «Cotizar encima» no (muestran o hacen). «Cotizar encima» va en el «⋯» sólo cuando el aviso de versión lo ofrece (no está al día), y el aviso conserva su botón.
- **Las líneas del «⋯» de la guardada las suma cada uno desde donde vive.** `ProveedorDelMenuDeLaGuardada` envuelve la cabecera y la hoja; cada área (por el hueco `Acciones`), la vista previa, el PDF, las revisiones y cotizar encima registran sus líneas con `useAporteAlMenu()` y montan sus diálogos por la URL; el menú las ordena. Así los permisos siguen decidiéndose en el servidor de cada área, un área no importa otra y lo que llega tras `<Suspense>` aparece solo. Descartado: componer el menú en `src/app` como el del listado (cotizar encima necesita `hayCambios`, que vive dentro de la hoja). «Guardar» se dibuja en la cabecera por un portal desde el resumen (`useRanuraDeGuardar()`): conserva su estado, su motivo y `Ctrl/Cmd+S`; hay un solo «Guardar». Descartados: dos «Guardar» (pie y cabecera) y una barra pegada arriba (suma nodos y JS). El «⋯» trae su menú de Base UI en frío (los topes de `/cotizaciones/[id]` y `/cotizaciones/nuevo`, en `docs/RENDIMIENTO.md`).
- **Listado por rutas e invocador.** `cotizaciones_listado()` deja decidir a la RLS; «Mías» = `creado_por`; salen todas las versiones; `p_lead`/`p_vehiculo` filtran fuera del esquema de filtros. Máx. 50 en la pantalla (la base admite hasta 100). Lead no visible = «—».
- **La lista nace en tarjetas y agrupada por vehículo.** Lo pidió la persona (como V1): `cotizaciones.vista` y `cotizaciones.agrupar` sin elegir son tarjetas y
  agrupada; la URL manda y elegir guarda. La vista cambia en el cliente sin releer (las mismas filas); la agrupación relee (es otra lectura) y vuelve a la primera
  página. Por eso el máximo de la página es uno solo para tabla, tarjetas, agrupada o no (`MAXIMO_DE_PAGINA_DE_COTIZACIONES`), de 50: con la imagen de la tarjeta
  y sus filas cada tarjeta suma ≈ 40 nodos y 100 no caben en el presupuesto del listado (2.700 nodos, 49.500 B), como en leads. `cotizaciones_listado()` y
  `cotizaciones_buscar()` dan 50 sin pedido y admiten 100 (lo medido).
- **La agrupada pagina por la cabeza de cada grupo, no por `vehiculos.cotizado_en`.** `cotizaciones_listado_por_vehiculo()` recorre las cotizaciones por las
  rutas del listado (un lote de `_cotizaciones_lote_del_listado()`, espejo de `cotizaciones_listado()`) y se queda con la primera de cada vehículo; el cursor es
  `(creado_en, id)` de esa cotización. Por `cotizado_en` un vehículo que quien mira no ve (sin `vehiculos.ver`) perdería su grupo, quien ve «propios» recorrería
  vehículos ajenos hasta llenar la página, y la fecha no retrocede con la papelera ni dice qué coincide con los filtros. Las sueltas se intercalan solas por fecha:
  no hace falta `cotizaciones_sin_vehiculo_idx`. Hacia adelante sólo la primera de un vehículo en la lectura pregunta (una sonda por
  `cotizaciones_vehiculo_creado_idx`, desde el cursor) y sin cursor ninguna; si la lectura llegó al final, el conteo sale de lo leído. Con 2.020 leídas sin llenar
  la página, `cortada` y «Seguir buscando».
- **Con búsqueda, se agrupa la página.** `cotizaciones_buscar()` tiene sus propias fuentes y su tope: agrupar en la base duplicaría cada una. La página junta las de
  su vehículo (la cabeza, la aprobada si está entre ellas) y el conteo es el de esa página; el modal del grupo busca con el mismo texto y el vehículo.
- **Las cotizaciones de un grupo se abren en un modal, en líneas compactas, no desplegadas ni en tarjetas.** Lo pidió la persona: desplegarlas en el lugar mueve la
  lista y la alarga. El modal (`?panel=cotizaciones-del-vehiculo&vehiculo=<id>`) lleva la aprobada primero (con su insignia «Aprobada»; es la cabeza del grupo) y las demás con casilla,
  número y título, «Final», total con su modo, autor y vigencia; sin cliente (es el mismo vehículo) ni «⋯» (las acciones están arriba de su resumen): no se paga un menú ni un
  nombre de lead por línea. Se lee desde el navegador al abrir (como «De este vehículo») con los filtros de la página; el modo, por `cotizaciones_modos_de()` (una llamada por página de 10).
  `?vehiculo=` es también el filtro del listado: con ese panel la página no lo lee como filtro, para que la lista de atrás siga agrupada. «Comparar» va en el pie del modal: sus
  elegidas viven en el hueco `Comparar`, que envuelve al modal; una línea lo cierra y abre su resumen en un solo paso. Sin la cabeza (el enlace abre un grupo que no está en la página)
  el modal sale sin la aprobada primera y con el título genérico: leerla pediría otra lectura del servidor por un caso raro.
- **El resumen de la cotización lleva arriba sus acciones y una cabecera fija; lo principal son las pestañas.** Arriba, fija, la barra: «Abrir cotización» (la principal), «Compartir cotización» y el «⋯» con la lista única de la fila sin
  «Compartir» (ya está a la vista), los mismos `menuDeFila` y `compartirDe` de la tarjeta: una sola lista de acciones; debajo, la cabecera resumida (miniatura de la imagen de la tarjeta y los datos de la fila, ≤ 120 px)
  y, con el resto del alto, las pestañas, que se desplazan por su cuenta (`Drawer desplazamiento="propio"`: un panel que se desplaza entero movería la barra y la cabecera). La cotización del resumen que no está en la
  página (una línea del modal de un grupo, otra página) entra a los menús con `conLaDelResumen()`: un id más en las tres lecturas por clave primaria de las marcas.
  Los diálogos del listado se dibujan dentro del Drawer mientras está abierto y su código ya llegó (un modal hermano cuenta como un clic afuera y lo cierra) y en el
  listado si no (así un `?panel=` de la URL no espera al chunk del resumen): un solo montaje a la vez. El panel es `ancho="amplio"`: con el normal (3/4 del celular) no caben «Abrir» y «Compartir» mitad y mitad con el «⋯» a 44 px. Barra pegajosa no:
  le quita alto a lo de abajo en un panel corto. Enviar a la papelera desde ese «⋯» deja el resumen abierto: al refrescarse dice que ya no está disponible y
  «Deshacer» la devuelve. **Fuera del listado** (la ficha del lead y la del vehículo, `?cotizacion=`): `src/app/(app)/cotizaciones/resumen-de-la-pagina.tsx` lee sólo esa cotización y monta `ResumenFueraDelListado` (`pantallas/listado-resumen.ts`) con las mismas acciones
  (`use-menus-de-las-filas.tsx`, compartido con el listado). La lectura vive en `src/app` y no en el módulo porque nombra al cliente y al vehículo con `leads` y `vehiculos`, que `cotizaciones` no importa (los ciclos); el componente sí es del módulo.
  «Abrir cotización» desde una ficha lleva `returnTo` (la ficha con su consulta, sin las claves del resumen) y la página de la cotización dibuja «Volver» con `returnToSeguro()`. «De este vehículo» es la quinta pestaña y no un bloque entre los datos y
  las pestañas: la lista de otras cotizaciones empuja las pestañas fuera de la vista; sin otras dice que ésta es la única, para que la pestaña no sea un hueco.
- **La lista de cotizaciones lleva en frío sólo lo que se ve al llegar.** La imagen de la tarjeta (`next/image`, el recuadro y la cáscara del visor), el
  conmutador y «Agrupar» con su action; lo que no se ve al llegar (el modal de un grupo, sus líneas y «Comparar») va con `diferido()`. El tope de
  `/cotizaciones`, en `docs/RENDIMIENTO.md`.
- **«Vencida» una sola vez en la tarjeta.** La de la vigencia, al pie; las insignias de arriba son «Aprobada», «Final» y el origen con su color (menos ruido). El
  origen va como insignia y no repetido en «N.º n · origen».
- **La tarjeta de la lista no repite el vehículo ni dice «Preventa».** Su título es el del vehículo (el automático) o el que se escribió, y un subtítulo con el
  mismo nombre sería ruido; la clase sólo se marca cuando es «Final». El vehículo («—» si quien mira no lo ve) va en la tabla y en el resumen.
- **La imagen de la lista en miniatura, achicada al responder.** `?ancho=480` de la ruta de la imagen, con su propia ETag: se achica del mismo PNG (nunca de
  un WebP ya armado, que pasaría dos veces por la compresión). El visor y «Compartir» piden la grande.

### La fórmula

- **Grafo versionado validado en SQL.** Lista de nodos con operaciones cerradas; `validar_formula()` y `evaluar_formula()` son espejo exacto de `validar.ts`/`evaluar()` con corpus de paridad; un borrador y una publicada por fórmula del origen y una fórmula activa por origen; snapshot por cotización. Se escribe como texto compilado al grafo.
- **`HOY()` no se admite** (lo decidió la persona): el compilador da `hoy_no_soportado`. Si una fórmula real lo pide, compila a un nodo `fecha_cotizacion` congelado con la cotización, con paridad TS/SQL.
- **El SI con condición es otra operación, `elegir`; el `si` de una bandera no cambia.** `si` depende de su `condicion`, que es una bandera y además el
  interruptor del nodo: ampliarlo a una condición cualquiera y a una rama «si no» lo volvería de dos formas, con chequeos cruzados en Zod y en SQL y otro
  orden del primer rechazo. `SI(bandera; x)` compila al `si`; `SI(condición; x[; y])` y `SI(bandera; x; y)` compilan a `elegir`, y la
  persona escribe SI en los dos casos. Un `elegir` no es condición de otro (`SI(SI(…); …)` como prueba es un error): una condición vale 1 o 0 y un
  `elegir` vale lo que valga su rama.
- **La rama no elegida de un SI no esconde sus faltantes.** Las dos ramas son nodos del grafo y se evalúan siempre (una pasada, sin cortocircuito): el
  valor es el de la rama elegida, pero el faltante de la otra queda en `faltantes`. Un SI no vuelve opcional un input; para eso están `condicion` y
  `requerido_si`.
- **Las comparaciones, Y y O auxiliares son `raw`** (valen 1 o 0, no un monto), y también la raíz de una fila nueva que es una de ellas; una fila que ya
  existía conserva su formato. La validación no exige `raw`: es lo que escribe el compilador, no una regla de la base.
- **BUSCARV compila a los nodos `tabla` y `tramo` y se revisa contra el catálogo del origen.** Sin nodo ni cálculo propios en
  la base: la exacta busca por la primera columna de la tabla y la de tramo por `desde`/`hasta`. El catálogo (clave y columnas de las tablas del origen
  y las compartidas, con la del origen ganando como al calcular) lo lee el área `formula` en el servidor con su propia consulta, porque un área no
  importa otra; si falla, sólo BUSCARV dice `tablas_sin_leer` y lo demás se edita igual.
- **El ejemplo de un mensaje del compilador usa el nombre que la persona escribió** (`SI necesita una condición, por ejemplo remate>1000.`), nunca una
  referencia A1: en la fórmula no hay celdas.
- **Sin «Sugerido: X» junto a un valor modificado.** La celda muestra el override con anillo y ↺, que lo quita. Si se reabre, `evaluar()` y `evaluar_formula()` devuelven `sugeridos[id]` sólo de nodos con override.
- **Publicar sin pisar el borrador.** El ⚙ y revertir publican la N+1 desde la publicada (`_publicar_version()`, candado por origen, compartido por todas sus fórmulas); publicar un borrador atrasado da PT409 con quién publicó; revertir a un nivel retirado se rechaza.
- **Versión esperada del borrador.** `formula_guardar_borrador`, `_descartar_` y `_publicar` la llevan al final con `default null`, sin sobrecargas; en guardar, nula = crear. Guardar devuelve `{id, actualizado_en}` y el editor sigue sin releer.
- **Orden en las RPC del borrador.** Permiso, validación (fuera del candado, es lo caro), candado del origen, borrador `for update`, esperadas y escritura. Descartar lo puede cualquiera con `configurar` del origen (limpia el olvidado de quien se fue).
- **Varias fórmulas por origen, una activa.** Cada fórmula del origen tiene su borrador, sus versiones (numeradas desde 1) y su tarjeta; la activa es la
  única que se cotiza (`_publicada_de_la_activa()`). Los candados son los del origen (`formulas:` y después `plantillas:`), compartidos por todas: un
  solo orden, el que prueban las carreras.
- **La primera publicada de un origen sin activa la activa** (sin preguntar): sin esto un origen nuevo no se cotizaría hasta tener el botón «Activar». Una
  activa siempre tiene publicada.
- **Una copia de otro origen queda marcada hasta que sus datos del vehículo existan en el destino** (sin preguntar): publicar y activar lo exigen sólo a
  esas (`copiada_de_otro_origen`, también la copia de una copia); las demás publican sin esa exigencia, sin romper fórmulas ni semillas.
- **Copiar no toca los colores:** el catálogo es de la empresa y hay una por despliegue, así que toda clave que la copia nombra ya existe, y un color en uso
  no se elimina.
- **Un trigger de compatibilidad cuelga de la fórmula de trabajo lo insertado sin fórmula del origen** (sin preguntar): la semilla, las pruebas, las carreras
  y el e2e insertan directo en `formulas` y `plantillas_tarjeta`; reescribirlos sería riesgo sin valor. Las RPC siempre pasan el id.
- **«Guardar con la N» deja de valer con lo primero que pase:** una versión posterior de su fórmula o que su fórmula deje de ser la activa
  (`desactivada_en`), con la misma ventana de 24 h.
- **Activar pide la activa que se vio** (sin preguntar): dos personas activando a la vez, la segunda recibe un PT409 con quién y cuándo en vez de pisar.
- **Activar sin ninguna tarjeta se rechaza** (sin preguntar; 22023, hint `tarjeta`): cada fórmula lleva su tarjeta, y activar re-valida la publicada contra
  la versión que se va a cotizar.
- **El nombre es único en el origen sin distinguir mayúsculas, también entre las archivadas; el tope de 50 cuenta las no archivadas** (sin preguntar). No hay
  desarchivar.
- **Publicar una tabla de referencia publica la N+1 de cada fórmula no archivada del origen con publicada que la use**, no sólo la de la activa.
- **«Para cotizar y mover» mira la activa** (sin preguntar): `origenes_resumen().formula_publicada` dice si hay activa y `tarjeta_publicada`, si la
  activa tiene su plantilla publicada. Sin activa, la Tarjeta está pendiente aunque otra fórmula del origen tenga la suya: no es la que se cotiza.
- **Crear y activar entran al inventario de visibilidad como `no_devuelve`:** leen la fórmula pero crear devuelve `{id, actualizado_en, avisos}` y
  activar, ids y números.
- **Planilla, Hoja y Tarjeta escriben en la fórmula de su URL** (`…/<parte>?formula=<fórmula>`, `p_formula_del_origen`), nunca en la de trabajo de
  cuando guardan: activar otra con el editor abierto no hace saltar lo escrito de fórmula. El ⚙ de la hoja no la manda: cambia la activa, la que se cotiza.
- **Las fórmulas del origen se eligen en el selector de la barra de la fórmula** (`docs/UX.md` › «Cotización: fórmulas del origen»): una fila por
  fórmula, la activa primero, con su «⋯», y la elegida en `?formula=` (la URL dice qué fórmula se edita, y un enlace a una fila o a un lugar de la
  tarjeta la lleva). Descartadas: una grilla de tarjetas (cada una ocupa el alto de una tarjeta para decir nombre, estado y versión, y con 50 no se
  recorre) y una tabla (sus columnas no dicen más que la línea de estado y en el celular se parte).
- **Sin `?formula=`, Planilla, Hoja y Tarjeta abren la fórmula de trabajo** (sin preguntar): con activa es la activa; sin activa, la más nueva sin
  archivar, así un enlace viejo o el paso Tarjeta siempre llegan a algo editable. Sin ninguna, «Empezar la fórmula». Una `?formula=` de otro origen o que
  ya no existe abre la de trabajo con su aviso.
- **Copiar de otro origen copia su publicada; si no tiene, su borrador** (sin preguntar): lo publicado es lo probado. El modal lo dice al elegir la fórmula.
- **La activa no ofrece «Activar…»** (sin preguntar): lo pendiente en ella se publica desde su planilla o su tarjeta; activar de nuevo no cambiaría qué se
  cotiza.
- **Una archivada no se edita** (sin preguntar): su «⋯» ofrece sólo Renombrar y Copiar, y abierta por URL muestra la cabeza con el aviso y «Copiar», sin
  Planilla, Hoja ni Tarjeta. Para seguir con ella se copia.
- **Archivar pide confirmar** (sin preguntar): no hay desarchivar. Eliminar también, y sólo se ofrece a la que nunca estuvo activa.
- **Las acciones de las fórmulas del origen no revalidan** (sin preguntar): revalidar desde el editor pisa lo que está a medio tipear. Devuelven el dato:
  la lista hace `router.refresh()`, la cabeza aplica el nombre nuevo y archivar o eliminar desde el editor vuelven a la lista por `salirSinPerder()`.
- **Los avisos de la copia quedan hasta «Ocultar»** (sin preguntar; `sessionStorage`, por fórmula): dicen qué tablas se crearon y qué datos del vehículo
  faltan, y se leen al llegar a la planilla, no en un toast que se va. Los datos que faltan siguen marcados en sus filas mientras falten, sin el aviso.
- **La fórmula se ve y se edita como planilla con referencias A1; se guardan ids.** A · concepto, B · %, C · valor, D · de dónde sale. `C5` y `B9` son
  del navegador (`aA1()` al mostrar, `deA1()` antes de compilar): `nodo.texto` nunca lleva una celda, así que insertar, mover o eliminar filas no reescribe
  ningún texto. No hay editor en texto aparte. Una sola copia de trabajo, la de la sesión; las
  tarjetas de la publicada y del borrador no llevan «Editar». La sesión se vuelve a montar con «Recargar» o si la versión cambia por algo que no hizo
  ella (publicar, descartar, revertir), nunca al guardar.
- **Un panel que ya no existe responde 308 desde el proxy, sin ese panel.** `?panel=editar-formula` (el Modo avanzado) y `?panel=plantillas-de-v1` («Empezar desde una plantilla») en planilla, hoja o tarjeta de una fórmula van a la misma parte con el resto de la consulta (`src/shared/lib/paneles-que-ya-no-existen.ts`); las rutas cortas y las URL viejas de Configuración › Cotización los quitan en su propio salto. Para empezar una fórmula está «+ Nueva fórmula»; lo creado con las plantillas (fórmulas, tarjetas y colores `v1_*`) se queda.
- **Orden único** (sin preguntar): la planilla dibuja las filas en el orden de `definicion.nodos`, numeradas de 1 a n. Una banda es un tramo de filas
  seguidas con el mismo `grupo`, con su cabecera sin número (un grupo partido lleva una por tramo); las filas sin grupo no llevan cabecera. No hay
  seudobandas «Tipo de cambio», «Unidad de ejemplo» ni «Variante»: el tipo de la fila lo dice el color de su celda. Así «una fórmula sólo usa filas de
  arriba» es lo que se ve, y el orden guardado es el que se dibuja.
- **La B absorbe el %** (sin preguntar): una constante `pct` raíz que sólo nombra un `porcentaje_de` raíz no tiene fila propia; se ve y se edita en la B
  de esa fila, y mover, duplicar o eliminar la fila la lleva. Un `pct` compartido o que es un `input` conserva su fila y la B lo muestra.
- **Rangos sólo en `SUMA`, `MAX` y `MIN`** (sin preguntar): `Cn:Cm` sobre la C y con filas de arriba. Se guarda la lista de ids y al mostrar, 3 o más
  filas seguidas se comprimen. El rango no crece solo: insertar una fila en medio muestra `SUMA(C5:C6; C8:C10)`, que es lo que se calcula.
- **Eliminar una fila se rechaza con su motivo** (sin preguntar): otra fila la usa («La usan C9 y C12.»), es el tipo de cambio de una banda o del total,
  es la fila del total, es la única de su banda, la hoja la muestra o la tarjeta de trabajo la nombra. Quitar una banda, igual si la tarjeta la nombra.
  Sin esto, publicar dejaría la tarjeta sin plantilla o la hoja con `nodo_sin_seccion`.
- **Deshacer de un nivel** (sin preguntar): eliminar una fila y quitar una banda guardan la fórmula anterior y avisan con «Deshacer»; no hay Ctrl+Z general.
- **Los ids no se muestran:** la referencia es la celda. Una banda se nombra por su id en `SUMA(primer_pago)` y el autocompletar la ofrece como
  «Primer pago → SUMA(primer_pago)».
- **Editar un valor en la planilla nunca pregunta.** C de una constante o B de un par escriben `params` y reescriben su texto, como el ⚙; si el texto no
  puede decirlo, queda «el texto ya no manda» y «Pisar el valor» rige sólo al recompilar ese texto en la barra de fórmula.
- **«Publicar…» espera mientras haya cambios aplicados sin guardar** («Guarda el borrador antes de publicar: se publica lo guardado.»): publicar algo
  distinto de lo que muestra la planilla sería un error de dinero.
- **La planilla en el celular y con el texto al 200 %** se desplaza de costado en su marco con «#» y A pegadas (D se parte en líneas): las dos cosas
  pasan con el mismo ancho angosto y se eligió la del celular en vez de bajar B–D bajo A. «Totales» y la tarjeta van al costado cuando la planilla mide
  72 rem o más (una consulta de contenedor, no `xl`): a 1.280 px la columna de Configuración deja ≈ 52 rem y la tabla quedaría apretada.
- **La tarjeta en vivo** dibuja la plantilla de la fórmula de trabajo leída con su fórmula publicada (sus etiquetas) y los valores de la fórmula de trabajo; «Ver total»
  sale del diseño (`ver_total_bs_por_defecto`, apagado sin él) y no se cambia en la planilla.
- **Qué hace lo que se escribe en C** (sin preguntar): en un valor fijo, un número cambia el valor y `=` la vuelve cálculo; en un cálculo, `=` recompila y
  un número la vuelve valor fijo; en las filas del asesor, dato del vehículo, interruptor y variante, un número es el valor de la unidad de ejemplo y `=`
  la vuelve cálculo; el tipo de cambio y la tabla no se escriben («Cambia su tipo en «Tipo de celda».»). El id de una fila no cambia; un negativo no se
  escribe en el texto; tope 2.000 por fila en UTF-16, del texto guardado (con ids). `key` = `<origen>:<vuelta>:<sesión>`.
- **Bandas.** «Nueva banda» pide etiqueta, color, plazo, tipo de cambio y al menos una fila, y va al final de `grupos`; si la fórmula no tiene `total_en`,
  toma el tipo de cambio de la banda. Quitar una banda deja sus filas sin banda. Arrastrar una fila a un tramo le pone esa banda; a un tramo sin banda, se
  la quita. Una auxiliar nunca suma a una banda; el doble conteo lo marca la validación de después, como tras aplicar una fila.
- **El tipo de cambio de una banda es una fila `tipo_cambio`** (el bucket, sin preguntar): se usa el bucket que ya apunta a ella o se crea uno (id = su
  `clave`). Si el diseño tiene modos, crear un bucket se rechaza («La hoja tiene modos de tipo de cambio: …»): los modos llenan exactamente los buckets de
  la fórmula. Sin modos, los buckets que quedan sin uso se limpian. «Total y tipos de cambio» edita `total_en`, la fila del total (pasa `salida: 'total'`
  en la misma operación) y el tipo de cambio de cada bucket.
- **Lo tipeado se normaliza a 15 cifras**, como la XCell: «1,1 %» manda 0,011. Las comparaciones con lo guardado también van a 15 cifras.
- **El ⚙ espera la publicada que leyó el panel**, nunca la versión que dibuja la hoja; si difieren, el panel lo dice. Lo enciende un proveedor y lo decide la base; sin proveedor no se registra el panel.
- **El ⚙ de la cabecera publica la N+1 desde la publicada, sin tocar el borrador**, como el de una constante (`formula_cambiar_cabecera()`, parámetros
  tipados en vez de un `jsonb` abierto). Escribe siempre las tres claves por defecto juntas y compara «los mismos valores» sobre los efectivos: no hay
  normalización que espejar. Es un `<Drawer>` con su URL (`?ajuste=cabecera`), el mismo patrón que el ⚙ de una celda; los textos y el orden, los de V1.
  «Aplicar también» va apagada en una guardada de sólo lectura y si la versión de la hoja no tiene el modo. Sin red dice «No hay conexión.» con «Reintentar»
  (reenviar es seguro: la base compara la esperada).
- **El ⚙ de un tipo de cambio.** `formula_tipo_cambio_del_nodo()` (definer, pide `empresa.tipos_cambio.gestionar` y ver el nodo; todo rechazo da `null`); manda sólo `{id, actualizadoEnEsperado, valor}`.

### La hoja

- **Las cotizaciones hermanas (la variante en par).** Qué nodos van en par es una regla estática (`solo_en` o nombrar la variante o un nodo que ya va), espejada
  en TS y SQL, para que la forma de la hoja no cambie al tipear. La opción no la elige la persona: la pone la base (`p_opcion` al calcular, `importadora.en_par` al
  crear), así un nivel que esconde la variante cotiza igual; el `par` (etiquetas de las dos opciones) viaja a todo el que abre porque es configuración. Las RPC en
  par llaman a `cotizacion_crear`, `cotizacion_guardar` y `cotizacion_encima` con ese ajuste de la transacción en vez de partirlas: sus definiciones y firmas las
  fijan pruebas de medición, de candados y de auditoría. La segunda hermana nace 1 µs después (la de la primera opción es la aprobada y quedan juntas en las
  listas). La base compone el título « · <etiqueta>» (el cliente manda el título sin la opción). La guardada de una hermana abre las dos y guardar guarda las dos
  sólo si quien mira puede guardar las dos (nunca se dibuja editable lo que no se guarda); si no, sola. Al abrir dos guardadas por separado con lo común
  distinto, manda lo de la que se abrió (con aviso) y al guardar queda en las dos; una hermana sin cambios no se reescribe. Los atajos, interruptores, el modo y
  «Ver total Bs» son comunes. La papelera trata el par como un lote (enviar una manda la otra al mismo lote; restaurar o purgar algunas suma su hermana del
  mismo lote, nunca cruza lotes ni purga una viva). «Cotizar encima» de una hermana crea un par nuevo en el acto. El PDF lleva una página A4 por tarjeta (una
  tarjeta encogida a la mitad no se lee); la imagen de «Compartir» apila las dos imágenes de la tarjeta en el navegador (la ruta sigue dando una por cotización).
- **Vehículo y lead obligatorios: dos libertades por rol y origen.** `cotizaciones.crear.sin_vehiculo` y `cotizaciones.crear.sin_lead` (por origen, sin alcance; se suman, sin deny): sin la clave en ese origen el vínculo es obligatorio. Una final pide siempre los dos y cotizar encima aplica las mismas claves a la anterior (una anterior sin lead se cotiza encima sólo con `sin_lead` de su origen). Las hace cumplir la base (`cotizacion_crear`, `cotizacion_encima`, `_cotizacion_cadena`); la hoja decide con `sesion.permisos` (con «Ver como», los del rol elegido, un subconjunto de los reales: nunca afloja). El rol dueño las tiene sin origen: sin ellas nadie podría concederlas (`concesion_dominada()`) ni editar un rol que las tenga (`rol_dominado()`), y el dueño es «todo el catálogo».
- **La hoja abierta la firma la base.** `cotizacion_hoja()` devuelve `abierta` con HMAC (clave en Vault); crear, evaluar y la ayuda de tabla reciben `p_abierta` y calculan con esa versión. Firma también la huella de las tarifas de la apertura, no sus valores: `crear` la compara con las que reconstruye del historial, porque un `cambiado_en` anterior a la apertura puede confirmar después. Cotizar pide `crear` y `ver` del origen.
- **Cotizar encima.** La N+1 nace al tocar (`cotizacion_encima`), siempre preventa, con lo guardado de la última de la cadena; índice parcial `cotizaciones_encima_unica`. Quien no ve la N+1 sólo sabe que existe.
- **Revisiones con totales por clave.** El diff se compara después de recortar (`_cotizacion_diff_recortado()`); «Ir a una fecha» es `p_hasta` exclusivo en `cotizacion_revisiones()`, anclando y paginando por id.
- **La hoja con el aspecto de V1:** el de las capturas de V1, con los tokens y en clases y variables sobre los nodos de siempre (ningún nodo más por celda ni
  por sección).
  - **La celda (XCell) va en una fila:** rótulo · valor(es) · acciones, de 56 px (`--xcell-alto`, en px: no crece con el texto). El rótulo va a 1,3 veces la
    letra de la hoja y se corta con «…» (el texto completo, en `title` y en el nombre del grupo); el monto, a 1,5 veces, en negrita y en la monoespaciada,
    nunca se corta y baja de línea antes de encimarse; el % de un par, chico y gris al lado (con tono, en la tinta del tono: un gris sobre un color no
    garantiza AA). Todo sigue a `--text-sm`, así la «Letra» del aspecto escala la celda. Sin el envoltorio de la cabecera: un nodo menos por celda paga los
    de los pasos.
  - **La celda densa de `repuestos` se queda densa:** la hoja de ítems es una tabla, no la hoja de cotizar; `XCELL_COMPACTA` en su contenedor apaga el alto,
    la sangría y las letras de V1.
  - **El candado de un lado bloqueado va en la fila de acciones**, con su motivo como nombre (`aria-label`), descripción del valor y globo en el `::after`
    del mismo nodo al pasar el puntero o enfocarlo: tres nodos, los de la nota escrita que reemplaza. El aviso o el error sigue escrito bajo la celda.
  - **El orden de las acciones es candado · ⚙ · ? · ↺**, el de V1; las flechas siguen ese orden. El candado no cuenta para anunciar el atajo: su motivo ya es
    la descripción.
  - **Un par cuyo secundario es el monto dibuja el % grande y primero** (`secondaryProminent`): el orden visual y el de Tab coinciden y los ids que emite la
    celda no cambian. La semilla deja sus impuestos en `porcentaje` (cambiarla movería el corpus y la tarea de oro).
  - **El total va en una tarjeta de superficie invertida** (la tinta de fondo y el papel de letra: oscura en claro y clara en oscuro, como V1), pegada al
    borde de arriba del resumen, en su lugar de hoy; el rótulo es la etiqueta del nodo en mayúsculas por CSS.
  - **«Avanzado» es un botón a lo ancho con los reguladores**, y el modal conserva su título (el término del glosario); es grande (56 rem: un `tercio` va a
    tres columnas) y sus secciones van sin marco. Los títulos que esconde son la descripción del botón, sin escribirse; «Hay datos por revisar.» sí se
    escribe: es un estado.
- **El modo elegido se dibuja aunque no sea visible; la visibilidad no es una regla de guardado.** Los modos visibles son sólo del encabezado
  (`modosDelEncabezado()`): `_cotizacion_modo` sigue aceptando cualquier modo del diseño, así una guardada vieja no pierde el suyo. Una cotización nueva abre con
  el modo por defecto y «Ver total» por defecto; una guardada, con lo suyo.
- **Los pasos de la hoja no reemplazan las barras.** «Hoja · Vehículo · Cliente · Vista previa» van debajo de los modos y abren los paneles de hoy; las barras
  del vehículo y del cliente se quedan arriba, fuera de la `key` de la hoja (adentro se volverían a montar con cada `key`). «Vehículo» y «Cliente» sólo si su
  barra tiene panel (`vehiculos.ver` del origen, `leads.ver`); en una guardada, «Vehículo» sólo si no es `solo_mostrar` y nunca «Cliente». **Van fuera del orden
  de Tab** (`tabIndex -1`): la tarea de oro «cotizar» no suma paradas (lo pidió la persona) y con el teclado lo mismo se alcanza por las barras, «Vista previa»
  del resumen y las celdas. El nombre de cada botón es lo que se ve («Vehículo», sin chocar con el de la barra, «Vehículo: …»); el punto es su descripción y su
  `title`.
- **Los enlaces de la ayuda piden texto** (`{texto, enlaces?}`: no hay ayuda de sólo enlaces; borrar el texto se los lleva). Su URL se valida en la base, en el
  esquema del diseño **y** en el de la hoja (`URL_DE_ENLACE`), con `rel="noopener noreferrer"`.
- **«Ver total Bs» se guarda con la cotización.** `ver_total_bs` validado contra el diseño de esa versión; `moneda_bs` sale del TC de `total_en`; si es nula no hay interruptor. El modo de TC es parte de las entradas.
- **La ayuda de tabla.** Si la celda es de dinero, cada cifra pasa por `<Monto>`; sólo columnas declaradas; tope 1.000 filas. `dato_del_vehiculo` (columna ← campo de texto) guarda en el vehículo por `vehiculo_guardar` y recarga.
- **Paneles de la hoja.** Vehículo y cliente leen desde el navegador y escriben su URL con `nuqs` + `replace`; elegir cliente conserva lo tipeado (borrador por persona, origen y vehículo); «Nuevo lead» es el del shell con `?elegir=`.
- **El vehículo elegido en una guardada vive en `?vehiculo=` y viaja al guardar; «Recargar» lo suelta.** Como en cotizar, el panel escribe la URL y el servidor hace el primer cálculo con `p_vehiculo` (recargar o un enlace lo conservan). «Recargar» lo quita siempre, también en uno de la misma versión (`nodo_no_editable`): nunca deja lo elegido sobre otra hoja, y lo tipeado vuelve con el borrador. Guardado, sale de la URL sin ir al servidor (la versión nueva ya trae ese vehículo). Lo decide `cambioDeVehiculo()` con `puede_guardar` y la clase, nunca el rol; una final lo muestra con su motivo. El panel es el de cotizar sin «Quitar» (la base no quita el vehículo); el dato del vehículo de una tabla no se elige ahí (`docs/PENDIENTES.md`).
- **El cambio de vehículo encabeza la línea de una revisión.** Con otro vehículo cambian muchos nodos: al final quedaría en «y N más». Los títulos se resuelven al leer (pk de `vehiculos`, RLS de quien mira); uno en la papelera se nombra como lo que no se ve («un vehículo que no puedes ver») y un lado sin vehículo, «sin vehículo»; sin la lectura de nombres, «Cambió el vehículo».
- **El aviso de subasta cerrada de una guardada es sólo del vehículo recién elegido.** El guardado no paga al abrir las lecturas de la subasta ni de apibara; el de la hoja nueva, sí (lo elige ahí).

### Diseño, plantilla y tarjeta

- **Una auxiliar `<fila>__<n>` no pide celda.** La regla vive en `compilador-auxiliares.ts` con espejo `_diseno_auxiliares()`; una fila constante propia sí pide celda.
- **Tope de 40 ítems por diseño.** El borrador lo admite; publicar, el ⚙ y revertir lo rechazan (`_diseno_maximo_de_items()`). Como la cobertura obliga a dibujar inputs y banderas, una fórmula con más de 40 tampoco se publica.
- **«Se deduce restando» es sólo un aviso** sobre sumas directas; la autoridad es la visibilidad que compila la base al publicar.
- **La plantilla lee la fórmula con lo que mira `validarPlantilla()`** (`looseObject`, `lectura-sobre.ts`), no con `esquemaDefinicion`: no se rompe con cada cambio de la fórmula. Guardar valida la forma; lo que cruza con la fórmula lo rechaza publicar.
- **La tarjeta de la cotización es una cuadrícula declarativa.** La forma 2 de la plantilla (columnas, filas y celdas libres, como en V1) se valida
  espejo en TS y SQL con listas cerradas (variables, `mostrar`, `ocultar_si`, 8 tamaños de letra) y nodos por id; los colores son una clave del
  catálogo o `auto`, nunca un hex suelto (un texto libre podría nombrar cualquier nodo; un hex, saltarse el catálogo). Un texto mezcla texto y
  datos sólo como `partes` (strings y datos, en una sola forma: nunca dos strings seguidos ni uno vacío, al menos un dato; sin datos es `texto`); `{{` sigue
  rechazado: nada interpola. Tope de **24 KiB** del texto del `jsonb`: la plantilla más grande de V1 (USA) mide 12.154 bytes (11.036 en JSON
  compacto; China 9.573, Compra dealer 9.745, Oficina 7.110), el doble a KiB enteros; la réplica de V1 USA en forma 2
  (`entities/tarjeta/plantilla-como-v1-usa.json`: 6 columnas, 16 filas, 56 celdas) mide 14.755. La forma 1 conserva su tope de 32 KB. Las claves de
  `estilo` y las combinaciones son opcionales con su valor por omisión (ahorran bytes) y `bordes` es un objeto por lado (un lado gana sobre `todos`).
  Los mensajes de la forma 2 nombran la celda o la fila, nunca el nodo: no exponen un id restringido. Sin subtotales por grupo: serían dinero calculado
  fuera de la base.
- **El texto con datos se guarda en partes, no con marcas.** `{tipo: 'texto', partes: ["Comisión giro ", {tipo: 'dato', …}]}`: cada parte, un string o el
  mismo dato de una celda «Dato», así la forma, el aplanado (`datosNombrados()`) y las reglas de nodos ya lo miran sin un parser en dos lenguajes, sigue siendo
  `tipo: 'texto'` para los retoques y la conversión de la forma 1 no se entera. Una sola escritura posible (el editor normaliza: junta los textos, quita los
  vacíos y sin datos escribe `texto`), así el tope de 20 partes mide algo real y dos plantillas iguales se comparan iguales. Las ramas de unas condiciones y
  la lista de respaldo siguen con texto simple.
- **Un dato sin valor dentro de un texto no escribe nada.** El «—» de una celda «Dato» dentro de una frase se leería como parte del texto: «Comisión giro »
  queda así. Un monto adentro va en `tramos` (sólo entonces) para que el HTML lo dibuje con `<Monto>` y el Modo Live lo tape; no lleva la segunda línea en Bs
  del total. El PDF, la imagen y «Copiar texto» usan las líneas, con cifras.
- **El campo del texto con datos es un `contentEditable` propio, sin librería.** Las pastillas son `<span contenteditable="false">` que dibuja el hook, no
  React; lo que se tipea lo escribe el navegador y se lee de vuelta, y Enter, pegar, Retroceso y Supr junto a una pastilla, las flechas junto a ella y
  Ctrl+Z los maneja el modelo puro (`edicion/texto-con-datos.ts`, posiciones en unidades: cada code unit, 1; cada pastilla, 1), así todos los navegadores
  hacen lo mismo. Un editor de texto enriquecido pesaría decenas de KB para un campo de 300 caracteres. Insertar, cambiar o **quitar** un dato es su propio
  paso de deshacer (sin `clave`); lo tipeado se junta por clave, como en los demás campos del panel.
- **Un texto con datos no se escribe en el lugar.** Enter, F2 o doble clic sobre él llevan al campo «Texto» del panel, como sobre un dato: el campo del
  lienzo es texto plano y perdería los datos. Tipear una letra lo reemplaza, como en cualquier celda de texto. Copiarlo como texto (TSV) pone sólo sus
  partes de texto (el sistema no sabe de datos); la copia interna de celdas las conserva.
- **La forma 1 se convierte al leerla y no se migra.** `cotizacion_tarjeta` convierte la publicada (`_plantilla_convertir()`, espejo
  `convertirPlantilla()`) con la misma apariencia y la vuelve a validar como cuadrícula. Los ids de la
  conversión son deterministas (el de la fila sale del nodo, `n_<nodo>`; el de la celda, de su fila y su columna; uno de más de 41 caracteres se acorta
  con un FNV-1a de 32 bits espejado) porque los retoques por cotización y el editor de la cuadrícula se apoyan en ellos. El título de un grupo, su
  tipo de cambio y su plazo son celdas que abarcan las filas de sus miembros (no una fila de encabezado: `ocultar_si` mira un solo nodo y el encabezado
  no se ocultaría con sus miembros; la combinada se acorta sola). El color: el de la plantilla si sigue en el catálogo, si no el del grupo. Los altos se
  estiman con aritmética entera (igual en TS y SQL). Una forma 1 cuya conversión rompe una regla de la cuadrícula es `sin_plantilla`; lo convertido no
  se mide contra los 24 KiB (lo acotan la forma 1 y la fórmula).
- **Las tarjetas sembradas de USA son forma 2.** `subasta_usa` y `planilla_usa` siembran la conversión de su forma 1 con la leyenda de la transferencia como
  texto con datos («Comisión giro » y el porcentaje de cada cotización), que la forma 1 no puede decir: su descripción fija («Comisión giro 4%») no cambiaba con el
  porcentaje de la cotización. Lo sembrado va legible (cada columna, fila y celda en su línea) y vale contra la v1 con el tope de 24 KiB. La forma 1
  de las dos queda en `entities/plantilla/plantillas-v1-de-las-semillas.json`: la conversión se sigue probando con una plantilla real (T5 de
  `plantilla-convertir.sql`, `convertir-plantilla.test.ts`). La de oficina sigue en forma 1: la conversión al leer sigue sembrada.
- **Un solo modelo de dibujo para HTML, PDF e imagen.** `geometriaDeLaTarjeta()` da, por celda visible, su rectángulo en px, su contenido resuelto y
  su estilo, y los tres la pintan con posiciones absolutas: es lo único que entienden igual el HTML, react-pdf y satori (`next/og` no tiene `grid`; una
  `<table>` como la de V1 no la dibujan react-pdf ni satori). El HTML escala con `min(1, ancho del contenedor / ancho)` como una imagen (la página nunca
  se desplaza de costado, también al 200 %: el texto entero sigue en «Copiar texto») y el PDF con `min(1, ancho útil / ancho, alto útil / alto)` en una
  sola página A4 (1 px = 0,75 pt); ninguno agranda. El total de la tarjeta es el de los totales y, con «Ver total Bs», lleva la moneda local en un segundo
  renglón (no hay variable ni `ocultar_si` que exprese «Ver total Bs»). «Vencida» sale de la tarjeta: es un aviso de trabajo y va en los del modal.
  «Copiar texto» sale de la misma geometría.
- **La celda logo dibuja sólo el logo, a la medida de la celda.** `contain` dentro de la celda menos su relleno, alineado por `alinear` y
  `alinear_vertical`, igual en el HTML, el PDF y la imagen (`cajaDelLogo()`); el nombre de la empresa es otro dato, «Nombre de la empresa». Lo que react-pdf o
  satori no leen (el WebP con que se suben los logos, un SVG con estilos) lo convierte a PNG el servidor con `sharp` al dibujar, hasta 1.024 px, como el tope
  de un logo raster; un SVG que nombra otro archivo no se dibuja (leería algo sin tope ni espera). Convertir al dibujar y no al subir deja servir los logos
  ya subidos sin migrarlos. Si el logo no carga en el lienzo del editor, el editor lo avisa con «Abrir Empresa».
- **El asesor de la tarjeta es quien la mira o la comparte, no quien la creó.** Una cotización la comparte cualquiera que la ve, y el cliente escribe a quien
  se la mandó: la tarjeta, el PDF, la imagen y el texto de «Compartir» nombran a quien los pide, con su WhatsApp, su cargo y su foto de perfil
  (`leerAsesorQueMira()`: `perfiles` por PK, legible para todo usuario activo; `cotizaciones` no importa `web`, que ya leía esos campos). Quien la creó es el
  autor («Creado por»). Con «Ver como», la persona real: la perspectiva cambia permisos, no quién comparte. El teléfono va tal cual lo guardó (E.164,
  «+591…»): es lo que valida su ficha y lo que abre WhatsApp. En el texto va al final, como firma («Asesor: nombre, cargo» y «WhatsApp: …»).
- **La foto del asesor es un contenido de celda, no una variable de texto.** Se encaja como el logo (`contain`, alineada como la celda, con la misma bajada con
  tope y 2 s y el mismo paso a PNG de `sharp`: satori no dibuja WebP); sin foto, o si no carga, sus iniciales en un círculo del lado menor de la caja, con
  borde de 1,5 px y letra de 0,4 × el diámetro en el color del texto de la celda. Una silueta genérica diría menos que las iniciales.
- **Con qué nace el editor de plantilla:** el borrador; si no hay (o no se lee), copia de la publicada; si no, la omisión. Una versión ilegible no se edita a
  medias. El editor escribe **sólo la forma 2**: una forma 1 se alinea con la fórmula y se convierte al abrirla, lo dice y no se guarda sola; si lo
  convertido no entra en la grilla (120 filas, 1.000 celdas), se toman los primeros 4 miembros de cada grupo y, si tampoco, sólo el total. El PT409 no dice
  quién (la tabla no lo guarda).
- **La referencia del lienzo se compone en `src/app`** (cruza el listado, la hoja guardada, `leads` y `vehiculos`, como el PDF), sin tocar la base: la
  página la pide sin esperarla y la sección la espera en paralelo con la plantilla. Su tamaño es `UNA` del área listado (una cotización, no una página).
- **El tope real de la cuadrícula son los 24 KiB, no las 1.000 celdas:** una celda mínima ocupa unos 80 bytes del texto del `jsonb`. Una operación del
  editor se rechaza sólo si pasa un tope **y crece**: una convertida que ya los pasa se puede achicar.
- **Las columnas no tienen rótulo en el esquema:** en pantalla dicen su letra (A a P) y, si el id es de la conversión, su nombre («B · Concepto»).
- **Como Excel, con lo que ahorra bytes:** Supr sobre una celda sin estilo ni combinación la quita (se dibuja igual); tipear una letra sobre una celda de
  texto o vacía empieza a escribir reemplazando; Enter confirma y deja el cursor en la misma celda; sin un bloque copiado en el editor, Ctrl+V pega el texto
  del sistema en la celda activa.
- **«Publicar…» queda a la vista** junto a «Guardar borrador» (cambia la imagen que recibe el cliente, como en V1) y «Descartar borrador…» va al «⋯».
- **El menú contextual del lienzo sale de `DropdownMenu`** con un disparador invisible sobre la celda: no se suma un `context-menu` a `shared/ui`.
- **Un rechazo de publicar con su `donde`** (una celda, fila o columna) ofrece «Ir a la celda», que lo elige en el lienzo.
- **Con el lienzo de la tarjeta a la vista, la página reserva el canal de su barra** (`html:has([data-lienzo-marco])`, sólo esa pantalla: en las demás no
  hace falta y con barras clásicas restaría unos 15 px), y «Ajustar» deja 8 px a la derecha de la tarjeta para el borde de la última columna
  (`MARGEN_DEL_LIENZO.derecha`). Sin `setTimeout` ni histéresis: un margen de escala dejaría la tarjeta desbordando al cambiar la ventana.
- **Guardar la tarjeta no remonta el editor:** lo elegido y el historial de deshacer siguen; la `key` del editor cambia sólo con una versión que no es la
  que acaba de guardar (la de otra persona tras «Recargar», ninguna tras publicar o descartar). «Hay cambios» compara sin el orden de las claves.
- **El tope del primer HTML de la pestaña «Tarjeta» se fija con la cuadrícula más grande** (16 × 120 y lo que entra en 24 KiB, con 500 miembros): el
  contexto reducido lleva todos los nodos del nivel «todos» (los ofrece «Dato»), así que el tope es lo medido más un
  5 % (`docs/RENDIMIENTO.md`), no el de los bloques más un 5 %.
- **`porcentaje` de un par.** Se admite de cualquier `porcentaje_de` (sobrescribible o no) y de su `pct`, y muestra el valor del `pct`: el «Comisión
  giro 4 %» de V1 es un `porcentaje_de` que no se sobrescribe. Los dos nodos tienen que ser del nivel «todos».
- **Colores de hoja derivados del hex.** Un color es un nombre y un #hex; sus versiones de la hoja (fondo, borde y tinta, en claro y en oscuro) las deriva la base al crear o al cambiar el hex
  (`_color_derivar`) y las guarda en `claro_*` y `oscuro_*`, así la hoja no calcula nada. Cada fondo es la primera mezcla del hex, de a 1/50, hacia blanco con luminancia ≥ 0,8 (claro) o hacia la
  superficie oscura de `design/tokens.css` con luminancia ≤ 0,05 (oscuro); cada tinta, la primera mezcla hacia negro (claro) o blanco (oscuro) con AA sobre su fondo; el borde es el hex. En el paso
  50 la mezcla es el destino: el AA está garantizado. El espejo TS (`entities/colores.ts`) da el mismo `#rrggbb` (el redondeo es el de `Math.round`, nunca `round(float8)`) y lo prueba un juego de
  casos en Vitest y en `db:probar`. Guardar el mismo hex no vuelve a derivar (un color migrado conserva su hoja). Tope 48 por empresa.
- **El texto de la tarjeta.** `texto: auto` es la tinta oscura de la interfaz (#1b2130, «negro») o el blanco, el de más contraste sobre el hex del
  fondo (o sobre el blanco si el fondo es `auto`): `textoAutomatico()`, en el núcleo. Los bordes de las celdas son de ese «negro». `fondo: auto` es
  blanco: no hay banda gris del vehículo (no hay hex fuera del catálogo). `auto` nunca es una clave del catálogo (`_tono_clave()` la salta).
- **La tarjeta lee la moneda de SU versión y la plantilla publicada hoy de la fórmula del origen de esa versión.** `cotizaciones.moneda_mostrar` y `cotizaciones.plantilla_id` no tienen uso y se quitan juntas (`docs/PENDIENTES.md`): no volver a darles uso.
- **El título de la cotización va en la página de la tarjeta, no en `cotizacion_tarjeta`.** Esa RPC es la plantilla de la fórmula (nada por cotización): el título resuelto (`tituloAparteDelNumero()`: sin el de respaldo «Cotización n.º N») llega como `PaginaDeLaTarjeta.titulo` y es la variable `titulo` de la cuadrícula, aparte del título de la opción (`titulo_opcion`). La forma 1 convertida lo pone en la fila de la fecha, a su lado (como iba en el PDF, y sin sumar una fila que no se puede ocultar); los metadatos del PDF no lo llevan, porque puede nombrar el vehículo.
- **PDF e imagen en servidor.** `@react-pdf/renderer` y `ImageResponse` de `next/og`, cargados con `import()` desde la composición del área: nunca llegan
  al navegador. Sin imágenes de cotización generadas en el cliente. Las fuentes son Geist del release `vercel/geist-font` v1.9.2 (zip sha256
  `15f066d58dcb99fb10014a49913009fdaf41e464cfb8851a44b44e593c95d3d8`, OFL 1.1): `Geist-Regular.ttf` `2c460a7a71063e53491f343d44b382267bc0cf496e31db64865f962af3152e68`,
  `Geist-SemiBold.ttf` `01923aa148e5202ae70a2e11b2ab4dc41b80bcc374aedccc913d47bb2f591c06`, `Geist-Italic.ttf`
  `14b65c2dce6eb81a68bee916fed0e63f6d8526400b364cabf166f58e49c71b14` y `Geist-SemiBoldItalic.ttf`
  `5434c3634179082d63c80a4748df2d4ef2632d69c445cf47f2ef2ac101a582b3`.
- **La imagen de la tarjeta se arma al pedirla, para quien la pide, y no se guarda.** Lleva el asesor (quien mira) y lo que esa persona ve: una guardada sería
  una por persona y cotización, crecería sin tope y habría que invalidarla con cada cambio de perfil o de permisos. WebP con `sharp` (calidad 80, ≤ 1.600 px):
  `ImageResponse` sólo da PNG y `sharp` viene con Next. Lo que evita volver a dibujarla es la caché del navegador: `private, no-cache` con una ETag fuerte y
  un 304 que sólo lee la huella. Sin el primer recálculo (la tarjeta sólo con el total) se entrega con `no-store`. No depende del nivel de quien la arma: la
  tarjeta sólo nombra nodos del nivel «todos» y los totales viajan para todos.
- **Una imagen de la tarjeta incompleta no se deja guardar.** Si al armarla falla leer el cliente, el vehículo o el asesor, o el logo o la foto que la tarjeta
  dibuja no llegan (2 s, un error o un archivo que no se lee), sale sin eso y con `no-store`: la huella no cambia con un fallo, y con la ETag el navegador
  seguiría recibiendo 304 de la imagen a medias. No se distingue un fallo de un momento de uno que se repite (un logo que no se lee): ese caso paga armarla en
  cada pedido hasta que se cambie el logo, y nunca deja una imagen a medias fija.
- **La ETag sale de una huella de la base y la versión del dibujo vive en TS.** `cotizacion_imagen_huella()` mira **lo que se dibuja** (el título, lote y VIN
  del vehículo y el nombre del cliente, sólo si quien pide los ve; el perfil de quien pide; clave y hex de los colores; nombre, activo y moneda de los tipos de
  cambio), no su `actualizado_en` ni el valor del día: una fase, una foto o el tipo de cambio de hoy invalidarían todas sin que cambiara nada de lo que se ve.
  La ETag suma el usuario (dos personas nunca comparten una), `VERSION_DEL_DIBUJO` y el ancho: un cambio en cómo se dibuja es código, y subir la versión en
  el mismo archivo no pide una migración. Con «Ver como», `no-store` sin leer la huella: la perspectiva cambia lo que se ve, y una ETag de la persona real
  serviría lo de otro rol.
- **La imagen de la tarjeta se pide a la vista y de a cuatro por página.** Armarla cuesta (satori, PNG y WebP en el servidor) y no hay una guardada que
  servir: una lista de 50 tarjetas pediría 50 armados en paralelo. `useCargaDeLaImagen()` pide turno en una cola de la página (`crearCola(4)`) sólo con la
  imagen a 200 px de la vista; la que sale antes de su turno deja la fila, y con turno va `eager` (una `lazy` que sale de la vista no se pediría y el turno
  quedaría tomado). Al volver, las ETag dan 304 y la cola se vacía enseguida.
- **La ruta vieja de la imagen sigue andando.** `/cotizaciones/<id>/portada` es un 308 a `/imagen` con su consulta (`next.config.ts`): un enlace o una caché
  del navegador que la nombre no da 404.
  Lo mismo el visor: `?visor=portada-<id>` y `?visor=portada-de-la-lista-<id>` lo siguen abriendo (`esClaveDelVisorDeLaImagen()`), aunque las claves que se
  escriben son `imagen-<id>` e `imagen-de-la-lista-<id>`.
- **El barrido del bucket `cotizaciones` tiene su rama, como `vehiculos`.** `not exists` sobre los adjuntos, por el índice de `ruta`: la
  rama genérica llama a `storage_refcount()` por objeto y una ventana de 10.000 costaba ≈ 0,9 s (≈ 0,2 s así). Una tabla nueva con rutas de ese bucket va en
  las dos; si falta en la rama, `storage_gc_reclamar()` igual la descarta al ver el refcount.
- **Los retoques de la tarjeta son de una cotización, sólo textos y filas ocultas.** Se guardan en `cotizaciones.tarjeta_retoques` (por id de celda y de
  fila) y se aplican a la cuadrícula antes de la geometría, así todo lo que dibuja esa tarjeta los sigue solo; nunca cifras, colores, el logo, tamaños,
  columnas ni combinaciones (la plantilla del origen sigue mandando en la forma). Cotizar encima se los lleva, como el título y las notas. Un `{{` se dibuja
  tal cual: en la cuadrícula nada interpola. Retocar pide lo que pide guardar, sin permiso propio, y es guardar la cotización: mueve `actualizado_en` (la
  fecha del último guardado de la tarjeta, la de la cabecera y la huella de su imagen).
- **La base valida los retoques contra lo que se dibuja hoy.** `cotizacion_retocar_tarjeta()` toma la cuadrícula de `cotizacion_tarjeta()` (la publicada,
  convertida y validada contra la versión de esa cotización); los que dejaron de aplicar (otra plantilla publicada) se ignoran al dibujar y el modo dice que se
  quitarán al guardar. La versión se compara antes que nada, sin intento: un reenvío tras una respuesta perdida da el PT409 «desde otra ventana».
- **La revisión de un retoque guarda cantidades, no los textos.** `{celdas: n, filas_ocultas: m}` por lado: una página de 20 revisiones con los textos llegaría a
  ≈ 1 MB, y «Revisiones» sólo dice «Retocó la tarjeta». La actividad, en cambio, guarda la fila entera como con las notas y el título (`cotizacion_auditar()`):
  caduca a los 14 días, no es lo oculto por nivel y su diff muestra qué texto cambió.
- **«Retocar» se apaga con la hoja sin guardar, y guardar los retoques revalida la página.** La hoja necesita la versión nueva para su próximo «Guardar» (si
  no, daría PT409 contra uno mismo), así que la action revalida y la hoja se vuelve a montar por su `key`; es seguro porque no hay nada tipeado en la hoja
  que perder.
- **«Volver a la plantilla» pregunta en el pie del modal, no con `<Confirmar>`**: sería un modal sobre otro. Confirmar guarda en el acto (es irreversible).
- **El campo de una celda va encima de ella sólo si se escribe cómodo.** Con la tarjeta casi a su tamaño (escala ≥ 0,75), la celda escalada de ≥ 160 px y la
  letra sin agrandar; si no (el celular, el texto al 200 %), a lo ancho del modal bajo la tarjeta. Las filas se ocultan desde un canal de 44 px a la derecha
  (un botón por banda, siempre a la vista) y, para las bandas de menos de 24 px, desde «Ocultar fila» a 44 px bajo la tarjeta.
- **La lista de respaldo y las condiciones de la tarjeta se resuelven antes de dibujar.** `resolverElContenido()` deja en cada celda un contenido simple
  (texto, dato o nada) y la geometría sigue igual: el HTML, el PDF, la imagen y «Copiar texto» no saben de condiciones. Son datos cerrados (un `es` de una
  lista, un nodo por id, un número), no expresiones: la tarjeta sigue sin motor propio. Un cambio en lo que se dibuja sube `VERSION_DEL_DIBUJO` (4).
- **Hasta 5 ramas contando el «si no», que va siempre; una fila no tiene «si no».** Con el «si no» obligatorio una celda siempre sabe qué mostrar (si
  ninguna rama se cumple, no queda indefinida). Una fila sólo decide si se oculta: su «si no» sería «se dibuja», que es lo que pasa si no se cumplen.
- **Una lista de respaldo sin ningún dato con valor deja la celda vacía.** Ni el último dato ni «—»: tiene valor un texto que no queda vacío sin los
  espacios de los bordes o un número (también el 0); un nulo no, y un nodo que no aplica tampoco.
- **Nulo, 0 y «no aplica» en una condición.** Un nodo que no aplica vale 0 (lo que no aplica no suma: «es 0» se cumple con un nodo apagado por su interruptor); uno sin
  valor es nulo y una comparación con nulo no se cumple (ni «mayor», ni «menor», ni «igual», ni «es 0»). Así «Remate es menor que 1.000» no oculta una fila
  de una cotización con el remate sin valor, y sí la de una donde el remate no aplica (vale 0); quien quiera verla también en ese caso suma la
  condición «Remate no es 0». `encendido` es «distinto de 0» y `opcion` compara la clave elegida.
- **Una condición sobre un nodo que no está en la versión de la cotización no tiene respuesta y su rama se salta.** La plantilla publicada hoy dibuja
  cotizaciones de versiones viejas: sin respuesta, la rama no gana por accidente y la fila no se oculta; si ninguna gana, el «si no». El editor lo dice junto
  al dato («Este dato ya no está en la fórmula: se salta.»).
- **`condicion_invalida` va última entre las reglas de la plantilla.** Antes van las que dicen que el nodo no existe o es restringido: una condición sólo se
  juzga sobre un nodo que la tarjeta puede nombrar, y el mensaje que llega primero es el que se arregla primero.
- **Lo que se arma a medias no sale del panel.** Una lista con un dato o una condición sin número quedan en un borrador del panel con su motivo junto al
  campo («Sin terminar: la celda no cambia hasta completarla.»); la plantilla sólo recibe reglas enteras. Así «Guardar borrador», el historial de deshacer y
  el lienzo nunca ven una forma que la base rechazaría.
- **Una celda con lista de respaldo o condiciones no se retoca.** Lo que muestra cambia con cada cotización: retocar su texto pisaría la regla. La fila que
  se oculta según condiciones sí se oculta a mano.
- **El aspecto de la hoja es declarativo, cerrado y plano.** Claves opcionales junto a las de siempre (`ancho`, `alto`, `relleno`, `separacion`, `densidad`, `letra`, `enfasis`, `tono`), de escalas
  cerradas y validadas igual en TS y en SQL: nada de px, CSS ni hex. No se llaman `estilo`, `clase` ni `color` (el juego las rechaza). Sin la clave, lo de siempre, así un diseño viejo se ve igual;
  el editor quita la clave en vez de escribir el valor por defecto. La cabecera no lleva ancho ni alto (va sola en su fila) y la tarjeta del resumen no lleva aspecto (es fija).
- **La regla de los 16 rem.** Una pieza de N columnas toma su ancho cuando le tocan 16 rem o más (`mitad` desde 32 rem, `tercio` desde 48); si no, la fila entera. Los cortes
  van en rem, así al 200 % la rejilla colapsa sola, y bajo el primer corte no hay hueco de columna. Una sección sin ancho es «Automática» (la mitad desde 64 rem). El alto son filas de
  la rejilla desde el mismo corte. Todo en clases y variables sobre los nodos de siempre: la hoja está al borde de su tope de nodos.
- **El color de una sección no pinta su fondo.** Su borde, sus celdas sin grupo, sus franjas y sus chips toman el color; el fondo, el título y los textos sueltos (leyendas, interruptor) quedan en
  los tokens: la base sólo garantiza el AA de la tinta sobre el fondo derivado, no del texto de la interfaz sobre él. El color del grupo gana en su celda; un chip marcado vuelve al primario.
  Es el catálogo de colores (sin lista nueva de tokens): ya es de la empresa y con contraste garantizado.
- **Las celdas se ordenan dentro de su sección.** Pasar un ítem a otra sección cambiaría quién lo ve (hereda el nivel de la sección); para eso sigue el JSON del diseño. Se ordena con dnd-kit (sólo
  en la pestaña «Hoja», con `diferido()`) y su sensor de teclado sobre el asa, con anuncios en español.
- **El PDF, la tarjeta y el resumen no siguen el aspecto.** Siguen con su plantilla (la cuadrícula): el aspecto es de la hoja en pantalla (la de cotizar y la de una guardada, que son el mismo componente).
- **«Compartir la cotización»: el texto se arma en el navegador, con las cifras ya escritas por el servidor.** `GET /cotizaciones/<id>/compartir` manda
  `DatosParaCompartir` una vez por apertura: los montos salen de la **geometría de la tarjeta de lo guardado** (`lineasDeLaTarjeta()`, sólo lo del nivel
  «todos», K4) con el formato del PDF, nunca de `valores` sueltos; el vehículo, sólo si quien pide lo ve. `textoParaCompartir()` (puro) arma el texto en cada
  formato y zona sin volver a pedir. Las fotos tienen su ruta (`…/compartir/fotos`), que se pide al elegir «Fotos». Sin migración ni clave propia: quien ve la
  cotización la comparte, como el PDF.
- **La imagen que se copia es la imagen de la tarjeta pasada a PNG en el navegador.** La ruta da WebP y el portapapeles pide `image/png`: armar otro PNG en el
  servidor costaría un `ImageResponse` por pedido. Se pide con la caché del navegador (su ETag da un 304) y el PNG queda listo **antes** del toque, porque
  Safari pierde el gesto si se espera algo antes de escribir o compartir. Las fotos se comparten a tamaño completo (≤ 1.600 px) y se bajan al marcarlas; con
  fotos, «Copiar imagen» pide una sola (el portapapeles lleva una imagen) y «Descargar imagen» baja cada marcada como está guardada.
- **Los formatos del texto, como V1 sin la IA.** «Simple»: sin marcas ni líneas en blanco (el de entrada); «Facebook» y «TikTok»: sin marcas, un renglón en
  blanco entre bloques (título · vehículo · conceptos · total); «WhatsApp»: además, el título y el total en `*…*` (un texto con `*` va sin marca). El título
  del vehículo no se repite si es el de la cotización. El cierre de la subasta sólo se dice si todavía no pasó: «Se subasta…» de algo cerrado engaña. La zona,
  la de la empresa (por su ciudad, «Hora de La Paz») o la del patio, sólo si se conoce.
- **«Compartir cotización…» lleva «…» y va primero y solo en el «⋯»** (abre algo encima, como las demás que abren un diálogo). La pestaña va en
  `?compartir=texto` y no en `?pestana=`, que es del resumen del listado. Un `?para=` que no es un guid ni se pide: el panel dice que no hay acceso.

### Tablas de referencia

- **Qué orígenes afecta publicar una tabla.** Los que la usan en un nodo o en la copia de `params.tablas`, aunque estén inactivos; una compartida pide `configurar` en cada uno. Editar una tabla publica la N+1; las filas inactivas se borran.
- **Publicar una fórmula no congela las tablas.** Una versión anterior que leía la viva recalcula con las filas nuevas; lo guardado de una cotización no cambia.
- **Una celda sin tocar no se reaplica.** Sólo si el texto difiere del mostrado, para no redondear al pasar con Tab; nunca se publica un número distinto del escrito.
- **La clave de una tabla y la de una columna no cambian.** La de la tabla la calcula la base desde el nombre (`_tabla_referencia_clave()`, con su espejo para mostrarla al tipear); la de una columna la manda la pantalla, sale de la etiqueta hasta que la persona la toca y se corrige sólo mientras la columna es nueva. Los nodos, las celdas guardadas y los `desde`/`hasta` de un tramo la nombran literal: renombrar es cambiar la etiqueta, y el tipo de una columna existente tampoco cambia (se quita y se suma de nuevo).
- **Cambiar las columnas sube la versión de la tabla y no publica la N+1 de ninguna fórmula.** Nada que una fórmula use se quita (eso se rechaza) y sumar o renombrar no cambia filas: la copia congelada sigue valiendo. Subir la versión deja en PT409 el borrador de filas que era de antes, y por eso «Columnas» y «Desactivar» se apagan con cambios de filas sin publicar. Quitar una columna borra su clave de las filas vivas; si no, el próximo publicar fallaría. La RPC recibe la lista entera (como publicar recibe todas las filas) y la base calcula qué cambió; una columna que ya estaba conserva sus otras llaves.
- **«En uso» es la publicada o el borrador** de cada origen que recibe la tabla (`_tabla_referencia_usos()`): un nodo que la nombra, su copia en `params.tablas` o una ayuda del diseño; una columna, si la nombra un `match`, una `columna`, un `desde` o un `hasta`. Sumar el borrador es lo conservador: si no, se rompería al publicarse. Por eso columnas y desactivar piden `cotizaciones.configurar` también del origen cuyo borrador la usa, y el 42501 nombra ese origen (los nombres de los orígenes los lee cualquiera); el mensaje nombra hasta tres usos y después «y otras fórmulas», nunca un total.
- **Una propia no toma la clave de una compartida activa** (23505): taparla dejaría sin filas a la fórmula del origen que la lee viva. Una compartida con la clave de una propia sí se crea, y ese origen la ve «Tapada».
- **Un origen recibe hasta 100 tablas activas, propias y compartidas.** Es el tope de la lista y del catálogo de BUSCARV: una más quedaría fuera de los dos. La pantalla apaga «Nueva tabla» con el tope de la lista combinada; la base lo exige por destino con el candado `tablas_referencia:crear`.
- **Desactivar no se deshace desde la app y la clave queda tomada** (la restricción única cuenta las inactivas); reactivar espera en `docs/PENDIENTES.md`.
- **La versión esperada es un entero** (`tablas_referencia.version`), como publicar. El PT409 de columnas y desactivar es el de publicar («<persona> publicó la versión N…») aunque lo último haya sido un cambio de columnas: cambiar columnas también firma `publicado_por` y `publicado_en`.
- **Una etiqueta nacida por SQL con espacios en los bordes cuenta como renombrada** al guardar las columnas: la base guarda la etiqueta recortada. En la pantalla, tipear espacios en los bordes no es un cambio.
- **La actividad de crear guarda `cuantas_columnas`, nunca las columnas**: `cotizaciones-visibilidad.sql` trata `tablas_referencia.columnas` como contenido oculto.
- **«Nueva tabla» y «Columnas» son `<Drawer>` y preguntan al cerrar con cambios** (`<CambiosSinGuardar preguntaAlCerrar>`: no tienen borrador que conserve lo escrito); «Desactivar» es un `<Confirmar>`. «Columnas» y «Desactivar» se montan sólo en el editor de la tabla (el «⋯» de la lista lleva a la tabla con el panel): ahí se ve la tabla y se sabe si tiene cambios de filas.

### Final, comprobantes y comentarios

- **Final.** Crear o marcar toman lead → vehículo → cotizaciones; crear una final sobre otra activa da 23505 (no la reemplaza); una `reportada` o `invalida` no ocupa el lugar. Marcar no lleva versión esperada (aceptado).
- **El orden de los rechazos no delata.** Primero la cartera, después ver el vehículo y recién la ayudante: si no, un 23505 o 23514 diría si hay final, vínculo o preventas.
- **Qué congela un comprobante.** El recorte del nivel «todos», la cotización, el origen, la razón social y el NIT; del cliente y del vehículo sólo los ids. Emitir pide la versión. Una cotización con comprobante, anulado o no, no va a la papelera.
- **Reportar no mueve la versión.** «Descartar los reportes» modera a `activa`; las marcas de reporte se leen en el servidor (tras `<Suspense>`, con `cache()`). Tope de 20 adjuntos sin candado (pueden quedar 21; aceptado).
- **Adjuntos sin miniaturas.** La URL firmada se pide al hacer clic (60 s), nunca al leer la lista.
- **Las pestañas del resumen.** «Todo» mezcla una página de cada fuente (comentarios, revisiones, adjuntos) y sólo dibuja hasta donde llegó la que menos retrocedió: mezclar sin ese borde saltaría lo que aún no se leyó. «Adjuntos» son los archivos (`cotizaciones_adjuntos`); un comprobante no es un archivo sino un documento emitido por la base, y va bajo los adjuntos, de sólo lectura, con la regla de la guardada. Las cuatro primeras piden sólo ver la cotización (como la guardada): ninguna se esconde, y si la base niega una lectura (papelera, acceso perdido) esa pestaña lo dice. Adjuntar y moderar salen de las mismas reglas del «⋯» sobre la fila (`puedeGuardarDesdeElListado()`: sin ellas el resumen no pregunta a la base); un alcance «propios» sobre una cotización ajena que la cartera sí deja editar queda sin «Adjuntar» en el resumen y se adjunta desde la guardada.

### La cotización aprobada

- **Una tabla aparte, mantenida al confirmar.** `cotizaciones_aprobadas` (PK = vehículo) y no una columna: aprobar mueve la versión y la revisión de la
  cotización (un PT409 a quien edita) y `vehiculos` se lee entero (el monto saldría a quien ve el vehículo y no la cotización). Un trigger por fila anota y
  uno diferido repone con el candado por vehículo: así cubre todas las RPC que cambian cotizaciones sin reescribirlas. Sin FK a `vehiculos` (cerraría un
  ciclo con su papelera al confirmar): la integridad la da la reposición.
- **Una sola regla de reposición.** La aprobada se queda mientras esté activa; si no, la más antigua activa; restaurar o reactivar no quita la marca. Dos
  reglas («la última» y «la primera») darían un resultado distinto según el orden de los eventos.
- **Aprobar es reversible, sin confirmar.** Se aprueba de una y el aviso ofrece «Deshacer» (aprueba la anterior con su versión); no mueve versiones y exige
  la versión de la cotización que se aprueba. La clave `cotizaciones.aprobar` se concede a quien ya cierra finales, en su origen.
- **Primer resultado = `totales.usd`.** Lo que la hoja dibuja en la tarjeta del total, en USD y sin convertir; cada celda lleva la moneda congelada con él.
- **«De este vehículo» con su propia lectura.** `cotizaciones_de_este_vehiculo()` aparte en vez de sumar columnas a `cotizaciones_listado()`: cambiar el
  retorno es `drop` + `create` y rompe la infra del listado, `datos`, sus pruebas y su medición; el bloque necesita además la versión, el modo, el autor y la
  aprobada fijada, todo en un pedido por página. La aprobada viaja aparte en la primera página (puede estar más allá de la página 10) y el código la pone
  primera sin repetirla; el cursor sale de la página, nunca de ella.
- **El modo del «Costo estimado» en la misma lectura, por una RPC invocadora.** `cotizaciones_aprobadas_de_vehiculos()` reemplaza la lectura de PostgREST de las
  aprobadas de una página de `/vehiculos`: PostgREST no puede llamar `_nombre_del_modo()` en un `select` y llamarlo aparte serían N idas. Sigue siendo una
  lectura por página (≤ 100 ids), con la RLS de quien mira; el nombre, una vez por versión y modo. Lee además cada cotización por `cotizaciones_pkey`, por eso
  su presupuesto en `medir-cotizaciones-aprobadas.sql` es de 1.000 buffers y no 600 (≈ 4 por fila, y ≈ 100 por versión al mirar el permiso).
- **El nombre del modo por `_nombre_del_modo()`.** `formulas` sólo la lee quien configura; el nombre del modo ya lo dan la hoja y la tarjeta a quien tiene
  `cotizaciones.ver` del origen, así que un `security definer` con el mismo chequeo (el de `cotizacion_tarjeta`) no expone nada nuevo. Se llama una vez por
  versión y modo de la página (cada llamada pregunta el permiso: por fila eran ≈ 90 buffers cada una).
- **Comparar cotizaciones vive en el área `aprobada`.** Necesita «Aprobar esta» (del área) y la lectura de la guardada (del núcleo); un área nueva o una
  carpeta del núcleo no podrían importar `aprobada`. El enlace y la lectura de `ids` (`entities/ruta-de-comparar.ts`) van al núcleo porque los escriben dos
  áreas (`aprobada` y `listado`).
- **Comparar compara lo guardado y alinea en TS.** Una `cotizacion_hoja_guardada()` por columna, sin `cotizacion_evaluar` (lo que se aprueba es lo
  guardado); la alineación por nodo sale del diseño y de los valores ya recortados, nunca de `formulas`. Un «grupo» es una **sección del diseño**: la
  etiqueta de un grupo de la fórmula no viaja a quien no configura, así que los subtotales de `totales.grupos` no se dibujan; un subtotal se ve si su ítem
  vino en el diseño y su valor en los valores. Los chips de una tabla no suman fila (su nodo ya tiene la celda).
- **Las columnas de comparar, en el orden de la lista de «De este vehículo».** La aprobada primero y después de la más nueva, no en el orden en que se
  marcaron: así la aprobada, si está elegida, es la referencia de lo distinto. El `returnTo` desde el resumen del listado es `/cotizaciones?cotizacion=<id>`,
  sin los filtros (leerlos pediría `useSearchParams()` fuera de un `<Suspense>`).
- **El bloque es del área `aprobada`.** Usa «Aprobar» y la insignia del área; una pantalla sin prefijo sería núcleo, que no importa áreas. Sale por
  `pantallas/aprobada-resumen.ts` para el resumen (la ficha del vehículo dibuja su fila de tarjetas con las piezas del área).
- **La aprobada al día entre islas, sin refrescar.** Aprobar desde el bloque no puede refrescar la guardada (perdería lo tipeado): `avisarAprobada()` y
  `useAlCambiarLaAprobada()` (un `Set` de oyentes por módulo) ponen al día «Aprobar» de la cabecera y el bloque relee su primera página. En el resumen sí se
  refresca el listado (no tiene nada tipeado), como «Aprobar» del «⋯».
- **Dónde aprueba quien mira lo manda el servidor.** `aprobarEn` (`origenesCon(permisos, 'cotizaciones.aprobar')`), no los permisos: con «Ver como» respeta el
  rol elegido y la base vuelve a decidir al aprobar. El motivo dice primero el permiso y después la inválida, en el orden de la base.

### Cotizaciones privadas

- **La marca en la fila, la regla en la base.** `cotizaciones.privada` y una condición más en la policy «cotizaciones: leer», en `puede_cotizacion()` y en las
  copias de la policy de las funciones definer (los títulos de la búsqueda, el buscador, los relacionados, la actividad): la privada ajena no existe para
  ninguna lectura, ni como «oculta» en los relacionados. Las lecturas invocadoras no cambian de rutas: la RLS la descarta sobre la fila que cada ruta ya leyó.
  La pantalla nunca decide quién la ve; con «Ver como», decide la persona real.
- **Sólo quien la creó la cambia, por RPC con la versión** (`cotizacion_privada_cambiar()`, revisión `{privada: {de, a}}`). Las hermanas comparten la marca;
  cotizar encima la hereda (quien cotiza encima es la autora y puede hacerla pública); la baja con traspaso de cartera la conserva.
- **Una final o la aprobada nunca son privadas.** Marcar final o aprobar la hacen pública en el mismo paso: aprobar pide `p_hacerla_publica` (sin él, 22023 con
  `hint privada`) para que ninguna pantalla la publique sin decirlo, y la pantalla pregunta antes. «Deshacer» de aprobar no la vuelve privada. Crear una final
  privada es 22023. La aprobada automática se elige sólo entre las públicas: un vehículo con sólo privadas no tiene aprobada.
- **Quien aprueba o marca final la hace pública aunque no la haya creado.** Aprobar y marcar final son de quien tiene ese permiso en el origen (y ve la
  privada); la pregunta lo dice antes. Lo único reservado a quien la creó es hacerla privada o pública por sí sola.
- **Donde una privada ajena frena algo, se sabe que existe y nada más.** Marcar o crear una final pide poder mandar a la papelera todas las preventas vivas del
  vehículo: una privada que quien marca no ve lo frena con el 42501 de siempre («Este vehículo tiene preventas que no puedes mandar a la papelera»), como
  frena una ajena a quien ve «propios», sin número, título ni monto. La marca quien ve las privadas del origen, o la autora la hace pública antes. Igual la
  cadena de versiones (`_cotizacion_cadena`): la de encima, privada y ajena, sale como «oculta».
- **La papelera no nombra una privada ajena, pero el lote se restaura y se purga entero.** El listado, el lote, sus conteos y `papelera_listar` la descartan
  como la policy «leer»; un lote con sólo privadas ajenas no aparece. Restaurar o purgar ese lote la incluye (es todo o nada, como siempre) y lo que
  devuelve no la nombra.
- **Una privada no mueve `cotizado_en`** (delataría que se cotizó el vehículo); hacerla pública sí. El tablero y el resumen de orígenes la siguen contando:
  son conteos sin ids ni montos.
- **El interruptor vive en la URL** (`?privada=si`, `replace`): la hoja nueva se vuelve a montar al elegir el cliente o el vehículo y un estado local se
  perdería; se borra al guardar. El pedido manda `privada` sólo encendido: un pendiente sin el campo se guarda pública.
- **Aprobar una privada, una pregunta por URL con `desde`** (`?panel=aprobar-privada&para=<id>&desde=…`): el listado, o las tarjetas de la ficha del vehículo,
  y «De este vehículo» dentro del resumen montan la misma pregunta y `desde` evita que abran dos. «De este vehículo», las tarjetas de la ficha y Comparar no
  preguntan por la marca leída (la de la tarjeta es sólo la insignia y pudo cambiar): abren la pregunta con el rechazo de la base. En la
  guardada, hacerla privada o pública y aprobar una privada esperan a que se guarden los cambios, y al entrar la página se vuelve a leer (la versión cambió).
- **«Quién crea y quién ve», un cuadro sobre la matriz, no otro permiso.** Escribe `cotizaciones.crear`, `cotizaciones.ver` (propios o todos) y
  `cotizaciones.privadas.ver` con las mismas RPC de Roles, en «Todos los orígenes» o en el origen de `?origen=` (no una grilla rol × origen completa: no cabe
  en el celular y la matriz ya es esa grilla). Suma «No ve» como cuarto escalón; «Sólo las suyas» es «lo propio», que incluye las de sus clientes, y la
  leyenda lo dice.
- **El interruptor y la línea del «⋯» viajan con la hoja.** Son un `<Switch>`, una línea y una insignia: diferirlos haría parpadear el pie del resumen y el menú.
  Entran en los topes de `/cotizaciones/nuevo`, `/cotizaciones/[id]` y `/vehiculos/[id]` (`docs/RENDIMIENTO.md`).

### Papelera

- **Papelera con permiso propio.** `cotizaciones.papelera.purgar`, global, aparte de la de vehículos; la policy de lotes tiene una rama por tipo sin `else` (un tipo nuevo no hereda claves).
- **Enviar mira ver antes de tomar la fila y otra vez después.** Quien no la ve recibe lo mismo que con una inexistente y nunca espera el candado.
- **Una cotización de la papelera frena la purga de lo que nombra.** Su lead, y su vehículo si está en otro lote (las del lote del vehículo se purgan
  con él): el `set null` cambiaría algo que todavía se restaura. A una viva, purgar su lead la deja sin cliente.
- **Quién restaura.** Quien envió el lote lo restaura entero aunque ya no vea alguna; los demás necesitan `purgar`. Restaurar es todo o nada; purgar no. Las genéricas `papelera_enviar|restaurar|purgar` conviven sobre los mismos ayudantes.

## Flujos

- **«Es la subasta» es un atributo de la fase** (`fases.es_subasta`), sólo en el flujo de un origen de tipo subasta (el tipo no cambia) y
  nunca con «Es final»; ningún texto fijo nombra la fase; un origen de subasta sin ella lo dice «Revisar».
- **Un solo motor de flujos.** Uno por origen + uno de repuestos, con fases, transiciones y requisitos; tablas hijas con dos FK nullable (`vehiculo_id` | `repuesto_id`) + CHECK y una única RPC `cambiar_fase`. Un origen nuevo es una fila y su flujo nace por trigger.
- **Versión por flujo, no por fila.** Toda RPC de configuración pasa por `_flujo_para_editar()`/`_flujo_tocar()`; dos personas en el mismo flujo chocan con PT409 (aceptable en pantalla de dueño). Renombrar un origen también la mueve: no se exceptúa.
- **Inexistente = PT409 «Recarga», no 42501**, mirado antes del permiso cuando el id no revela nada; el permiso se mira antes del candado: quien no puede no espera ni hace esperar.
- **Lo que la pantalla anuncia es lo que eliminar hace.** `fase_impacto` y `fase_eliminar` comparten `_fase_uso()`; las de impacto no toman candado ni devuelven versión; tope fijo 50 leyendo 51.
- **Mostrar de más es reversible; esconder, no.** Las paradas cuentan unidades en la papelera y las fases jubiladas cuentan como uso de una regla.
- **Mover sin cambio también mueve la versión** (`fase_mover`, `flujo_regla_cambiar`, `flujo_oferta_guardar`): una regla sola.
- **Un requisito nace informativo.** `bloqueante` o `espera_ambito` en `requisito_crear` dan 22023; `formatos: []` se rechaza (nunca se cumpliría), nulo = todos. Al editar se revalida sólo el grupo cuyo campo cambió.
- **`flujo_fuera_de_regla` es muestra, sólo para quien configura.** ≤ 1.000 unidades por fase y `revisadas` lo dice. No se ensancha a `logistica.ver`: lo de una unidad lo da `logistica_unidad`.
- **Reglas.** Encender una fuera del catálogo del ámbito da 22023; apagarla se permite siempre. La action pregunta el impacto antes de escribir (`en_uso`); los nombres humanos viven en TS, la base da mensajes genéricos.
- **La oferta de transporte es de `flujos`, sin PK** (unicidad por parciales; el INFO `no_primary_key` es esperado). Exige «transporte» encendida al guardar; apagarla no la borra.
- **«Revisar» avisa y nunca frena.** Quien no configura recibe cero filas, no 42501; una invitación sin aceptar cuenta como persona activa.
- **Copiar las fases sólo hacia un flujo vacío y entre vehículos** (`flujo_copiar_fases`): el destino sin ninguna fila en `fases` (tampoco
  jubiladas), `flujos.configurar` en los dos orígenes y candados en orden de uuid (el origen `for share`). Se copia lo activo: las jubiladas y las
  salidas hacia ellas no, sin decirlo; la marca de subasta hacia un origen que no es de subasta, las esperas que no caben y los tipos de
  documento que ya existían con ese nombre (se reusan) sí se dicen (≤ 50). `bloqueante` va tal cual: el destino no tiene unidades. La oferta de
  transporte no se copia (es del flujo y de logística). El modal vive en la URL y lo monta la barra, que sigue montada cuando el flujo se llena y
  la página se relee; el 42501 del origen lleva hint `desde`.
- **Crear fase no es idempotente por id** (repetir da 23505): la interfaz usa un id por apertura y relee antes de reintentar. Una transición sí toma «ya existe» como hecho.
- **Transiciones.** No cambian origen ni destino (cambiar el destino es eliminar y crear); poner roles no exige dominancia (no otorga nada); lista vacía hereda la de la fase destino.
- **`flujos.activo` no se edita ni se quita**: nadie lo lee ni lo escribe.
- **Un ítem «Perdido» no frena al vehículo**: la regla vive en `_repuesto_ante_espera`.
- **Tipos de documento.** `proposito` no se edita; una combinación inválida de vencimiento se rechaza, no se limpia; apagar `visible_portal_permitido` no oculta lo ya marcado; un tipo de flujo activo no repite el nombre de un global activo.
- **El flujo se configura sobre un diagrama con disposición calculada** (`disponerDiagrama`, `@xyflow/react` detrás de `diferido()`): una columna por
  fase en su orden, ramas arriba, vueltas atrás abajo, sin posiciones guardadas. Descartado: guardar posiciones (migración y deriva al reordenar),
  una disposición automática genérica (dagre o elk: otra dependencia y cruces igual) y un panel acoplado en la página (le quita ancho al diagrama).
  La lista sigue siendo la versión navegable y la única del celular (`?vista=diagrama|lista`, con `shallow` y `replace`: el servidor no depende de
  ella, como `?hueco=`). Versión de la librería: la última de la mayor anterior si la nueva tiene menos de 14 días (12.12.1, MIT); la atribución se
  oculta (`proOptions.hideAttribution`): es un enlace externo en inglés y la licencia lo permite.
- **El panel del flujo no es modal desde 1024 px** (`<Drawer alCostado>`): el diagrama sigue a la vista y tocar otra fase cambia el panel sin
  cerrarlo; más angosto, el drawer modal. Sus bloques van a la vista (`<BloquesALaVista>`), no plegados: la persona pidió que editar no fuera «puros
  acordeones». Con `?seccion=` y `?fase=` a la vez gana la sección. Las reglas y los tipos de documento se abren ahí; sin barra de pestañas.
- **Arrastrar sí ordena las fases** (a diferencia de mover unidades): es configuración de quien la tiene, con «Mover antes/después» de teclado, y se
  apaga con la lista cortada. **Crear una salida arrastrando, no:** sin teclado ni celular, suma interacción a un formulario que ya tiene destino,
  acción y «pide nota».
- **Un `rol_sin_personas` de una salida queda en su fase:** la base no dice de qué salida es y no se adivina por el texto.

## Logística

### La cadena y la unidad

- **La unidad en su página va en zonas y el alto lo pone `src/app`.** Con 1440×900 y 1280×800 todo lo importante entra sin desplazar la página: «Qué falta» con mover arriba a la izquierda, las pestañas (Documentos, Transporte, Repuestos, Aduana, Dinero) debajo y notas e historial a la derecha, cada zona con su desplazamiento. La forma (zonas o bloques con la barra «Mover») se elige por el ancho de la **pantalla** (1024 px, `useAlMenos`: el servidor lo adivina por cookie y la hidratación no salta); las dos columnas con alto fijo, por el ancho del **contenedor** (`@container/unidad`, 56 rem): con el texto al 200 % los rem crecen y el arreglo vuelve solo a una columna con alto natural. El alto (`--alto-del-detalle`) lo define la página, no el módulo: el marco sabe cuánto ocupa (`<main>`, la sub-navegación, el `gap`); la cabecera va fuera del cambio de forma.
- **La zona de cada hueco la dice un solo mapa del núcleo (`ZONA_DEL_HUECO`), junto a `ORDEN_DE_HUECOS`**, no la declaración de cada área: el orden ya es central y la zona es el mismo tipo de dato con la misma clave; así `repuestos` no conoce los nombres de las zonas de `logistica`, y el `Record` obliga a ponerle zona a toda clave nueva. «Dinero» junta gastos, pagos y margen porque caben cinco pestañas a 1280 px y es la palabra de la persona.
- **`ORDEN_DE_HUECOS` va por lo que más se hace:** qué falta, documentos, notas, historial, transporte, repuestos, aduana, gastos, pagos, margen. Rige también el orden de los bloques en el celular y en el drawer de gastos (a propósito). El panel del ítem tiene su orden propio (`ORDEN_DEL_ITEM`: qué falta, sus bloques, documentos, historial, notas, transporte), con las secciones a la vista.
- **La pestaña elegida va en `?hueco=`, con `shallow` y `replace`** (aunque `ui.md` pida `shallow: false`): el servidor no depende de la pestaña, así que un viaje por pestaña no aporta nada. Cada zona recuerda lo último que eligió porque las dos comparten la clave de la URL.
- **Subir documentos va en un drawer sólo en las zonas de la página** (`?subir=documentos`, clave propia: `?panel=` cerraría el drawer del ítem de repuesto y una clave aparte convive con `?vehiculo=` e `?item=`): una pestaña con alto fijo no tiene lugar para la bandeja. En los bloques (celular, drawers, ficha del vehículo) la subida sigue en línea: no toca el ítem, la ficha ni sus specs. Un contexto del núcleo (`useEnZonas`) se lo dice al área, sin que el núcleo importe un área.
- **Transporte sigue en línea dentro de su pestaña:** su borrador por campo y su `PT409` con «Recargar» viven en el formulario y la pestaña ya tiene su propio desplazamiento.
- **Cada hueco va en un límite de error** (`LimiteDelHueco`) y su `diferido()` avisa y muestra el esqueleto en su zona: un hueco roto o sin código no tumba la página ni deja un blanco.
- **«La ganamos» es el mover de siempre** (`?ganada=si`), sólo hacia fases que no son la subasta; `vehiculo_subasta_ganada` envuelve
  `cambiar_fase` en una transacción: nunca queda un «ganada» que sigue en la subasta. `cambiar_fase` no se toca.
- **La cadena excluye las no ganadas con un índice parcial** (`vehiculos_cadena_idx … where situacion <> 'no_ganada'`): un filtro sin índice
  descartaría filas que crecen con la tabla. Cada consulta lleva el literal.
- **La cadena es una gráfica y no un kanban.** Con cientos de miles de vehículos una columna con «Ver más» no da un número útil: cada fase dice cuántos vehículos tiene y cuántos están demorados o
  trabados; la lista de una fase (tabla por cursor) y el lote viven en su propia página. «Sin fase» la pone la base (primera, sólo con vehículos); el orden es el de la base. Un vehículo se abre
  siempre en su página (`/logistica/vehiculo/[id]`), nunca en un drawer (salvo en `/logistica/gastos`: `docs/PENDIENTES.md`).
- **El número de cada fase es un conteo con tope por índice, no una tabla resumen.** `limit 1.001` sobre `vehiculos_cadena_idx` (por fase, «1.000+»): el costo depende de las fases y no de la tabla
  (medido: los bloques del índice no crecen con la fase), el número siempre está fresco (la demora depende del reloj) y respeta el alcance de quien mira. Una tabla resumen
  habría puesto una fila caliente en cada mover y en cada lote de 200 (bloqueos, riesgo de deadlock), quedaría desfasada en demorados y trabados, seguiría necesitando el conteo vivo para «propios»
  y daría totales exactos, contra la regla.
- **«Trabado» = demorada a la que le falta un bloqueante para su fase siguiente; se evalúan las primeras 50 demoradas visibles de cada fase.** Acota `evaluar_requisitos` (sin requisito bloqueante en la fase siguiente
  no se evalúa nada) y `hay_mas` lo dice (`3+`); `evaluar_requisitos` pregunta por `documentos_unidad_tipo_idx`. Los jobs de alertas no toman candado: hacer esperar a quien mueve es peor.
- **«Propios» no recorre la fase.** `_logistica_lo_propio` junta hasta 10.001 ids propios del origen (lo creado y lo de la cartera, por sus índices) y la columna, el resumen y los grupos parten de ahí:
  el pedido lo acota la cartera de la persona y no la tabla. Si se cortó, todo número lleva «+». Lo materializan (`with … as materialized`) antes de unirlo a los pares: unido a la vez, el planificador
  recorría `vehiculos` entera.
- **Quién ve cada grupo de la bandeja** (lo conservador, sin consultar a la persona: el alcance de la bandeja de Inicio): lo visible (`_logistica_alcance`); «por aprobar», además `logistica.documentos.aprobar`;
  «por vencer», además `logistica.documentos.subir` (como el job que avisa). La acción sale sólo con su permiso y, sin él, la fila conserva el enlace al detalle. Mostrar de más es reversible; esconder no.
- **Ventanas de la bandeja** (sin consultar a la persona): «por vencer» = `vence_el` entre hoy y hoy + `aviso_dias` del tipo, aprobados, con modo `renovar` o `solicitar` (lo vencido ya bloquea y sale como trabado);
  «llegadas esperadas» = ETA de hoy o anterior, sin arribo, con la fase no final; «salen hoy» = zarpe de hoy (no hay zarpe real: no se detecta uno atrasado). «Hoy» es el día de la empresa, como
  `documentos_vencimientos()`.
- **«Revisar» no aprueba en la fila.** Aprobar un documento sin ver el archivo es aprobar a ciegas: «Revisar» (y «Renovar») llevan a la página del vehículo con «Documentos» abierto (`?hueco=documentos`),
  donde se aprueba de un toque. «No la ganamos» sí se hace en la fila: es reversible (hacer + «Deshacer» de 10 s, `.claude/rules/ui.md`).
- **La fila de la bandeja y de la lista lleva a la página, no a un resumen** (excepción al patrón de lista: lo pidió la persona). El nombre es un enlace de verdad (Ctrl+clic abre otra pestaña) en un
  `span` marcado dentro (`EnlaceALaUnidad`): así `esClicPropio` no cuenta el clic en el enlace y no se navega dos veces, y el «visto» de la lista tiene dónde enchufarse.
- **Las lecturas de la cadena son `security definer`.** Las policies de `transportes`/`documentos` preguntan por fila; la definer resuelve el alcance una vez por origen (el menor de `logistica.ver` y `vehiculos.ver`).
- **Inexistente, en papelera o sin acceso: un solo texto y 42501 hint `acceso`.** El nombre de quien movió (PT409) sólo llega a quien pasó el acceso; sin acceso a la cadena, 42501, no cadena vacía.
- **Mover.** `cambiar_fase` toma la unidad `for no key update`; la esperada nula vale sólo para unidad sin fase. El lote no mezcla fases y mueve «los N que pueden»; sin actualización optimista.
- **Las acciones de «Qué falta» se resuelven en el servidor**, en la action que envuelve la lectura de `flujos` (`leerQueFalta`): los permisos y la regla no
  viajan al navegador y no hay lectura nueva; el navegador sólo filtra lo que sabe el DOM (qué huecos hay, página o drawer, red). Descartado: resolver en el
  navegador con `mis_permisos` (pagaría JS y permisos) y pasar capacidades por un contexto desde la página (la regla correría en el navegador).
- **«Revisar» antes que «Subir»:** `evaluar_requisitos` cuenta en la misma consulta los subidos que contarían si se aprobaran (`por_revisar`); `cumplido`
  sigue siendo de los aprobados. Sin eso, quien sube y aprueba vería «Subir» otra vez justo después de subir.
- **«Pedirlo» es una tarea de agenda sin fecha ni descripción**, vinculada al vehículo, sin un tipo de aviso nuevo (`tarea_asignada` ya avisa). La lista
  es de quien tiene la clave en el origen de la unidad **y la ve** (el espejo de `alertas_demora`), sin quien pide. Un ítem no ofrece «Pedirlo» (una tarea
  no se vincula a un ítem). Lo que falta de un pago se pide a quien lo confirma (`logistica.pagos.confirmar`): lo que falta es que esté confirmado.
- **«Pedirlo» acota en la base la clave por la que se busca** (`agenda_quienes_reciben` sólo acepta las de `CLAVES_QUE_SE_PIDEN`): si no, quien da tareas
  podría averiguar quién tiene cualquier permiso en un origen. La tarea en sí es la de siempre (`tarea_crear`): la base exige que el responsable reciba
  tareas, no que tenga la clave ni que vea el vehículo, igual que una tarea dada desde la agenda con su vínculo. El cliente sin vincular se pide a quien
  edita vehículos (la clave del dato), aunque vincular pida también `leads.editar`.
- **En un drawer, «ir a» lleva a la página de la unidad** («Abrir la unidad»), salvo en el ítem, cuyos destinos ya son su vehículo o su proyecto. La franja
  «fuera de regla» no lleva acciones nuevas: no es una tarjeta de destino. Las faltas informativas también llevan acción. Las acciones sólo se apagan sin red.
- **«Qué falta» sin realtime.** Se relee al volver el foco (≥ 5 s) y con `logistica:unidad-cambio`; destinos desde `fases_transiciones`, tope 12. Un fallo al leer el flujo apaga sólo los huecos con regla.
- **Notas sin «Borrar».** Corregir sólo la propia, sin cambio de fase y sin versión (gana la última).
- **El ítem de repuesto entra al motor como `UnidadAbierta`**, sin volver nulo `Unidad.origenId`: el camino del vehículo no cambia.

### Documentos

- **Un objeto y N filas con la misma ruta** (hasta 100 unidades); ids `md5(p_id || ':' || unidad)::uuid` para reintento idempotente; eliminar es suave y no se deshace; el refcount cuenta filas vivas.
- **`visible_portal` lo marca sólo quien aprueba**, que puede aprobar lo propio (sin cuatro ojos). Mime y bytes salen de `storage.objects.metadata`, no del cliente.
- **Una foto de cámara es documento y no se comprime.** El tipo se elige antes que los archivos; uno por vez, cortando ante un fallo que se repetiría.

### Gastos y pagos

- **El tipo de cambio lo elige quien carga** y la base guarda valor e id; moneda→base multiplica, base→moneda divide; en moneda base un tipo es 22023. El equivalente lo calcula siempre la base.
- **Una confirmación de pago no se deshace: se anula** (`pago_anular`, motivo 1–500). Sello e inmutabilidad en triggers (ni `service_role` edita un confirmado). La «venta» del margen = suma de pagos confirmados.
- **Más de dos decimales es error**, mirado antes de asignar (`numeric(18,2)` redondea en silencio). Gasto ≥ 0, pago > 0; prorrateo en partes iguales, 1–200 vehículos; la suma exacta es la del monto.
- **Un comprobante se lee por la fila que lo nombra**, no por la carpeta: con la carpeta, quien ve pagos bajaría comprobantes de gastos.
- **Un pago se registra sin lead**: `trg_lead_visible` rechazaría al asesor sin acceso; el margen no depende del lead.
- **Listas de gastos y pagos sin sumas ni «Anterior».** La fila abre el panel de la unidad: las acciones, en un solo lugar.
- **Aduana y pagos no son por origen.** `logistica.aduana.gestionar` y `logistica.pagos.confirmar` quedan globales (cambiaría el catálogo y la matriz de Roles); las RPC acotan lo que se lee.

### Transporte, catálogos y aduana

- **Catálogos sin eliminar.** Puertos y navieras se desactivan; orden = número en «Editar», no flechas (serían dos escrituras sin transacción). Un inactivo guardado en una oferta se muestra «(inactivo)».
- **Contenedor y booking en mayúsculas sin espacios** (`A-Z 0-9 . / -`, ≤ 40), sin dígito de control ISO 6346. ETA/arribo ≥ zarpe.
- **Un grupo de transporte: ≤ 200 filas, todo o nada, permiso antes que versión.** Leer pide `logistica.ver`/`repuestos.ver` en algún origen (si no, se sondearían bookings); un campo «Varios» no se vacía.
- **El cursor de `transporte_grupos` es el id de una fila de `transportes`**, no la clave (con la clave se recorrían grupos no visibles); ≤ 2.000 filas por llamada con `cortada`.
- **Aduana.** El canal congela la composición (por cualquier camino); un vehículo vivo en otra declaración da 23514; agregar pide la regla `aduana`, quitar no. `pagada` es de todos los vivos; `faltan`, sólo de los vistos.

## Repuestos

- **Sin INSERT directo de proyectos**: si no, quien tiene `repuestos.editar` crearía uno de un vehículo que no ve. La lista no trae lead ni teléfono (un proyecto que
  sólo tiene lead dice «—» en «Cliente»); busca por etiqueta, VIN y cliente. La cabecera lee el lead por id (`leerLeadParaEnlazar`), sólo con `leads.ver`.
- **El cliente de un proyecto es un lead** (`lead_id`); los viejos conservan `cliente_nombre` y `cliente_telefono`. Nada se copia del lead al proyecto: el
  teléfono escrito quedaría fuera del enmascarado y el nombre a la vista de quien no ve el lead. Si hay lead y nombre escrito, manda el lead, y un lead que
  no se ve se dice «Cliente que no puedes ver» aunque haya nombre. La cabecera de un proyecto viejo muestra el nombre, nunca el teléfono.
- **Con `leads.ver`, «Cliente (lead)» reemplaza el cliente y el teléfono escritos** en «Nuevo proyecto»: con un lead a mano, un teléfono escrito queda fuera del
  enmascarado y dos campos «cliente» confunden. Sin ese permiso van el cliente y el teléfono escritos. El cliente no se cambia en un proyecto ya creado (`PENDIENTES`).
- **«Nuevo lead» del formulario es el alta del shell**, no una propia (duplicaría la verificación del teléfono y el borrador): el formulario deja `?nuevo=proyecto`
  antes de abrirla, se esconde mientras está encima (el contenido de un drawer se desmonta y el borrador lo repone) y el creado vuelve en `?lead=`, que resuelve
  el servidor. Sin drawers apilados: dos raíces de Base UI sin anidar, con Esc, clic afuera y foco sin precedente.
- **El lead propuesto por el vehículo no cuenta como escrito** (`baseDelBorrador`): abrir desde la ficha y cerrar no deja borrador. Se lee en el navegador al
  elegir el vehículo (`vehiculo_vinculos`, invocadora) y no se distingue «no tiene» de «no lo ves».
- **Un proyecto sólo se elimina vacío** (borrado suave con «Deshacer»); cerrado no recibe ítems. «Borrar sólo sin uso» de catálogos es un trigger `before delete`.
- **Stock: cantidad siempre positiva, el sentido sale del motivo** (`sobrante` entra; `vendido`, `devuelto`, `ajuste` salen; `reasignado` sólo por reasignar), validado en la RPC. «Vender suelto» no registra precio.
- **Una sola unidad en stock saca el ítem de la espera** (`en_stock_desde`); lo que entra por `sobrante` tiene tope.
- **La hoja de ítems guarda por celda con una cola por fila** (`colaPorClave`) y sin revalidar; sólo cantidad y precio son `XCell`.
- **Imágenes del ítem: tope 8 en la base con candado por ítem**, sin UPDATE; proyecto cerrado e ítem eliminado frenan el INSERT.
- **Nulo no es 0 en dinero.** Margen y total son nulos si a un ítem le falta precio o moneda; un total que no cabe en `numeric(18,2)` es error de la línea, no un recorte.
- **Pagos de proyecto por la RPC gemela `pago_registrar_proyecto`**, sin tocar la firma de `pago_registrar`; el lead queda nulo (también al corregirlo).
- **Un pago de proyecto se anula con el mismo `pago_anular`** y la clave de confirmar; como cualquier pago vivo cumple `proyecto.pago_cliente`, no se anula ni
  se elimina (`pago_eliminar`) el último mientras un ítem vivo (también en stock) esté en una fase que lo pide. Como confirmar, no mira si el proyecto está cerrado.
- **La cotización de repuestos se numera con `identity`, con huecos** (no es comprobante). Aceptar copia el unitario a `precio_cliente`; anular no lo revierte.
- **El proyecto se guía por pasos que salen del flujo de repuestos, no de nombres** (`entities/flujo/pasos.ts`): las fases activas en su orden y, justo antes de
  la primera fase activa que lo pide (bloqueante o informativo), un hito por clave de requisito: `repuesto.precio` → «Precio al cliente», `proyecto.pago_cliente` →
  «Pago del cliente». Antes, porque un requisito es lo que la fase pide para entrar. Sin la clave en ninguna fase, el hito no aparece: el progreso no inventa pasos.
  Se dibujan como una barra de progreso compacta bajo la cabecera (pista con el color de la fase, nombre y progreso en texto); un hito es un botón que lleva a su
  pestaña. Descartados: un kanban de ítems por fase (arrastrar está prohibido y duplica la Cadena) y un asistente por ítem (lento con 20 ítems y rompe la hoja celda a celda).
- **«Compra registrada» no es un paso**: la base no tiene una clave que la ubique. Compras no tiene hito: sólo su pestaña (la clave `repuesto.compra` es de la persona,
  `PENDIENTES`). Cotizaciones y Pagos tienen su pestaña pidan o no las fases su clave; el hito sólo es un atajo.
- **El progreso de una fase cuenta los ítems que llegaron**: los que están en ella o en una fase a la que se llega desde ella por salidas hacia adelante (destino de
  mayor `orden`). Así un ítem «Perdido» no cuenta en «Recibido» y una vuelta atrás no infla el número. El del pago, con `repuestos.costos.ver`, es todos o ninguno
  (un pago es del proyecto); sin la clave, los que llegaron a la fase que lo pide, sin decir nada del pago.
- **El siguiente de un ítem sólo cambia de botón por un hito bloqueante** (`siguienteDelItem`): un informativo no frena mover. Destino = la salida hacia adelante más
  cercana (si no hay, la primera); cada botón pide la clave que la base exige para eso (`repuestos.mover`, `repuestos.cotizar`, `repuestos.costos.editar`) y sin ella
  se dice «Sigue: «X»»; un hito bloqueante que falta y quien mira no puede hacer nunca da «Mover» (la base lo rechazaría siempre). Se calcula en el navegador sobre las filas vivas de la hoja: un precio tecleado cambia el botón y el progreso sin releer nada.
- **El proyecto se recorre por pestañas fijas** (Ítems · Cotizaciones · Pagos · Compras, `?pestana=items|cotizaciones|pagos|compras`; sin clave, Ítems): un solo
  lugar para cada cosa y nada aparece de golpe. Los enlaces viejos abren lo mismo y los de un formulario de compra o de pagos sin `?pestana=` redirigen con su
  pestaña. La hoja no se desmonta nunca: en otra pestaña queda montada y oculta (`hidden`), porque sus filas vivas calculan la barra de progreso, volver a Ítems no
  la relee y lo que se esté escribiendo en una celda no se pierde. Lo que se pega bajo la barra superior es la barra de pestañas, con el nombre compacto del proyecto
  a su izquierda mientras va pegada: la cabecera entera (vehículo, cliente, notas) ocuparía un tercio de la pantalla. Cada pestaña reserva su alto (`min-h-80`)
  mientras llega. Sin «Cerrar»: cambiar de pestaña lo cierra.
- **El panel del ítem es una variante de logística** (`PanelDeLaUnidadALaVista`), no un cambio de la pieza común: el drawer de `/logistica/gastos?vehiculo=` sigue
  plegable. El destino ya elegido viaja en `?destino=` y llega a «Qué falta» por un contexto nulo por defecto; los bloques de `repuestos` (imágenes, stock, compras)
  los compone `src/app`. El stock del bloque sólo enlaza a su panel de la hoja: el formulario cambia la fila sin releerla.
- **Los ítems de un proyecto son tarjetas agrupadas por paso, y su fila de Excel vive en un drawer de abajo.** Se agrupan en el navegador sobre lo leído (`agruparPorPaso`, ≤ 200 filas, sin otra
  lectura) y la tarjeta no repite la fase: la dice el encabezado de su grupo, y «Siguiente» sólo lleva el botón (sin flujo legible, la insignia de su fase). Una fase que no está en el orden del flujo va tras las
  conocidas, por nombre. La tarjeta dice qué es el ítem («Tipo · Condición» o la descripción), cantidad, precio y stock; el clic abre `?item=` con **la fila del ítem como hoja de cálculo** (Ítem, Cantidad,
  Precio, País, Vía, Moneda, Tracking, Notas) sobre las secciones del ítem. Descartados: mantener la tabla además de las tarjetas (dos vistas que mantener y la tabla no cabe en el celular), un drawer a la derecha (en
  el celular la fila de ocho celdas necesita el ancho; abajo se desplaza de costado como una hoja), apilar las celdas de la fila en el celular (deja de ser una fila) y un panel de filtros (los filtros son pocos
  y se ven: fichas de una sola opción). El drawer mide el 60 % del alto en escritorio con un asa que lo agranda o lo achica mientras está abierto (`<Drawer alto="ajustable">`, recordado sólo mientras está
  montado) y la pantalla completa en el celular. El ítem se abre sin la cabecera «Proyecto #N» ni su enlace: su título es el ítem (`conCabecera={false}`).
- **Buscar y filtrar los ítems va en la URL con `shallow: true` y `replace`** (excepción a `ui.md`): se aplican en el navegador sobre las ≤ 200 filas ya leídas, así que un viaje al servidor por cada letra no
  aporta nada y no suma entradas al «atrás». Con otra navegación pendiente, una escritura `shallow` se pisa (la última letra puede no llegar a la URL): se acepta, el filtro es barato de repetir. Con filtros, «N de M ítems»
  (M con `conteoCorto`: «3 de 200+ ítems»); nunca un total exacto.
- **«Agregar ítem» tiene su propia URL (`?panel=nuevo-item`) y un drawer con una fila nueva**; crea sólo con la descripción (Enter) y deja otra fila lista, para cargar varios ítems seguidos. El ítem creado
  queda arriba y se edita celda a celda; no hay fila nueva dentro de la lista.
- **Reglas menores de los ítems en tarjetas:** cada ficha de filtro es de una sola opción (no multiselección) y «Sin precio» es un interruptor aparte; Stock y «Mover a…» van en el «⋯» de la tarjeta
  y «Mover a…» abre el drawer del ítem para elegir el destino; «Eliminar el ítem» pide `repuestos.editar`; el alto del drawer, mientras el panel sigue montado, se conserva entre aperturas.
- **La ayuda de cada columna de la fila del ítem va en un `title`** con subrayado punteado: un «?» con `Popover` arrastra Base UI a la carga en frío por diez encabezados
  y el `popover` nativo no se posiciona junto al encabezado en Safari sin anchor positioning. No llega al tacto en una tablet de 768 px o más: el título visible
  ya dice qué es.
- **El vehículo de la cabecera de un proyecto se lee en su propio `<Suspense>`** (la lectura empieza en la página, en paralelo con la hoja): su error se dice en
  el recuadro con «Reintentar» y la hoja sigue. La situación necesita el nombre y el color de la fase del vehículo, que `Vehiculo` no trae: sale de
  `leerFasesDeOrigen` (configuración cacheada por pedido, la misma de la ficha), y si esa lectura falla o la fase no está entre las leídas, no se dibuja la
  insignia (decir «Sin fase» mentiría). Descartados: la miniatura dentro del `dl` (se pierde en la grilla) y la portada grande con el carrusel (JS de cliente y
  ruido).
- **Tras un pago, la página se vuelve a pedir por el evento del dinero** (`useAlCambiarElDineroDelProyecto`): las actions de pagos no revalidan (los lee el
  navegador), y sin esto la fila seguiría diciendo «Registrar pago».

## Agenda

- **Tarea: el creador edita, elimina y reasigna; el responsable sólo completa y reabre.** Una tarea nacida en una conversación sólo va a sus miembros (`tareas.conversacion_id`, fija).
- **Publicar también para despublicar y eliminar.** `agenda.eventos.publicar` si el evento era o queda público/«seleccionados»; destinatarios sólo con «seleccionados». «Destinatario», nunca «invitado».
- **`p_datos`: clave presente = cambio, ausente = no toca, nulo = quita**; desconocida, 22023. Orden: `assert_activo()` → fila `for update` → permiso (42501) → `sin_cambios` → versión (PT409) → cambio.
- **Lecturas de invocador.** «Mi agenda» es filtro sobre la RLS; cada cosa entra por su fecha en `[desde, hasta)`, tope 200 por clase, rango ≤ 45 días; semana desde el lunes; días en la zona de la empresa.
- **Fechas.** Una tarea puede quedar «Sin fecha»; un evento puede empezar en el pasado; una tarea no vence en el pasado.
- **La agenda es una libreta: abre en la hoja del día en todo ancho.** La jornada fija de 08:00 a 20:00 (`JORNADA`; lo de afuera, «Antes» y «Después» sólo si trae algo) da la hoja con huecos que busca quien anota a mano; se descartaron la grilla por duración (frágil al 200 % y en el celular, muchos eventos no tienen fin, más JS) y la lista continua de los próximos días (pierde la hoja). Los pendientes van al costado; en el celular, debajo de la hoja (sin pestaña pegajosa: esconde uno de los dos y suma un control).
- **Los pendientes son de quien mira, también con «De todos», y los filtra «Qué ver».** Sin tareas no hay «Vencidas» ni «Sin fecha»; sin recordatorios, no hay «Recordatorios»; sin ninguno, no hay columna. «Sin fecha» lista sólo pendientes: una hecha se reabre desde su panel.
- **Los pendientes se leen en la base por grupo, en plpgsql, con el estado literal.** «Completar» en un toque exige la versión (PT409) y ninguna lectura la traía, y las vencidas no caben en `agenda_rango` (están fuera del día). `agenda_pendientes(p_grupo, …)` y `agenda_tareas_sin_fecha` dicen `estado = 'pendiente'` en el SQL para que el planificador pruebe el índice parcial (`tareas_pendientes_idx`, `tareas_sin_fecha_idx`); por PostgREST el estado llega como parámetro y el plan genérico no lo usa. La primera página se lee en el servidor tras su `<Suspense>`; «Ver más», en el navegador y diferido.
- **«Nuevo» de la agenda es el modal de la barra, filtrado por la URL.** `?panel=nuevo-en-la-agenda` lo abre con Evento, Tarea y Recordatorio; el botón se compone en `src/app` porque el modal vive en el layout. Evento y tarea, ya en la agenda, sólo escriben su `?panel=` (una escritura por nuqs, `replace`): el alta nace en el día que se mira. Un «Nuevo» propio de la agenda duplicaba el catálogo y el paso de elegir lead.
- **Un evento se vincula a un lead en su formulario.** «Lead (opcional)» con `leads.ver`, elegido de la cartera (`ElegirLead` del buscador); `evento_crear`/`evento_guardar` aceptan `lead_id` y `trg_lead_visible` exige verlo. El nombre lo lee la página de `leads` encadenado al evento; si no se ve, el panel dice «Ver el lead».

## Chat

- **La regla del canal global vive en `es_miembro()`.** La dueña no lee conversaciones donde no es miembro. Una directa no se deja, se silencia; el grupo lo administra quien lo creó (2 a 50).
- **Lista y no leídos son `security definer`** que repiten la regla de `es_miembro` una vez: bajo RLS, contar pagaba la regla por mensaje. Si la regla cambia, cambia en los tres lugares.
- **`chat_leer` recibe hasta dónde se leyó y enviar no mueve la lectura propia**: con `clock_timestamp()` se marcaría leído un mensaje ajeno de otra transacción con hora anterior.
- **Editar: 15 min con versión; borrar: autor o `chat.moderar`, sin versión**, vacía el cuerpo y conserva la ficha. Fichas de vehículo, lead o cotización pueden quedar sin referencia; tarea y evento no.
- **Mensaje con tarea o evento: primero la RPC de agenda y luego la del chat, en una transacción**; id del mensaje del navegador, el de la tarea del servidor, candado consultivo por id.
- **Envío optimista, de a uno y en orden.** Reintentar reusa id y cuerpo; la cita se lee en otra consulta por pk (el embed `mensajes→mensajes` da 400).
- **«Purgado» y «no lo veo» no se distinguen en una mención**: distinguirlo filtraría existencia.
- **El widget guarda su estado en local, no en la URL** (abrirlo no cambia la pantalla de atrás). En el celular la burbuja es un enlace a `/chat`; va abajo a la derecha del marco, con `z-40`, dentro de `<Flotantes>` (`src/app/(app)/_shell/flotantes.tsx`: una fila `fixed` con «Copiar el enlace de esta página» a su izquierda, que queda sola donde el chat no está).
- **Recargar y copiar el enlace: sin librería y sin tocar el aviso de cambios sin guardar.** Recargar es `location.reload()` (el `beforeunload` de `useSalidaConCambios()` ya pregunta). Copiar usa `copiarTexto()`; si falla, un modal diferido con el enlace seleccionado en vez de un aviso de error: la persona igual puede copiarlo. En una barra de menos de 28 rem (el celular de 412 px) «Recargar la página» pasa al pie del menú: con el ícono en la barra desborda (440 px de 413) o deja el buscador en 22 px, y el tipo de cambio y el buscador ya tienen su lugar fijado por pruebas.
- **`/chat?con=` se resuelve en el render con `chat_directa`**, no con una action: un enlace plano sirve con «atrás» y sin JS extra.

## Notificaciones

- **Las preferencias no apagan la campana.** La campana es el registro; las preferencias gobiernan sólo el push.
- **Abrir un aviso lo acciona sólo en `tarea_asignada`, `recordatorio` y `demora_fase`**; los demás, por su acción propia.
- **Ningún aviso nombra al lead** (puede llamarse como su teléfono, viaja por Realtime y queda tras perder el acceso): se abre por la `ruta`.
- **Repetir un aviso borra el abierto anterior y deja uno nuevo** (si no, el antispam se lo traga). Un destinatario sin perfil se descarta: avisar nunca hace fallar la operación.
- **«Ya avisado» de la limpieza es tabla propia** (`limpieza_avisos`): una columna en `vehiculos` movería `actualizado_en`; un `exists` sobre `notificaciones` se pierde al purgar.
- **El cuerpo no lleva fechas formateadas en SQL**; un mes en texto sale de un arreglo fijo, no de `lc_time`.
- **Push con un pase de un uso (10 min) atado a la notificación.** La privada VAPID vive sólo en la función `push`, que canjea el pase antes de mirar las claves; Next no firma nada. Tope 10 suscripciones por persona.
- **Web Crypto propio (RFC 8291/8292), no `web-push`** (no admite `fetch` inyectado). Sólo 404/410 caducan una suscripción; `redirect: 'manual'`.
- **El endpoint se valida dos veces** (`_push_endpoint_valido()` y la lista de hosts en la función): sólo `https`, sin puertos de servicio; la duplicación es a propósito, contra el proxy abierto.
- **Correo sin reintentos ni idempotencia**, tope 10 s; el error nunca lleva la clave ni el texto libre del proveedor. El archivo de Resend es `resend-rest.ts`: la regla `NINGUN_SDK_DE_CORREO` rechaza una ruta llamada `resend`.

## Actividad

- **Sólo las definer escriben y leen el detalle.** `registrar_actividad()` sin `execute` para `public`, `anon` ni `authenticated` (si no, se podrían inventar `antes`/`despues`); `actividad.detalle` sin `select` para la app (lleva teléfonos, el código del portal y montos).
- **Cada cambio se lee como frase con su antes → después, y los valores salen de la base ya recortados.** «Ana cambió Precio de Toyota Hilux #12: 10.000 → 12.000». `actividad_listar` trae de cada fila visible `registro_titulo` y `registro_destino` (por la PK de la fila ya elegida, con la visibilidad de `_actividad_puede_ver_fila` sobre la fila vigente; la unidad de la que cuelga un gasto, documento, transporte, pago o compra sólo se nombra con `vehiculos.ver` de ese vehículo o `repuestos.ver`: ver el gasto no es ver el vehículo) y `primer_cambio` (el primer campo, sacado del mismo recorte de `_actividad_recortar` que ya hacía: sin teléfonos ni lo restringido de una cotización, cada texto a 80 caracteres y con la moneda de la foto de cada lado). Se descartó leer `actividad_diff` por fila (N+1 por página) y leer `actividad.detalle` (lleva lo que la app no ve). Con varios campos la frase dice el primero y «y N más», sin valores; el detalle completo se despliega en la misma fila. El campo va con su etiqueta, sin artículo («cambió Precio de»): un artículo por campo no se puede decir bien para los campos del layout. Las acciones de `registrar_actividad()` que se ven llevan su predicado en `VERBOS` («Aprobó», «Resolvió la subasta de»); una sin verbo, «Hizo «…» en».
- **El detalle de un cambio se despliega en su fila, no en un drawer.** `?cambio=<id>` despliega esa fila y la trae a la vista; uno a la vez, con `replace` (desplegar no es ir a otra pantalla: «atrás» sale de la actividad). Si no está en lo cargado (es más viejo o quien mira no lo ve) sale arriba como «El cambio que abriste», leído con `actividad_diff`, y la lista sigue debajo. Sin drawer, la frase y el detalle se leen juntos y la lista no queda tapada.
- **Los filtros de la actividad son chips arriba, a todo el ancho.** Persona y tipo de registro como chips con un `<select>` nativo (la lista del sistema en el celular, sin código de más), el registro de «Ver actividad» y la fecha de «Ir a una fecha» como chips con su «×», y «Limpiar filtros». Se descartó `<FilterShell>`: su panel al costado le quita 15 rem a la frase para dos filtros de una opción.

## Web y portal

### Sitio público

- **La web pública es otro repo sobre el mismo Supabase.** Lee sólo el esquema `web`; ampliar `web.vehiculos` es deliberado, columna por columna, y `atributos` trae sólo campos `publico_web` activos.
- **Revalidación sin variables de entorno.** URL en `integraciones.config.revalidar_url`, secreto en Vault; cola + job por minuto con triggers por sentencia, sin índice único ni `on conflict` (serializaba escrituras de vehículos).
- **El job sólo envía a `https://`.** «Probar» acepta loopback sólo si la base del despliegue es loopback; la app rechaza IP internas literales. No se ataja lo que resuelve el DNS.
- **El HTML del sitio lo deriva la base** (`_web_doc_html()` sobre ProseMirror con lista blanca; fuera de ella 22023, no se recorta). `minutos_lectura` sólo en la base.
- **El `slug` sale del título al crear y después no lo sigue**: renombrar algo publicado no mueve su URL.
- **Publicar una guía pone `publicada_en = ahora − 60 s`**: el reloj de Next no es el de la base. «Programar» pide al menos un minuto adelante.
- **Categoría con guías no se borra** (la FK es `set null`, no falla sola): la action lo rechaza y la lista apaga «Eliminar» con motivo.
- **El consentimiento de un testimonio está atado al texto**: cambiar cliente, texto o foto lo anula y despublica; ciudad o vehículo apagan sólo su permiso.
- **Sitio web y Cola web en Configuración.** Sitio web es una sub-ruta por parte y `/configuracion/web` sólo redirige (Interfaz › «Una
  sección sin sub-sección índice…»). Ajustes y Legales comparten la versión de `ajustes_web`, y cada action revalida las dos rutas. En la
  Cola web, «Política de la cola» es la tercera sección, abierta, con la barra de cambios sin guardar como hermana (`order-last`); los
  grupos de habilitadas que hoy no reciben turnos son parte de «En la rueda».
- **La rueda por rol.** Entra quien está `habilitado` (nace en false), tiene `web.cola.participar` y cuenta activa (`puede_estar_en_la_rueda()`); prioridad ponderada y `max_intentos`.

### Portal del cliente

- **Acceso por RPC con `otorgado_en` como versión.** La clave la genera la base, bcrypt, nunca en claro ni en argumentos (`logging.serverFunctions: false`). Nunca costos, VIN completo ni privados.
- **Cookie HMAC de `node:crypto`, sesión de 7 días cortada por `otorgado_en`** (viaja como texto con microsegundos: un `Date` lo redondea). `salir` no revoca en la base: el corte es revocar u otorgar de nuevo.
- **Todo fallo de `ingresar` da el mismo 401** (error de base, cuerpo > 2 KB): sin oráculo. Límite por HMAC(ip, sal de Vault), 5 fallos = 15 min; `documentos/[id]` mira la cookie antes que el id.
- **El límite por IP supone Vercel.** `ipDelPedido` toma la primera de `x-forwarded-for` o `x-real-ip`; otro alojamiento cambia `ipDelPedido`.

## Buscador

- **Las tres secciones son RPC** (el mínimo vive en el servidor). `buscador_leads` devuelve ids y se hidrata con `leads_vista_por_ids`; `buscador_cotizaciones` no devuelve `lead_id`, `vehiculo_id` ni `creado_por`.
- **«Mis propias» con consultas estáticas**, no `execute … using` (planificada con el texto iba a Seq Scan); con > 1.000 coincidencias de título se toman 1.000 cualesquiera.
- **Un texto que parece teléfono no busca leads**; `#n` busca leads y cotizaciones, no vehículos.
- **Elegir un lead de la cartera pide los 20 candidatos que deja la base y se queda con los de la cartera** (`buscarLeadsDeLaCartera()`, `en_cartera` de `leads_vista_por_ids`; se muestran 5). Con 5 candidatos, quien ve «todos» no encontraría un lead propio tapado por ajenos; no hay RPC nueva. El registro de `paginas-en-la-base.ts` lo marca `pideMasQueElDefecto`.

## Tablero

- **Inicio es la bandeja.** Los widgets personalizables viven sólo en `/tablero`; widgets en Inicio, exportar una gráfica y comparar períodos quedan fuera.
- **Bloques de Inicio en el servidor**, cada uno tras su `<Suspense>`; 5 por bloque leyendo 6; cada uno lleva su límite de error (`<LimiteDeBloque>`): lo que falla al leer o al dibujar apaga sólo ese bloque. «Recordatorios de hoy» incluye los vencidos; «Sin seguimiento» = mi cartera, creado hace > 24 h.
- **«Ver todos» en cada bloque de Inicio, sólo en el tope.** Bajo el tope el bloque ya muestra todo y el enlace sobraría (menos ruido); en el tope (5, el sexto lo dice) lleva a la lista completa ya filtrada. Se dibuja sólo si
  quien mira puede abrir el destino (si no, el bloque sigue con su conteo). El género vive en el catálogo (`BloqueBandeja.verTodos`: «Ver todas» personas, tareas, alertas y esperas; «Ver todos» lo demás). Los que antes lo mostraban siempre
  (recordatorios, tareas, trabados, por aprobar, demora, repuestos) lo muestran sólo con tope y conservan su destino. Descartado: un enlace fijo en el título (ruido con listas cortas) y el número del total (nunca un total exacto).
- **«Leads sin seguimiento» abre `/leads?sin_seguimiento=si` sin `alcance`: «míos».** Es lo que cuenta el bloque (mi cartera). Quien elige «Todos» a mano con el filtro puesto ve los leads sin seguimiento de lo que esa persona ve (la misma
  definición, otra población): el chip y el panel lo dicen. El filtro es una condición de columnas de `leads_vista`/`leads_cartera_vista` (`ultimo_seguimiento_en is null` y `creado_en < ahora − 24 h`) sin índice propio; el «No» del
  panel de filtros (siempre ofrece Todos/Sí/No) es el contrario lógico: con algún seguimiento o creado hace menos de 24 h. Medido con 212.000 leads (`medir-escala.sql`, `docs/RENDIMIENTO.md`).
- **«Personas sin rol» abre `/configuracion/equipo?estado=sin_rol`.** Un filtro más de `equipo_lista()` (activa, no bloqueada y sin fila en `usuarios_roles`, la definición del bloque) y no un estado de la persona: la insignia no cambia.
- **El «Ver todos» de los turnos de la web es un panel en Inicio (`?panel=turnos`), no una pantalla.** Todos mis turnos sin confirmar (asignados y vencidos), de a 20 con «Ver más» por cursor `(vence_en, id)` hasta 200, con
  «Contacté» y «Vincular a lead» en cada uno. Lee en el navegador al abrirse y al volver a la pestaña (un turno pudo vencer o reasignarse) y no se relee por props: «Contacté» quita el turno localmente
  para no soltar las páginas cargadas. «Vincular a lead» reemplaza `?panel=turnos` por `?panel=vincular-turno` (un solo modal a la vez; «atrás» vuelve al panel).
- **La conversión cuenta por la clase del tipo de lead** y por `cliente_desde`, que sólo pone el paso de prospecto a cliente (un alta como cliente no infla la tasa); `conversion_desde` cubre a los clientes de antes. La tasa puede pasar de 1.
- **Ranking por dueño vigente**: sin dueño o en baja cuenta en el total y no en el ranking.
- **El margen del mes cuenta cada vehículo en el mes de su último pago confirmado vivo.** Un mes pasado cambia si se confirma o anula un pago: no se presenta como cerrado.
- **Gráficas en HTML y SVG propio.** Texto en HTML, el SVG sólo pinta barras (`preserveAspectRatio="none"`), tokens `--viz-*`; leyenda en texto y «Ver como tabla» en `<details>`.
- **«Documentos por aprobar» pide sólo `logistica.documentos.aprobar`.** La lectura es la bandeja de logística (de vehículos): con `repuestos.documentos.aprobar` saldría vacío; hasta que traiga los ítems, quien sólo aprueba los de repuestos no lo ve.
- **Widgets por permiso, no por rol**, cada uno con su error. La preferencia guarda `orden` con las ocultas; una clave que ya no existe se ignora y un widget nuevo cae al final.

## Datos

- **Exportar lee con un token fijo** (`getSession()` verificado con `getClaims(token)`): refrescar tras responder rotaría el refresh token. Única excepción a «nunca `getSession()`».
- **Exportar: primero la constancia, después las filas.** `datos_exportacion_registrar` con conteo previo al mismo corte; el stream corta con error, nunca entrega un CSV que parezca entero. Un fallo gasta el cupo. Delimitador `;`.
- **Exportar lee de la tabla bajo la RLS**, no de las RPC de listado (cortan en 100): una pasada por PostgREST, sin definer nueva.
- **La importación total crea cada lead con la identidad del destino**: misma regla de duplicados y limbo que a mano. Idempotencia por `md5(importación:fila)::uuid` y `procesadas` bajo `for update`.
- **`service_role` actúa a nombre de quien importa con claims locales**, repuestos en cada salida; vuelve a mirar los permisos en cada lote (si se pierden, la importación queda `fallida`).
- **El navegador convierte y sube un CSV normalizado**; `importar-csv` sólo valida forma, trabaja ≤ 45 s sin `waitUntil` y el job retoma a los 2 min.

## Pruebas, CI y despliegue

- **Sin segunda pila local para el e2e completo.** La salida son los bloques del CI (cada uno con su pila); se reabre sólo con tiempos medidos (`docs/DESPLIEGUE.md`).
- **Sesión reusada por cuenta.** `entrarConSesion` inyecta cookies (30 min); quien cambia la persona o su acceso pide `{ fresco: true }`.
- **Cuentas en paralelo.** La dueña primero y las demás a la vez; se borran todas menos ella a la vez y ella al final (la base rechaza una asesora sola en empresa vacía).
- **Tareas de oro con KLM.** Se mide lo pulsado (tope de teclas de control), un reloj del robot generoso y KLM (0,28 s/tecla, 1,35 s/decisión) contra la meta.
- **Una medición que siembra lo suyo vacía su tabla dentro de su transacción revertida**: convive con `db:sembrar-volumen`; si la base trae filas ajenas, se niega.
- **`db:medir` y `db:medir:volumen` fuera del CI** (guarda `FUERA_DE_CI`): un runner de 2 vCPU los vuelve inestables. Entrar pide runner dedicado y 5 corridas con cada tiempo a ≤ 10 % de su mediana.
- **`db:carreras` entra al job `base` tras 5 corridas verdes seguidas** por `workflow_dispatch`, sin reintentos (un rojo vuelve la cuenta a 0). Hasta entonces, sólo el job `carreras` con `carreras: true`.
- **`deno check` fuera del CI.** Las funciones Deno siguen fuera de lint y typecheck: meterlas pide una dependencia nueva.
- **Volver atrás nunca deshace una migración en la nube**: se escribe una migración que la revierta, con el respaldo como último recurso (no guarda Storage). `restaurar.sh` y `resetear.sh` son sólo de la demo.
- **La base remota del proyecto la cambia también la IA** (sesión, orquestador o bucle): push, semilla, reset y reparar el historial, con el ref mirado y respaldo antes de borrar datos. La persona prefiere avance sin esperarla; secretos, configuración, funciones y Vercel siguen siendo suyos, y b_ip (otra app, datos reales) no se toca (`docs/DESPLIEGUE.md` › «La base remota»).
- **Un cliente se instala desde un clon aparte** con `SUPABASE_PROJECT_REF` obligatoria (`--linked` actúa sobre `supabase/.temp/project-ref`); Auth por el panel; el dueño es la primera cuenta por `/registro`, antes de compartir la URL.
- **Los e2e afectados se eligen con evidencia y con tope de 40** (`scripts/e2e-afectados.mjs`). Un texto que se fue y un localizador no
  exacto que el texto nuevo cumple desde su comienzo pesan más que un dirigido de un módulo grande; un texto cuenta entero sólo en las
  pantallas que lo dibujan (las rutas a las que llega su archivo por imports, o toda pantalla si llega al marco o a más de 6 rutas). Se
  ignora un texto que nombran más de 12 specs («Guardar», «Cancelar», «Cerrar») y un localizador que tienen más de 40: el choque de un
  localizador no exacto (strict mode) se cuenta aparte del texto que se nombra porque es una rotura cierta en toda pantalla que lo dibuja.
  Lee también `src/**/*.ts` (los avisos de las acciones), no sólo `.tsx`. No cambia lo que corre el CI (`scripts/e2e-dirigidos.mjs`).

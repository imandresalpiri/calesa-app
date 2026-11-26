# Pendientes

Lo que falta, para elegir la próxima actualización. Cada entrada: `- **[id]** qué falta — contexto mínimo y, si la hay, la salida recomendada.`
Al cerrar una, se borra su línea (el PR lo cuenta). Lo nuevo que aparezca al trabajar se anota aquí en una línea, en su sección.

## Para desplegar (sólo la persona)

- **[—]** Actualizar Next (hoy `16.4.3`): `next build` avisa de una vulnerabilidad conocida (`SecurityFatalError`, que corta el primer build de cada sesión de IA y `scripts/compilar-e2e.sh` repite) — la actualización con la versión verificada el día y el e2e completo; la decide la persona antes de desplegar. Mientras tanto, el reintento de `scripts/compilar-e2e.sh` cae si el primer build pasó de 5 minutos (`docs/LECCIONES.md`): que el reintento no dependa de cuánto tarda el build.
- **[—]** Producción: variables, secretos, el primer `db push` y la lista de `docs/DESPLIEGUE.md` — el ensayo en seco está en `listo`.
- **[9-6]** Las dos corridas de `db:carreras` por `workflow_dispatch` que faltan (cuenta 3 de 5) para pasarlas al job `base` — una sesión no puede disparar un workflow; comandos en `docs/DESPLIEGUE.md` › «Lo que sólo una persona comprueba».
- **[9-11]** El dispatch con un spec que cae a propósito debe dejar en `e2e-fallos/` los cinco archivos de `scripts/ci/volcar-base.sh` — comandos en la misma lista.
- **[9-12]** «¿Guardar contraseña?» de Chrome con el Modo Live (`XCell` abre su entrada como `password`) — pide un Chrome con sesión y gestor; si lo ofrece, se decide de nuevo (`type="text"` deja el valor en el árbol de accesibilidad).
- **[5a-4b]** El e2e completo con los dos proyectos tarda ≈ 95 min de reloj contra el assert de 25 — va en los 8 bloques del CI, sin segunda pila local de Supabase.
- **[—]** Fotos y cámara en un iPhone real: subir desde Safari una foto HEIC (debe verse y quedar WebP en el bucket); el `capture` de `<ZonaDeArchivos>` sólo se prueba como «el botón existe».
- **[—]** Push a un teléfono real: falta poner las claves VAPID en Vercel y en los secretos de `push` (`docs/DESPLIEGUE.md` › «6. VAPID»); comprobar también que el clic de una notificación enfoque la app instalada.
- **[—]** Los contratos de las API que usa `env:check produccion` no se verificaron contra la nube: lo confirma la primera corrida real con credenciales.
- **[9-01b]** Los índices de `actividad` se crean sin `concurrently`: en una base con volumen bloquean sus escrituras — si la tabla nunca se purgó, purgarla antes del `db push` (no figura en `docs/DESPLIEGUE.md`).
- **[—]** Qué IP ve el CRM tras la reescritura del sitio: al publicar el portal, mirar en Vercel la de `/api/portal/ingresar`; si es la del sitio, una cabecera propia firmada con secreto compartido (hoy frena el límite por código: 5 fallos, 15 min).

- **[—]** La cola de integración no está activa: `main` no tiene ruleset con «Require merge queue» (0 corridas `merge_group`) y los PR entran sin probarse combinados — la persona lo crea en Settings › Rules (`docs/FLUJO.md` › «GitHub»); `estado.sh` debería decirlo.

## Decisiones de producto que esperan a la persona

### Cotizaciones

- **[—]** El dato del vehículo de una tabla (4.14-2c3) no se elige en el panel de una guardada: el lector de opciones lee `cotizacion_tabla` con la hoja abierta, que una guardada no tiene — falta uno por cotización (la celda dice «Falta un dato del vehículo.»).
- **[4-72]** Quien ve una cotización pero no su vehículo no puede recalcularla («No se pudo recalcular») — que el recálculo de una guardada no dependa del vehículo, o que la pantalla diga por qué.
- **[—]** Una plantilla de la forma 1 que ya no se convierte (un `{{` en una etiqueta, leyenda o nota, que la forma 1 admite como texto, o una fórmula con más de 120 filas convertidas) pasa a `sin_plantilla` sin aviso: la tarjeta va por omisión — que el editor o publicar la fórmula lo digan.
- **[—]** La hoja de cotizar no llega del todo a la disposición de las capturas de V1: va en una columna a 1280–1440 (el contenedor de las secciones mide
  612–770 px, con el menú y el resumen al costado), el total vive en el resumen y no dentro de la rejilla, y el ⚙ de los años no va junto a sus chips. Es del
  editor de la hoja sobre la vista (la tarjeta del total como pieza).
- **[—]** Los modos de tipo de cambio se editan en «Hoja», no en la planilla de la fórmula.
- **[—]** «Decimales» de los totales que no son una celda (el listado de cotizaciones, «De este vehículo», la cabecera de comparar, la línea del total de
  una revisión y el resumen de una guardada): siguen con 2 — decidir si toman los de la celda del total (el listado está medido al borde).
- **[—]** El % que la B de una fila absorbe (`=pub*4%`) no tiene «Decimales» propios en la planilla: queda en «Automático» — decidir si el panel de la
  fila elige también los de su %.
- **[—]** Editor de la tarjeta: arrastrar el borde de una fila del lienzo para cambiar su alto (hoy, el campo «Alto» del panel).
- **[—]** Una bandera que sólo lee la `prueba` de un `elegir` o un término de `Y`/`O` (`SI(nuevo; 100; 50)`) no pide su interruptor en el diseño al publicar (§5 de `validar_diseno()` y `revisarCobertura()` sólo cuentan la `condicion`): decidir si una condición también lo exige.
- **[—]** En la primera publicación de un origen (las dos esperadas nulas), el borrador puede nacer sobre una v1 que otra persona publicó entre medio — decidir si la esperada nula deja de valer.
- **[—]** «Compartir la cotización» no tiene el asistente de IA de V1 para reescribir el texto («hazlo más corto», «más profesional»…) ni su editor de imagen 9:16 (la historia de WhatsApp o Instagram con la foto y la cotización): hoy se comparte la imagen de la tarjeta o las fotos tal cual — decidir si vuelven y, la IA, con qué proveedor.
- **[—]** Tablas de referencia: reactivar una desactivada (hoy no se deshace y su clave queda tomada), renombrarla (su nombre; la clave no cambia) y hacer propia una compartida (copiarla al origen con sus filas; hoy se crea una propia vacía con otra clave).
- **[—]** Publicar una fórmula no revisa en la base que existan su tabla y sus columnas (BUSCARV lo revisa al compilar, con el catálogo del origen) — decidir si `formula_publicar()` lo exige.
- **[—]** Sin hacer: el filtro «Favoritas» y la insignia en el listado, quién reportó en la lista de reportes, el tiempo real en comentarios y el motivo de lo bloqueado en la fila de un lote de la papelera.

### Leads y web

- **[9-14a]** Marcar final y editar un lead exigen tenerlo en cartera (`puede_actuar_lead` › `en_cartera`): una dueña con «todos» no cierra la venta de un lead de su asesora sin que se lo compartan — recomendado dejarlo.
- **[8-14a]** Un rol con `web.cola.participar` sin `leads.crear` ni `web.cola.gestionar` recibe turnos (campana) pero no los ve en Inicio — recomendado dejarlo (quien atiende la web crea el lead).
- **[—]** Ordenar el listado de leads por último seguimiento o por próximo recordatorio, y mostrar ambos en la tarjeta del kanban (que lee oportunidades, no leads) — el listado ordena sólo por `creado_en` en todos sus caminos; un orden propio pide cursor, ruta e índice (el recordatorio es personal) y su medición.
- **[8-05a]** Vincular a un lead una solicitud web ya contactada — `web_confirmar_contacto` sólo escribe `lead_id` en `asignada` o `vencida`; pide una RPC nueva.

### Logística

- **[—]** «Documentos por aprobar» de Inicio sólo trae los documentos de vehículos (`_bandeja_por_aprobar`): quien sólo aprueba los de repuestos no ve el bloque. Sumar los de los ítems pide ampliar esa RPC y su medición.
- **[—]** Un bloque «Subastas sin resolver» en Inicio — hoy es un grupo de la bandeja del día de `/logistica` y «Subasta: Sin resolver» en el inventario.
- **[A1c]** Avisos sin salida: el bloqueo de eliminar una fase no enlaza «las fases que esperan» ni «las unidades en ella» (`ImpactoDeFase` sólo trae conteos; pide los ids); «Editar grupo» con más unidades de las que se muestran y «súbelo por partes» de documentos de un grupo de más de 100 no dicen el paso siguiente; «No pudimos leer los títulos» del panel de fuera de regla no ofrece «Reintentar».
- **[6-2]** Publicar en la vitrina mueve la versión de la ficha (`vehiculo_vitrina` usa `vehiculos.actualizado_en`) — una columna `vitrina_actualizado_en` que la RPC exija y devuelva.
- **[6-4]** Se puede pedir un requisito de dato cuya regla está apagada (`transporte.*`, `aduana.*`, `pagos.*`) y nadie puede cumplirlo, y «Qué falta» igual ofrece «Pedirlo» a quien no tiene la clave del hueco — que `revisar_flujo()` lo avise con un código propio o que la RPC lo rechace (saberlo en «Qué falta» exige leer las reglas).
- **[—]** «Qué falta» no marca un requisito «ya pedido»: pedirlo dos veces da dos tareas (el id del intento sólo evita el doble clic). Marcarlo pide una lectura nueva.
- **[—]** «Pedirlo» en un ítem de repuesto (hoy, «Pídeselo a quien administra los roles.»): haría falta vincular una tarea a un ítem.
- **[—]** Acciones en la franja «fuera de regla» de «Qué falta» (hoy sólo su enlace al hueco).
- **[6-6]** Prorratear un gasto por el valor del vehículo u otro criterio; hoy se reparte en partes iguales — base e interfaz.
- **[6-7]** Borrar una nota propia con una RPC `security definer` (el `update` da `42501`), que además impida a su autora cambiar el cuerpo de una nota de cambio de fase (hoy lo frena sólo la action).
- **[—]** Vincular un pago a un lead: sin interfaz (el alta manda `p_lead` nulo).
- **[—]** La lista de un origen con sus puertos, navieras y categorías de gasto propios y los compartidos que usa (el tapado con «Tapado por el de
  <origen>», como las tablas en el drawer del origen) y crear uno «Sólo de <origen>»: hoy Logística › Configuración edita sólo los compartidos
  y un propio no tiene pantalla — la base, las actions y los esquemas ya reciben el origen (`origenId`, hoy siempre nulo).
- **[—]** Pasar un catálogo de logística de propio a compartido (o al revés) no se ofrece — decidir qué pasa con el compartido que tapaba y con
  los permisos de cada origen que empezaría a usarlo.
- **[—]** `/logistica/gastos` sin filtro por vehículo ni por proveedor — `gastos_listar` sólo filtra origen, categoría y fechas; pide migración.
- **[—]** Eliminar un embarque o un contenedor vacío: hoy queda al sacarle su última unidad o vaciar su booking (lo frena la FK `restrict`); no se
  ve en `/logistica/embarques` (lista sólo grupos con unidades), pero su clave sigue tomada en el origen y tipearla otra vez lo reusa con sus datos
  — una RPC `embarque_eliminar|contenedor_eliminar` que exija que esté vacío.
- **[—]** `embarque_guardar` y `contenedor_guardar` no tienen tope de unidades: revisan el permiso y bloquean cada una (`_entidad_editable`,
  `_entidad_bloquear_unidades`), y `transporte_asignar` suma de a ≤ 200 sin tope total. Ninguna pantalla los guarda sueltos: con la suya, un
  tope de unidades por embarque (o el de 200 del grupo).
- **[—]** Las pantallas propias de embarques y contenedores (crear uno sin unidades, su tipo y su sello, sumarle o sacarle vehículos en lote) no existen:
  la base ya tiene `embarque_crear|guardar`, `contenedor_crear|guardar` y `transporte_asignar|quitar`, sin action ni interfaz.
- **[—]** El diff de la actividad de un transporte nombra su embarque y su contenedor por id (`embarque_id`, `contenedor_id`), no por booking o número.

### Repuestos

- **[8-13a]** Un ítem no dice «fuera de regla» ni quién lo movió, y «Esperas que destraban vehículos» no cruza los ítems con la fase del vehículo — `logistica_unidad` es sólo de vehículo; pide una RPC `security definer` (o sería N+1).
- **[8-13b]** El transporte propio de un ítem sin vehículo es sólo texto — falta el formulario; `transportes.repuesto_id` y `transporte_guardar(p_repuesto)` ya existen.
- **[—]** El cliente de un proyecto ya creado no se cambia — haría falta una RPC con versión (`PT409`) para `lead_id`: decidir si se puede cambiar y quién.
- **[—]** En la lista de proyectos, uno que sólo tiene lead dice «—» en «Cliente» — `repuestos_proyectos_listar` no trae el lead; sumarlo pide leer
  `leads_vista` por página: decidir si la lista debe nombrarlo.
- **[—]** «Compra registrada» no es un paso del proyecto: la base no tiene una clave de requisito que la ubique, así que Compras sólo tiene su pestaña y
  «Registrar compra» nunca es el siguiente de un ítem — decidir si se crea `repuesto.compra` (requisito de dato evaluado por `_requisito_dato_cumple`) y en qué fase.
- **[—]** La acción de `repuesto.precio` en «Qué falta» lleva al proyecto sin abrir el panel de Cotizaciones — podría ir a `?pestana=cotizaciones`.

### Chat

- **[—]** Agregar o quitar miembros de un grupo del chat: `chat_grupo_miembros` existe en la base, sin pantalla.

## Seguridad y dinero

- **[—]** Un gasto en la moneda base acepta `NaN` como monto: `_gasto_validar` mira `< 0` y `_monto_en_base` no lo ataja sin conversión — el corte de `_pago_validar`; migración.
- **[—]** `pago_registrar_proyecto` no mira la regla `pagos` del flujo de repuestos (el del vehículo sí, con `_dinero_regla_activa`) y la pestaña «Pagos» del proyecto no la lee — decidir si se esconde o se apaga con su motivo, y frenarlo en la base.
- **[—]** Corregir o eliminar un pago sin confirmar de un proyecto cerrado pasa (una compra no: 23514) — decidir si el cierre congela los pagos sin confirmar; confirmar y anular no lo miran a propósito.
- **[—]** Repuestos: la policy de UPDATE de `repuestos_proyectos` pide `repuestos.editar` sin `repuestos.ver` (un `update` sin `where` no pasa por la de leer) y no mira proyecto cerrado ni eliminado — como el trigger `repuestos_item_escritura` de los ítems.
- **[—]** `lead_campo_impacto` lee los valores públicos de todos los leads aunque quien llama tenga `leads.ver` con alcance «propios»: acotando el rango se hallan los extremos de leads que no ve — contar con `_lead_visible_para` sin perder los de la papelera.
- **[—]** Anular o eliminar el último pago de un proyecto no toma sus ítems mientras uno entra a una fase que pide `proyecto.pago_cliente` (`cambiar_fase` toma el ítem `for no key update`) — carrera sin cubrir en `supabase/tests/areas/dinero/`.
- **[—]** `cotizacion_evaluar` con la hoja abierta reconstruye las tarifas en cada recálculo: una que confirma después de abrir la hoja con `cambiado_en` anterior cambia el cálculo sin aviso hasta guardar (crear sí compara la huella) — compararla también al recalcular, midiendo antes `medir-cotizacion-hoja.sql`.
- **[—]** Un pago confirmado con `confirmado_en` nulo (filas anteriores al sellado) no entra al «Margen del mes» ni a «sin venta» — un `check` con relleno, mirando antes los datos de producción.
- **[—]** Gastos y pagos viejos en otra moneda sin `tipo_cambio_id`: al corregirlos la base pide el tipo (`23502`, hint `tipo_cambio`) — revisar antes de cargar datos reales.
- **[—]** `formula_publicar()` no revisa que la tarjeta publicada de esa fórmula siga calzando con la versión nueva: la planilla lo evita al
  eliminar filas y quitar bandas (las rechaza si la tarjeta de trabajo las nombra), pero una RPC a mano no — que publicar valide la plantilla
  publicada contra la versión nueva, como `formula_del_origen_activar`.

## Errores conocidos

- **[4-54]** Si se elige otro vehículo o cliente, o se crea un lead, mientras la hoja guarda, se guarda con el de antes sin tarjeta de éxito y puede quedar una cotización de más — la barra queda fuera de `[data-hoja]` y su `inert`; assert: o dice que se guardó o el panel no deja elegir.
- **[—]** Guardada: enviarla a la papelera, invalidarla o reactivarla descarta lo tipeado sin aviso (la `key` con `actualizadoEn` remonta la hoja); un guardado pendiente sobrevive al envío y, tras «Deshacer», da PT409 contra uno mismo.
- **[5a-39]** Equipo › «Dadas de baja» dice «Por ahora el equipo eres tú…» aunque haya personas en la lista: el aviso cuenta el equipo activo y no mira el filtro (`cabecera-equipo.tsx`).
- **[9-13]** `rbac_eliminar_rol` sobre un rol que figura en `fases_roles` o `fases_transiciones_roles` devuelve el `23503` crudo de la FK `restrict` — mensaje humano o quitar el rol de esas listas; migración.
- **[—]** `declaracion_leer` con un id que no existe da `55000` («record "s" is not assigned yet») en vez de `P0002`, y un enlace viejo muestra el error con «Reintentar» — el `if` lee `s.vehiculos` sin asignar; separar el «no existe».
- **[—]** El `23503` de crear un vehículo en una fase que se borra a la vez (`vehiculo_crear`) no se traduce a PT409.
- **[7-5]** (segunda mitad) La suscripción de la campana pedida sin red pone la barra «Sin conexión. No se pudo abrir esto.» aunque nadie abrió nada — una suscripción de fondo no avisa (`notificaciones/features/campana`).
- **[4-60]** La action que guarda una preferencia de lista no se reintenta si la red se corta a mitad de envío (`listas-por-pagina-pendiente.spec.ts`) — reintentar al volver la red.
- **[4-76]** El aviso de versión no sale si la hoja no tiene secciones (`SinDatosQueVer` corta antes); y en `cotizar-encima.spec.ts`, «sin envío» no tiene centinela y «otra persona» se simula con la dueña.
- **[—]** Un `22023` de `_formula_rechazar` cuyo `hint` es un nodo llamado `valor` se pinta bajo el campo «Valor nuevo» del ⚙.
- **[—]** Al descartar o publicar la fórmula, un error que no es PT409 ni falta de red muestra el mensaje de la base (guardar ya usa texto propio).
- **[—]** Tras pasar a stock, el estado derivado de la cabecera del proyecto de repuestos (pendientes) sólo se actualiza al volver a entrar.
- **[—]** «Actividad reciente» de la ficha del vehículo escribe el cambio de lead con su id («Lead de …: — → dbe6287c-…»): va el nombre del lead,
  o sin el id si quien mira no lo ve.
- **[—]** La tabla de la ayuda con más columnas de las que caben deja las de texto de una letra de ancho al 100 % («Año», «Tipo de vehículo»): las cifras no
  se parten y el texto lleva `wrap-anywhere`, cuyo mínimo es un carácter (`tabla-de-la-ayuda.tsx`, `fila-de-la-ayuda.tsx`) — un ancho mínimo por columna de
  texto; cierre: `sinTextoCortado` en la prueba de la tabla ancha de `cotizar-hoja-ayuda-tabla.spec.ts`.
- **[—]** e2e que caen de vez en cuando en `main` o en el CI de PR ajenos: `agenda:208` (la tecla «n» llega antes de hidratar y abre «Nuevo lead»), `modales-con-salida:194` (Esc antes de que abra el modal), `scripts/orquestador/maquina.test.ts` (`kill ESRCH`), `edicion-de-la-tabla-en-la-ayuda.test.tsx` («+ Añadir fila» no deja el foco en la fila nueva con la máquina cargada), `leads-ficha-derecha` (1 de 3), `leads-ficha-desplazamiento-interno` (depende de la geometría), `chat-menciones:87` (el foco), y sin causa vista `accesibilidad` en `movil`, `leads-alta` y `cotizaciones-papelera-enviar` — se arreglan si caen dos noches seguidas (`.claude/rules/e2e.md`).
  `cotizaciones-listado` E6 y E8 caen en el CI y pasan en local (la tecla N abre `panel=nuevo-lead` en vez de la hoja; «Ver todas» pierde `clase=preventa`):
  esperar la hidratación o el `href` ya filtrado antes de actuar.

## Deuda técnica

### Rendimiento y escala

- **[—]** El listado de cotizaciones de la dueña con 100 filas mide 50.003 B comprimidos con la siembra de volumen, sobre su tope de 49.500 (`e2e/listas-por-pagina-volumen.spec.ts`) — medir qué lo sube (la imagen de la tarjeta en la lista es candidata) y recortar o subir el tope con la regla del 5 %.
- **[—]** Retirar `vehiculo_interesados()` y `lead_telefonos_leer()`: la app no las llama; sus pruebas SQL (`humo.sql`, `numero-global.sql`…) las siguen probando — migración que las quite con sus sondas.
- **[4-79]** `origenes_resumen()` cuenta con `count(*)` exacto vehículos y cotizaciones por origen, contra la regla de escala, y el inicio de Configuración la lee para lo que falta sin usar esos conteos — `limit n + 1` por origen con `conteoCorto()` o quitar el número; para el inicio, una lectura de los pasos sin contar si con volumen pesa.
- **[4-67]** El conteo de exportar (`contarLeadsHasta`) de una cartera recién sembrada de 5.001 elige `Seq Scan on leads` tras `analyze` (≈ 3 s) — cierre: páginas sin seq scan, que no crecen y bajo 50 ms en `db:medir:volumen`.
- **[4-77]** Cada lectura con la policy de `cotizaciones` paga ≈ 160–240 buffers fijos (`mis_permisos()`), sin reproducir — causa sin medir; arreglarlo toca una `security definer` de todas las policies.
- **[4-78]** Las listas del panel del vehículo de la hoja («Últ. cotización», «Cierre subasta» y su búsqueda) leen `from('vehiculos')` y recorren el origen para quien ve «propios» — pasarlas a rutas tipo `vehiculos_inventario()`.
- **[4-51]** El `on delete set null` de `cotizaciones.vehiculo_id` no tiene índice que lo sirva (todos son parciales): purgar un vehículo recorre `cotizaciones` — assert: `seq_scan` = 0 con 250.000.
- **[4-14]** La página profunda del historial de un vehículo muy cotizado ordena sus cotizaciones (crece con las de ese vehículo, no con N) — límite sin assert.
- **[4-65]** La pestaña de una clase de lead que quien mira no tiene recorre su cartera (hasta ≈ 400 ms con 80.000) — salida no hecha: copiar la clase en la cartera.
- **[5a-40]** La baja de 200.000 leads tarda 9 corridas y 15 s porque ningún update de `cartera` es HOT (11 btree) — un índice que sostenga lo ajeno sin nombrar la cartera, sin romper `medir-escala.sql`; la persona aceptó el número actual.
- **[—]** `leerCatalogosDeTransporte` (`/logistica/embarques`, «Editar grupo») lee hasta 200 puertos y 200 navieras de todos los orígenes y descarta
  `hayMas`: con los propios por origen, lo que pasa del tope se ve «—» sin aviso — devolver `hayMas` con `<AvisoDeTope>` o leer por id lo que nombran los grupos.
- **[6-5]** Medir `gastos_listar` y `pagos_listar` con volumen (≈ 50.000 filas, dueña con «todos» y una persona con «propios»): el filtro `en_cartera` por fila puede ir descartando al profundizar.
- **[8-13c]** Índice `(fase_id, fase_desde, id)` en `repuestos_items` si la Cadena de repuestos y los bloques de Inicio llegan a miles — hoy alcanza `repuestos_items_fase_id_idx`.
- **[—]** La planilla de la fórmula tarda ≈ 1 s en abrir con 600 filas y ≈ 2 s con 2.000 (O(filas × nodos), al abrir la pestaña) — una versión por lote de `textoVigente()`/`textoDeNodo()`.
- **[—]** El job de la papelera toma siempre los 50 lotes vencidos más viejos: 50 que no se pueden purgar del todo (pago, portal, comprobante) frenan para siempre a los nuevos; vale para los tres tipos.
- **[—]** `vehiculos_papelera_listar()` y `leads_papelera_listar()` usan el mismo `exists` por lote: sin medir si con poco volumen leen el índice entero.
- **[—]** `limpieza_avisar()` no tiene tope de filas revisadas — si crecen los retenidos, cota inferior o índice parcial.
- **[—]** El bloque «Leads sin seguimiento» de Inicio cuesta lo que pesa la cartera de quien mira; no se midió con volumen.
- **[4-73]** Presupuestos al borde (`docs/ESTADO.md` › «Al borde»: los nodos de la hoja y el JS de `/cotizaciones`, `/cotizaciones/nuevo` y `/cotizaciones/[id]`) — lo nuevo se carga con `diferido()`; con la regla del 5 % se sube el tope.
- **[—]** «Vincular o marcar un vehículo» de la ficha del lead (`?panel=agregar-vehiculo`, `shallow: false`) y cada cambio de un recordatorio (`router.refresh()`) releen todos los bloques de la ficha, todos a la vista; se acota cuando moleste (que cada bloque relea lo suyo).
- **[—]** Las lecturas de cotizaciones de quien ve «todos» sin `cotizaciones.privadas.ver` descartan las privadas ajenas sobre las rutas de siempre: leen de más en proporción a ellas, y la siembra de volumen no tiene privadas — sembrar un 10 % de privadas ajenas y una persona con «todos» sin el permiso en `medir-cotizaciones-listado.sql`, `medir-cotizaciones-buscar.sql`, `medir-cotizaciones-de-este-vehiculo.sql` (también las tarjetas de la ficha del vehículo) y `medir-relacionados.sql`; cierre: sin `Seq Scan`, bloques con 250.000 ≤ 1,2 × los de 50.000 + 20 y ≤ 50 ms.
- **[—]** `_cotizacion_cadena` devuelve `{"oculta": true}` cuando la versión de encima es una privada ajena: delata que existe (`docs/DECISIONES.md` › «Cotizaciones privadas») — si molesta, saltarla en la cadena como si no existiera; cierre: un caso en `supabase/tests/areas/cotizaciones/privadas.sql`.
- **[—]** `medir-cotizaciones-de-este-vehiculo.sql` a veces no lee `cotizaciones_origen_creado_idx` ni `cotizaciones_aprobadas_pkey`: el plan depende de cuándo se tomaron las estadísticas de `cotizaciones_aprobadas` (otra corrida pasa) — un `analyze` de `cotizaciones_aprobadas` tras sembrar, antes de medir.
- **[—]** `medir-cotizacion-hoja.sql` cae en `main` (`db:medir`, fuera del CI): con todo el aspecto la hoja lee 38–39 bloques de `formulas` (su TOAST) y sin él
  32–33 — candidato: en una función el registro `fo` guarda el diseño sin destoastear y cada una de sus diez `fo.diseno` lo vuelve a leer; leerlo
  una vez en una variable. Cierre: la medición pasa.
- **[—]** Tope de 40 ítems por diseño: `subasta_usa` tiene 39 — para crecer, subir `_diseno_maximo_de_items()` y la constante midiendo la hoja, o partir la hoja.

### Archivos y funciones sobre el tope

- **[4-39]** `vehiculos/entities/vitrina.ts` (358), `leads/entities/alta.ts` (331) y `leads/entities/oportunidad.ts` (307) — partir por responsabilidad.
- **[4-43]** `e2e/leads-ficha-edicion.spec.ts` (336) — por tema: edición, borrador, sin red, permisos.
- **[4-46]** `supabase/tests/cotizacion-hoja.sql` (736) y `cotizacion-hoja-dato-del-vehiculo.sql` (340) — los ayudantes `pg_temp.ch_*` a un archivo que `probar-schema.mjs` cargue antes, y que `SOLO` sepa cargarlos.
- **[4-52]** `supabase/tests/medir-cotizacion-guardar.sql` (319) — en terreno/funciones y casos.
- **[4-56]** `e2e/soporte/cotizar-formula.ts` (332) — la fórmula de prueba, los orígenes y su limpieza, lo que se mira en la base.
- **[4-64]** En `supabase/tests/`: `cotizaciones-visibilidad` 1.968, `medir-escala` 1.044, `cotizacion-guardar` 766, `cotizacion-crear` 729, `publicar-diseno` 626, `derivados-leads` 496, `medir-publicar` 424, `medir-cotizaciones-lectura` 348; además `scripts/carreras.mjs` 449 y `eslint.config.mjs` 400.
- **[4-64]** Funciones SQL de más de 80 líneas: `cotizaciones_listado()`, `cotizacion_guardar`, `_cotizacion_hoja`, `cotizacion_encima`, `importacion_procesar_lote`, `lead_campo_guardar`, `origen_campo_guardar`, `_web_doc_nodo`, `_web_ajustes_objeto` — al tocarlas; partir una `security definer` mueve su inventario y carreras.

### Limpieza y código

- **[—]** `src/modules/empresa/features/tipos-cambio/hooks/use-guardar-leyenda.ts` no lo importa nadie: quitarlo.
- **[—]** El grupo de los tipos de documento compartidos se llama `empresa` por dentro (`ClaveDeGrupo`, `VistasDeGrupos.empresa`, `?de=empresa`):
  renombrarlo a `compartidos` muda un parámetro, así que van en el mismo PR sus enlaces y los e2e (`.claude/rules/rutas.md`).
- **[—]** El lienzo de la hoja (la pestaña Hoja del origen) no dibuja la variante en par (`hojaDeLaVistaPrevia()` no trae `par`); la planilla de la fórmula sí la dice («Se cotiza en par» en «Tipo de celda › Variante»).
- **[—]** En la vista previa de las hermanas, «Copiar texto» copia sólo el de la tarjeta de la cotización abierta (no une los dos).
- **[—]** `medir-cotizacion-crear.sql` y `medir-cotizacion-guardar.sql` no tienen un caso en par: crear y guardar en par llaman dos veces a lo que ya miden.
- **[4-45]** `cotizaciones.moneda_mostrar` y `cotizaciones.plantilla_id` no tienen uso real (`moneda_mostrar` sólo viaja por `cotizaciones_listado()`) — migración que la recree sin ellas, con su medición y `db:types`.
- **[—]** `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` están en `esquemaDelServidor` (`src/shared/config/esquemas.ts`) y en `.env.example`, pero sólo los lee la función `push` — dejarlos sólo en `esquemaDeLasFunciones`.
- **[—]** Copias que deberían subir al núcleo o a `shared`: el esquema de la nota de publicar, `FILAS_POR_PEDIDO`, `MARCAS_DE_GESTORES`, `valorTipeado`, `diasParaLaPurga`/`textoDePurga`, las lecturas de tonos, `normalizar` de la XCell y la subida por hash a bucket privado.
- **[—]** Dos claves para «el mismo nombre de catálogo»: `_catalogo_clave()` ↔ `claveDeCatalogo` (`shared/lib/catalogos`: logística y tipos de documento, tabla
  ASCII de tildes) y `_nombre_de_catalogo()` ↔ `claveDeNombre` (`shared/lib/catalogo`: grupos de campos y categorías, `unaccent`) — unificar en una
  sola función y una sola carpeta; cambia qué nombres choca cada índice único, así que va con su migración y sus pruebas.
- **[—]** Dos arrastres con dnd-kit que se parecen: el de las filas del lienzo de la tarjeta (`cotizaciones/features/plantilla/hooks/use-asa-de-fila.ts`) y `shared/ui/campos/arrastre/` — unificarlos en un `shared/ui/orden` (asa, sensores, anuncios en español, coordenadas por contenedor).
- **[—]** `e2e/configuracion-200-capturas.spec.ts` captura un panel por la URL apenas se ve el diálogo, sin esperar lo que trae su `diferido()`: «Datos del origen» y «Columnas de…» salen vacíos en la hoja — esperar un texto del cuerpo antes de `capturar()`.
- **[—]** «Ver comprobante» duplicado en repuestos y logística (`ver-comprobante.ts` y `useComprobante.ver`); `XCell` no tiene `emptyLabel`.
- **[—]** Las guardas de áreas (`areas-de-cotizaciones`, `-flujos`, `-logistica`, `areas-b/areas-de-web`, `areas-c/areas-de-repuestos`) son cinco copias de la misma lógica, y los registros de `<Confirmar>`, `<Drawer>` y RPC paginadas están partidos en `areas-b/`, `areas-c/`, `*-formula.ts` y `*-papelera.ts` — unificar en una guarda parametrizada y un registro por módulo.
- **[—]** Repuestos sube imágenes con `subirPorHash` desde el hook — debería ir a `infra/items/imagenes.client.ts`.
- **[—]** Huérfanos de Storage: `storage_gc_encolar_huerfanos` sólo barre `vehiculos`; quedan los de `repuestos` y `cotizaciones` (subidas cuyo registro falló), imágenes de guías y fotos de testimonios web subidas y nunca guardadas.
- **[—]** El CSV de una importación que el job deja `fallida` tras 24 h sin avance no se borra (ni el objeto de un borrado fallido en el navegador), y un error que se repite reintenta cada 2 min esas 24 h.
- **[—]** La importación total lee «2.125» como 2125: un campo `numero` con 3 decimales y parte entera ≤ 3 dígitos escrito con punto no vuelve igual.
- **[—]** Las ramas `p_repuesto` de las RPC de logística sólo se prueban con filas sembradas por SQL (ninguna pantalla las usa); el e2e de compras no sube un comprobante.
- **[4-95]** El `creado_en` de una revisión es el `now()` de su transacción: «Ir a una fecha» puede dejar del lado equivocado una revisión de esa ventana — `clock_timestamp()` o saltar por `(creado_en, id)`, si alguna vez se ve.
- **[4-74]** `schemas/edicion.ts` acota `notas` con `.max(2000)`, que cuenta unidades UTF-16 mientras la base cuenta caracteres (un emoji cerca del tope da distinto); `cotizar-guardada-guardar.spec.ts` usa `waitForTimeout(600)`.
- **[—]** La muestra de la tarjeta del modal de colores (`como-se-ve-el-color.tsx`) usa la tinta de `_color_tinta_de_la_tarjeta()` y la tarjeta de la cotización, `auto` (#1b2130 o blanco) — alinearla y retirar `_color_tinta_de_la_tarjeta()` si queda sin uso.
- **[7-3]** El `aplicado_en` de `chat.participar` y `chat.moderar` en el catálogo dice «policy …» y no nombra las RPC que los exigen — dato de catálogo en una migración nueva.
- **[5a-42]** `medir-bajas.sql` falla sin regresión cuando el disco tarda en `fsync` (topes de tiempo) — juzgar el trabajo (40 lotes, ≤ 16 M buffers) y los tiempos sólo con la ventana sana (`pg_stat_checkpointer`, `/proc/pressure/io`).
- **[5a-43]** `medir-importacion-volumen.sql` falla si la segunda pasada es más rápida (banda 0,8–1,2) — tope de razón sólo por arriba y el mismo trabajo por fila en las dos pasadas.
- **[—]** `supabase/tests/medir-jobs.sql` corre la limpieza con `now() + 12 h`: entre las 12:00 y las 15:00 de La Paz no mide nada.
- **[—]** `fase_mover` con `orden` repetido previo y ancla compartida deja la movida detrás de la otra fase — desempatar si molesta.
- **[—]** `logistica/entities/dinero/reparto.test.ts` («para cualquier monto…», ~2700 casos) pasa de los 5 s de Vitest con la máquina cargada (`pnpm test` junto a `db:probar`) — menos casos o un `timeout` propio.
- **[—]** `scripts/demo/sembrar.mjs` no siembra proyectos de repuestos, eventos ni tareas de la agenda, ni vehículos fuera de la primera fase del flujo: la demo muestra esas pantallas vacías.
- **[—]** `bloquear-peligrosos.sh` lee el texto del comando: un agregar que no aparece en él (dentro de `bash guion.sh`, armado con `printf`/`base64`, un `.npmrc` o un `package.json` escritos con Write) no se mira — una guarda de CI que exija que toda dependencia nueva de `package.json` esté en `scripts/orquestador/dependencias-aprobadas.txt` y que el PR que suma a la lista lleve «Dependencias nuevas».

### Flujo

- **[—]** El orquestador une sin sesión sólo los choques en `docs/*.md`: sumar las fichas `src/modules/*/CLAUDE.md` y `.claude/rules/*.md`, que son la mayoría de los choques y abren sesión sólo por eso.
- **[—]** Los arreglos van primero al soltarse un carril, pero esperan a que termine una sesión de tarea (2–4 h) — sin salida clara (¿reservar un carril si hay un PR por arreglar?).
- **[—]** Ninguna guarda ve un término repetido en `docs/GLOSARIO.md` (un bloque duplicado entra a `main`): que `mapa.sh --check` falle con un término o un título repetido en un doc.
- **[—]** El «Final del log» del job caído puede llegar vacío al prompt de arreglo (`gh run view --log-failed` no devuelve nada mientras la corrida sigue, y los jobs que no son e2e se mandan antes): pedirlo por la API de jobs (`actions/jobs/<job>/logs`) con las anotaciones del check-run. Y `ES_INFRA` (`scripts/orquestador/sin-sesion.sh`) no reconoce un puerto ocupado del runner («address already in use», «un puerto de la pila estaba ocupado»): abre una sesión que sólo puede relanzar con un commit vacío.
- **[—]** `vitest.config.mts` corta un test a los 5 s en local y a los 15 s en CI: con la máquina cargada (varias sesiones) da timeouts que obligan a repetir `verificar.sh` (sobre todo `reparto.test.ts`) — 15 s también en local, o que `verificar.sh` reintente una vez sólo los archivos caídos.
- **[—]** `verificar.sh` no corre `shellcheck`, que el Nivel 1 del CI sí corre sobre `*.sh`: correrlo, o fallar si falta, cuando la rama toca un `.sh`.
- **[—]** El estado `por_arreglar` no se limpia si el PR se integra antes de que arranque el arreglo: puede lanzarse un arreglo sobre un PR ya integrado.
- **[—]** El hook de esperas (`.claude/hooks/bloquear-esperas.sh`) no ve otras formas de esperar: leer `tasks/<id>.output` antes de su aviso, `ScheduleWakeup` sin nada que esperar, `echo esperando` de relleno y el mismo bucle relanzado con `run_in_background` tras el rechazo. Y rechaza de más: el `for … sleep` dentro del heredoc de un guion python.
- **[—]** Las sesiones editan casi siempre con un heredoc de python o `sed -i` en vez de Edit, así que el lint por archivo del hook `PostToolUse` casi no corre: llevar el ESLint de los archivos tocados al hook `Stop`, o que el prompt pida Edit.
- **[—]** El plan entero (35–61 KB) va dentro del prompt de la tarea y se relee tras cada compactación: dejarlo en `estado/<ID>/plan.md` y que el prompt lo nombre.
- **[—]** Traer el flujo del kit vuelve a pegar las lecciones `(kit)` que el proyecto ya tiene, en otra sección y con «(calesa-app, PR #n)»: el traer del kit omite las que ya están en `docs/LECCIONES.md`.
- **[—]** Probar `AUTOCOMPACT_SESION` en ≈ 200k (hoy 300000) para las sesiones de tarea: la lectura de caché es la mayor parte del costo — comparar el costo por tarea en el cierre siguiente.

### Límites aceptados

- **[—]** Una fase rara (pocas unidades en un origen grande) del filtro «Fase» recorre el origen en orden por `vehiculos_origen_listado_idx`; un índice `(origen_id, fase_id, creado_en desc, id desc)` lo acotaría si llega a notarse.
- **[—]** Una no ganada en una fase de subasta que no es la inicial queda retenida de la limpieza por «fase» o «bloqueo», como hoy.
- **[—]** Un aviso de limpieza no se repite tras quitar «Conservar» o restaurar; con `aviso_dias` > 90 un vencimiento puede avisar dos veces.
- **[—]** Tablero: «Finales» cuenta por cohorte de creación, porque no hay fecha de marca final.
- **[—]** `cambiar_fase` acepta `p_fase_esperada` nulo; despublicar no revoca la URL de una foto; «Ver como» acota la interfaz, no las filas.
- **[—]** `storage-gc`, `apibara` e `importar-csv` (Deno) quedan fuera de lint y typecheck; `lead_dormido_meses` y `demora_dias_default` no tienen interfaz (nada lee `lead_dormido_meses`).
- **[—]** «Los teléfonos extra cuentan como el principal»: restaurar un lead de la papelera mira sólo su principal; un extra suyo que ya es de otro lead entra sin revisarse y aparece en «Números repetidos».
- **[—]** «De este vehículo» en la guardada: si entre el conteo del servidor y la lectura del bloque las otras dejan de verse, queda el título «De este vehículo» sin filas (raro; se arregla al recargar). La cabecera sin `cotizaciones.aprobar` dibuja la insignia del servidor, que no se pone al día si otra persona aprueba otra.

## Pulido de interfaz

- **[—]** «Ayuda» abierta por la URL (`?panel=ayuda`) mientras lee deja el foco en «Elegir mis enlaces» del pie (el cuerpo todavía no tiene nada enfocable): llevarlo al título o a la ✕ (`src/app/(app)/_shell/ayuda/modal-de-ayuda.tsx`).
- **[—]** El comprobante de «Registrar gasto» es el `<input type="file">` nativo: el navegador escribe «Choose File» y «No file chosen» en su idioma, no
  en el de la app — usar el botón «Elegir archivos» de los documentos de la unidad (`logistica/features/dinero/components/campo-de-comprobante.tsx`).
- **[—]** La lista de fases del flujo deja «Subir» y «Bajar» a la vista (`flujos/features/fases/components/acciones-de-fila.tsx`) y las demás filas de Configuración los llevan en el «⋯»: decidir si es la excepción (ordenar con el teclado) o pasarlos al «⋯».
- **[—]** Al recargar una guardada con un cálculo pisado, «Editado a mano: …» entra al resumen después del primer dibujo (su lista va con `diferido()`) y empuja
  «Modo de tipo de cambio» hacia abajo: reservarle el alto o dibujar su primera línea en frío (`features/hoja/components/pisadas/`).
- **[—]** En Logística › Configuración › Navieras la lista tiene dos columnas «Estado» («Activo» y «Activa»): `columnaDeUso="Estado"` en `navieras-de-transporte.tsx` repite el título de la columna de estado; ponerle otro («Uso» o quitarla).
- **[—]** La planilla de la fórmula angosta: a 1280 px con la tarjeta al costado (36 rem), # y A, pegadas, ocupan casi todo lo que queda y C y Ejemplo se ven
  desplazando la grilla — angostar A cuando la planilla es angosta (`@container/formula`, `cuadricula/clases.ts`); en el celular (390 px), el «⋯» de la fila
  activa queda al final, en Ejemplo, y llegar a él esconde la C — fijarlo a la derecha como `#` y A van fijas a la izquierda (`fila-de-la-cuadricula.tsx`).
- **[—]** La barra de fórmula de la planilla en el celular con el texto al 200 %: pegada arriba, sus dos filas (las herramientas se parten en dos renglones),
  el texto y el renglón de la edición ocupan casi toda la pantalla y tapan la cuadrícula — no pegarla con el texto agrandado o plegar las herramientas en
  un «⋯» de la barra cuando no caben (`barra/barra-de-formula.tsx`).
- **[—]** En el editor de la hoja, el «+» de la pieza elegida no se achica con el lienzo: con la vista 1.280 en una ventana de 1.280 (el lienzo a ≈ 0,3)
  tapa la mitad de abajo de una pieza baja, como la tarjeta del total y su cifra. Darle un tamaño que siga la escala o sacarlo fuera de la pieza (`features/diseno/components/editor/`).
- **[—]** `<ListaDeCatalogo>` dentro de un drawer (los «Grupos de campos», las «Categorías» de las preguntas y de las guías) elige la tabla por el ancho de la
  pantalla, no del drawer: en 24 rem la columna «Estado» queda tras el «⋯» pegado («Activ…») y se lee desplazando la tabla — elegir tarjetas por el ancho del
  contenedor (`@container`) o angostar la columna del nombre (`lista-de-catalogo.tsx`).
- **[—]** En el celular al 200 %, el «⋯» del panel de la fase queda más arriba que la ✕ (el «⋯» va en rem y la ✕ en px): alinear sus centros (`drawer.tsx`, `acciones`).
- **[—]** Una XCell `mitad` o `tercio` angosta (la hoja a 1280 px con el resumen al costado, los tercios del modal «Avanzado», un par con un lado bloqueado
  en el celular) baja sus acciones (el % y el ⚙ de un par) a una segunda línea: la celda mide 88 px en vez de 56 y las de la misma fila no se alinean; V1 los
  dejaba en la misma fila. Achicar el rótulo o la caja del valor (`min-w-[6rem]`) antes que bajar las acciones (`clases.ts` de la XCell).
- **[—]** En el celular, el paso a paso de la puesta en marcha (seis filas arriba) baja el contenido de cada paso casi a media pantalla, y en
  «Listo» deja «Cotizar con <origen>» bajo el pliegue: plegarlo a una línea («Paso 3 de 6 · Flujo») que abre la lista (`paso-a-paso.tsx`).
- **[—]** Cabecera del resumen de la cotización en el celular: al 200 % ocupa casi toda la pantalla (el monto se corta contra el borde y las pestañas quedan debajo, sin desplazamiento del drawer, que va con `desplazamiento="propio"`) — que el drawer se desplace cuando la cabecera no deja alto a las pestañas, o plegarla a título y total; y la fila «Creada» parte su valor bajo la etiqueta — dejar la etiqueta con el primer tramo del valor (`resumen-de-cotizacion.tsx`, `cabecera-del-resumen.tsx`).
- **[—]** La imagen de la tarjeta quita el recuadro al cargar (`onLoad`) y la grande del resumen puede verse un instante como un marco gris vacío hasta que el
  navegador la decodifica: pasar a «lista» tras `img.decode()` (`imagen-de-la-tarjeta.tsx`, `useCargaDeLaImagen()`).
- **[—]** En el celular (≈ 390–412 px), «+ Nuevo» de la barra superior tapa la palabra «Buscar» del buscador («Bu» cortado; cede su ancho con `min-w-0` sin cortar el texto), también con un solo tipo de cambio: dibujar sólo la lupa cuando no cabe la palabra.
- **[—]** `<Opciones>` (`src/shared/ui/opciones.tsx`): el radio `sr-only` es absoluto sin un `relative` en su etiqueta, y con las opciones en dos renglones cae bajo otra (el «Cómo empieza» de «Nueva fórmula»): sumar `relative` a la etiqueta.
- **[—]** La burbuja del chat tapa contenido en el celular: el «⋯» de la primera fila de una lista de Configuración a la vista al abrir (390 px, la pestaña «Campos» de un origen), la esquina de «Guardar» de la barra de cambios sin guardar (Configuración › Leads › «Mensaje del portal»), y al 200 % el borde derecho del valor de una tarjeta de ajustes (la dirección de apibara) y la última línea de una página — reservar su lugar al pie del contenido y subirla mientras la barra está a la vista, como los avisos (`data-pie-de-panel`).
- **[—]** El selector de embudo de la vista de embudo no se cierra al elegir otro (`DropdownMenuRadioItem` de Base UI no cierra al hacer clic): en el
  celular el menú queda sobre las pestañas de etapas hasta tocar afuera (`selector-de-embudo.tsx`; `closeOnClick` en el ítem).
- **[—]** En el menú de Configuración (10 rem) el motivo de una sub-sección apagada larga ocupa cinco renglones («Te falta el permiso
  «Gestionar los campos de los leads».»): acortarlo o mostrarlo al enfocar.
- **[—]** «Cotizar» del título de «Cotizaciones de este vehículo» (`src/app/(app)/vehiculos/[id]/bloque-cotizaciones.tsx`) se ve sin borde: `buttonVariants()` sin `cn()` deja ganar el `border-transparent` de la base.
- **[—]** Tras agregar un teléfono extra en el panel de edición de la ficha, el foco va a «Nombre» (la ficha se vuelve a leer y el panel se rearma) y no a «Agregar teléfono».
- **[—]** Al volver de «Nuevo lead» a «Nuevo proyecto» se apilan dos avisos («Lead creado» y «Recuperamos lo que habías escrito y no guardaste.») — el
  arreglo va en el marco del alta (no avisar «Lead creado» cuando vuelve a un formulario con `?elegir=`) o en el borrador (no avisar al reponer tras el alta).
- **[—]** Con «Ver como» la franja del aviso (≈ 2,25 rem) hace desplazar la página de la unidad de logística en escritorio: el alto fijo (`--alto-del-detalle`) no la descuenta.
- **[—]** Redimensionar la ventana cruzando los 1024 px remonta los huecos de la unidad (zonas ⇄ bloques) y se pierde lo escrito y no guardado; la forma se elige por el ancho de la pantalla.
- **[—]** Con sólo no ganadas en un origen, el inventario sin filtros dice el vacío de primera vez (el filtro por defecto las oculta) — que diga que hay no ganadas y ofrezca verlas con «Subasta: No ganadas».
- **[—]** «Nueva oportunidad…» del «⋯» no ofrece vehículo: haría falta una lectura de los vehículos del lead desde `src/app` (una Server Action de `vehiculos` pasada por props) — hoy se agrega con «Editar» en la ficha.
- **[4-20]** Ancho contra altura del aviso de escritorio: a 22 rem, al 200 % tapa texto de la última fila de una lista — decidir (ancho, angosto o que se aparte) y afirmarlo en `e2e/avisos-con-descripcion.spec.ts` (`--ancho-del-aviso`; `avisosAbajo()` cambia con el ancho).
- **[R7]** Blancos táctiles bajo 44 px en componentes de toda pantalla (`Tabs`, `Switch`, `Checkbox`, `Popover` de Roles, «Nuevo lead» del marco, «Saltar al contenido», «Abrir» de las listas, el botón de 32 px): 121 en `BLANCOS_CONOCIDOS` — rediseño; se cierra vaciando la lista.
- **[R7]** R7 sólo es dura en `RUTAS_DE_LAS_FASES_5_A_9` (`e2e/soporte/accesibilidad-conocidos.ts`); fuera quedan 5 blancos (`/`, `/leads` ×2, `/leads/[id]` → `tel:`, las partes de `/configuracion/origenes/[id]/…`) — se cierra ampliándola a toda la app.
- **[—]** La barra del vehículo de la hoja desborda la página al 200 % en el celular cuando dice «Obligatorio»: la insignia es `shrink-0` junto a «Selecciona
  un vehículo» (`vehiculos/…/contenido-de-la-barra.tsx`) — que la insignia baje de línea (`flex-wrap`) y afirmarlo con `sinScrollHorizontal()` en `cotizar-panel-del-vehiculo`.
- **[4-47]** La ayuda de una tabla corta en 1.000 filas sin enlace al editor, y una tabla congelada sin copia viva sale con claves en vez de etiquetas — falta el enlace y congelar `columnas` (espera a la baja de tablas).
- **[—]** `LugarDelAjuste` no recuerda la última celda: el panel del ⚙ no se desliza y el foco se devuelve a mano; tras publicar o descartar el borrador de la fórmula, el foco cae al `body`.
- **[—]** Panel de la unidad: «Qué falta» deja un hueco vacío arriba del primer destino y de «Desde esta fase no hay a dónde mover.».
- **[—]** El resumen del contenedor pone «Mover el grupo» debajo de toda la lista: con 8 unidades hay que desplazar para llegar a «Marcar que llegó».
- **[—]** `/logistica/embarques` › Contenedores dice «Las primeras.» sobre la lista sin decir de qué.
- **[—]** En el celular, la línea del aviso del hueco «Transporte» con « y otros que no puedes ver» ocupa dos líneas y reserva una: la ruta baja al llegar ese aviso (`linea-del-aviso.tsx`).
- **[—]** El margen sin gastos dice «Real USD 0,00» junto a «Sin venta registrada» y parece un costo cargado — «Sin gastos» lo diría sin cifra.
- **[—]** `logistica_bandeja` de Inicio con el alcance «propios» recorre la fase entera (su rama por fila no parte de `_logistica_lo_propio`): pasarla a esa lectura y medirla con volumen.
- **[—]** Con más de 10.001 vehículos propios en un origen, sólo el resumen de la cadena lo avisa («+»): los grupos de la bandeja del día y la lista de una fase de ese alcance no dicen que `_logistica_lo_propio` cortó (`_bandeja_dia_alcance` podría devolver un `cortado`).
- **[—]** `/logistica/gastos` todavía abre el panel de la unidad en un drawer (`?vehiculo=`): llevarlo a `/logistica/vehiculo/[id]` como el resto de logística y borrar `drawer-de-la-unidad.tsx` y `clave-de-unidad.ts`.
- **[—]** Con el texto al 200 % en el celular, el pie fijo de Identidad y Ajustes («Cancelar», «Guardar») ocupa medio panel de la fase: lo de arriba se lee desplazando.
- **[—]** Las 200 compras por proyecto llevan `<AvisoDeTope>` sin camino a lo antiguo — filtro por fecha si aparece.
- **[—]** En un campo privado de cartera, los avisos de rango y de opciones que sacas cuentan sólo los leads de tu cartera y no lo dicen (`resumenDeImpacto` de leads).
- **[—]** En escritorio con el texto al 200 % la barra mide menos de 24 rem y el tipo de cambio no se dibuja; el menú que lo trae es sólo del celular (`md:hidden`): no queda a mano.
- **[—]** El `PT409` del panel de un tipo de cambio en Configuración dice el texto de la base, sin quién ni a cuánto: el popover de la barra ya lo arma con `conflictoDeValor()` y `tipos_cambio_vigentes()`.
- **[—]** El diagrama de un flujo de 7 fases abre a escala 0,6 en 1440 px y la última fase queda cortada a la derecha, con el texto de las cajas chico: encuadrarlo
  al abrir (o un zoom mínimo mayor) y dejar el «+/−/ajustar» para el resto.
- **[—]** Con el texto al 200 % y una foto angosta (celular), la esquina con la vitrina y el «⋯» tapa en parte la flecha derecha del carrusel de la
  ficha (y de la tarjeta grande de la lista): bajar las flechas o achicar la esquina cuando no caben.

## Decisión de la persona

Versiones mayores que `pnpm outdated` lista y la tarea mensual de dependencias no instala (`scripts/orquestador/README.md`).

- @types/node 20.19.43 → 26.6.6 (decisión de la persona)
- @vitejs/plugin-react 5.2.0 → 6.3.0 (decisión de la persona)
- @xyflow/react 12.12.1 → 13.0.1 (decisión de la persona)
- cn 0.4.0 → 0.5.2 (decisión de la persona)
- jsdom 30.1.3 → 31.0.1 (decisión de la persona)
- supabase 2.122.1 → 3.2.0 (decisión de la persona)
- typescript 6.0.3 → 7.0.2 (decisión de la persona)
- vitest 4.1.12 → 5.1.0 (decisión de la persona)
- web-push 3.6.7 → 4.0.0 (decisión de la persona)

## Fuera de alcance

- Multiidioma. Offline real (modo sin conexión y sincronización en segundo plano). Editor de artes (Konva). Directorio de contactos/empresas.
- API de WhatsApp/Meta. Multi-empresa por despliegue.
- La web pública en sí (repo aparte con `sitio-marketing` sobre el esquema `web`).
- «Visto» en los pendientes de la agenda y en los bloques de Inicio.

De esta versión, además: exportar la actividad; cambiar qué permisos
existen o la matriz de Roles; cambiar embudos ya existentes (la plantilla sólo toca los que nacen después); exportar seguimientos,
documentos, fotos o repuestos y formatos que no sean CSV; importar `seguimientos`, `repuestos_items` y cotizaciones, y deshacer una
importación de vehículos; métricas por asesor para quien no tiene `tablero.metricas.ver`; editar la cola desde el tablero; estabilizar
inestables; specs nuevos al 200 % y lectores de pantalla reales.

Si algo de esta lista se vuelve necesario, se discute y se agrega explícitamente; no se cuela dentro de otro trabajo.

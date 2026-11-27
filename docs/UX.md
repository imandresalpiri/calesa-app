# Experiencia de uso — importadora

Reemplaza planillas de Excel por asesor, WhatsApp entre áreas y el prototipo `ip`. Regla: ninguna tarea de oro puede ser más lenta que la
planilla que reemplaza.

## Roles

Los roles son libres (el dueño los crea); la interfaz se arma por **permisos**, no por nombre de rol. Perfiles de referencia y su inicio:

- **Asesor:** leads, cotizaciones, turnos de la web; escritorio y celular. Inicio: recordatorios de hoy, turnos web sin confirmar, leads sin
  seguimiento.
- **Logística:** vehículos por el flujo, documentos, embarques, aduana; celular en puerto o aduana. Inicio: vehículos trabados, documentos
  por aprobar, alertas por demora.
- **Repuestos:** proyectos e ítems, compras, stock. Inicio: ítems por mover, esperas que destraban vehículos.
- **Dueño / admin:** configura, mira métricas, resuelve conflictos. Inicio: tablero operativo.
- **RRHH / equipo:** alta, roles, bloqueo y baja. Inicio: Equipo.

## Tareas de oro

Cada meta la hace cumplir su e2e, en escritorio y celular.

- **1. Registrar lead y anotar un seguimiento** (asesor, ~30/día). Meta: ≤ 25 s desde `N` hasta lead guardado (seguimiento opcional);
  duplicado detectado al terminar de tipear el teléfono. `e2e/leads-alta.spec.ts`. Nunca: crear un lead con teléfono ajeno; perder lo
  tipeado.
- **2. Cotizar un vehículo para un lead** (asesor, ~15/día). Meta: ≤ 90 s con link de subasta o vehículo del inventario; cada celda editable
  con teclado; PDF en 1 clic. `e2e/cotizar-tarea-de-oro.spec.ts` (la hoja), `…-enlace.spec.ts` (enlace de subasta), `…-cliente.spec.ts`
  (cliente elegido o creado con el «+»), `…-recorrido.spec.ts` (del listado al PDF, con dos cuentas). Nunca: guardar con una constante
  vencida sin saberlo; un total que no cuadre con las líneas.
- **3. Mover vehículos de fase con documentos** (logística, ~40/día). Meta: mover 1 en ≤ 15 s; marcar llegada de un contenedor de 8 en
  ≤ 60 s; ver _antes_ de confirmar qué falta en cada uno. `e2e/logistica-tarea-de-oro.spec.ts`: mover 1 desde la cadena (la fase en la gráfica → su lista → la página del vehículo → destino → nota; 4 gestos, 7 teclas y 5 decisiones: KLM 13,9 s) y el contenedor desde `/logistica/embarques`.
  Nunca: mover sin el documento bloqueante; perder un archivo subido; pisar el cambio de otro.
- **4. Atender un turno de la web y dar acceso al portal** (asesor, ~5/día). Meta: «contacté» en 2 toques desde el celular (1 desde
  Inicio, `e2e/web-turno.spec.ts`); otorgar portal desde la ficha en ≤ 30 s con sólo el teclado (`e2e/leads-portal-acceso.spec.ts`). Nunca:
  dejar vencer un turno sin aviso (el vencido queda «Vencido» en Inicio y avisa en `/notificaciones`); un código que no se pueda dictar.

### Flujo 1 — Registrar lead y seguimiento

1. `N` donde la pantalla no tiene un «nuevo» propio, o «Nuevo» en la barra superior (o `Shift+N`) → «Lead» (el modal abre con él enfocado: Intro) → drawer (no
   página), `?panel=nuevo-lead`. **Se abre al instante** y lee orígenes, tipos y layout desde el navegador: esqueleto con la forma del formulario, listo, o error («No se pudo
   cargar el formulario.» con «Reintentar»). **Un solo panel**: se desliza una vez y los estados cambian dentro
   (`e2e/leads-alta-un-drawer.spec.ts`). Foco en **Teléfono principal**.
2. Al completar el teléfono (debounce 400 ms) se consulta `verificar_telefono`. Es mío: «Ya existe: Ana Quispe (Tu n.º 12), y es tuyo». Es
   de otro: «Lo tiene Diego Vargas», nada más. En limbo: «Sin dueño» y «Tomar lead» (se adopta al guardar, queda constancia). Existente o
   ajeno no deja seguir. Debajo, cómo quedará y de qué país («Se guardará como +54 91155550000 · Argentina»), sin pedir nada al servidor;
   «País» (en «Más datos») se llena solo mientras esté vacío; lo escrito no se pisa.
3. Nombre, origen (el último usado, por persona), tipo (el primero activo de la clase prospecto) y los **requeridos** del layout, en su
   orden; el resto a la vista en la sección «Más datos», con su valor por defecto. Volver requerido un campo suma un paso: Configuración lo avisa (desde el
   cuarto, la meta cuesta).
4. `Ctrl/Cmd+Enter` valida y abre «Primer seguimiento (opcional)» en el mismo drawer, sin guardar; `Ctrl/Cmd+S` o «Guardar lead» guardan
   desde cualquier paso; `Esc` vuelve a los datos. Mismos campos que el redactor de la ficha; se escribe seguimiento sólo si hay algo
   escrito.
5. El pie dice lo que pasará, sin diálogo («Se creará sin primer seguimiento…» / «Se guardará con el primer seguimiento que escribiste.»).
   Guardar crea lead, seguimiento y próximo contacto en una transacción → toast «Lead #124 creado»; el drawer queda listo para el siguiente,
   foco en el teléfono. «Abrir ficha» → `/leads/[id]`. Abierto con el «+» del panel del cliente de la hoja de cotizar, guardar cierra el
   drawer y la hoja elige al lead creado (foco a la barra «Cliente»; el aviso va sin «Abrir ficha»: salir dejaría la cotización a medias).

Estados propios: teléfono en verificación (spinner, resto editable); sin permiso (ni botón, ni atajo, ni URL); conexión caída al guardar
(conserva todo y guarda solo al volver; el intento lleva su id, reintentar no duplica); cerrar o recargar con datos (borrador con
«Descartar»); dato inválido (motivo junto al campo); ningún origen activo (campo deshabilitado con motivo).

### Flujo 2 — Cotizar

La hoja es **configurable por origen** (`docs/COTIZADOR.md` › «El diseño de la hoja»): la semilla trae un diseño igual al cotizador actual
(`docs/referencias/cotizador-actual.md`) y otro al Excel (`docs/referencias/excel-de-cotizacion.md`).

1. **Entrada:** desde la ficha del lead, el «⋯» de un vehículo en el inventario («Cotizar vehículo») o el listado. Arriba, pestañas de orígenes (nombres de la base; «Oficina»
   es un origen) y los **modos** de tipo de cambio del diseño (Aduana, Paralelo, Unificado…; se eligen con dos o más; una cotización nueva abre
   con el **modo por defecto** del diseño, o el primero, y con «Ver total» por defecto; el encabezado dibuja los **modos visibles** más el
   elegido, que se ve aunque esté oculto; con uno solo visible no se elige ni se nombra). `Ctrl/Cmd+K → «Nueva cotización»` abre la hoja.
   - **La cabecera compacta:** los modos en un segmentado chico, «Ver total en moneda local» en un interruptor chico al lado (qué hace es su ayuda
     oculta: lector y `title`) y el ⚙ van en la misma fila que las barras bajas del vehículo y del cliente (glosario: «Ranura de la cabecera»): a 1.440 px,
     una sola línea; en el celular, las dos barras arriba y la cabecera debajo, con blancos de 44 px. Antes de hidratar la fila muestra la misma
     cabecera quieta: nada salta al llegar la de verdad.
   - **El ⚙ de la cabecera** (icono de reguladores junto a los modos, 44 px; sólo a quien configura el origen y con al menos un modo): abre
     el panel «Configuración por defecto de <Origen>» (`?ajuste=cabecera`) con el aviso «Con esto arrancan las cotizaciones nuevas de
     <Origen>. El selector del encabezado sigue cambiando sólo la cotización abierta.», «Tipo de cambio por defecto» (radios), «Mostrar el
     total en <moneda> por defecto» (si se ofrece y hay moneda), «Opciones visibles en el encabezado» (con dos modos o más; el modo por
     defecto, marcado y apagado con «El modo por defecto debe quedar visible.»), «Aplicar también a esta cotización» (marcada; su ayuda «Si lo
     desmarcas, esta cotización se queda en <modo actual>.»; apagada con «Esta cotización usa la versión N, que no tiene ese modo.» o «Sólo
     ves esta cotización: no cambia.») y el pie «Cancelar» · «Guardar por defecto». Cargando: esqueleto tras 300 ms; lectura que falla:
     «No pudimos leer la configuración por defecto.» con «Reintentar»; conflicto: el mensaje de la base con «Volver a leer» (lo elegido
     queda); sin red: «No hay conexión.» con «Reintentar»; los mismos valores: «La cabecera ya tiene esos valores.». No muestra cifras.
2. **Pasos:** **la hoja** (preventa o final), **vehículo**, **cliente**, **vista previa**; no hay paso «Oficina». El vehículo y el cliente se eligen en
   sus barras (dicen «elegido» u «obligatorio que falta»). Arriba de la hoja, la fila de **pasos de la hoja** «Privada · Vista previa» (partes
   iguales; 44 px en el celular): «Privada» es el interruptor de la cotización privada, sólo en la hoja nueva y a quien puede marcarla (sin él,
   «Vista previa» toma la fila); «Vista previa» abre la tarjeta. Una guardada lleva sólo «Vista previa»; sin ninguno, la fila no se dibuja. Van
   fuera del orden de Tab: con el teclado, «Vista previa» es el último botón de la hoja nueva (después de «Guardar»; se ve al enfocarlo) y en una
   guardada está en el «⋯».
   - **Vehículo:** arriba del panel, el campo **«Título de la cotización»** (hasta 120 caracteres; el contador «N/120» aparece desde 100):
     automático, muestra el título del vehículo elegido con la ayuda «Automático: toma el título del vehículo.»; escribir lo vuelve manual
     (cambiar de vehículo lo respeta) y vaciarlo lo devuelve a automático (con el foco puesto queda vacío, con el del vehículo de ejemplo). La
     barra del vehículo muestra el título grande y debajo el vehículo (su título si no es el mismo, y su referencia); sin vehículo, el título
     solo con «Selecciona un vehículo». Con vehículo el foco sigue yendo al buscador. Sin `vehiculos.ver` del origen, la barra muestra el título
     y «No puedes ver los vehículos de este origen.» y el panel abre sólo con el campo. Debajo del campo, un solo campo busca por nombre, VIN o
     lote (desde 3 letras o números) y trae un enlace, un VIN o un lote de la subasta
     (`apibara` llena ficha y fotos); «+» carga a mano. **Ambas abren el alta del inventario dentro del panel y «Crear y elegir» crea el
     vehículo y lo elige**, sin guardar la cotización; pestañas «Últ. cotización» y «Cierre subasta»; el elegido muestra su historial
     («Historial de cotizaciones» abre su modal, `?ver=historial`, que se lee al abrirse, con «Ver más»); la barra dice «Cotizado (n)». En «Elegido», el tipo de vehículo se elige entre las filas
     de la tabla, con el del vehículo marcado; un toque lo guarda en el vehículo, cierra el panel y la hoja recalcula (quien no puede editar
     el vehículo lo ve sin elegir; la celda sin valor dice que se elige en «Vehículo»).
     **Ver la ficha sin perder la hoja:** cada tarjeta de vehículo (en las dos pestañas) y el «Elegido» llevan, al medio a la derecha, un enlace con el glifo ↗ de abrir afuera («Ver <título> en Vehículos»,
     44 px en el celular) a `/vehiculos/<id>` en otra pestaña; no elige ni cierra el panel, y tocar el resto de la tarjeta elige como siempre.
     **Subasta cerrada:** al elegir (o abrir con) un vehículo de un origen de subasta que sigue en el tramo de subasta con la subasta ya pasada
     («Sin resolver», «No ganada», o «En subasta» con el cierre vencido que la base aún no actualizó), un aviso bajo la barra del vehículo dice
     «La subasta de este vehículo cerró el <fecha con zona>. Situación: <situación>.» (sin fecha, «…ya cerró.») con «Refrescar la subasta»
     (con apibara encendida y permiso de editar el vehículo; pide un toque, «Consultar a apibara gasta cuota. ¿Refrescar la subasta ahora?»,
     «Sí, refrescar» / «No, volver»; si vuelve viva, el aviso se va; si sigue cerrada, «Consultada: la subasta sigue cerrada.»; fallo del
     momento: el motivo con «Reintentar»; clave o cuota: el motivo con «Ir a Integraciones» para quien configura, sin «Reintentar»), «La
     ganamos» y «No la ganamos» (las de la ficha; sin permiso de mover, «Para resolverla hace falta poder mover de fase en «<origen>»:
     pídeselo a quien administra los roles.»), «Elegir otro vehículo» (abre el panel en «Cierre subasta») y «Cotizar igual» (lo cierra para
     esta hoja). No bloquea guardar. Un vehículo en su fase (ya se ganó) no avisa. En el panel, la fila de una subasta cerrada dice «Subasta
     cerrada · <situación>» y «Cerró <fecha>».
   - **Cliente:** búsqueda desde 3 letras o `#n`; sin buscar, «míos» por `reciente_en` (el último seguimiento o el alta) en las pestañas
     «Todos», «Prospecto» y «Cliente» (abre en «Todos»); busca entre los leads que quien cotiza ve, como el listado, y el tipo de cada lead
     va como texto; el elegido tiene «Quitar»; «+» abre «Nuevo lead» del shell (borrador y verificación del teléfono) y al guardar la hoja
     elige al creado, conservando lo tipeado. Los dos paneles van por cursor (Anterior y Siguiente), nunca «Página N de M».
   - **Lead y vehículo son obligatorios salvo con las claves del rol en ese origen** («Guardar sin lead» y «Guardar sin vehículo», en «Roles
     y permisos» por origen; una final los exige siempre). Cliente preseleccionado desde su ficha: «Cotizar lead» (en su «⋯») o «Cotizar» del bloque «Cotizaciones» abren
     la hoja con ese lead en el primer origen donde se cotiza. Lo que falta: «Guardar» apagado, el motivo junto al botón («Para guardar, elige el
     cliente en «Cliente».» o «…el vehículo en «Vehículo».», el cliente primero), «Elegir el cliente» o «Elegir el vehículo» (abre `?panel=cliente`
     o `?panel=vehiculo`; sin `leads.ver` o sin `vehiculos.ver` del origen, en su lugar «Para elegir el …, pídeselo a quien administra los
     roles.») y la insignia «Obligatorio» en su barra. Cambiar de origen recalcula la regla; «Ver como» aplica la del rol mirado. Si la regla cambió
     con la hoja abierta, el rechazo dice «Tu rol ahora pide el cliente (o el vehículo) para guardar en este origen.» con el mismo «Elegir…».
   - **Sin vehículo, el título es obligatorio** (para cualquier rol, después del cliente y del vehículo): «Guardar» apagado con «Escribe el
     título de la cotización.» y «Escribir el título», que abre `?panel=vehiculo` con el foco en el campo. Si la base lo rechaza igual (otra
     pestaña lo vació), el aviso dice lo mismo con el mismo botón y el campo lo repite debajo. Sólo espacios es vacío.
     **Con una variante en par** (glosario: «Variante en par»): sin chips de esa variante; arriba de las secciones, «Dos versiones: <etiqueta 1> y
     <etiqueta 2>.»; cada celda o subtotal que cambia según la opción va en dos celdas del mismo ancho, lado a lado («Transporte · 20 pies» | «Transporte · 40
     pies»; en el celular, una debajo de la otra), y lo común una vez (vale para las dos; los atajos, los interruptores, el modo y «Ver total Bs», también). Arriba
     de «Avanzado», los dos totales («Total · 20 pies», con `<Monto>`), cada uno con sus avisos y su «Reintentar»; «Guardar» crea las dos **cotizaciones
     hermanas** y lo guardado dice «Se guardaron las dos: n.º N (20 pies) y n.º M (40 pies).» con «Abrir la de 20 pies» y «Abrir la de 40 pies». El título se
     escribe sin la opción (su tope deja lugar a « · <etiqueta>»). La vista previa muestra las dos tarjetas, una bajo la otra.
3. **La hoja:** secciones y celdas en su lugar de la rejilla, con sus huecos (glosario: «Posición (en la rejilla)»); el DOM, el `Tab` y la vista que
   apila (el celular, el texto al 200 %) van en **orden de lectura** (fila y luego columna); cada monto en una **XCell** (`Tab` avanza, tipear abre edición, `Esc` cancela) con el color
   de su grupo en borde y fondo, ayuda y ⚙ si el permiso lo da, **como un campo de alto fijo** (56 px como mínimo, como la de V1): tocar
   cualquier parte la edita y el rótulo flota; el aviso, el error y «Calculado» van dentro, en la línea de abajo del rótulo (cortados con «…»,
   enteros en un globo al enfocarla), así nada de la hoja salta. Rótulo grande (se corta con «…» y el completo va en `title`) · monto grande y
   en negrita en la monoespaciada (nunca se corta: en una celda angosta se apila) · el % chico y gris de un par (si el secundario es el monto,
   el % va grande y primero) · acciones en el orden candado · ⚙ · ? · ↺; una celda apagada (otra variante, condición apagada, sin el nivel) se
   ve como un campo deshabilitado, gris con su monto legible, y tocarla muestra su motivo. Un lado bloqueado lleva **candado** en la fila de acciones: su motivo se ve en un
   globo al pasar el puntero, al tocarlo o al llegar con →, y es la descripción del valor. Los títulos de sección van chicos y en mayúsculas;
   las franjas de subtotal, con el valor en la monoespaciada. «Avanzado» es un botón a lo ancho con los reguladores (lo que esconde es su
   descripción; «Hay datos por revisar.» va escrito) y abre un modal grande con sus secciones sin marco. Arriba del modal «Avanzado», «Tocar un valor lo cambia sólo en esta
   cotización.» y, a quien tiene el ⚙, «El ⚙ cambia el valor por defecto de las cotizaciones nuevas.». La ayuda de una celda va en bloques
   (un enlace es una tarjeta bajo «Consulta estas fuentes» que abre en otra pestaña). Lo **sugerido** lleva un punto; sobrescrito queda **modificado** (anillo y ↺). Atajos (chips
   de año) y **variante** (Moto, Auto Gasolina…) en píldoras, la elegida rellena del primario; **interruptores** (habilitar fila, mostrar
   garantía) sin caja, con el switch y su rótulo a la derecha (el motivo de uno apagado va escrito debajo). **Una celda que quien mira no puede
   ver no se dibuja ni llega**; una que no puede editar va con candado y su motivo. **Recalcula en la base** 150 ms después de la última
   tecla. En el celular y al 200 %, una columna en el mismo orden.
   - **El ⚙** (`?ajuste=celda&nodo=`) abre «Valor por defecto de <celda>»: el valor por defecto de cada constante, que afecta a las
     cotizaciones nuevas del origen (publica la versión siguiente de la fórmula con lo que el panel leyó) y, si la celda se edita en esta
     hoja, «Aplicar también a esta cotización». La hoja sigue en su versión. Si otra persona publicó antes, el mensaje de la base y «Volver
     a leer», sin perder lo tipeado. Cerrar con algo tipeado pregunta.
   - **Una celda de tipo de cambio** abre «Tipo de cambio de <celda>»: en la hoja nueva, el valor de hoy (por `<Monto>`), que cambiarlo
     afecta a toda la empresa (las guardadas conservan el suyo) y «Valor nuevo» (con Modo Live, como una celda); al cambiarlo la hoja se
     reabre con el valor nuevo y lo tipeado vuelve. Sin fila o desactivado, dice dónde se cambia; en una guardada, que se cambia en
     Configuración › Empresa › Monedas y que la cotización conserva el suyo.
   - **La ayuda** («Ayuda de X», `?ayuda=bloques&nodo=`) abre un panel con sus bloques en orden: el primer título va de nombre del panel (sin
     él, «Ayuda de <rótulo>») y no se repite; un texto con sus saltos de línea y su **negrita**; los enlaces; y cada tabla (la de la hoja abierta,
     sólo las columnas que el bloque nombra, en su orden; cargando, sin filas, tope de 1.000 filas, fallo con «Reintentar» o «Recargar»). Con Modo
     Live las cifras de dinero se tapan. **Llenar una celda:** en una columna que llena una celda, cada cifra es un botón («Usar 14,94 % en IVA %»)
     si esa celda se dibuja y se edita; tocarlo la escribe (como tipearla, con «Editado a mano» si pisa un cálculo), cierra la ayuda, deja el foco en
     la celda y avisa «IVA % = 14,94 %» con «Deshacer» (con Live y una celda de dinero, sin la cifra). **«Tu vehículo»:** con un vehículo elegido,
     la fila que casa con él va marcada y dice «Tu vehículo» delante de su primer valor. Una tabla que ya no está no se dibuja.
   - **Editar la tabla desde la ayuda** (sólo en la hoja nueva, a quien configura el origen, sin Modo Live): ✎ «Editar la fila N», 🗑 «Quitar la fila
     N» (tachada, con «Volver la fila N») y «+ Añadir fila»; se edita una fila a la vez, en sus campos («Factor, fila 2», con «Listo» o Enter y
     «Cancelar»), y no se dibujan los botones de valor ni «Tu vehículo» (vuelven al cerrar una fila sin nada editado). El primer toque lee la tabla entera («Abriendo…»); si cambió desde que se abrió la hoja, sólo se abre con «La tabla cambió
     desde que abriste la hoja: estás editando la de hoy.»; más de 2.000 filas o una que no se lee, «Esta tabla se edita en la configuración.». Al pie,
     «Cambios sin guardar.» (o «Corrige la celda marcada para guardar.») con «Descartar» y «Guardar» («Guardando…»), que publica la tabla con la nota «Desde la ayuda de «<rótulo>».»: «Tabla
     publicada (versión N).», y la hoja vuelve con la versión nueva de la fórmula y lo tipeado («Poniendo la hoja al día con la tabla nueva…»; a los
     10 s, «Recargar»). Otra persona publicó entre medio: su nombre y cuándo, con «Recargar», y lo editado sigue; una celda que la base rechaza, en su
     campo. Cerrar la ayuda con cambios pregunta. En una guardada o con Live, a quien configura sólo «Editar en la configuración» (el drawer de tablas
     con esa tabla).
4. **El total y «Guardar», sin resumen al costado:** la hoja va a todo el ancho. El total va en la **tarjeta del total** (de superficie invertida,
   con la etiqueta chica en mayúsculas y el monto grande): donde el diseño la ubica, a todo el ancho de su sección, o sin la pieza, sola arriba de
   «Avanzado» (en par, los dos totales). Debajo y fuera de ella, en una línea que guarda su alto, sus avisos (desactualizado, por qué falta,
   «Reintentar»), el total con que se guardó, lo pisado, lo que suma aparte y el total en moneda local si se pidió con «Ver total en moneda local»
   (apagado al nacer y sólo si la versión da su moneda). **«Guardar»** va a todo el ancho debajo de «Avanzado» (o al final, sin él), con su motivo,
   lo que falta elegir y, en una región viva, lo que dijo el último guardado; `Ctrl/Cmd+S` guarda (preventa). En una guardada «Guardar» va en la
   cabecera y «Vista previa» en su «⋯». El Modo Live es sólo el interruptor de la barra de arriba. «Vista previa»
   abre la tarjeta de la cotización (la cuadrícula tipo Excel de la plantilla, escalada como una imagen al ancho del modal, que en escritorio es
   grande (hasta 56 rem): nunca agranda ni desplaza la página de costado; en el celular, el modal a pantalla completa), con «Copiar texto» (apagado sin total o desactualizado) y, en una
   guardada, «Descargar PDF» (sin salir de la página; un fallo con «Reintentar»). Los avisos de trabajo van fuera de la tarjeta (total
   desactualizado, sin plantilla, lo de hoy no es lo guardado, cambios sin guardar, «Esta cotización venció el …»). La tarjeta de lo guardado
   también ofrece «Descargar PDF». En una guardada la tarjeta va con sus retoques y el pie suma «Retocar» (ver «Cotización: retocar la tarjeta»).

Estados propios:

- **Fórmula del origen sin publicar:** pantalla bloqueada «Falta publicar la fórmula de <origen>», con enlace a configuración si hay
  permiso. **Link de subasta inválido o sin datos:** se sigue a mano.
- **Desactualizada:** al guardar una nueva, la fórmula o un tipo de cambio cambió desde que se abrió; bajo «Guardar», «Usar la versión
  nueva» o «Guardar con la versión N». Editar una vieja usa SU versión. **Vencida:** pasó la vigencia de la empresa; se dice en el listado
  y en los avisos de la vista previa (la tarjeta y el PDF, que recibe el cliente, no lo llevan), y se recotiza encima.
- **Un cálculo pisado** (`docs/COTIZADOR.md` › «Pisar un cálculo»): toda celda calculada que se ve se escribe encima si el nivel lo deja
  (el total no). La celda lleva el lápiz «Editado a mano» (no ensancha la celda), «Calculado: $480» debajo (con `<Monto>`, a la vista
  también en el celular y para el lector) y ↺ «Volver al calculado». La primera pisada de la hoja muestra, sobre las secciones, «Pisaste
  un cálculo: queda fijo aunque cambien los datos. ↺ lo devuelve.»: en línea, sin bloquear ni robar el foco, anunciado una vez; ✕
  «Cerrar el aviso» (44 px en el celular) lo cierra y el foco va a la primera celda; no vuelve en esa hoja. Bajo el total, la lista de
  lo pisado («Editado a mano: Transferencia a USA $500, calculado $480»); la tarjeta, el PDF y la imagen no lo marcan.
- **Guardar:** la hoja pasa a la tarjeta «Cotización n.º N guardada» con total y «Cotizar otra». Sin lead, apagado («Para guardar, elige el
  cliente en «Cliente».»); con el total nulo o recalculando, también. El borrador vuelve al recargar.
- **El recálculo falla o no hay red:** conserva lo tipeado, «No se pudo recalcular» con «Reintentar», no deja guardar con un total viejo; si
  la fórmula cambió, «Recargar». El mensaje de la base nunca se muestra (puede nombrar lo que quien mira no ve). Una celda apagada por una
  bandera que el nivel esconde dice «Está apagada en esta hoja.» sin nombrarla; «Sin total» dice «Revisa las celdas con aviso.» o «Falta un
  dato que esta hoja no muestra.».
- **Una guardada** (`/cotizaciones/[id]`):
  - «Enviar a la papelera» no pregunta, aunque haya cambios sin guardar (lo guardado vuelve con «Deshacer»; lo tipeado, no). «Guardar» y
    `Ctrl/Cmd+S` apagados sin cambios, salvo con un guardado pendiente o con «Lo de hoy»; guardar no cambia la URL. Si otra persona la
    cambió, bajo «Guardar» se dice quién y cuándo (el único texto de la base que se muestra), que lo escrito no vuelve, y «Recargar» monta la hoja
    con la lectura nueva.
  - **Sólo lectura** (puede verla y no guardarla): sin «Guardar», modos y «Ver total Bs» apagados, con su aviso.
  - **Lo de hoy no es lo guardado** (cambió una tabla de referencia o un dato del vehículo): se recalcula con lo de hoy, el aviso lo dice,
    «Total guardado» muestra el de antes con `<Monto>` (también si el recálculo falla o no ve el vehículo) y «Guardar» la deja con lo de
    hoy. Con otro vehículo elegido el aviso no se dice (sólo «Total guardado» si el total es otro).
  - **Otro vehículo** (preventa): «Recargar» suelta lo elegido (nunca vuelve sobre otra versión); un vehículo que se perdió entre elegir y guardar
    dice «No se puede usar ese vehículo: ya no existe, está en la papelera o ya no tienes acceso.» con «Elegir otro vehículo»; si pasó a final,
    «Esta cotización cambió mientras la tenías abierta: recárgala.». Sin red, lo elegido queda en la URL y el guardado sale al volver.
  - **Revisiones** (`?panel=revisiones`, sólo lectura; recargar lo abre, «atrás» lo cierra): por revisión, autor y fecha relativa, qué
    cambió (tres cosas y «y N más»; «Sin cambios que puedas ver.» si sólo cambió lo que el nivel esconde) y «Total: <antes> → <después>»;
    de a 20 hasta 500, con «Ir a una fecha» (no va a la URL) y «Volver a las más recientes». Esqueleto a los 300 ms, vacío, error.
  - **La cadena** bajo el título: «Versión V de la n.º N» (enlace a la anterior) y, si la hay, la versión nueva (enlace) o «Hay una versión
    nueva que no puedes ver.».
  - **Aviso de versión:** si usa otra versión de la fórmula que la de hoy o venció, lo dice a todos y, a quien puede, ofrece «Cotizar
    encima», que crea la versión nueva en el acto y la abre (apagado con cambios sin guardar: la versión nueva lleva lo guardado); un
    rechazo dice por qué con «Abrir la versión nueva», «Reintentar» o «Recargar». Una que no existe, está en la papelera o no se ve: «Esta
    cotización ya no está disponible: no existe o ya no tienes acceso.».
  - **Marcar final:** sin vehículo o sin cliente, apagado con su motivo al lado (a quien no puede guardarla, a quién pedírselo); la URL a
    mano avisa y se limpia. El `<Confirmar>` dice que el vehículo queda vinculado a su lead, el lead pasa a cliente, las demás cotizaciones
    del vehículo van a tu papelera y se marca lo guardado. Al entrar, la cabecera dice «Final». Rechazo: el diálogo sigue abierto con su
    motivo (otra persona la cambió, otra ya es la final, no se sabe si entró) y «Recargar». Se puede marcar una vencida o de otra versión:
    el aviso de versión basta.
- **Puede cotizar pero no ve la hoja** (`cotizaciones.crear` sin `cotizaciones.ver`): «No puedes ver esta hoja». **Par con monto
  calculado:** bloqueado («Se calcula con los demás datos.»); su porcentaje editable llega con el candado por lado.

### Flujo 3 — Mover de fase

1. `/logistica` abre la **bandeja del día** (lo que le toca hoy a quien mira, por grupos con su acción) y al lado la **cadena** como gráfica: una fase por punto con cuántos vehículos tiene y cuántos están demorados o trabados. Clic en una fase → su lista (tabla paginada, filtros en URL).
2. Clic en un vehículo (de la bandeja, de la lista o de «dónde está») → su página `/logistica/vehiculo/<id>` con «Qué falta para pasar a …» abierto (documentos aprobados/faltantes, datos, esperas de repuestos, en vivo). Cada falta trae lo que la destraba: hacerlo ahí («Subir», «Revisar», «Completar», «Registrar»), ir a donde se hace o «Pedirlo» a quien puede.
3. Subir documento desde el panel (arrastrar o cámara); se sube al confirmar, nunca antes; queda «subido» hasta que alguien con permiso lo
   aprueba.
4. «Mover a <fase>» pide nota interna (obligatoria si la fase lo exige) → RPC con `fase_esperada`; conflicto: «Rosa Mamani la movió a
   «<fase>» hace 1 min.», «No se movió nada.» y «Recargar», que conserva la nota escrita (nunca pisa).
5. Lote: en la lista de una fase, elegir unidades (su casilla o «Elegir los de esta página»), o desde el resumen de un contenedor en
   `/logistica/embarques`, «Marcar que llegó» (abre el lote con ese contenedor) → destino → vista previa por unidad («Lista» / «Falta:
   <documento> aprobado.») → «Mover los N que pueden» → resultado parcial explícito («Se movieron 7 de 8.») con «Reintentar» de los que no.

### Flujo 4 — Turno de la web

1. Notificación push/campana «Turno web #WEB-4F2K · Toyota RAV4» → tarjeta con **Contacté** y **Vincular a lead** (buscador; «crear lead»
   adentro). Cuenta regresiva visible; al vencer, aviso y reasignación.
2. Ficha del lead, bloque «Acceso al portal» de la columna de la izquierda, bajo «Quién lo tiene» (`?seccion=portal` lleva ahí; lead en la cartera y
   `leads.portal.gestionar`): «Dar acceso» → diálogo
   (`?panel=otorgar-portal`) con el campo de la clave (8 a 64) y **un solo botón principal** que dice lo que hará («Generar clave y dar
   acceso» con el campo vacío; «Dar acceso con esta clave» con algo escrito) → código `MII-4F2K9` en grande y dicho símbolo por símbolo, la
   clave **una sola vez** y el texto para WhatsApp. Mientras otorga el diálogo no se cierra; al cerrarse la clave se olvida.
3. Con acceso, la sección muestra estado, código, quién lo otorgó y último ingreso, con un botón principal («Compartir acceso» o
   «Desbloquear») y, en su «⋯», «Cambiar la clave» (el mismo diálogo: avisa que el código anterior y la sesión abierta dejan de valer) y
   «Quitar el acceso» (confirma nombrando el código, `?panel=revocar-portal`). Estados en «Leads: ficha (estados propios)».

## Pantallas

Navegación de primer nivel (hasta 7, filtrada por permisos, en `src/app/(app)/_shell/navegacion.ts`): Inicio · Leads · Vehículos ·
Cotizaciones · Logística · Agenda · Chat; Repuestos sólo con permiso. Configuración, Actividad y Datos van en el menú del usuario y en
`Ctrl/Cmd+K`, con «Mi perfil», «Instalar la app» (sólo si el navegador puede instalarla y aún no corre instalada; en iOS explica «Compartir ›
Agregar a inicio»), «Ayuda», «Ver como» (quien gestiona roles), tema, densidad y «Cerrar sesión».

**Ayuda (menú del usuario):** el renglón «Ayuda» (con icono, tras las entradas del usuario) abre un modal con los **enlaces de ayuda** de quien mira
(`?panel=ayuda`: recargar lo reabre, «atrás» lo cierra; también desde cualquier pantalla por la URL), leídos al abrirlo y nunca con el marco. Cada
fila (44 px como mínimo) dice título, descripción y dominio, y se abre en otra pestaña (su nombre lo dice). Al pie, «Elegir mis enlaces» lleva a
Perfil (`/perfil?panel=enlaces-de-ayuda`). Cargando, la lista, el vacío y el error ocupan la misma caja. Vacío: «Todavía no hay enlaces de ayuda.»
con «Agregar en Configuración» (`empresa.ajustes.gestionar`, a `/configuracion/empresa?panel=enlaces-de-ayuda`) o, sin ese permiso, «Agregar uno
propio» (a `/perfil?panel=nuevo-enlace-propio`); si ocultó todos, «Ocultaste todos los enlaces de ayuda.» con «Elegir mis enlaces». Sin red: «No se
pudieron cargar los enlaces» con «Reintentar». En el celular, a pantalla completa.

**Menú lateral** (desde 768 px; en el celular es el menú del botón, sin cambios): desplegado muestra ícono y nombre; el botón «Plegar menú» (abajo, y `Ctrl/Cmd+B`) lo
deja en una columna de sólo íconos (3,5 rem) y ahí el botón dice «Desplegar menú». Plegado, cada entrada lleva su nombre en `title` (tooltip) y como texto para el lector (el nombre accesible sigue siendo «Chat 1 sin leer»), la
marca queda en su logo y el contador de Chat es un punto en la esquina de su ícono (el número sigue para el lector). Se recuerda por persona
(`menu.plegado`, igual en todos sus dispositivos) y llega ya dibujado desde el servidor; sin elegir, desplegado. Sin conexión el cambio vale en la pantalla y se guarda
al volver la red. El ancho no se anima y los avisos no se mueven. `Ctrl/Cmd+B` no responde mientras se escribe (en un editor es la negrita).

- **Acceso** — `/ingreso`, `/registro`, `/recuperar` (sin sesión): `?returnTo=`, `?aviso=`; `/registro` sólo con registro abierto o sin
  equipo; `/auth/nueva-contrasena` tras el enlace del correo.
- **Inicio** — `/` (todos): bandeja por rol + widgets opcionales; bloques por permiso; cada contador lleva a la lista filtrada. **«Ver todos» / «Ver todas»** bajo la lista de un bloque,
  sólo cuando llega a su tope (5: debajo se ve todo) y quien mira puede abrir el destino (si no, el bloque sigue con su conteo y sin enlace): leads sin seguimiento →
  `/leads?sin_seguimiento=si` (abre «míos»), personas sin rol → `/configuracion/equipo?estado=sin_rol`, turnos de la web → el panel `?panel=turnos`; los demás, a su lista de siempre. «Turnos de
  la web sin confirmar» (`leads.crear` o `web.cola.gestionar`: mis turnos con código, fuente y «Vence en…», «Contacté» en un toque y
  «Vincular a lead»; el panel de «Ver todos» es un drawer con todos mis turnos sin confirmar, de a 20 con «Ver más» hasta 200, el aviso del tope, esqueleto, vacío y error con «Reintentar»), «Documentos por aprobar» (`logistica.documentos.aprobar`: sólo los de vehículos), «Repuestos por mover» (`repuestos.mover`) y
  «Esperas que destraban vehículos» (`repuestos.ver`). Cada bloque, con su `<Suspense>` y su límite de error: si falla (al leer o al dibujar), sólo ése
  dice el error con «Reintentar». Sin ningún bloque: «Tu rol todavía no tiene trabajo en la bandeja», con los bloques que existen y a quién pedir
  acceso; sin rol, «Aún no tienes un rol, avisa al dueño».
- **Leads** — `/leads` (`leads.ver`): tabla + enlace a la ficha. «Míos» por defecto; con alcance «todos», `?alcance=`. Filtros del layout
  (`a.<campo>`), «Sin seguimiento» (Todos / Sí / No, `?sin_seguimiento=`; chip con su «×»), tipo, origen, `?q=`, `?cursor=`, vistas guardadas; la fila y la tarjeta llevan a `/leads/<id>`; marcas
  `?tachados=`, `?favoritos=`, `?etiqueta=`; `?panel=etiquetas`. «Lista | Embudo» (en «Vista y opciones», con el alcance, las vistas guardadas, «Ítems
  por página» y «Más»: exportar, importar y papelera): `?vista=embudo&embudo=<id>` es el kanban de las oportunidades propias (`?etapa=` en el celular;
  a la vista, el selector de embudo y la búsqueda; en «Vista y opciones», «Lista | Embudo», «Etapas…» `?panel=etapas` y «Nuevo embudo…» `?panel=nuevo-embudo`).
  `&lead=<id>` es el **embudo filtrado por lead**: sólo sus oportunidades en todas las etapas, con el chip «De <nombre>» (su «×») y «Ver todas» en el lugar
  de la búsqueda, sin el aviso de qué se ve; cambiar de embudo lo conserva, quitarlo conserva el embudo y la etapa. Vacío: «<nombre> no tiene oportunidades
  en «<embudo>».» con «Ver todas». Un `lead=` que no se ve, no existe o no es un id se ignora y se quita de la URL. Sin `?vista=embudo`, `lead=` no
  filtra nada y se ignora.
- **Lead** — `/leads/[id]` (`leads.ver` y acceso): **dos columnas, todo a la vista, sin pestañas ni acordeones** (desde 56 rem de contenedor; por
  debajo, y con el texto al 200 %, una sola en el mismo orden). **Izquierda**, con su propio desplazamiento si no cabe (la ventana no se desplaza: cada columna lo hace por dentro): la cabecera (el nombre con el «⋯»
  arriba a la derecha, el de la lista con «Cotizar lead» y «Editar lead» —no hay botones sueltos—; debajo, quién lo tiene en una línea; números y marcas),
  «Datos» (los datos clave del lead y «Ver más», `?ver=datos`), «Quién lo tiene» («Compartir» y «Transferir» a todo el ancho) y «Acceso al portal» (la
  cartera y `leads.portal.gestionar`). **Derecha**: el índice quieto arriba de la columna («Índice de la
  ficha», enlaces de ancla con `aria-current="location"`; en el celular, pegajoso y desplazable de costado) y los bloques en su orden, con su propio desplazamiento, cada uno por su permiso:
  «Seguimiento» (`?panel=anotar-seguimiento`, `editar-seguimiento&seguimiento=<id>`, `agendar-recordatorio`, `editar-recordatorio&recordatorio=<id>`;
  «Ver todos» y «Ver tus recordatorios» en `?todos=seguimientos|recordatorios`), «Cotizaciones» (con `cotizaciones.ver` en algún origen; «Cotizar» en el título;
  ver «Cotizaciones del lead y del vehículo»), «Vehículos» (`vehiculos.ver`; el compacto de Relacionados con «Vincular o marcar» en el título y la gestión al pie:
  `?panel=agregar-vehiculo`, `?panel=desvincular`) y «Oportunidades» (con la cartera; «Nueva» en el título; `?panel=nueva-oportunidad`,
  `editar-oportunidad&oportunidad=<id>`). `?seccion=seguimientos|vehiculos|oportunidades|cotizaciones|portal` lleva a su bloque (`vehiculos` y `#relacionados`
  a «Vehículos») y le da el foco al título; con un `?panel=` también abre lo suyo. Un bloque sin permiso no se dibuja ni está en el índice.
- **Vehículos** — `/vehiculos` (`vehiculos.*`): tabla + panel de filtros. Pestaña por origen (`?origen=`); filtros en URL (`q`,
  `subasta`, `orden`, `fase`, `categoria`, `anio.min`, `a.<campo>`…), `?cursor=`, vistas guardadas; la fila y la tarjeta son enlaces a la ficha `/vehiculos/<id>` (Ctrl o el
  botón del medio abren otra pestaña; la casilla, el «⋯», «Publicar» y la foto no navegan);
  alta `?panel=nuevo` (sin el alta suelta pero con la de cotizar: «Nuevo» apagado con «Cotizar un vehículo nuevo», que abre la hoja con el panel
  del vehículo en alta); edición `?editar=`; `?vitrina=si|no`, `?limpieza=si|no`; el «⋯» de cada fila y tarjeta (el mismo de la ficha: ver «Vehículos
  (estados propios)»), con sus paneles sin salir de la lista: «Editar imágenes» `?panel=imagenes&para=<id>`, «Publicar en la web…» `?panel=vitrina&para=<id>`
  (el panel completo de la ficha) y «Actualizar los datos» `?panel=actualizar-datos&para=<id>`; junto al estado de vitrina de cada fila, «Publicar» abre ese
  mismo panel y «Sacar de la web» se hace de un toque con «Deshacer» (con `vehiculos.vitrina` del origen).
  En escritorio, «Tabla | Tarjetas» en «Vista y opciones», con las vistas guardadas, «Ítems por página» y la papelera (`?vista=`, recordada en `vehiculos.vista`).
  **Tarjetas de la lista** (en escritorio si se eligen; en el celular, siempre, una columna con la misma tarjeta): en grilla y **todas del mismo alto**. Arriba la
  foto 4:3 con su carrusel (los puntos a la derecha), la casilla arriba a la izquierda, el «⋯» arriba a la derecha y, en subasta, el chip «Lote N» abajo a la
  izquierda (velo oscuro, sin lote no está); después el título en dos líneas (cortado con «…», entero en el `title` y el nombre del enlace), la línea
  `#n · año · VIN` en una, la situación con sus insignias y, pegadas abajo, las **filas de datos fijas** de la pestaña, con «—» si falta el dato: el precio o
  la puja («Puja actual» o «Puja final») y, en subasta, «Compra directa»; «Costo estimado» a lo ancho; los campos «en tarjeta» de a dos.
  En un origen de subasta, cada vehículo en subasta lleva su **cuenta regresiva del cierre** («Cierra en 2 d 04:12:33», viva cada segundo, ámbar con menos de 24 h
  y roja con menos de 1 h; «Cerrando…», «Cerró hace 3 min» o «Sin fecha de cierre»; con `prefers-reduced-motion`, cada minuto y sin segundos): en la tarjeta,
  arriba de la línea que separa los datos; en la tabla, debajo de «En subasta» en la columna Fase.
  **Tabla:** Nombre, Fase, Año, «Lote» (subasta), «Precio» o «Puja actual», «Compra directa» (subasta), «Costo estimado» (con `cotizaciones.ver`) y los campos
  «en tarjeta». En un origen de subasta con el campo de la puja, «Precio» es «Puja actual» (USD, «final» si terminó o se vendió; sin puja, «—»).
  **«Costo estimado»** (con `cotizaciones.ver` en algún origen): el primer resultado de la aprobada del vehículo con su moneda y el modo de tipo de cambio de
  su cotización («US$27.999 · Unificado»), todo en un botón que abre «Compartir la cotización» de la aprobada sobre la lista (`?panel=compartir&para=<id>`; en Modo Live es texto; nombre accesible «Compartir la cotización aprobada (US$27.999 · Unificado)») (sin modo, sólo el monto; sin total, «Sin total»; sin aprobada o una que no se ve,
  «—»); sin la clave no se dibuja ni se consulta. **«Compra directa»** (subasta): el campo del layout con la ruta de apibara `pricing.buy_now_usd`, en USD; sin
  ese campo activo o sin el dato, «—» (ese campo no se repite entre los «en tarjeta»).
  `/vehiculos/papelera` (por lote).
- **Vehículo** — `/vehiculos/[id]` (según origen): **ficha en dos columnas**. **Izquierda** (desde 56 rem de contenedor la ventana no se desplaza: la columna lo hace por dentro si no cabe), sólo lo clave y
  pensada también para mostrarle el vehículo a un cliente: la foto con su **tira de miniaturas** debajo (desplazable de costado, la actual marcada; un clic
  abre el visor en esa foto, ← → la recorren y Enter la abre) y, sobre su esquina como en la tarjeta de la lista, la vitrina (el botón de la tarjeta, que
  abre `?panel=vitrina`; sin permiso, apagado con su motivo) y el «⋯» (el mismo de la lista, con «Editar» e «Editar imágenes»: no hay «Editar» suelto);
  título, número, origen, situación (`<BadgeDeSituacion>`, la única vez), la insignia de vitrina y los enlaces cortos «Ver en logística» (`logistica.ver`
  del origen) y «Repuestos · Proyecto #N» (`repuestos.ver`, si tiene proyecto). Debajo, en este orden, **la subasta y el costo**, sin título a la vista y como la tarjeta de la lista: la **cuenta regresiva** del cierre (sólo
  en un vehículo en subasta; sin fecha, «Sin fecha de cierre») y, en filas fijas, «Puja actual» o «Puja final» (en un origen manual, «Precio»), «Compra
  directa» (sólo en un origen de subasta con el campo de apibara) y **«Costo estimado»** (`cotizaciones.ver` del origen): el total de la aprobada con su
  modo, que es el botón que abre Compartir de esa cotización (`?panel=compartir&para=<id>`; en Modo Live, texto); sin aprobada que quien mira vea, «—» y
  «Cotizar» si cotiza en el origen. «Editar fechas de subasta» está en el «⋯» del vehículo (`?panel=fechas-de-subasta`); consultar de nuevo es «Actualizar
  los datos» del mismo «⋯». Después, **«Datos principales»** (sólo los datos clave del
  origen, en dos columnas en la lateral y una en el celular y al 200 %, y «Ver más» a lo ancho, que abre la **ficha completa** en `?ver=ficha`: casi toda
  la pantalla en escritorio y entera en el celular, sólo lectura, las fotos con su tira, los datos comunes, «Precio» y todos los grupos del layout; Esc y
  «atrás» la cierran y el foco vuelve a «Ver más»).
  **Derecha**: el índice quieto arriba de la columna («Índice de la ficha»; en el celular, pegajoso) y sólo lo de ventas, con su propio desplazamiento, los bloques que quien mira ve en este orden: **«Cotizaciones de este
  vehículo»** (`cotizaciones.ver` del origen: la fila de tarjetas con «Aprobar esta» y las casillas de «Comparar» (el botón en el título), al acercarse; «Cotizar» en el título, la hoja con
  este vehículo y la vuelta a la ficha, sólo con `cotizaciones.crear` del origen; aprobar ahí pone al día el «Costo estimado» de la izquierda; ver
  «Cotizaciones del lead y del vehículo»), **«Relacionados»** compacto (`leads.ver`: el vinculado con «Desvincular» confirmado, los interesados y lo cotizado;
  ver «Relacionados (estados propios)»), **«Actividad reciente»** (`actividad.ver`: los últimos 5 cambios del vehículo como frases y «Ver toda la actividad»,
  `/actividad?entidad=vehiculos&registro=<id>`); la vitrina no es un bloque: se publica en «Publicar en la web…» (`?panel=vitrina`) y se ve en el botón de la foto y en la insignia. Lo de logística y repuestos no tiene bloque: lo enlazan
  «Ver en logística» y «Repuestos · Proyecto #N» de la cabecera; la ficha entera está en «Ver más» de la izquierda. Un bloque sin permiso no está, tampoco
  en el índice. Arriba de las dos columnas, «Volver» y los avisos (limpieza, situación). En el celular y con el texto al 200 %, una columna en el mismo
  orden. `?seccion=cotizaciones|relacionados|actividad` lleva a su bloque (si no lo ve, se queda arriba); un `?seccion=` que
  la ficha no conoce se ignora y la ficha se queda arriba. `?panel=desvincular|vincular-lead|marcar-interesado` y `?relacionados=<tipo>` llevan a «Relacionados» y abren lo suyo; `?editar=`,
  `?panel=vitrina` («Publicar en la web»), `?panel=imagenes` («Editar imágenes»), `?panel=actualizar-datos` («Actualizar los datos»),
  `?panel=fechas-de-subasta`, `?ver=ficha` y `?visor=` abren lo suyo. Cada bloque tiene su esqueleto, su vacío y su error («No pudimos cargar «<título>».»
  con «Reintentar»; uno caído no tumba a los demás).
  - **Cotizaciones del lead y del vehículo** (bloque): una **fila de tarjetas** que se desliza, sólo tarjetas (sin filas de letras), de las **últimas 10** que quien mira ve
    (la más reciente primero; en el vehículo, la aprobada primero) y, al final, la tarjeta **«Ver más»** a `/cotizaciones?lead=` o `?vehiculo=` (el listado filtrado). Cada tarjeta es la
    de la lista (`docs/GLOSARIO.md` › «Fila de tarjetas»): la imagen de la tarjeta, el título en dos líneas, «N.º n» con «Aprobada», «Final», autor · hace…, el total con su modo
    (`<Monto>`), la vigencia y **«Compartir»** a la vista (no en Modo Live); sin línea de cliente ni «⋯» (el resumen que abre lo trae). Un clic abre el resumen sobre la ficha (`?cotizacion=`)
    y deja marcada la tarjeta abierta; cerrarlo deja la ficha donde estaba. Se desliza con el dedo, la rueda o las flechas ‹ › (escritorio); un degradado en el borde dice que sigue. En el lead, «Cotizar»
    en el título (la hoja con este lead en el primer origen donde quien mira cotiza, como «Cotizar lead»). En el vehículo, «Cotizar» en el título, **«Aprobar esta»** al pie de cada tarjeta menos la
    aprobada (con `cotizaciones.aprobar` del origen; apagado con su motivo; tras aprobar la ficha se refresca) y una casilla sobre la imagen para **«Comparar»** 2 o 3, cuyo botón va en el título del bloque. Los dos
    se leen al acercarse; esqueleto de 3 tarjetas, error con «Reintentar», «Sin cotizaciones que puedas ver.».
  - **De este vehículo** (bloque de la guardada y quinta pestaña del resumen de la cotización): las cotizaciones del mismo vehículo que quien mira ve, **la aprobada
    primero** (insignia «Aprobada» y borde de acento) y después de la más nueva; de a 10 con «Ver más» y, en 100, «Mostrando las 100 más recientes.» con
    «Ver todas en Cotizaciones» (`/cotizaciones?vehiculo=`). Cada fila: «N.º N · título» (`tituloDeLaCotizacion()`: el suyo, si no el del vehículo, si no «Cotización n.º N»), insignias
    «Aprobada», «Final», «Vencida» y «Esta» (la que se mira), el total (`<Monto>`) con el nombre del modo de tipo de cambio, autor y fecha; **«Aprobar esta»**
    a la vista en todas menos la aprobada (con `cotizaciones.aprobar` del origen de esa cotización; apagado con su motivo: «Para aprobar hace falta permiso en
    «<origen>»: pídeselo a quien administra los roles.» o «Una cotización inválida no se aprueba.»; la vencida se aprueba) y «Abrir» en todas menos «Esta».
    Aprobar es lo de la cabecera (aviso con «Deshacer» 10 s, PT409 con quién y cuándo y «Recargar», «Sin conexión: no se aprobó…») y el bloque relee su primera
    página. Sin otras que quien mira vea, sin vehículo o con uno que no ve, no se dibuja. Esqueleto de tres filas; error «No pudimos cargar las cotizaciones de
    este vehículo.» con «Reintentar» (sin tumbar la página ni el resumen); el de «Ver más», «No se pudieron cargar más.». Angosto o al 200 %, cada fila en una
    columna y los botones a todo el ancho. Cada fila lleva a la izquierda su casilla de comparar (44 px; «Comparar la n.º N»), también «Esta» y la aprobada:
    **«Comparar»** va en la fila del título del bloque, apagado hasta tener 2 con «Elige 2 o 3 para comparar.» a su lado; con 3 las demás casillas se
    apagan y dice «Puedes comparar hasta 3.». Abre «Comparar cotizaciones» con las elegidas en el orden de la lista y `returnTo` a la página de donde se
    vino; tras aprobar o releer, las elegidas que ya no están se sueltan.
  - **Comparar cotizaciones** — `/cotizaciones/comparar?ids=a,b[,c]&returnTo=` (pide sesión; cada una, `cotizaciones.ver` de su origen: lo decide la base).
    2 o 3 del mismo vehículo, **lo guardado** de cada una (su versión de la fórmula, sus valores y su total, recortados al nivel de quien mira; sin
    recálculo), en el orden de `ids` (la primera es la referencia; si no se pudo leer, la primera que se leyó). Arriba, «Comparar cotizaciones» y, debajo, el título del vehículo (si lo ve) y «Volver» (a
    `returnTo` si es interno; si no, `/cotizaciones`). Una tabla con la **columna de etiquetas fija** y una columna por cotización: cabecera con «N.º N ·
    título», autor · fecha · «Fórmula vN», insignias «Aprobada», «Final», «Vencida» y el total (`<Monto>`) con su modo; después una fila por sección del
    diseño y una por nodo que quien mira ve, alineadas por nodo (el rótulo, el de la primera que lo tiene; el porcentaje de un par, su fila; lo que la
    tarjeta suma aparte, en «Totales»). Lo que una versión no tiene o quien mira no ve en ella: «—» («No está en esta versión» para el lector). **Lo distinto
    de la primera**: fondo de acento y ↑, ↓ o ≠ con «Más que la primera», «Menos que la primera» o «Distinta de la primera» para el lector (sin cifras en
    `aria-label` ni `title`). Al pie de cada columna, **«Aprobar esta»** (como en «De este vehículo»: apagado con su motivo, un envío a la vez, «Aprobando…»;
    al entrar la insignia «Aprobada» pasa a esa columna sin recargar, con «Deshacer» 10 s; PT409 con quién y cuándo y «Recargar»; «Sin conexión: no se
    aprobó…») o, en la aprobada, su insignia; y «Abrir». `ids` mal formados, 1 o más de 3, repetidos, sin vehículo, de vehículos distintos o alguno que
    no se ve: «Sólo se comparan 2 o 3 cotizaciones del mismo vehículo que puedas ver.» con «Volver», sin decir cuál. Esqueleto propio (`loading.tsx` y
    `<Suspense>`); si falla la lectura de las marcas, el error de la pantalla con «Reintentar»; si falla una columna, «No pudimos cargar la cotización #N.»
    con «Reintentar» en su cabecera y las demás siguen. En el celular y al 200 %, la tabla se desplaza de costado dentro de su caja con la pista de
    desborde (cada columna de 10 rem o más; la de etiquetas, a lo sumo el 35 %) y la página no desborda; el pie queda bajo su columna.
- **Cotizaciones** — `/cotizaciones` (`cotizaciones.*`): **«Tabla | Tarjetas»** en «Vista y opciones» (sólo en escritorio; en el celular siempre tarjetas; por defecto
  **tarjetas**; `?vista=` manda y elegir guarda `cotizaciones.vista`) y **«Agrupar por vehículo»** (un interruptor, **encendido por defecto**; `?agrupar=si|no` manda y
  cambiarlo relee la lista desde la primera página y guarda `cotizaciones.agrupar`; las vistas guardadas recuerdan también la vista y la agrupación). **Agrupada:**
  una tarjeta o fila por vehículo (la **cabeza del grupo**: su aprobada si quien mira la ve y coincide; si no, la más reciente que coincide) y las sin vehículo
  sueltas, intercaladas por fecha; los grupos se ordenan por su cotización más reciente; la búsqueda y los filtros valen sobre las cotizaciones (un grupo existe si
  alguna coincide y sólo cuenta las que coinciden); con `?vehiculo=` no se agrupa y el aviso de arriba dice «…, sin agrupar.»; con `?q=` se agrupa cada página.
  «N cotizaciones de este vehículo» (en la tarjeta, en su fila reservada; en la tabla, bajo el vehículo; tope «100+»; con una sola no está) **abre un modal**
  (`?panel=cotizaciones-del-vehiculo&vehiculo=<id>`, se recarga, se comparte y «atrás» lo cierra; mientras está abierto `?vehiculo=` es del modal y no el filtro, así que la lista de atrás sigue agrupada;
  el foco vuelve al botón; en el celular, a pantalla completa) titulado «Cotizaciones de <vehículo>» y con las cotizaciones del vehículo que coinciden con la búsqueda y los
  filtros en **líneas compactas**: la aprobada primero (con su insignia «Aprobada»; sin ella, la cabeza del grupo) y después las más recientes (casilla, «N.º n» con su título, «Final», el
  total con su modo, autor · «hace…» y la vigencia; sin cliente ni «⋯»); la fila de la lista no se despliega. De a 10 con «Ver más» hasta 100 y ahí «Ver todas en Cotizaciones» (`/cotizaciones?vehiculo=`); 2 o 3
  casillas habilitan «Comparar» en el pie del modal («Elige 2 o 3 para comparar.»; con 3, «Puedes comparar hasta 3.»). Un clic en una línea cierra el modal y abre su resumen (el foco va al
  resumen). Estados del modal: tres líneas de esqueleto, «No pudimos cargar las cotizaciones de este vehículo.» o «No hay conexión.» con «Reintentar» (la lista sigue); si su cabeza ya no vale (papelera,
  invalidar, una más nueva) la página se relee. Un `vehiculo` que no es un id no abre nada, avisa y limpia la URL; si el grupo no está en la página del enlace, el modal se arma sólo con lo que lee
  (título «Cotizaciones de este vehículo», sin la aprobada primera). Si la base recorre su tope sin completar la página: «Revisamos muchas cotizaciones sin completar la página.» con «Seguir
  buscando» (también en lugar del vacío). **La tarjeta de la lista:** la imagen de la tarjeta arriba (miniatura de 480 px, 15:8, recortada desde arriba a la izquierda,
  pedida a la vista y de a cuatro por página; su clic abre el visor en `?visor=imagen-de-la-lista-<id>`, así no se cruza con el del resumen abierto) con el «⋯» encima (sin «Compartir»), el título (dos líneas, entero en `title`), «N.º n» con «Aprobada», «Final» y el origen
  con su color en una línea, el total con su modo, «Cliente:» enlazado a su ficha (con `leads.ver`; si no, su nombre o «—»), autor · «hace…», la vigencia, la fila
  del conteo y **«Compartir»** como acción principal a todo el ancho (no en Modo Live). Todas miden lo mismo (filas de alto fijo, sin `auto-rows-fr`: el despliegue va
  a todo el ancho). **La tabla:** «Cotización» (sólo «N.º n»), **«Título»**, cliente, vehículo, origen, clase, total, vigencia, creada y el «⋯» con «Compartir
  cotización…» primero. Y el resumen `?cotizacion=` (la fila, la tarjeta y el resumen nombran la cotización por su
  **título** —el suyo o, sin él, el de su vehículo—, en dos líneas como mucho y entero en `title`; en la tarjeta de la lista el título es el enlace a la ficha del vehículo y la celda «Vehículo» de la tabla también, con el mismo permiso: tocar el resto de la tarjeta o la fila abre el resumen) (un panel ancho —a todo el ancho en el celular—; arriba, la
  **barra del resumen**: «Abrir cotización» (primario, a `/cotizaciones/<id>`), «Compartir cotización» (el mismo panel de la tarjeta; no en Modo Live ni sin la oferta)
  y, al final, el «⋯» de la fila sin «Compartir» (también para una línea del modal de un grupo o una de otra página); los dos botones crecen por igual: en el celular
  mitad y mitad con el «⋯» a 44 px y, con el texto al 200 %, se parten en filas sin salirse; sin la cotización a la vista (no disponible, error, cargando) no hay barra;
  sus diálogos se abren sobre el resumen sin cerrarlo. Debajo, la **cabecera resumida** (fija, ≤ 120 px de alto en escritorio; crece con el texto al 200 %): a la izquierda la **miniatura de la imagen
  de la tarjeta** (480 px, 15:8, recortada desde arriba a la izquierda; su clic abre el visor de fotos `?visor=imagen-<id>`, que cerrar el resumen borra; mientras se arma o si falla, un recuadro chico con el total y «Preparando…» o «Reintentar»;
  en Modo Live, borrosa con «Oculto en Modo Live» y sin visor) y, a su derecha, el título (el número va en el del panel; con un vehículo vinculado que quien mira ve —`vehiculos.ver` del origen—, el título y el dato «Vehículo» son enlaces a `/vehiculos/<id>`, «Ver <título> en Vehículos», en la misma pestaña; en la ficha del propio vehículo, texto), el total con su modo, la clase con «Aprobada» y «Vencida», cliente, vehículo, creada · autor y la vigencia; en el celular, la
  miniatura a la izquierda y el texto en líneas cortas. Y, ocupando el resto del alto, las **pestañas** `?pestana=` (todo el ancho del panel en partes iguales; si no caben, la lista se desplaza de costado con su pista; la
  cabecera queda fija y cada pestaña se desplaza por su cuenta): «Todo» —adjuntos, revisiones y comentarios en una línea de tiempo, lo más nuevo arriba, con «Ver más»; vacía ofrece «Agregar comentario» y, con permiso
  para guardarla, «Adjuntar»—, «Adjuntos» —los archivos y, en una final o con alguno, sus comprobantes de sólo lectura—, «Revisiones», «Comentarios» y, sólo con un vehículo que quien mira ve, **«De este vehículo»** (`?pestana=vehiculo`; sin
  vehículo, `?pestana=vehiculo` abre «Todo») —ver «Cotizaciones del lead y del vehículo»; sin otras cotizaciones dice «Ésta es la única cotización de este vehículo.»; tras aprobar ahí se refresca el listado; sus casillas y «Comparar» abren «Comparar cotizaciones» y «Volver»
  regresa a este resumen, sin los filtros—; cada pestaña se lee al elegirla, por
  cursor y con tope, y una que falla lo dice sin tumbar a las otras; se adjunta y se comenta ahí con los permisos de la guardada; una que no se
  ve dice que ya no está disponible. **El resumen también abre sobre la ficha del lead y la del vehículo** (`?cotizacion=<id>`): trae su propia lectura, su barra y su «⋯»; «Abrir cotización» lleva a la página de la
  cotización con «Volver» a la ficha (`returnTo`) y cerrarlo deja la ficha como estaba); **buscador** (`?q=`: número —«#12» sólo número—, título de la cotización, cliente, vehículo por título, VIN o lote, y autor; 3 letras o un
  número; quien no ve a un lead o a un vehículo no encuentra por él; con más de 50 coincidencias en una fuente avisa «Escribe más para afinarla»; sin
  resultados dice qué se buscó y ofrece «Limpiar búsqueda»), **vistas guardadas** en «Vista y opciones» como en leads y vehículos (la búsqueda, los filtros, la vista y la
  agrupación) y, a la derecha de cada fila y sobre la imagen de cada tarjeta, el **«⋯»** con la lista única de acciones según el rol: primero y sola, «Compartir
  cotización…» (toda persona que ve la fila; con el Modo Live no está; en la tarjeta tampoco, porque es su acción principal; abre «Compartir la cotización» en
  `?panel=compartir&para=<id>`), «Aprobar» (`cotizaciones.aprobar`; apagada con su motivo sin vehículo o
  si es inválida), «Marcar final…» (`cotizaciones.final.gestionar`, en una preventa; apagada sin vehículo o cliente), casilla «Favorita», «Reportar…»,
  moderar («Invalidar…», «Descartar los reportes…», «Reactivar…», con `cotizaciones.moderar`) y, al final y separada, «Enviar a la papelera» (sin preguntar,
  con «Deshacer»). Son las mismas actions de la guardada; «Marcar final…», «Reportar…» y moderar abren su diálogo en `?panel=…&para=<id>`; filtros mías, clase (preventa o final), origen; `?vehiculo=` y `?lead=` (ids fuera del esquema: sin
  chip y «Limpiar» no los borra; arriba, de quién o de qué son, con «Ver todas», y su vacío propio); «Vencida» en la fila y la insignia «Aprobada» (tabla, tarjeta y resumen); `nuevo` abre la
  hoja. «Papelera» (en «Vista y opciones» › «Más», para quien puede enviar a ella o vaciarla) lleva a `/cotizaciones/papelera`: lotes por cursor (5, las primeras 20 de
  cada uno y «Mostrar los N»), «Restaurar» y «Purgar» una o el lote (`cotizaciones.papelera.purgar`,
  `?panel=purgar&lote=<id>[&cotizacion=<id>]`, nombra lo que borra; un lote de varios pide tipear «purgar N»; una final con comprobante
  queda y el aviso dice por qué); las que se fueron con su vehículo están en la papelera de vehículos.
- **Cotizar** — `/cotizaciones/nuevo` (`cotizaciones.crear`): formulario hoja (XCell); `?origen=&lead=&vehiculo=&returnTo=` (se validan y
  se llevan; el vehículo va al recálculo); sin entrada en la navegación. Ver Flujo 2.
- **Cotización guardada de una hermana** — bajo la cabecera, «Ver la de <etiqueta de la otra>» (enlace); con la hermana disponible y el mismo permiso de
  guardar, la hoja en par con las dos (cada columna con su cotización) y «Guardar» guarda las dos (un PT409 de cualquiera dice «Cambió la de <etiqueta>: …» con
  «Recargar» y no guarda ninguna); si lo común de las dos era distinto, «Lo común de las dos versiones era distinto: se muestra el de esta y, al guardar, queda en
  las dos.». Si la hermana no se ve, está en la papelera, es inválida o sólo se puede guardar una, se abre sola con «La de <etiqueta> no está disponible.» y su
  vehículo no se cambia (es de las dos). La vista previa, el PDF (una página por tarjeta) y «Compartir» (el texto de las dos opciones y las dos imágenes de la tarjeta en una
  sola) llevan las dos. Enviar una a la papelera manda las dos («Se enviaron 2 a la papelera.», «Deshacer» devuelve las dos).
- **Cotización guardada** — `/cotizaciones/[id]` (`cotizaciones.ver`; edita quien la puede guardar, `puede_guardar` de la base): la hoja de
  SU versión; quien sólo ve, en sólo lectura. Cabecera: el h1 «Cotización n.º N» y, bajo el origen y el cliente, **la barra del vehículo** con el título grande y
  el vehículo debajo (o «Sin vehículo»); quien la puede guardar la abre en el panel del vehículo con el campo «Título de la cotización» arriba y guardar
  deja «Cambió el título» en «Revisiones». **En una preventa** el panel es el de cotizar (buscar, pegar un enlace/VIN/lote, «+», «Últ. cotización» y
  «Cierre subasta»; sin «Quitar», también en una sin vehículo): elegir otro (`?vehiculo=`) recalcula la hoja sin guardar, el título automático pasa al del
  nuevo (un manual se respeta), «Guardar» se enciende y guardar deja «Cambió el vehículo: A → B» (uno que quien mira no ve, «un vehículo que no puedes ver»);
  el dato del vehículo de una tabla no se elige ahí. **En una final**, el vehículo en sólo lectura con «Una cotización final no cambia de vehículo.».
  Un `?vehiculo=` que no se puede usar deja la hoja con el guardado y dice bajo la barra «No se puede usar ese vehículo.» con «Elegir otro vehículo»;
  la subasta cerrada del nuevo, su aviso de siempre bajo la barra. Quien sólo ve, la barra sin botón. **A la vista**, en la fila del título: la clase, la vigencia («Vale hasta el…» o «Vencida»), las insignias
  («Aprobada», todos los que la ven, o «Aprobar», con `cotizaciones.aprobar` del origen: sin confirmar; apagado con su motivo sin vehículo o si es inválida;
  al entrar pasa a la insignia y el aviso ofrece «Deshacer» 10 s; PT409 con quién y cuándo y «Recargar»; después «Reportada» o «Inválida»), **«Guardar»**
  (sólo con `puede_guardar`; su motivo y «Elegir el vehículo» debajo; lo que dice el guardado va en el cierre de la hoja, bajo «Avanzado»; quien sólo la ve lee en su lugar «Sólo lectura: no puedes guardar esta cotización.») y **«Compartir»** (toda persona que
  la ve; sin ícono; con el Modo Live no está: «Compartir la cotización» en `?panel=compartir`, estados en «Cotización: compartir»); debajo, la cadena de
  versiones. **Lo demás, en el «⋯»** (`<MasAcciones>` con borde, arriba a la derecha), en el orden de la lista única (`accionesDeCotizacion()`, la misma
  del «⋯» del listado sin «Compartir cotización…» ni «Aprobar», que aquí están a la vista): «Vista previa» (`?panel=vista-previa`) · «Descargar PDF»
  («Descargando…» apagado mientras baja; un fallo lo avisa y se vuelve a elegir) · «Revisiones» · «Marcar final…» (en una preventa, con
  `cotizaciones.final.gestionar` del origen; apagado con su motivo debajo; `?panel=marcar-final`) · «Emitir comprobante…» (en una final activa sin
  comprobante vigente, con `cotizaciones.comprobantes.emitir`; `?panel=emitir-comprobante`, el aviso nombra el número «S-N») · «Cotizar encima» (si no
  está al día y la base lo deja; apagado con cambios sin guardar; el aviso de versión conserva su botón) · «Favorita» · «Reportar…» · moderar
  («Invalidar…», «Descartar los reportes…», «Reactivar…») y, separada al final, «Enviar a la papelera» (quien puede guardarla o, en una preventa, quien
  tiene `cotizaciones.moderar`; vuelve al listado con «Deshacer»). Lo que llega tras leer (las marcas, el comprobante) aparece solo; cerrar un diálogo
  abierto desde el «⋯» devuelve el foco al «⋯». En el celular el «⋯» (44 px) queda en la fila del título y «Guardar» y «Compartir» van debajo, mitad y
  mitad; desde `md`, todo en una fila con el «⋯» al final; al 200 % la fila se parte. Bajo la cabecera, si
  el vehículo tiene otras que quien mira ve, «Hay 2 cotizaciones más de este vehículo · Ver» («Hay 1 cotización más…», «Hay más de 100…»): «Ver» salta al
  bloque (`#de-este-vehiculo`) con el foco en su título. Bajo la hoja, «De este vehículo» (se lee al acercarse; aprobar ahí pone al día la cabecera
  sin refrescar la hoja; «Comparar» en su título abre «Comparar cotizaciones» con `returnTo` a esta página; ver «Cotizaciones del lead y del vehículo») y después
  «Comprobantes» (en una final o en una que ya tiene alguno): del más nuevo, «Vigente» o «Anulado» con quién, cuándo y motivo, hasta 20
  con aviso de tope; «Anular» el vigente pide motivo en `?panel=anular-comprobante` (sin id: hay a lo sumo uno).
  En el pie de «Vista previa», **«Retocar»** (quien la puede guardar): el mismo modal pasa al modo «Retocar la tarjeta» (estados en «Cotización: retocar la
  tarjeta»). Estados en Flujo 2.
- **Logística** — `/logistica` (`logistica.ver` en algún origen): la **bandeja del día** y la **cadena como gráfica**; en la URL: `?origen=` (orígenes con la logística encendida), `q` («dónde está»:
  nombre, VIN o lote; 3 letras o números) y `?panel=lote` (el lote de un contenedor o un booking). `/logistica/fase/[fase]` (la lista de una fase: `[fase]` es el id o `sin_fase`;
  `?origen=`, `q`, `demoradas`, `por_aprobar`, `contenedor`, `booking`, `naviera`, `cursor`), `/logistica/bandeja/[grupo]` (un grupo entero: `demorados`, `trabados`, `por-aprobar`, `por-vencer`,
  `llegadas`, `salidas`, `sin-resolver`; `cursor`), `/logistica/vehiculo/[id]` (la página de la unidad, a la que lleva todo vehículo y la notificación de demora; `?hueco=documentos` abre esa
  pestaña o ese bloque; **meta:** en escritorio, a 1440×900 y a 1280×800, la unidad entra sin desplazar la página, y mover, subir y anotar se hacen sin salir de ella), `/embarques`, `/aduana`, `/gastos` (`?ver=gastos|pagos`). La página de la unidad tiene el hueco «Repuestos» (con `repuestos.ver`): «Espera N repuestos», cada ítem con su proyecto,
  «Para pasar a «X» espera que llegue a «Y».» y el enlace a su panel; sin espera, «Este vehículo no espera ningún repuesto.». Ver «Logística: estados propios». **Configurar:** el ⚙ «Configurar» (nombre accesible «Configurar la logística»; a la derecha de la barra, en toda página de Logística) lleva a la pestaña Fases del origen de la cadena (`?origen=`) o, si la persona no lo configura, del primero que sí (activos primero), donde están su flujo y sus catálogos («Catálogos de logística (drawer)»). Lo ve quien tiene `flujos.configurar` o `logistica.catalogos.gestionar` en algún origen; sin ninguno, no se dibuja.
- **Repuestos** — `/repuestos` (`repuestos.ver`): proyectos por cursor `numero` (`?q=` de 3 letras o un número,
  `?estado=abiertos|cerrados|todos`, `?por=`, `?cursor=`) con número, vehículo o «Externo», cliente, estado derivado, ítems («200+») y
  última actividad; «Nuevo proyecto» (`repuestos.editar`, `N`, `?panel=nuevo-proyecto`, `&vehiculo=<id>` lo abre vinculado, `&lead=<id>` con el
  cliente elegido; `?nuevo=proyecto` lo conserva en la URL debajo de «Nuevo lead»); con `repuestos.configurar`, el ⚙ «Configurar» en la fila de filtros de las tres vistas (a «Repuestos (config)»).
  - `/repuestos/[id]`: la cabecera dice **de qué vehículo es**, en un recuadro bajo el título: la miniatura de su portada, el título enlazado a su ficha, el
    VIN o el lote (con los dos, «VIN X · Lote N»), el origen y la situación; sin vehículo, «Proyecto externo · sin vehículo» con la etiqueta y el VIN escritos;
    debajo, el cliente y las notas. «Cerrar proyecto» o «Reabrir proyecto» (y «Eliminar proyecto» sin ítems: sin confirmación, con «Deshacer»); bajo la
    cabecera, la **barra de progreso** (las fases activas del flujo de repuestos en su orden y, justo antes de la primera fase que lo pide, los hitos
    «Precio al cliente» y «Pago del cliente», cada uno con su pista de avance y su progreso en texto; un hito es un botón que lleva a su pestaña) y, debajo,
    las **pestañas fijas** Ítems · Cotizaciones · Pagos · Compras (`?pestana=items|cotizaciones|pagos|compras`, `role="tab"`; por defecto Ítems; Cotizaciones pide
    `repuestos.cotizar`, Pagos y Compras `repuestos.costos.ver`; sin la clave la pestaña no está y el valor no abre ni lee nada). La barra de pestañas va **pegada**
    bajo la barra superior al bajar, con «Proyecto #N» a su izquierda mientras va pegada; cambiar de pestaña no la mueve y el contenido reserva su alto mientras
    llega. **Ítems** son **tarjetas agrupadas por paso** (en otra pestaña siguen montadas, ocultas), con buscador y filtros en el navegador: un encabezado por fase con ítems, en el orden de los
    pasos, con su nombre y cuántos tiene («Comprar · 3»), y «Sin fase» al final. Cada tarjeta dice **qué es** («Bomba de agua · Usado» o su descripción), cantidad y precio, y **el botón de su siguiente** (mover a la
    próxima fase, con la acción de la transición: abre el panel del ítem con el destino ya elegido, `?item=<id>&destino=<fase>`;
    o «Nueva cotización» / «Registrar pago» si el destino pide ese hito como bloqueante y falta); su «⋯» lleva a Imágenes, Stock, «Mover a…» y Eliminar. El clic en la tarjeta abre un **drawer de abajo
    con la fila del ítem como hoja de cálculo** y sus secciones; «Agregar ítem» abre otro con una fila nueva. Nunca arrastrar. Un panel de compra
    o de pagos se abre con su pestaña (`?pestana=compras&panel=compra&compra=…`); `?panel=stock|imagenes&item=` e `?item=` no piden pestaña.
  - Vistas «Stock» (`?vista=stock`) y «Cadena» (`?vista=cadena`; las tres se eligen en «Vista y opciones» › «Qué ver»: una columna por fase del flujo de repuestos, más «Sin fase» si tiene
    ítems, de a 50, tarjeta con «Proyecto #N» y días en la fase; `?q=`, `?proyecto=` y, en el celular, `?fase=`).
  - El panel del ítem (`?item=<id>`, sobre el proyecto o la Cadena) va **en dos columnas** (ver «Repuestos: proyecto (estados propios)» › «Panel del ítem»): a la izquierda lo del ítem en el orden en que
    se usa, a la derecha sus tarjetas. En el proyecto va bajo el título del ítem, sin cabecera propia; en la Cadena lleva la cabecera de la unidad y la columna izquierda se lee sin editar.
  - **Cotizaciones del proyecto:** «Nueva cotización» con la moneda en la misma barra (apagado con su motivo con el proyecto cerrado o sin
    monedas activas; sin configuración, el mensaje de la base y, con `repuestos.configurar`, el enlace a configurarla) y la lista de tarjetas
    (número, estado, total o «Sin total», creada y aceptada o «Sin aceptar»; todas del mismo alto; tope 50). Cada tarjeta lleva su «⋯» arriba a la
    derecha («Más acciones de Cotización #N») y tocarla abre la hoja. El «⋯» sólo ofrece lo que la entidad permite, sin leer nada al abrirse:
    «Abrir»; «Aceptar» (borrador; apagado con su motivo sin `repuestos.editar`, sin total, con el proyecto cerrado o sin red); «Anular» (borrador o
    aceptada con el proyecto abierto; sin red, apagado); una anulada, sólo «Abrir». Las confirmaciones son las de la hoja
    (`?panel=aceptar-cotizacion|anular-cotizacion&cotizacion=<id>`), montadas una vez sobre la lista; «Aceptar» muestra el total guardado.
  - **La hoja de una cotización** (`/repuestos/[id]/cotizaciones/[cotizacion]`): una columna con un solo nivel de secciones. Arriba, lo que la define: el
    número con su estado, «Aceptar» y «Anular» a la derecha (el motivo de «Aceptar» apagado tiene su línea reservada) y, debajo, proyecto, cliente del
    proyecto (el mismo de la cabecera de `/repuestos/<id>`), fechas y total (`<Monto>`; en vivo en la borrador, el guardado en las demás; nulo es «Sin
    total»). Después, los ítems: «Importado» y «Local» con «Agregar línea» y «Agregar desde un ítem»; cada línea con descripción, `XCell` de cantidad,
    costo y logística (sugerida del tramo, ↺), caja (con la elegida en `<Monto>`), total o «Sin total · motivo», «Quitar línea» y su renglón de error. Al
    final, «Condiciones»: las notas, la configuración con que se calculó y «Guardar» (el aviso de la base, `PT409` en `<AvisoDeConflicto>` incluido, cae
    bajo «Guardar» en un lugar reservado). Nada se mueve al editar o recalcular: celdas, totales de línea, error de línea, motivo de «Aceptar», notas y
    aviso tienen su alto reservado. Una borrador con el proyecto cerrado y las demás, en sólo lectura con la misma forma y el total de la base.
  - Ver «Repuestos: listado (estados propios)» y «Repuestos: proyecto (estados propios)».
- **Agenda** — `/agenda` (todos): una libreta. Al entrar (sin `?vista=`, en todo ancho), la **hoja del día**: las horas de la jornada (08:00 a 19:00) siempre a la
  vista con lo que pasa en cada una (eventos, tareas con vencimiento, recordatorios, cierres de subasta), «Antes de las 08:00» y «Desde las 20:00» sólo si traen algo,
  y la hora actual marcada «Ahora» (borde de acento y texto). Al costado (debajo en el celular, y debajo de semana y mes), los **pendientes** de quien mira:
  «Vencidas», «Recordatorios» (vencidos o de hoy) y «Sin fecha», cada uno con «Completar» en un toque (toast con «Deshacer») y «Ver más». A la vista: «‹ Hoy ›», la
  fecha, «Ir a una fecha» (el campo del día y «Ir», en línea, sin desplegar nada), Día/Semana/Mes y un solo **«Nuevo»** (tecla `N`), que abre el modal «Nuevo» de la barra filtrado a Evento, Tarea y Recordatorio
  (`?panel=nuevo-en-la-agenda`) sin salir de la vista y la fecha. «Vista y opciones» lleva «Qué agenda ver» (Mi agenda | De todos, sólo con `agenda.ver_todo`) y
  «Qué ver» (las clases). Paneles por URL (drawer) como siempre; el formulario del evento suma «Lead (opcional)» con `leads.ver`.
- **Chat** — `/chat` (`chat.participar`; `?c=<conversación>`, `?panel=nueva|grupo|salir|borrar-mensaje&mensaje=<id>`; estados en «Chat
  (estados propios)»): maestro-detalle; menciones `#` de vehículo/lead/cotización, `/tarea`, `/evento`; widget flotante fuera de `/chat`.
- **Notificaciones** — `/notificaciones` (todos): lista; la campana trae las que piden acción. Arriba, «Preferencias de avisos» a
  `/perfil#notificaciones`.
- **Perfil** — `/perfil` (todos): seis tarjetas de ajustes (`<TarjetasDeAjustes>`: columnas de ≈ 20 rem: una en el celular y más cuanto más ancha la pantalla, sin tope de ancho) con lo guardado a la vista;
  lo que se edita abre su modal (`?panel=`), sin plegables y sin desplazar a 1440×900. Cada una lleva sólo su «⋯» («Editar…» primero) y tocarla abre su modal (regla «El «⋯» en Configuración y Perfil»).
  - **Tú** (`?panel=tu`): la foto, el nombre y el correo; el modal edita foto y nombre (con versión: un cambio ajeno dice «Recargar» y conserva lo tipeado). El correo no se cambia desde acá.
  - **Preferencias** (`?panel=preferencias`): tema, densidad, ítems por página, zona horaria de las subastas y «Marcar lo que abrí» (con cuánto lo recuerda y si marca el último) como texto; el modal
    las ofrece, se aplican y se guardan al elegirlas (sin «Guardar»; «Listo» lo cierra).
  - **Turnos de la web:** «Disponible para recibir turnos» a la vista en la tarjeta (el interruptor es el valor que la tarjeta muestra: sin «⋯»; apagado, la ruleta no le reparte; el pegajoso sí); si su rol no recibe turnos, deshabilitado con el motivo.
  - **Tu ficha en la web** (`?panel=ficha`): WhatsApp, cargo, identificador, especialidades, la presentación y si está visible; dice «Se usa en lo que compartes» (la tarjeta de la cotización lleva estos datos). El modal edita todo
    eso y «Aparecer en la web», con versión. Mirando como otro rol, «Editar…» queda apagada en el «⋯» con el motivo.
  - **Notificaciones** (`?panel=notificaciones`; `/perfil#notificaciones` también lo abre y quita el ancla): el push de este navegador a la vista como interruptor y cuántos avisos por tipo y navegadores hay;
    el modal trae un interruptor por tipo del catálogo (sólo apagan el push, no la campana) y «Tus navegadores» con «Quitar». Con el interruptor a la vista y deshabilitado, dice por qué: el rol no recibe push, la empresa no lo activó
    (y dónde), falta la clave pública, el navegador no lo admite o lo bloqueó; mientras revisa, «Revisando este navegador…». Si no se pueden leer los avisos, la tarjeta dice «No se pudieron cargar tus avisos» con «Reintentar».
  - **Ayuda** (`?panel=enlaces-de-ayuda`): los primeros enlaces de ayuda de su menú y «N en tu menú · M ocultos.»; el «⋯» lleva «Elegir mis enlaces…» y «Agregar enlace propio». El
    modal («Mis enlaces de ayuda», a pantalla completa en el celular) lista los de la empresa con su interruptor «Mostrar» y los propios, en su orden; cada fila lleva sólo su «⋯» (uno de
    la empresa: «Abrir el enlace», «Subir», «Bajar»; uno propio: «Editar», «Subir», «Bajar», «Abrir el enlace», «Quitar») y tocarla abre la primera. «Mostrar», mover y quitar guardan
    al instante (mostrar y quitar, con «Deshacer»). «Agregar enlace propio» arriba (`?panel=nuevo-enlace-propio`; editar, `?panel=editar-enlace-propio&enlace=`), apagado con su motivo al
    llegar a 20. Los propios sólo los ve su dueña o dueño; uno nuevo de la empresa aparece visible al final; uno quitado o desactivado desaparece. Conflicto (otra ventana): el aviso y la lista releída.
- **Actividad** — `/actividad` (`actividad.ver`): cada cambio como una frase con su icono por tipo de registro, agrupada por día en la zona de
  la empresa: «Ana cambió Precio de [Toyota Hilux #12]: 10.000 → 12.000» (con varios campos, «Precio y 2 más», sin valores; un alta o una baja,
  sin antes → después; el registro enlaza a su página si existe y se ve; montos con `<Monto>`). Una fila que quien mira no ve dice sólo
  «Ana cambió un lead que no puedes ver». Una sola presentación en todo ancho; en el celular la frase se parte en renglones. «Ver detalle»
  abre un drawer, «Detalle del cambio», con todo el diff (`?cambio=<id>`, suma al historial; la fila queda marcada: sólo lo que cambió, con la etiqueta del campo y cada monto con la moneda de su lado;
  sin moneda conocida, el número y «(moneda sin conocer)»); un `?cambio=` fuera de lo cargado abre el mismo drawer;
  inválido o sin acceso, «No tienes acceso a este cambio.»; un error al leer queda en el drawer con «Reintentar». Filtros como chips arriba:
  persona y tipo de registro (`?persona=`, `?entidad=`), el registro (`?registro=`, desde «Ver actividad» del «⋯» de un lead —fila, tarjeta, kanban y
  ficha— y de la ficha de vehículo) y la fecha de «Ir a una fecha», cada uno con su «×», y «Limpiar filtros». «Ver más» con tope; retención de `actividad_dias` (14 si
  no se puede leer). **Actividad reciente** (en la ficha del vehículo, leída al acercarse; sola en `/actividad/reciente?entidad=&registro=`): los
  últimos 5 cambios del registro como frases, cada uno a su detalle en `/actividad`, y «Ver toda la actividad»; esqueleto, «Sin cambios en
  los últimos N días.» y error con «Reintentar»; sin `actividad.ver` no se dibuja.
- **Configuración** — `/configuracion/*` (permiso de cada sección): inicio en `/configuracion/inicio` (`/configuracion` redirige con 308 y su consulta; una URL que ya no existe da «Esta página no existe»)
  - secciones, del registro `secciones.ts`: «Empresa y equipo» (Empresa, Equipo, Roles) · «Ventas» (Leads, Orígenes) · «Web» (Sitio web, Cola web). En **toda** página de Configuración, el inicio
    incluido (layout de `/configuracion`): a la izquierda el **menú de Configuración** desde 1024 px y con 44 rem de contenedor (con el texto al 200 % pasa
    al selector), de tres niveles que no se confunden: el **grupo** es un rótulo en mayúscula chica (no es enlace), la **sección** un renglón con su ícono del
    catálogo y su nombre (la abierta, en negrita; la página, con acento y `aria-current="page"`) y **sólo la sección abierta** despliega sus sub-secciones,
    sangradas bajo una línea guía a la izquierda (la actual, con el acento en esa línea y `aria-current="page"`). Arriba del menú, el **buscador** (abajo).
    Donde no se ve el menú (celular y pantallas angostas), arriba de la página: el **selector de sección** (`<select>` nativo con su «Sección», por grupo, a
    44 px; elegir navega y, con cambios sin guardar, pregunta) y, dentro de una sección, el buscador y «‹ Configuración» (la vuelta al inicio; en el inicio no
    va). **Buscar en Configuración** (la tecla `/` enfoca el que se ve; Esc lo vacía): al tipear filtra secciones y sub-secciones por nombre y por las
    `palabras` que declara el registro (sin acentos ni mayúsculas; cada palabra escrita es el comienzo de una del título o de las palabras), sólo lo que la
    persona puede abrir; cada resultado con su camino («Empresa › Datos de la empresa»), hasta 12; Enter abre el primero, las flechas recorren la lista; sin
    resultados, «Nada coincide con «x».» con «Limpiar». En el inicio es el campo de la página y los resultados ocupan el lugar de las tarjetas; dentro de una
    sección va arriba del menú y los resultados ocupan el lugar del menú (en el celular, un panel debajo del campo). La búsqueda se vacía al cambiar de
    pantalla. Un grupo sin secciones que abrir no se dibuja; sin ninguna, «No tienes permiso» y sin menú.
    Cada sub-sección es una sub-ruta con su `h1` y una frase (`EncabezadoDeConfiguracion`); la **índice** vive en la ruta de su sección y se
    marca sólo ahí (el selector no repite la sección). La que la persona no puede abrir y declara su motivo va **apagada** con el motivo debajo
    en el menú (no es enlace) y como `<option disabled>` con el motivo en el selector; su URL abre la primera sub-sección que sí puede.
    Equipo y Roles sólo se envuelven. **Orígenes** despliega un sub-ítem por origen que la persona abre (también los inactivos; hasta 20 y
    «Ver todos los orígenes»), cada uno a su «Datos» y marcado en cualquiera de sus pestañas; la búsqueda los encuentra por nombre. **El inicio:** las tarjetas, una por grupo (`h2`), en **mampostería** (columnas CSS de ≈ 20 rem: más cuanto más ancha la pantalla, sin huecos entre tarjetas
    de distinto alto), con, por sección, su título (el enlace), una frase y **lo que falta**, en la sección donde se resuelve: una línea por origen en Orígenes («China: falta configurar el flujo y publicar la
    fórmula», enlazada a la pestaña del primer paso), «Falta activar apibara» una vez en Empresa; sólo de orígenes activos y lo que la persona puede hacer (no el paso de los
    permisos), con su enlace al paso; hasta 3 y «Y N más». Llega después de las tarjetas; si no se puede leer, la tarjeta queda con su frase.
- **Leads (config)** — `/configuracion/leads` (`leads.configurar`: la página de tarjetas; `leads.campos.gestionar`: «Campos»), con «Campos» como única
  sub-sección del menú de Configuración (`configuracion/leads/seccion.ts`). Seis tarjetas con `<TarjetasDeAjustes>`, cada una con su «⋯» («Editar…» primero; tocarla también) que
  abre su modal por `?panel=`: «Tipos de lead» (`tipos`), «Orígenes del lead» (`origenes`) y «Tipos de seguimiento» (`seguimientos`), con la insignia o los
  primeros ítems y «y N más» (las listas, en el modal, con «Nuevo …» en el pie; Nuevo/Editar/Eliminar son otro modal que vuelve a la lista:
  `?panel=nuevo-origen`/`editar-origen&origen=<id>`, `nuevo-tipo`/`editar-tipo&tipo=<id>`/`eliminar-tipo&tipo=<id>`…); «Embudo» (`embudo`: la plantilla como mini-kanban
  con «Inicial», «Ganada» y «Perdida»; el modal se titula «Plantilla del embudo»; «Restablecer» en el «⋯», `?panel=restablecer-embudo`, apagado con «Ya son las etapas de
  fábrica.»); «Mensaje del portal» (`portal`: el texto con sus variables como pastillas; el modal usa el editor con variables: botones que insertan en el cursor,
  vista previa con un cliente, código y clave de ejemplo, aviso en vivo de una variable que no existe; en blanco remite a «Restablecer», `?panel=restablecer-portal`)
  y «Teléfonos extra» (`telefonos`: «Máximo de teléfonos extra» de 0 a 20 y el interruptor «Los teléfonos extra cuentan como el principal»; con la regla guardada y
  encendida, su «⋯» suma «Números repetidos» después de «Editar…», `?panel=numeros-repetidos`: enmascarados con enlace a los leads que ves, «Ver más» / «Seguir buscando»,
  «No hay números repetidos entre leads.»). Sin `leads.configurar`, sólo «Campos» (la raíz lleva a ella); «Campos» sin su permiso va apagada con «Te falta el permiso
  «…».» y su URL lleva a las tarjetas. Sin ninguno de los dos permisos, «No tienes permiso» y la sección no está en el menú ni en el inicio.
- **Empresa** — `/configuracion/empresa` (`empresa.*`), cuatro sub-rutas en el menú de Configuración (`configuracion/empresa/seccion.ts`):
  «Datos de la empresa» (la índice, `/configuracion/empresa`: sus tarjetas de ajustes con modal), «Monedas y tipos de cambio» (`/monedas`: la **moneda base** arriba con «Cambiar la moneda base…» en su «⋯»,
  un grupo por **par de monedas** con sus tipos de cambio como tarjetas —valor, quién y cuándo, «En la barra» con su tope de 3— y «Tipo de cambio» por par, y abajo
  las monedas activas con «Gestionar monedas…» y «Al compartir» con «Editar la leyenda…» en su «⋯»; modales `?panel=moneda-base|monedas|leyenda`, paneles `?tc=`, `?moneda=`, crear en `?panel=`/`?par=`), «Integraciones» (`/integraciones`) y «Comprobantes»
  (`/comprobantes`, con `empresa.ajustes.gestionar`: la tarjeta con la serie vigente y el próximo comprobante, y «Cambiar la serie…» en su «⋯», que abre su modal con versión; sin el
  permiso, apagada con «Pide el permiso «Ajustes de la empresa».» y su URL abre Datos).
- **Repuestos (config)** — `/repuestos/configuracion` (`repuestos.configurar`; la raíz abre `/flujo` con un 308): la página de Repuestos con un `h1` «Configuración de repuestos» y una tira de pestañas,
  cada una una sub-ruta, a todo el ancho; en el celular la tira se desplaza con la abierta a la vista. Se entra con el ⚙ «Configurar» (nombre accesible «Configurar los repuestos»; 44 px y sólo el
  ícono en el celular, con su texto desde 768 px) de la fila de filtros de `/repuestos`, junto a «Vista y opciones» y «Nuevo proyecto», en las tres vistas y sólo con `repuestos.configurar`. **Flujo**
  (`/repuestos/configuracion/flujo`): el editor del flujo (el de la pestaña Fases de un origen) sobre el flujo de los repuestos, sin selector. **Cotizador** (`/repuestos/configuracion/cotizador`):
  «Fórmula» con «Publicar cambios» (publica una versión nueva: no es una barra de «Guardar») y su historial, «Tramos de logística» y «Cajas» por moneda con sus modales en la URL
  (`?panel=tramo|caja`); cada tramo y cada caja es una fila con sólo su «⋯» («Editar…»), y un toque la abre. **Catálogos** (`/repuestos/configuracion/catalogos`): tipo de pieza, condición, vía de
  transporte y país de origen (agregar, editar nombre, orden y activo, desactivar, eliminar sin uso; tope 200 por catálogo con `<AvisoDeTope>`; `?panel=nuevo-valor&catalogo=`,
  `editar-valor&valor=`, `eliminar-valor&valor=`); la fila se nombra «Editar <nombre>», un toque la abre y su «⋯» trae «Editar» primero; sin «Editar» ni flechas a la vista. Sin `repuestos.configurar`,
  cada pestaña dice «No tienes permiso» y no hay ⚙. El buscador de Configuración encuentra «Flujo de repuestos»,
  «Cotizador de repuestos» y «Catálogos de repuestos» y lleva aquí. Estados: esqueleto con la forma de cada pestaña; error de lectura con «Reintentar»; ver «Flujos: configuración (estados propios)».
- **Orígenes** — `/configuracion/origenes` (`origenes.gestionar`, `flujos.configurar` o `cotizaciones.configurar`, cada una **en ese origen**): la
  frase «De dónde vienen los vehículos: sus datos, campos y categorías, su flujo, su fórmula y sus tablas.», «Nuevo origen» (un enlace a
  `/configuracion/origenes/nuevo`; sin `origenes.gestionar`, apagado con su motivo) y, como tarjetas con su «⋯» («Abrir» primero y, con `origenes.gestionar`, «Desactivar|Activar» y «Eliminar origen»), sólo los orígenes que la persona abre (columnas de ≈ 20 rem: una al 200 % y en el celular, más cuanto más ancha la pantalla; tope 100
  con `<AvisoDeTope>`): punto de color, nombre, «Subasta|Manual», «Activo|Inactivo», lo que falta en corto o «Nada pendiente», y vehículos y
  cotizaciones; la tarjeta entera abre sus Datos. **Arriba de la lista, «Para todos los orígenes»** (`h2`; sólo con `cotizaciones.configurar` en algún origen):
  lo que vale para todas las cotizaciones de la empresa, en dos tarjetas de ajustes lado a lado (apiladas en el celular y al 200 %), cada una con su modal
  por `?panel=`: **Colores** (hasta 6 por nombre con su muestra y «y N más» sobre lo leído; sin ninguno, «Todavía no hay colores.») y **Vigencia** («N días»). Cada tarjeta lleva sólo su
  «⋯» («Editar colores…», «Editar vigencia…»), sin «Editar» suelto, y tocarla abre el modal; con el teclado la tarjeta es un botón («Editar colores», «Editar vigencia») y el «⋯» va aparte
  («Más acciones de Colores»). Sin poder cambiar la vigencia (pide `cotizaciones.configurar` en todos los orígenes), su «⋯» va apagado con el motivo, la tarjeta no abre nada y el motivo va
  en un `<Aviso>` del bloque. Cada tarjeta lee lo suyo tras su `<Suspense>` y dentro de su límite: si falla, esa tarjeta dice «No pudimos cargar «Colores».» con «Reintentar» y la lista de
  orígenes sigue. Por URL, `?panel=colores|vigencia` sin permiso no abre y se limpia. Ver «Cotización: colores» y «Cotización: vigencia».
- **La página del origen** — `/configuracion/origenes/<id>/<pestaña>`, a todo el ancho del contenido (sin el menú de Configuración ni su cabecera). Arriba
  las **migas**: «Configuración › Orígenes › <origen> ▾», donde «<origen> ▾» es el **selector de origen** (`Cambiar de origen (ahora <origen>)`): un popover con los
  orígenes que la persona abre (con buscador desde 11), cada uno un enlace a la misma pestaña si allí la abre, o a la primera que abre; salir con cambios
  sin guardar pregunta antes. Debajo, el punto de color, el nombre como `h1` y, si lo está, «Inactivo»; a la derecha, mientras el origen no termina su
  puesta en marcha, «Seguir la puesta en marcha» (al paso que falta), **«Datos»** (desde 768 px) y, si hay algo que hacer, el «⋯» (en el celular
  empieza con «Datos»; con `origenes.gestionar`, activar, desactivar y eliminar: `?panel=eliminar-origen`). «Datos» abre el **drawer de los datos**
  (`?panel=datos`): la ficha del origen y su formulario (sin `origenes.gestionar`, apagado con su motivo y sin pie; «Guardar» lo cierra; «Cancelar» o cerrar con cambios pregunta antes;
  un PT409 dice que alguien lo cambió, con «Recargar», que trae lo guardado y deja lo escrito). Después, las **pestañas** planas
  **Fases · Planilla · Hoja · Tarjeta · Campos · Categorías** (en el celular la barra se desplaza dentro de su ancho y deja a la vista la abierta), cada
  una su sub-ruta; la que no se abre va apagada con su motivo. La que tiene algo pendiente para cotizar (fases, una fórmula activa, la tarjeta
  publicada, los campos) lleva ⚠ con su frase en un tooltip (y para el lector de pantalla, en el nombre de la pestaña).
  - **Fases** (`/fases`, `flujos.configurar` o `logistica.catalogos.gestionar` en el origen; apagada con «Lo configura quien tiene el permiso
    «Configurar el flujo» o «Catálogos de logística».»): el editor del flujo de ese origen, sin selector, y arriba del diagrama los catálogos de su
    logística (Puertos · Navieras · Categorías de gasto · Tipos de documento, cada uno en su drawer: «Catálogos de logística (drawer)»). Las fases como
    **diagrama** (por defecto desde 768 px; `?vista=diagrama|lista`, «Ver como lista») o lista (por defecto en el celular, con «Ver como diagrama»), con la
    **barra del flujo** encima («Reglas del flujo», los catálogos, la vista y, en la lista, «Nueva fase»). Tocar una fase abre el **panel del flujo** al
    costado (`?fase=<id>`); las reglas se abren en el mismo panel (`?seccion=reglas`). Con sólo los catálogos, el diagrama se ve en lectura. En el diagrama las fases se mueven a donde se las deja, se crean con doble clic o desde su barra flotante y se vinculan
    arrastrando su asa; se ordenan con «Mover antes/después» (y «Subir/Bajar» en la lista), se jubilan y reactivan; en el panel se editan y se agregan y
    quitan salidas y requisitos. Ver «Flujos: configuración (estados propios)» y siguientes.
  - **Planilla · Hoja · Tarjeta** (`/planilla`, `/hoja`, `/tarjeta`, `cotizaciones.configurar` en el origen; apagadas con «Lo configura quien tiene el
    permiso «Configurar el cotizador».»): las tres comparten la **barra de la fórmula**, arriba: el selector «Fórmula: <nombre> (activa) ▾» (la lista
    de las fórmulas del origen, cada una con su «⋯», «Archivadas» y «Nueva fórmula»: «Cotización: fórmulas del origen (estados propios)»), el estado
    de lo que se edita, **«Versiones»** (el drawer de las publicadas, `?panel=versiones` en la Planilla; desde Hoja y Tarjeta lleva ahí), «Guardar» y
    «Publicar…» de la pestaña abierta y **«Tablas»** (el drawer de las tablas, `?panel=tablas`). La elegida va en `?formula=<id>` (sin ella, la de
    trabajo: la activa o, si no hay, la más nueva) y se conserva al cambiar entre las tres. «Planilla» («Qué se calcula: la fórmula del origen, sus
    versiones y sus tablas.»): la planilla, con `?panel=publicar-formula`, `revertir-formula&version=<id>` y `descartar-borrador`, y los de la planilla
    («Cotización: fórmula (estados propios)»).
    «Hoja» («Cómo se ve y se llena la cotización.»): `?vista=412|1280|1920|200` y `?pieza=` («Cotización: hoja (estados propios)»). «Tarjeta» («La imagen que recibe el cliente.»):
    `?panel=publicar-tarjeta|descartar-plantilla` y `?referencia=ejemplo`. En el drawer de las tablas, en dos grupos: «De <origen>» y «Compartidas» (una
    compartida tapada por una propia va «Tapada por la de <origen>»); `&tabla=<id>` (el editor) y
    `&accion=publicar-tabla|nueva-tabla|columnas-de-tabla|desactivar-tabla`. Una compartida se edita ahí con el aviso de a quién le cambia.
  - **Campos** (`/campos`, «Campos del origen»; el editor de campos de `shared/ui/campos`, a todo el ancho, sin tope): arriba el buscador
    («Buscar campo», `?q=`, sin tildes, filtra en el cliente) y «Nuevo campo» (principal, `?campo=nuevo`). Luego «Datos clave (n de 4)»: cuatro
    casillas en orden (de 1 a 4 columnas según el ancho); una llena dice el dato, se arrastra a otra y su «⋯» tiene «Subir», «Bajar» y «Quitar de
    los datos clave»; una libre dice «Libre» y recibe un campo o un dato común soltado encima. Cada cambio guarda al instante; con 4, «Hacer dato
    clave» se apaga con «Ya hay 4 datos clave: quita uno para sumar este.» (y soltar encima lo dice); vacíos, «Sin datos clave: la ficha mostrará
    los de fábrica de su tipo.». Después «Comunes» (los datos comunes, insignia «Común» y «Dato clave» si lo es; su «⋯» lo hace o lo quita) y los
    grupos del layout (dos columnas desde 64 rem). Cada fila: el asa (arrastre dentro de su grupo; también con teclado: Espacio, flechas,
    Espacio), el nombre, `tipo · clave` y las insignias («Requerido», «De fábrica», «Principal», las banderas en fila, «Dato clave»), y un «⋯»
    (Editar · Hacer dato clave o Quitar de los datos clave · Subir · Bajar · Desactivar · Eliminar…; lo imposible, apagado con su motivo).
    Tocar la fila abre el panel `?campo=<id>` (`&eliminar=1`: «Eliminar…» abre preguntando); las banderas se cambian ahí. Desactivar es
    reversible con «Deshacer» (si era dato clave, el «⋯» avisa «También sale de los datos clave.»). «Desactivados» va a la vista, debajo, y sin número.
    En un origen de subasta, quien gestiona ve encima «apibara trae N datos que este origen no usa» con «Ver cuáles» (`?panel=datos-nuevos-de-apibara`: un modal
    con la lista y un ejemplo de cada uno) y «Agregarlos».
    Con una búsqueda no hay asas; sin coincidencias, «Nada coincide con «…».» y «Limpiar». Conflicto `PT409` dentro del panel con «Recargar»,
    que conserva lo escrito. Sin `origenes.gestionar`: el aviso con su motivo, «Nuevo campo» apagado, sin asas, el «⋯» sólo con «Ver» y el
    panel sin «Guardar». El grupo de un campo y el drawer «Grupos» (`?panel=grupos`, junto a «Nuevo campo»), como en Leads › Campos, con el
    catálogo del origen; sin `origenes.gestionar`, «Grupos» abre la lista de sólo lectura con el motivo. **Categorías** (`/categorias`,
    `?categoria=`). Las dos se abren con el origen; sin `origenes.gestionar`, todo deshabilitado con su motivo.
  - `/<id>` sola responde 308 (por persona) a la **última pestaña** que esa persona abrió en ese origen si todavía la abre o, si no, a la primera que
    abre (sin ninguna, a Fases), con su consulta entera. Una pestaña que no abre, por URL: «No puedes abrir esta
    pestaña», su motivo e «Ir a <la primera que abre>»; un origen ajeno, «No puedes abrir este origen» (con «Ver los orígenes» si abre otros), sin
    decirle si existe; a quien sí podría abrirlo, uno que no existe es un 404.
  - Estados: cargando con el esqueleto del marco (migas, cabecera y pestañas) y el de cada pestaña; error con reintentar y PT409 los de cada editor.
- **Nuevo origen** — `/configuracion/origenes/nuevo` (`origenes.gestionar`; sin él, «No puedes …» con su motivo): `h1` «Nuevo origen», a la izquierda el
  paso a paso de la puesta en marcha (Datos el actual, los demás todavía sin enlace) y el formulario de Datos (tipo, nombre, sustantivo y género, color,
  plataformas de subasta) con «Crear origen» y «Cancelar» (a la lista). Salir con algo escrito pregunta antes (`ConfirmarDescarte`). Un nombre repetido
  se dice en el campo y lo escrito queda. Creado, lleva a `/<id>/puesta-en-marcha/campos`. Celular: una columna, el paso a paso arriba.
- **Puesta en marcha** — `/configuracion/origenes/<id>/puesta-en-marcha/{datos,campos,flujo,formula,tarjeta,publicar,listo}` (se abre como la página
  del origen: con alguno de sus tres permisos en ese origen; ajeno, «No puedes abrir este origen»): el paso a paso que lleva a quien crea un origen
  hasta cotizar con él (glosario). Patrón: arriba «‹ <origen>», «Puesta en marcha de <origen>» con su punto de color y el «⋯» («Salir de la puesta en
  marcha», a la página del origen); a la izquierda (arriba en el celular) el paso a paso (`nav` «Pasos de la puesta en marcha»: número, título e
  insignia «Hecho», «Pendiente» o «Sin permiso» con el motivo; el actual con `aria-current="step"`, pegado al desplazar desde `md`); a la derecha el
  editor del paso, el mismo de su pestaña (Datos, Campos, el editor del flujo, la planilla de la fórmula de trabajo o «Empezar en blanco» / «Copiar la de
  otro origen», el editor de la tarjeta, y «Publicar…» con qué se publica y el modal de activar con su nota), y al pie «Seguir» (primario; «Ir a publicar»
  antes de Publicar) y «Volver» (fantasma), a lo ancho en el celular. Cada paso guarda con sus botones; «Seguir» no guarda ni exige: lo hecho se deriva
  de lo que hay (campos activos, fases, fórmula de trabajo, fórmula activa), así que lo hecho fuera del paso a paso cuenta. `/puesta-en-marcha` sola
  lleva al primer paso que falta y la persona puede hacer. Sin el permiso de un paso: «No puedes hacer este paso» con el motivo, y «Seguir» lo salta.
  Sin fórmula de trabajo, Tarjeta y Publicar dicen «Este origen todavía no tiene fórmula.» con «Ir a la fórmula». Con la planilla sin publicar, la
  Tarjeta dice que la fórmula trae la tarjeta por omisión (o la de la copia). `listo`: «<Origen> ya cotiza.» con «Cotizar con <origen>» (la hoja de
  cotizar de ese origen); sin fórmula activa, «Falta publicar la fórmula.» con el enlace a la página del origen. Estados: cargando con el esqueleto de
  cada editor, sin permiso, error con reintentar y PT409 los de cada editor. Salir a mitad no pierde nada: se retoma con «Seguir la puesta en marcha» de la página del origen.
- **Sitio web (config)** — `/configuracion/web` abre la primera sub-sección que la persona puede; cada una es una sub-ruta del menú de Configuración
  («Web › Sitio web»), con su título y una frase. «Ajustes» (`/ajustes`) y «Legales» (`/legales`) con `web.ajustes.gestionar`; «Guías» (`/guias`),
  «Preguntas frecuentes» (`/faqs`) y «Testimonios» (`/testimonios`) con `web.contenido.gestionar`. Lo que no puede abrir va apagado en el menú, con su
  motivo, y su URL abre la primera que sí. «Ajustes»: la fila única del sitio en cinco tarjetas con lo guardado a la vista, sin acordeones ni barra de cambios (Identidad del sitio: nombre y lema ·
  Contacto: WhatsApp de respaldo, horario y dirección · Redes · SEO · Vitrina: moneda secundaria y orígenes visibles, avisando en el modal qué vehículos dejan
  de verse), cada una con su «⋯» («Editar…») y el toque en la tarjeta, que abren su modal (`?panel=identidad|contacto|redes|seo|vitrina`) con su «Guardar»; con versión, sin red y conflicto
  («Recargar» conserva lo tipeado); cerrar un modal con cambios pregunta. «Legales»: una tarjeta por documento (términos, privacidad) con su estado («Publicada»
  o «Sin publicar»), un extracto, su última edición y «Editar…» en su «⋯» (o tocarla), que abre su modal con el título y el editor (`?panel=terminos|privacidad`, con borrador); las
  dos páginas entran enteras a 1440×900. «Guías» (con categorías) y su editor
  `/configuracion/web/guias/[id]` (un editor de bloques a todo el ancho, sin tope: barra fija con «← Guías», deshacer y rehacer, el estado «Borrador», «Programada» o «Publicada», «Vista previa»,
  guardar y publicar con `web.guias.publicar` y el «⋯»; el título grande y el texto centrados; un panel a la derecha, «Publicación» y «Bloque», que se oculta y se acuerda y debajo de 1024 px es un
  cajón `?panel=lateral`; bloques con «/» o «+»: párrafo, títulos, listas, cita, imagen, galería, botón, video y separador; la vista previa abre en un modal `?panel=vista-previa`; salir con cambios
  pregunta en la barra; sin red avisa y no publica). «Preguntas frecuentes»: panel por URL, reordenar, eliminar con confirmación;
  la categoría de una pregunta es un combo como el grupo de un campo («Crear categoría «x»», «Ya existe «X».») y «Categorías», junto a «Nueva pregunta»,
  abre su drawer `?panel=categorias` (`&quitar=<id>`) como el de «Grupos» de Leads › Campos («Mover sus 3 preguntas a…», «Sin categoría»). La categoría de
  una guía, también un combo que la crea. «Testimonios»: con su
  consentimiento (quién, cuándo, canal; ciudad, vehículo y foto por separado) y «Retirar». Las listas llevan su acción principal («Nueva …») sin repetir el
  título de la página.
- **Cola web (config)** — `/configuracion/cola-web` (`web.cola.gestionar`): tarjetas en una rejilla que ocupa todo el ancho del área (sin tope de ancho; a 1920 px,
  varias columnas). «Actualizar» arriba y, debajo, los avisos de la política y los bloques en este orden, cada uno con su título (`h2`).
  «Sin asignar» (una tarjeta por solicitud sin asesor: código y fuente, sin «⋯» ni clic: no tiene acciones; «Ver más» de a 20), «En la rueda» (una
  tarjeta por persona, en el orden de la ruleta: disponible o no, abiertas de su cupo, prioridad, «Contacta el N %» o «Sin turnos aún», vencidas y último turno;
  su «⋯» es lo único suelto: «Editar…» —`?panel=editar-en-la-rueda&para=`, cupo, prioridad y orden en un modal— y «Quitar de la rueda» —`?panel=quitar-de-la-rueda&para=`,
  confirma nombrando a la persona y el aviso ofrece «Deshacer»—; tocar la tarjeta abre «Editar…»; «Agregar a la rueda» —`?panel=agregar-a-la-rueda&q=`, busca en
  el equipo y avisa si el rol no recibe turnos— junto a su título; y, debajo, sus propias secciones —no dentro de «En la rueda»—, «Habilitada, pero su rol no recibe turnos de la web» con «Se cambia en
  Roles.» y «Cuenta bloqueada o inactiva») y «Política de la cola» (una tarjeta de ajustes con cola activa, minutos para contactar, días con el mismo asesor,
  cupo por defecto e intentos a la vista; su «⋯» dice «Editar política…» y tocarla abre el modal `?panel=politica`, con la versión de la fila: el conflicto deja
  «Recargar» y conserva lo tipeado; cerrar con cambios pregunta). Cada bloque lleva su error de lectura si falla sin tapar los otros. Estados: esqueleto con las
  mismas rejillas, vacío por bloque, «Mostrando las primeras N habilitadas» al tope, sin permiso («No tienes permiso»). En el celular, las tarjetas en una columna.
- **Equipo** — `/configuracion/equipo` (`equipo.usuarios.*`): tabla desde 768 px, tarjetas debajo, panel lateral. `?q=&estado=` se
  resuelven en el servidor («jose» encuentra «José»); dibuja las 100 primeras por nombre y lo dice al pie; la persona se gestiona desde su
  «⋯» y tocar la fila o la tarjeta abre su acción principal («Cambiar sus roles», si está a su alcance), sin resumen. `?panel=invitar`; `?persona=`; `?baja=`.
- **Roles** — `/configuracion/roles` (`equipo.roles.*`): matriz roles × permisos por módulo; desde 768 px la columna «Permiso» queda pegada
  a la izquierda y la fila con los nombres de los roles arriba, a ras del borde, sin hueco (la tarjeta se desplaza por dentro y, con la página al final, su borde de arriba queda a ras de la barra superior), con el título del módulo pegado debajo, a ras de ella; cada
  celda guarda sola. En móvil, un rol a la vez (`?rol=`) y como lista (permiso, explicación y control debajo): la barra «Rol a la vista» queda
  pegada bajo la barra superior y el título del módulo en curso, debajo de ella. Ningún aviso en línea: un «!» junto al nombre de cada rol que
  los tiene (en el celular, en la barra «Rol a la vista», 44 px) abre «Avisos de <rol>» (sin avisos, sin botón) y otro junto al título abre «Avisos
  de Roles y permisos».
  La cabecera de cada rol lleva su «⋯» («Más acciones de <rol>») con «Eliminar el rol…» (apagada con su motivo); su única acción es destructiva, así que tocar la cabecera no hace nada.
  `?panel=nuevo-rol`, `?panel=avisos&rol=`, `?panel=avisos-de-la-pagina` (también `?panel=avisos` sin `rol`), `?eliminar=`.
  **El bloque «Cotizaciones»** lleva, además, los niveles de acceso y «Quién crea y quién ve» (ver «Cotización: niveles de acceso y quién crea y quién ve»):
  `?bloque=<módulo>` deja a la vista el bloque de ese módulo (lo usa `?bloque=cotizaciones`).
  Un rol que no existe aún: «Todavía no hay roles» con «Crea uno con «Nuevo rol»…».
- **Datos** — `/datos` (todos: «Mis leads»; todo: `datos.exportar.todo`): `?seccion=exportar|importar`, con la barra siempre; sin permiso
  para importar nada (`leads.crear`, `datos.importar.todo` o `vehiculos.crear` en algún origen), «Importar» apagada con su motivo y
  pedirla abre «Exportar».
  - **Exportar:** «Mis leads» (con `leads.ver` y `leads.exportar`, abre `/leads?panel=exportar`) y, con `datos.exportar.todo`, una tarjeta
    por entidad (Leads; Vehículos, un archivo por origen; Cotizaciones, todas o de un origen) con «Desde», «Hasta» y «Descargar». Estados:
    preparando (botón apagado), nada en el rango, más de 250.000 filas (pide un rango más corto), límite de 3 por hora (dice cuándo se
    puede), error con «Reintentar», tarjeta apagada con su motivo.
  - **Importar:** «Qué importas» (Leads o Vehículos, sólo lo que puedes; `?entidad=`); con Leads y `datos.importar.todo`, «Destino» («Yo» y
    las personas activas, hasta 100); con Vehículos, «Origen» (activos donde creas; `?origen=`). Pasos: Archivo (CSV ≤ 20.000 filas y
    10 MB; sirve el de Exportar) → Columnas (emparejadas solas, «Ignorar esta columna», las que faltan; en Leads, origen y tipo para las
    filas sin) → Vista previa (las primeras 500 de 50 en 50, «Lista» o «Con errores» con su motivo, filtro de errores, «Importar N filas»)
    → Importando (preparar, subir, «puedes seguir en otra pantalla»; sin conexión o error, «Reintentar» manda el mismo intento).
  - **Avance:** «Importando» lee la importación cada 5 s: esperando, «n de N filas», en pausa (sin avance hace 2 min la retoma el sistema);
    al terminar, cuántos creados, ya existentes y con errores, o «No terminó: <motivo>.», y «Descargar las rechazadas» (con las celdas del
    archivo; un «ya existe» no nombra a nadie; el detalle se guarda 30 días). Si no se puede leer, lo dice sin perder lo último.
  - Al pie, «Importaciones»: las propias (todas, con quién, con `datos.importar.todo`), con fecha, qué, destino, estado y avance; de a 20
    hasta 500 con aviso; vacío; error con «Reintentar».
- **Buscador** — `Ctrl/Cmd+K` o el botón «Buscar» de la barra (todos): paleta sin URL (un `Dialog`). Sin texto: «Últimos abiertos» (8) y
  las acciones que la persona puede (`puede()`: Nuevo lead, Nuevo vehículo, Nueva cotización, «Ir a…», Configuración, «Ver atajos de
  teclado»). Con texto (mínimo 3, 250 ms de espera, cancela la anterior): las acciones que coinciden arriba y una sección por tipo (Leads,
  Vehículos, Cotizaciones; hasta 5 cada una) y «Ver todos en Leads» (`/leads?q=`). Un teléfono no se busca. Estados: buscando, sin
  resultados, error y sin conexión con «Reintentar». Enter abre la fila; Esc cierra. `?` lista los atajos.

## Permisos (matriz de referencia; el catálogo real vive en `permisos.ts` y se siembra en SQL)

- **Asesor:** crear lead y ver mis leads; cotizar; crear y ver vehículos (por origen); chat y tareas; importar leads (`leads.crear`);
  deshacer mi importación (24 h).
- **Logística:** crear y ver vehículos; mover de fase y aprobar documentos (por origen); chat y tareas.
- **Repuestos:** proyectos, costos y cotizador de repuestos; chat y tareas.
- **Dueño:** todo lo anterior, más leads de otros (teléfono enmascarado), fórmulas, costos y margen, vitrina web y guías,
  equipo/roles/bloqueo/registro, exportar e importar todo, exportar mi cartera (`leads.exportar`).

## Reglas transversales

- **El «⋯» en Configuración y Perfil:** toda tarjeta y toda fila lleva sólo su «⋯» arriba a la derecha, con la lista única de acciones de su entidad, aunque tenga una sola. Ningún botón de acción suelto («Editar», «Gestionar», «Cambiar», «Configurar», «Subir», «Bajar», una papelera). Tocar la tarjeta o la fila (fuera del «⋯») abre su acción principal, la primera del «⋯»; con el teclado, la tarjeta es un botón con nombre («Editar <título>», «Abrir <origen>») y el «⋯» va aparte («Más acciones de <título>»): orden de foco la tarjeta y después su «⋯», sin un interactivo dentro de otro. Sin permiso, el «⋯» lleva la acción apagada con su motivo; una tarjeta sin acciones no dibuja «⋯» ni clic. Una acción destructiva nunca es la principal de un toque. «Subir» y «Bajar» van en el «⋯» (apagadas con su motivo) y el foco vuelve al «⋯» de la fila movida. Siguen a la vista los interruptores que guardan al instante (son el valor que la tarjeta muestra), los enlaces del texto y las acciones de la página («Nuevo …», «Invitar»). Fuera de Configuración y Perfil, toda tarjeta, fila y ficha lleva su «⋯» arriba a la derecha como siempre.
- **Ancho en Configuración y Perfil:** sin tope de ancho en las páginas ni en sus esqueletos (`loading.tsx` y `fallback` con la misma forma que la página); las tarjetas de ajustes, la lista de orígenes y el inicio se reparten en columnas de ≈ 20 rem, así que en pantallas grandes entran más. Sólo conservan un ancho legible el texto corrido (descripciones, avisos y vacíos) y los formularios (los de los modales, «Nuevo origen» y el paso Datos de la puesta en marcha). Las tablas usan todo el ancho. Sin desplazamiento de costado en 375 px, con el menú de Configuración visible u oculto y con el menú lateral plegado o desplegado.
- **Secciones:** un solo nivel por pantalla o panel, a la vista, cada una con su título. Ningún acordeón ni bloque plegable, ninguna sección ni tarjeta dentro de otra; lo secundario va en un drawer o un modal con su URL (`?panel=`), abierto desde un botón con verbo o desde el «⋯» — `.claude/rules/ui.md`.
- **Sin saltos de interfaz:** lo que cambia de contenido dentro de un área (cargar, editar, cambiar de vista, mostrar un aviso) no cambia el tamaño del área: alto fijo o reservado, y el esqueleto mide lo mismo que el contenido.
- **Recargar y copiar el enlace (marco, toda pantalla con sesión):** en la barra superior, a la izquierda del buscador, «Recargar la página» (ícono, recarga completa del
  navegador; con cambios sin guardar pregunta el navegador, como con F5); en una barra de menos de 28 rem (el celular angosto) no entra y queda al pie del menú. Abajo a la derecha, a la izquierda del botón del chat, «Copiar el enlace de esta página»
  (flotante, secundario: más chico, contorno y sin relleno de acento): copia la URL de ahora con su consulta y avisa «Enlace copiado.»; si el portapapeles falla, un modal
  con el enlace seleccionado. Donde el chat no está (`/chat`, sin `chat.participar`) queda solo en ese lugar. Los dos son de 44 px en el celular y van por debajo de los modales.
- **Estados obligatorios en toda pantalla:** cargando (esqueleto propio por patrón), vacío primera vez, vacío por filtro, error con
  reintentar, sin permiso — `.claude/rules/ui.md`. **Cargando**: toda página de `(app)` tiene su propio `loading.tsx` con la forma de lo
  que dibuja después; no vale el heredado (`scripts/guardas/estados-de-ruta.test.ts`).
- **Destructivas:** papelera (vehículos, cotizaciones, leads) = hacer + toast con deshacer 10 s; purga y baja de usuario = diálogo que nombra
  el objeto; masivas irreversibles = confirmación tipeada.
- **Fotos:** toda foto de una entidad abre el visor (`?visor=`) con ← →, Esc, «3 de 12» y miniaturas; la cabecera de la ficha del vehículo
  lleva el carrusel con su tira de miniaturas (un clic abre el visor en esa foto). Las galerías (imágenes de un ítem) abren el visor en la foto tocada.
- **Vistos:** en las listas de vehículos, leads (lista y kanban), cotizaciones, proyectos de repuestos, los chips de la agenda y las de logística (bandeja del
  día, fase, «dónde está», gastos y pagos, unidades de un grupo), como en un correo, el nombre de lo que no se abrió en ese módulo va en **negrita** y el de lo ya
  abierto en peso normal; lo último lleva además borde de acento y un ojo chico junto al nombre (tooltip y texto para el lector «Último visto», sin texto a la vista; y también va en peso normal). «Visto» se dice con texto para el lector: nada
  depende sólo del peso. Con «Vistos» apagado, o sin saber aún qué se abrió, ninguna lista pone negrita por esto. En el chip de la agenda, «visto» lleva una
  tilde (y el texto para el lector) y lo nuevo no lleva nada: el fondo es de la clase y su etiqueta ya va en negrita, así que el peso no se distingue. Aduana y las notificaciones no marcan. `/perfil` › «Vistos»: marcar o no, recordar 7, 30, 90 días o 1 año, marcar o no el último.
- **Barra de cambios sin guardar:** un formulario de página (no de un panel) muestra abajo, pegada (`sticky`, sin tapar el último campo),
  «Tienes cambios sin guardar» · «Descartar» · «Guardar» al cambiar algo; salir con cambios (un enlace, un aviso, el selector de sección,
  recargar o cerrar) pregunta «Tienes cambios sin guardar.» · «Descartar» · «Seguir editando». El «atrás» del navegador no pregunta.
- **Avisos con acciones:** un aviso de error, advertencia o bloqueo que tiene salida la ofrece ahí mismo (de 1 a 3, la que destraba primero;
  sin permiso, a quién pedírselo) — `.claude/rules/ui.md` › «Avisos con acciones».
- **Fechas de subasta:** en la zona de quien mira (`/perfil` › «Zona horaria»; sin elegir, la de la empresa), con la abreviatura («14:00
  GMT-4»); en el tooltip (y debajo, en la ficha) la hora del patio y la de la empresa. Lo demás, en la zona de la empresa.
- **Formatos:** `Intl` con locale y moneda de la empresa (`es-BO` por defecto); montos con cifras tabulares; fechas cruzan servidor↔cliente
  como ISO y se muestran en la zona de la empresa. **Modo Live** oculta cifras sensibles **y** símbolos de moneda. Voz: español neutro con
  tuteo. Densidad: compacta en escritorio (filas 36–40 px), cómoda en táctil (48 px), recordada por usuario.
- **Atajos:** `Ctrl/Cmd+K` buscar/comandos · `N` nuevo, lo propio de la pantalla (vehículo en vehículos; si no hay, un lead) · `Shift+N` abre «Nuevo» (elegir qué crear;
  no abre encima de otro diálogo ni mientras se escribe) · `Ctrl/Cmd+S` guardar · `Ctrl/Cmd+Enter` guardar y seguir · `Ctrl/Cmd+B` plegar o desplegar el menú lateral · `Esc` cerrar panel o volver un paso · `?` abre «Atajos
  de teclado» (la lista del catálogo; no se dispara mientras se escribe). En un alta de vehículo `Ctrl/Cmd+S` guarda y cierra; en «Nuevo
  lead» deja el drawer listo para el siguiente.
- **Filtros:** panel lateral plegable si el listado mide 40 rem o más (si no, hoja inferior) + chips activos + «limpiar»; esquema
  declarativo por listado; estado en URL (nuqs, `shallow:false`); vistas guardadas por usuario (en «Vista y opciones»). Formularios en drawer o modal con secciones
  a la vista, un solo nivel; `returnTo` para volver.
- **Patrón de lista** (`.claude/rules/ui.md`): toda lista de registros se dibuja igual. Desde 768 px, tabla con **nombre pegado a la
  izquierda** (entero hasta 16 rem; más largo, «…» y completo en `title`) y **«⋯» a la derecha**, que se desplaza de costado dentro de su
  tarjeta, nunca la página; por debajo, tarjetas. **Un clic en cualquier parte de la fila o tarjeta abre su resumen** (en una lista sin resumen —leads,
  vehículos—, su página), salvo casilla, «⋯», enlace o botón. Teclado: una parada de Tab por fila (el nombre, «Abrir Ana Rojas»); al cerrar el resumen el foco vuelve a él. El «⋯»
  («Más acciones de …») está siempre a la vista (nunca sólo al pasar el mouse) y siempre en el mismo lugar: en la tarjeta de la lista,
  arriba a la derecha (`<EsquinaDeAcciones>`), de 44 px también en escritorio; si la tarjeta lleva una foto arriba (la grande del inventario),
  sobre la foto, con fondo de superficie translúcido y borde, espejo de la casilla de la izquierda, y en el mismo lugar sobre el recuadro vacío
  si no hay foto o no carga; en la tarjeta del kanban, igual, arriba a la derecha. En la tabla, en la columna pegada a la derecha, que lleva una
  sombra sólo mientras queda contenido detrás (falta desplazar hacia la derecha). Un ítem sin «⋯» no deja hueco. Lo que no se puede hacer no
  aparece, y un ítem visible pero imposible dice por qué.
- **Texto al 200 % (reflujo, WCAG 1.4.10):** ninguna lista ensancha la página; «⋯» y casilla miden 44 px; una tarjeta de menos de 16 rem
  apila sus piezas; los botones chicos crecen con el texto. Los avisos (22,25 rem) crecen con el texto sin pasar de la pantalla menos 1 rem
  por lado y suben sobre el pie de un panel abierto.
- **Paneles y modales con formulario:** cerrar con algo escrito (Esc, ✕, clic afuera, «Cancelar») pregunta **en el mismo modal o panel**
  («Tienes cambios sin guardar.» con «Seguir editando», con el foco, y «Descartar»); sin cambios cierra directo; «atrás» cierra sin
  preguntar (el borrador vuelve al reabrir). La acción de un aviso que deja la pantalla («Abrir ficha», «Recargar») con algo escrito
  pregunta lo mismo en el pie del panel; la que actúa en el lugar («Deshacer») no. Mientras guarda, los campos se apagan y no se cierra. El
  rechazo de un campo se dice **junto a su campo**, con el foco ahí. Sin conexión lo escrito queda y se guarda al volver.
- **Un modal nunca abre otro modal:** segundo nivel = panel lateral o página. En el celular al 200 %: título y pie fijos, **la descripción
  se desplaza con el cuerpo**, botones del pie de 44 px (`e2e/modales-celular-200.spec.ts`: pie ≤ 26 % de la pantalla, cuerpo ≥ 45 % del
  modal).
- **Confirmaciones con URL** (`?panel=mover-oportunidad&oportunidad=<id>&destino=<id>`, `salir-lead`, `purgar&lote=<id>`,
  `deshacer-importacion&importacion=<id>`, `desvincular`, `etapas&eliminar=embudo`, `eliminar-origen`): «atrás» las cierra, recargar las
  reabre, Esc devuelve el foco, no se cierran mientras actúan. Si lo que nombra ya no existe, avisa y limpia la URL.
- **Barra de un listado (`<FilterShell>`):** búsqueda (crece y ocupa el ancho libre; con menos de 14 rem toma su propia fila), «Filtros»,
  «Vista y opciones» y «Nuevo». Una barra plana: cada pieza envuelve a la izquierda, en el orden en que se lee.
  - **«Vista y opciones»** (`<VistaYOpciones>`): un solo botón que agrupa lo que no se usa a cada rato —la vista («Lista | Embudo», «Tabla |
    Tarjetas», «Qué ver» de repuestos), el alcance («Míos | Todos»), «Ítems por página», las vistas guardadas y «Más» (exportar, importar, la
    papelera)—, cada grupo con su permiso de siempre; «Más» sin nada adentro no aparece y una lista sin nada que agrupar no tiene botón. Es un
    popover desde 768 px y una hoja inferior por debajo, sin URL (un menú: «atrás» no lo cierra); cambiar el ancho con el panel abierto pasa
    de uno a otro sin cerrarlo. El botón dice lo activo («Vista y opciones · Lista · Míos · 25 por página») y crece en alto al 200 %. Lo
    elegido adentro va en la URL (`?vista=`, `?alcance=`, `?por=`). Cambiar algo en el lugar (alcance, tabla o tarjetas, ítems
    por página) no lo cierra; lo que lleva a otra lista o pantalla (la vista, una vista guardada, la papelera, importar) sí. Esc y la ✕ lo
    cierran y el foco vuelve al botón; con un tamaño a medio elegir con flechas, el primer Esc lo deshace. El panel llega con `diferido()` al
    abrirlo por primera vez (sin red esa vez: «Sin conexión. No se pudo abrir esto.» con «Reintentar»). Sin red con el panel abierto, una
    línea dice «Sin conexión: lo que necesita la red se activa cuando vuelva.» y lo que navegaría queda apagado (`inert`); «Ítems por página»
    y «Tabla | Tarjetas» siguen.
  - **El marcador de búsqueda es corto** («Nombre o número»,
    «Título, VIN o lote», «Título o lead») para caber al 200 % en el celular.
- **Mínimo para buscar por nombre:** 3 letras o dígitos seguidos; un número (`5`, `#5`) busca por número desde un dígito. Mientras no
  alcanza, el campo lo deja escrito, dice «Escribe al menos 3 letras» y **no escribe `?q=`, no pide nada, no deja chip ni toca los
  tachados**; un `?q=ab` por URL igual (`e2e/leads-listado-busqueda-minima.spec.ts`).
- **Ítems por página:** en cada lista con Anterior/Siguiente y filtros (leads, vehículos), selector «Ítems por página» (10, 25, 50, 100) en
  «Vista y opciones» (en la hoja, en el celular; `<select>` de 44 px). Sus avisos («Sin conexión: se aplicará cuando vuelva la red.», «No se
  pudo guardar tu preferencia…» con «Reintentar») van en el panel y, con el panel cerrado, bajo la barra. Se guarda en la cuenta (`listas.por_pagina`, también en el
  perfil); `?por=` la fija para esa página; cada lista tiene un máximo (100). Cambiarlo vuelve a la primera página y conserva filtros y
  búsqueda. No lo llevan el kanban ni las papeleras (`docs/RENDIMIENTO.md`).
- **Barra superior:** «Nuevo» (a la izquierda del tipo de cambio) abre un modal sin pantalla propia (`?panel=crear`: recargar lo reabre, «atrás» lo cierra) con lo que quien mira
  puede crear, en este orden y filtrado con `puede()` (lo que nunca podrá no aparece; «Ver como»: las del rol mirado): **Lead** (`leads.crear`) → el drawer `?panel=nuevo-lead` en la
  pantalla de ahora; **Vehículo** (`vehiculos.crear`; sólo con el alta de cotizar, la hoja con el vehículo en alta) → `/vehiculos?panel=nuevo`; **Cotización** (`cotizaciones.crear`) →
  `/cotizaciones/nuevo`; **Proyecto de repuestos** (`repuestos.editar`) → `/repuestos?panel=nuevo-proyecto`; **Seguimiento** y **Recordatorio** (`leads.editar`) → un segundo paso
  del mismo modal: se busca un lead **de tu cartera** (3 letras o un número, nunca por teléfono; hasta 5, «Escribe más» si hay otros; «Atrás» vuelve) y se abre su ficha en «Seguimientos» con
  el modal de anotar o agendar; **Evento** y **Tarea** (siempre: para uno mismo no piden permiso) → `/agenda?panel=nuevo-evento|nueva-tarea` (ya en la agenda, sólo su `?panel=`: conserva la vista y la fecha). «Nuevo» de la agenda abre este mismo modal con «¿Qué quieres agendar?» y sólo Evento, Tarea y Recordatorio (`?panel=nuevo-en-la-agenda`). El modal abre con «Lead» enfocado (con
  flechas y Tab se recorre; Intro elige); elegir cierra el modal y abre la puerta (un modal nunca abre otro). Con una sola opción el botón la abre directo. Sin nada que crear no hay
  botón. En el celular mide 44 px, con sólo el icono si la barra mide menos de 24 rem. Estados del paso del lead: bajo el mínimo, la pista; «Buscando…»; sin resultados («Sólo se ofrecen los de
  tu cartera»); error y sin conexión con «Reintentar». Lo recibe el layout como claves, no como permisos. La paleta conserva «Nuevo lead», «Nuevo vehículo» y «Nueva cotización».
  Tipos de cambio: a la vista los que la empresa eligió («En la barra», hasta 3; sin ninguno, el por defecto): el primero siempre y los
  demás desde 56 rem de barra; por debajo, y en la copia del menú, el primero y «+N» en la esquina (no ensancha la barra). Al abrirlo, todos
  los vigentes con quién y cuándo cambió el valor por última vez (nunca el correo) y, para quien gestiona los tipos de cambio, el lápiz
  «Cambiar el valor de <nombre>»: Enter guarda, Esc cancela, el motivo junto al campo; con algo escrito el popover no se cierra al tocar
  afuera; sin red, lo escrito queda y se guarda al volver; un `PT409` dice «<Nombre> lo cambió a <monto> hace N minutos» con «Recargar».
  Con el Modo Live, cifras ocultas y sin lápiz. Al pie, «Compartir» (toda persona; con el Modo Live no se ofrece, y con un valor a medio
  editar espera: «Termina de cambiar el valor para compartir.») y «Configurar los tipos de cambio» (quien gestiona). **«Compartir»** cambia el
  contenido del popover por su panel (`Volver a los tipos de cambio`): casillas de los activos (por defecto los de la barra; sólo para ese envío),
  la imagen y el texto tal como saldrán (logo, nombre, momento en la zona de la empresa, un tipo por línea, leyenda) y los botones, que se apagan
  con su motivo («Elige al menos un tipo de cambio.», «Este navegador no permite copiar imágenes.»). Celular con menú del sistema: «Compartir» (imagen
  y texto; sin archivos, sólo el texto), «Copiar texto» y «Descargar»; escritorio: «Copiar texto», «Copiar imagen» y «Descargar» (PNG). Si la imagen
  falla, «No se pudo armar la imagen.» con «Reintentar» y el texto sigue disponible; sin red, «No hay conexión.»; el panel se desplaza con los botones a
  la vista. En el
  celular menú, Live y avatar miden 44 px y la barra cabe al 200 %; el tipo de cambio sólo se dibuja con 24 rem o más. El botón «Buscar»
  (44 px) abre la paleta (`Ctrl/Cmd+K`) y la campana trae los avisos; el widget del chat flota fuera de `/chat` y no va en la barra.
- **Permisos en UI**: ocultar lo que nunca va a usar; deshabilitar con motivo lo que espera poder hacer (**dominancia**: lo que no puede dar
  nunca se esconde). RLS es la seguridad. **«Ver como»:** banner fijo «Viendo como <rol> · Salir»; cambia lo que se ve, no lo que se puede.
- **Conflictos:** todo formulario de edición manda `actualizado_en` esperado; `PT409` → «X cambió esto hace N min · ver / recargar». Barras
  que se desplazan: degradado en el borde por donde siguen. **Movimiento**: transiciones con View Transitions (un fundido corto) y
  `prefers-reduced-motion`.

### Agenda (estados propios)

| Estado                       | Qué se ve                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cargando                     | Esqueleto de la barra, las filas de la hoja y la columna; los pendientes con su propio esqueleto (la hoja no los espera). «Ver más» dice «Cargando…» y queda apagado.                                                          |
| Día vacío                    | Las 12 horas y arriba «Nada agendado hoy.» (otro día: «Nada agendado este día.») con «Nuevo». Si «Qué ver» excluye lo que hay: «Nada de lo que elegiste ver este día.»                                                         |
| Semana o mes vacío           | «Nada agendado en este rango.» con qué cambiar.                                                                                                                                                                                |
| Sin pendientes               | «Nada pendiente.» · «Lo vencido y lo que no tiene fecha aparece aquí.» Un grupo vacío no se dibuja.                                                                                                                            |
| Tope de 200 por clase        | `<AvisoDeTope>`: en semana y mes, «Mira un día o quita clases en «Vista y opciones».» con «Ver el día»; en el día, quitar clases (o «Mi agenda» con «De todos»).                                                               |
| Tope de pendientes           | «Mostrando los 500 más antiguos.» («las 500 más recientes» en «Sin fecha»).                                                                                                                                                    |
| Error del día                | La pantalla de error con «Reintentar».                                                                                                                                                                                         |
| Error de pendientes          | En la columna, «No pudimos leer tus pendientes» con «Reintentar»; la hoja sigue. «Ver más» que falla: el motivo y «Reintentar», sin perder lo cargado.                                                                         |
| Sin permiso para crear       | «Nuevo» siempre está: Evento y Tarea no piden permiso; Recordatorio sólo con `leads.editar`. Sin `leads.ver`, el evento no ofrece «Lead (opcional)».                                                                           |
| Sin `agenda.ver_todo`        | No existe «Qué agenda ver»; `?de=todos` se ignora. Con «De todos», los pendientes siguen siendo «Los tuyos.».                                                                                                                  |
| Lead que no se ve al guardar | Junto al campo: «No encontramos este lead o no tienes acceso.»                                                                                                                                                                 |
| Formulario del evento        | Todos los campos a la vista, en un solo nivel: título, empieza, termina, «Lead (opcional)», quién lo ve, «Lugar (opcional)» y «Descripción (opcional)».                                                                        |
| Cambiar de responsable       | En el panel de la tarea, sólo para quien puede reasignarla: una sección a la vista («Cambiar de responsable») con el selector y «Reasignar», apagado sin persona elegida o en curso; el error de la base va junto al selector. |
| Conflicto `PT409`            | Los paneles con su aviso y «Recargar»; «Completar», el toast de conflicto con «Recargar».                                                                                                                                      |
| Sin red                      | «Vista y opciones» apagado; «Completar» avisa que no llegó; «Ver más» con «Reintentar».                                                                                                                                        |
| Texto al 200 %               | La columna pasa debajo (consulta de contenedor en rem), la hora en `minmax(0,4.5rem)`, chips con `break-words` y barras con `flex-wrap`: nada ensancha la página.                                                              |

### Chat (estados propios)

- **Entrar:** `chat.participar`; sin él, «sin permiso» y no se lee nada. `?c=` ilegible = «Elige una conversación»; una conversación que ya
  no es mía (salí, la borraron, perdí `chat.global`) dice «Esta conversación ya no es tuya», nunca un 404. En el celular, lista y hilo son
  dos pantallas.
- **Lista:** esqueleto con la forma de las filas; vacío de primera vez que invita a iniciar una; error con «Reintentar»; «Ver más» hasta el
  tope. No leídos «99+».
- **Hilo:** esqueleto que reserva el alto; error con «Reintentar» (sin redactor); sin mensajes, «Escribe el primero». «Ver anteriores» por
  cursor y, en el tope, `<AvisoDeTope>` con «Ir a una fecha» (desde una fecha el hilo no sigue lo nuevo y dice cómo volver).
- **Enviar:** Enter envía, Mayús+Enter salta de línea; se ve al instante («Enviando…»). Sin red o rechazado queda «No enviado ·
  Reintentar» con el motivo; reintentar reusa el mismo `id` y nunca duplica. Pasado el largo máximo, el motivo bajo el campo.
- **Responder:** desde el «⋯» del mensaje (siempre visible, 44 px en celular): «Respondiendo a {nombre}» sobre el redactor con «Quitar
  respuesta». La cita va arriba del texto; sin original legible, «Mensaje no disponible»; borrado, «Mensaje eliminado».
- **Editar:** sólo lo propio, hasta 15 minutos (se mide al abrir el «⋯»; la base manda), en la burbuja: Enter guarda, Esc cancela;
  «Guardar» apagado vacío, sin cambios o guardando. Un rechazo se dice dentro y conserva el texto. Lo editado dice «editado».
- **Borrar:** el autor o quien tiene `chat.moderar`, con diálogo por URL (`?panel=borrar-mensaje&mensaje=<id>`; uno no cargado o que ya no
  se puede borrar avisa y se limpia). No se deshace: queda «Mensaje eliminado» para todos.

### Empresa (estados propios)

- **Entrar:** `empresa.ajustes.gestionar` o `empresa.tipos_cambio.gestionar`; cada sub-sección se edita con su permiso, sin él
  deshabilitada con el motivo arriba; sin ninguno, «sin permiso». Cada sub-ruta tiene su esqueleto.
- **Datos de la empresa:** seis **tarjetas de ajustes** (Identidad, Región, Datos legales y de contacto, Políticas, Íconos de la app, Enlaces de ayuda) que muestran
  lo guardado («Sin dato» si falta); tocar la tarjeta o «Editar…» en su «⋯» abre su modal (`?panel=identidad|region|datos-legales|politicas|iconos`),
  con «Cancelar» y «Guardar»: sin cambios guardar cierra; con cambios, Esc pregunta «Seguir editando» o «Descartar». Mientras guarda, el modal
  se apaga. Color sin contraste, logo inválido y zona inexistente: motivo junto al campo. Sin conexión, lo tipeado
  queda y se guarda solo al volver; Datos legales repone su borrador con el «Descartar» de su aviso. Sin `empresa.ajustes.gestionar`, se ve todo con
  «Editar…» apagada en el «⋯» y el motivo; «Íconos de la app» sin logo, apagado con su motivo; «Volver a los íconos neutros» va en el «⋯». PT409: «Recargar».
  **Enlaces de ayuda** (después de Región, para que las seis entren a 1440×900): la tarjeta nombra el primero con «y N más» y, junto al título, «N enlaces» (con tope «20+»); su «⋯» lleva «Editar…» y «Nuevo enlace». El modal
  (`?panel=enlaces-de-ayuda`, a pantalla completa en el celular) tiene «Nuevo enlace» arriba y la lista con el dominio y su estado («En el menú» o «No se ve en el menú»); cada fila,
  su «⋯» (Editar, Subir, Bajar, Desactivar o Activar con «Deshacer», Quitar con `<Confirmar>` que nombra el enlace, `?panel=quitar-enlace-de-ayuda&enlace=`). Nuevo y Editar
  (`?panel=nuevo-enlace-de-ayuda|editar-enlace-de-ayuda`): título (hasta 80), dirección y descripción opcional (hasta 140); una dirección sin `https://` dice «Escribe una dirección que
  empiece con https://.» junto al campo. Con 30, «Nuevo enlace» apagado con el motivo. Conflicto: «Recargar» conserva lo tipeado; sin red, se guarda solo al volver. Sin
  `empresa.ajustes.gestionar`, la tarjeta apagada con su motivo.
- **Monedas y tipos de cambio:** arriba la **moneda base** (código, nombre y símbolo) con «Cambiar la moneda base…» en su «⋯» (o tocando la tarjeta), que abre su modal (`?panel=moneda-base`): con datos cargados
  el campo queda apagado con su motivo; sin `empresa.ajustes.gestionar`, apagada. Debajo, un grupo por **par de monedas** (el de la base primero) con una
  tarjeta por tipo de cambio: nombre, «★ Por defecto» o «Inactivo», el valor grande, «Cambiado por X · fecha» y el interruptor «En la barra», que guarda al
  tocarlo (apagado con su motivo si el tipo está inactivo o ya hay 3: «quita uno para sumar este»). La tarjeta abre su panel (`?tc=`: el valor y su historial; el
  por defecto no se desactiva; nada se borra); el «⋯» lleva «Cambiar el valor» y «Usar por defecto». «Tipo de cambio» de cada par abre el panel de crear con
  las dos monedas elegidas (`?par=`); con un solo par o ninguno, la pantalla dice cómo empezar. Al pie, secundarias: «Monedas activas» (chips) con «Gestionar monedas…» en su «⋯»
  (la lista de hoy en un modal; una moneda se abre en su panel) y «Al compartir» con la leyenda y «Editar la leyenda…» (modal con «n de 120»; vacía, no se muestra;
  `PT409` con «Recargar»). Sin `empresa.tipos_cambio.gestionar`, todo a la vista y esas líneas del «⋯» e interruptores apagados con su motivo.
  **Comprobantes:** una tarjeta «Serie de comprobantes» con la serie vigente y el próximo comprobante; «Cambiar la serie…» en su «⋯» abre su modal (`?panel=serie`) y guarda con su versión (`PT409` con «Recargar»).
  **Integraciones:** una tarjeta por integración (apibara, Web pública, Avisos push, Asistente de IA) con su estado («Activa», «Apagada» o «Falta la clave») junto al
  título, lo guardado como texto (la clave sólo dice «Guardada el …»: no se muestra nunca) y el interruptor, que guarda al instante. «Configurar…»
  en el «⋯» (o tocando la tarjeta: dirección y plataformas de apibara, dirección de revalidación) y la clave o el secreto («Cargar la clave», «Reemplazar la clave») son modales
  distintos (`?panel=apibara|clave-apibara|web-publica|secreto-web-publica`), una escritura cada uno. «Ver uso» y «Probar» van en el «⋯» y su
  resultado, en la tarjeta; apagados con su motivo («Guarda la dirección para probar.»). apibara no se activa sin su clave. Sin
  `empresa.ajustes.gestionar`: todo a la vista con «Configurar…» apagada e interruptores apagados y el motivo arriba; un `?panel=` a mano se rechaza.
  **Asistente de IA:** la cuarta tarjeta. Lo guardado: Proveedor, Dirección, Modelo, Clave («Guardada el … · termina en ····abcd», «No se puede ver: sólo
  reemplazar.»; sin ella, «Falta la clave»), Prompt base (dos líneas o «Sin prompt base»), Atajos (los activos en su orden, tres con nombre y «y N más»; «Ninguno
  activo») y «Usos de este mes» (hasta 5 personas «Nombre · n» y «y N más», con su alto; «Nadie lo usó este mes.»; si no se leyeron,
  «No se pudieron leer los usos.»). El interruptor no enciende sin clave («Carga la clave para activarlo.»). En el «⋯»: «Configurar…» (también tocando la
  tarjeta; `?panel=asistente-ia`: DeepSeek llena la dirección y el modelo y se leen, «Otro proveedor» los deja escribir; si la dirección nueva cambia el
  origen con una clave guardada, el modal avisa antes de que se borra), «Editar el prompt base y los atajos…» (`?panel=indicaciones-asistente-ia`,
  `ancho="amplio"` y a pantalla completa en el celular: el prompt base con «n de 4.000» y la lista de atajos con «Nuevo atajo» arriba, cada uno con nombre,
  instrucción, «Activo» y su «⋯» con Subir, Bajar y Quitar; todo en un «Guardar»), «Cargar la clave» / «Reemplazar la clave» (`?panel=clave-asistente-ia`) y
  «Probar conexión» (apagada con «Carga la clave para probar.»). La respuesta de la prueba va en la tarjeta, en un área de alto reservado con la pista
  «Prueba la conexión desde el «⋯» para ver qué responde el proveedor.»: «Respondió el modelo X.» o el error con su acción («La clave del asistente no es
  válida.» con «Reemplazar la clave»; uno que el proveedor rechaza, «Configurar en Integraciones», que abre el modal del proveedor).

### Vehículos (estados propios)

- **Entrar:** `vehiculos.ver` en algún origen; pestañas = orígenes donde lo tiene, también desactivados («Inactivo»); sin ninguno, «sin
  permiso» diciendo a quién pedírselo. Origen desactivado: se edita lo que hay; «Nuevo», `N` y `?panel=nuevo` no abren nada.
- **Lista:** esqueleto; vacío de primera vez con la frase del origen y «Nuevo» si puede; vacío por filtro con «Limpiar filtros»; error.
  Filtros: los «filtrables» del origen más subasta, fase, categoría y año; lo inválido en la URL se ignora; cambiar de pestaña suelta los filtros.
  «Subasta» (`?subasta=`, una a la vez, sólo en un origen de subasta): «Cualquiera» (por defecto), «Cierra hoy», «Cierra en 48 h», «Cierra esta semana» (lunes a
  domingo; las tres cuentan desde ahora en la zona de la empresa y sólo traen vivas), «Todas las vivas», «Sin resolver» y «No ganadas»; sin elegir, la lista no
  trae las no ganadas, y elegirlas es la forma de verlas. Justo debajo, «Orden» (`?orden=`, sólo en un origen de subasta): «Más recientes» o «Cierre más
  próximo», que es el de siempre cuando «Subasta» tiene valor; por cierre van primero las vivas por su cierre, después las vivas sin fecha y al final el resto
  por alta, y sobre la lista dice «Cierre más próximo primero» (en otra página, «Volver al principio»). «Fase» (`?fase=`, varias a la vez): las fases del
  origen y «Sin fase»; filtra la columna, así que la fase de la subasta trae todo lo que está en ella, viva o no. En un origen de subasta, un atajo «Sin
  resolver N» (hasta «99+») arriba de la lista pone o quita `?subasta=sin_resolver` de un toque; sin ninguna pendiente y sin el filtro puesto, no se dibuja.
- **Alta y edición (panel):** «Datos principales», «Precio» y una sección por grupo del layout, todas a la vista; rechazos junto al campo (VIN o lote repetido también). Conflicto: quién y cuándo, «Ver cómo quedó» y «Recargar».
- **Fotos:** elegir (selector, soltar o cámara) las deja en una bandeja sin subir que dice lo que no entra y por qué (no es foto, > 25 MB,
  repetida, pasa de 24). «Subir N fotos» con avance; un fallo se dice entero con «Reintentar las N que faltan». Reordenar con botones o
  `Alt+←/→`; eliminar con «Deshacer». Todo eso, en el drawer «Editar imágenes» del «⋯» (`?panel=imagenes`, con
  `&para=<id>` en la lista; esqueleto mientras se lee; con fotos elegidas sin subir, cerrar pregunta; al cerrar, la lista o la ficha ya tienen la portada
  nueva). Un `para` que no es un id, de otro origen o que no se ve: el drawer dice «No existe o no tienes acceso». La ficha no tiene bloque «Fotos»: se
  editan sólo en «Editar imágenes» y se ven en la tira de la cabecera.
- **«⋯» del vehículo** (el mismo, en este orden, en la fila, la tarjeta y la ficha; `accionesDeVehiculo()`): **«Cotizar vehículo»**, la acción principal (en
  negrita, con su icono y sola en su bloque: la hoja con el vehículo y su origen, sin lead y con `returnTo` = de donde salió, la lista con su consulta o la
  ficha; sin `cotizaciones.crear` en el origen no está) · «Editar» · «Editar imágenes» · «Publicar en la web…» («Editar publicación…» si ya está publicado) ·
  «Actualizar los datos» · «Ver actividad» (`actividad.ver`) · y, separada, «Enviar a la papelera». Editar, imágenes y actualizar: con `vehiculos.editar` en
  el origen y un vehículo que no edita, apagadas con «No tienes permiso para editar este vehículo.»; sin la clave en el origen, no están. «Actualizar los
  datos» sólo en un origen de subasta con apibara encendida (si no, no está); sin enlace, lote ni VIN, apagada con «No tiene enlace, lote ni VIN para
  consultar la subasta.». Sin nada que ofrecer, no hay «⋯».
- **Actualizar los datos** (`?panel=actualizar-datos`): «Consultar a apibara gasta cuota. ¿Actualizar ahora?» con «Sí, actualizar» / «No, volver»; consulta
  con el diálogo abierto (no se cierra mientras tanto), cierra y dice el resultado («Subasta actualizada.», «Subasta consultada: no había datos nuevos.»,
  «Se conservó lo que editaste: …») y, si trajo fotos que faltan, las trae con su aviso de progreso. Clave o cuota en falta: «Ir a Integraciones» para quien
  configura; al resto, el motivo y «Pídele a quien administra la empresa que revise la integración con apibara.». Un fallo del momento, «Reintentar»; otra
  persona editó, «Recargar». Sin red, «Sí, actualizar» apagado con «No hay conexión. Vuelve a intentar cuando vuelva.». Un `para` que no está en la página o
  que no se puede consultar no abre: avisa y limpia la URL.
- **Vitrina:** «Publicar en la web…» en el «⋯» (en la lista, sin permiso no está; en la ficha, apagado con motivo). Panel `?panel=vitrina` (en la lista,
  `&para=<id>`, leído al abrirse, con esqueleto): interruptor, precio público (vacío = «Consultar»), rango, nota, destacado y «Así lo verá el visitante».
  Si la fase no publica o la web está apagada, «Publicado, no visible». Desde la lista, «Sacar de la web» es un toque con «Deshacer».
- **Papelera:** enviar no pregunta: se hace con «Deshacer» 10 s, desde el «⋯» o eligiendo filas (casilla sólo en las que puede). El
  resultado se dice entero; lo publicado se despublica; lo que no puede ir (vinculado a un lead, fuera de su fase inicial) va apagado con
  motivo. Pantalla por lote; restaurar vuelve sin publicar; purgar (`vehiculos.papelera.purgar`) nombra lo que borra y un lote de varios
  pide tipear «purgar N»; si otra persona ya actuó, no se purga nada.
- **Limpieza automática** (importados de subasta, con el interruptor encendido): dentro de 3 días, banner en la ficha con «Conservar»;
  conservado, «Quitar». Listado: filtro «Se limpiará pronto» e insignia con fecha.
- **Situación** (`<BadgeDeSituacion>`, en la tabla, la tarjeta, la ficha y el panel de logística): la fase con su color, o
  «En subasta», «Sin resolver» o «No ganada» con su texto cuando la subasta manda. Las no ganadas no salen en el inventario por defecto.
  **Aviso de la ficha** (bajo la cabecera, sólo «Sin resolver» y «No ganada»): «La subasta terminó y sigue en «<fase>». ¿La ganamos?»
  (o «…y todavía no tiene fase.») con «La ganamos» (enlace al mover de logística en su modo) y «No la ganamos» (hecho con «Deshacer» 10 s);
  enviando, «Guardando…» apagado. Sin permiso de mover en el origen, el texto sin botones y «Para resolverla hace falta poder mover de fase
  en «<origen>»: pídeselo a quien administra los roles.». Conflicto: el texto de la base con el nombre, «No se cambió nada.» y «Recargar».
  Error: «No pudimos guardar el resultado. Intenta de nuevo.»; sin red, el aviso de siempre. No ganada: «No ganada · la marcó <nombre> el
  <fecha>. Ya no cuenta en logística ni en Inicio.» (sin el nombre si no se pudo leer) con «Deshacer». En subasta o en su fase, sin aviso.
- **Ficha (`/vehiculos/[id]`):** sin `logistica.ver`, sin «Ver en logística»; sin `cotizaciones.ver`, ni
  «Cotizaciones de este vehículo» ni el grupo Cotizado ni la fila «Costo estimado»; sin `cotizaciones.crear`, sin «Cotizar» en el título; sin
  `cotizaciones.aprobar`, «Aprobar esta» apagado con su motivo; un `PT409` al aprobar dice quién y cuándo; sin `leads.ver`, sin «Relacionados»; sin
  `actividad.ver`, sin «Actividad reciente»; sin `repuestos.ver` o sin proyecto, sin «Repuestos · Proyecto #N»;
  sin ninguno de los tres bloques, la derecha queda vacía y sin índice. «Actividad reciente»: esqueleto, «Sin cambios en los últimos N días.», «No se pudo cargar la actividad» con
  «Reintentar». La foto: sin fotos, el recuadro 4:3
  con su ícono (el «⋯» y la vitrina igual encima) y sin tira; con una, sin tira ni flechas; si la lectura falla, la portada en su lugar y el visor dice «No
  se pudieron cargar las fotos.» con «Reintentar». La vitrina de la foto sin `vehiculos.vitrina`: apagada (`aria-disabled`) con el motivo para el lector y
  en un aviso al tocarla. Subasta y costo: mientras se lee, su esqueleto; sin aprobada, «Costo estimado» dice «—» (y «Cotizar»); en Modo Live, el costo no es botón
  (sin «Compartir») y los montos van tapados; origen manual, sin cuenta ni «Compra directa», «Precio» y «Costo estimado»; subasta sin fecha de cierre,
  «Sin fecha de cierre»; fuera de «En subasta» (cerrada, ganada), sin cuenta; sin poder editar, «Editar fechas de subasta» no aparece en el «⋯». «Datos principales»: sin datos clave
  guardados, los de fábrica de su tipo; un dato vacío, «—». La ficha completa sin red: «Sin conexión. No se pudo abrir esto.» con «Reintentar»; mientras
  lee los grupos, su esqueleto, y si falla, «No pudimos cargar la ficha del vehículo.» con «Reintentar». Sin fase: «Sin fase» en la cabecera. Subasta sin
  resolver: el aviso de arriba con «La ganamos». Sin red: el índice funciona (son anclas); lo diferido dice «Sin conexión» en su lugar con «Reintentar».

### Relacionados (estados propios)

Arriba de cada detalle, en dos presentaciones que elige cada lugar (`presentacion`, obligatoria): **en una línea** en logística
(la página de la unidad y el drawer de `/logistica/gastos?vehiculo=`), y **compacta** en las fichas (`/vehiculos/[id]`, un bloque de la columna derecha, con `leads.ver`; `/leads/[id]`, el bloque
«Vehículos» de la columna derecha, con «Vincular o marcar» en su título y la gestión al pie, con `vehiculos.ver`). Tres grupos: **Vinculado**, **Interesado** y **Cotizado** (éste sólo con `cotizaciones.ver`). **Un grupo sin nada (ni lo que no se ve) no
se dibuja**, y sus acciones no se pierden: van al «⋯» «Más acciones de «Relacionados»» del bloque o de la línea.

- **En una línea:** `<section aria-label="Relacionados">` sin encabezado, con un chip por grupo con algo («Vinculado · n»; 44 px en el celular, 32 en escritorio) y, si hay acciones de grupos
  que no se dibujan, el «⋯» pegado al último chip. Cada chip abre un popover (su código se pide al primer clic) con el grupo: leyenda a la vista, filas, acciones y «Ver todos» (que cierra el
  popover antes de abrir su drawer). Al 200 % los chips y el «⋯» bajan de renglón; el popover no pasa del ancho de la pantalla.
- **Compacta:** `<section aria-label="Relacionados">` con el `h2` «Relacionados» y su «⋯», y los grupos con algo en una grilla en rem (`auto-fit`, mínimo 16 rem: una columna en el celular o
  en una lateral angosta; en pantallas grandes los grupos con algo llenan el ancho, sin pistas vacías, y las filas de un grupo van en la misma grilla; al 200 % caen columnas, no ensancha), sin borde por grupo. Cada grupo: una línea de título con el `h3` «<Tipo> · n», «Ver todos» y el «⋯» del
  grupo («Más acciones de «<Tipo>»»), hasta 3 filas y lo que no se ve contado. **Sin leyendas a la vista:** la leyenda es el `title` del `h3` y la descripción del grupo para el lector
  (`aria-describedby` a un texto `sr-only`). Sin botones sueltos: las acciones del grupo, en su «⋯»; las de cada fila, en el de la fila.
- **Filas:** desde un vehículo, el lead (nombre enlazado, números como siempre, «Fuera de tu cartera» si se ve enmascarado, nunca el teléfono); desde un lead, el vehículo (miniatura que abre
  la galería, título enlazado, origen y n.º). Debajo, lo propio del tipo: «Desde el <fecha>», la nota del interés con quién lo marcó, o «Cotización N.º n · <fecha>». «⋯» con las acciones.
- **Leyendas:** vehículo: «El lead dueño o comprador de este vehículo.», «Leads que mostraron interés en este vehículo.», «Leads con una cotización activa de este vehículo.». Lead:
  «Vehículos de los que este lead es dueño o comprador.», «Vehículos que le interesan a este lead.», «Vehículos con una cotización activa para este lead.».
- **Acciones** (cada una por su permiso y sus banderas; la base vuelve a exigirlas): «Cotizar», «Ver cotización», «Quitar interés» (en el lugar, con «Deshacer»), «Desvincular» (desde un
  vehículo, su confirmación `?panel=desvincular`; desde un lead, con la cartera en el lugar con «Deshacer», sin ella lleva a `?seccion=vehiculos&panel=desvincular&vinculado=<id>`), «Vincular a un lead» (sin
  vínculo) y «Marcar un interesado» (los dos abren el selector de leads de la ficha: `?panel=vincular-lead`, `?panel=marcar-interesado`; en un resumen o en la unidad llevan a la ficha con el panel
  abierto), «Vincular o marcar» (desde un lead: en el título del bloque «Vehículos», abre `?panel=agregar-vehiculo`; no va en ningún grupo) y «Ver todos» (`?relacionados=vinculado|interesado|cotizado`: un `<Drawer>` de a 20 por cursor con
  «Ver más» hasta 500, `AvisoDeTope`; se abre en el lugar, la ficha o la unidad; el de Vinculado en un vehículo trae el vínculo vigente y los anteriores; el enlace abre su drawer
  aunque el grupo no se dibuje).
- **Estados:** cargando, `EsqueletoDeRelacionados` del alto de lo que viene (tres chips en una línea; el `h2` y tres celdas en la compacta);
  error «No pudimos cargar los relacionados.» con «Reintentar» (sin encabezado en una línea, bajo el `h2` en la compacta; la pantalla sigue); vacío total «Sin relacionados todavía.» con **una**
  acción a la vista (la primera: vincular) y el resto en el «⋯»; lo que quien mira no ve, «1 que no puedes ver» / «3 que no puedes ver», sin datos (el grupo se dibuja; un vínculo oculto no
  ofrece vincular, y «Desvincular» queda en su grupo); sin `leads.ver` (o `vehiculos.ver` desde un lead) no hay bloque; sin `cotizaciones.ver` no hay grupo Cotizado;
  conflicto `PT409` con el texto de la base y «Recargar»; tope «100+» en el chip o en el título del grupo y, en «Ver todos», «No pudimos revisar el resto: hay muchos que no puedes ver.» si el recorrido se cortó.

### Leads: configuración (estados propios)

- **Campos** (`leads.campos.gestionar`; sin él, apagada en el menú): el mismo editor de campos que un origen, sin casillas ni «Comunes»:
  buscador y «Nuevo campo», los grupos como en el formulario con sus insignias («En la tabla», «Filtrable», «Solo la cartera», «De fábrica»),
  el arrastre dentro del grupo, el «⋯» y el panel `?campo=`; «Desactivados» a la vista, debajo, con «Activar» en su «⋯». Fijos: teléfono, nombre, tipo y
  que el lead tenga origen.
- **El grupo de un campo se elige** (glosario «Grupo de campos»): en el panel, «Grupo» es un combo con buscador que ofrece los activos del layout; lo
  escrito con otra escritura de uno que existe no se crea («Ya existe «Datos del Cliente».»; inactivo: «… (inactivo): actívalo en «Grupos».») y, si
  no hay coincidencia, la última opción es «Crear grupo «x»». El valor guardado que se desactivó se ve «X (inactivo)».
- **«Grupos»** (botón de la cabecera, antes de «Nuevo campo»): un drawer `?panel=grupos` con el nombre arriba («Agregar»; «Renombrar «X»» al
  tocar una fila, con «Cancelar»), la lista con cuántos campos tiene cada uno y su «⋯» (Renombrar · Desactivar o Activar · Subir · Bajar · Quitar…).
  Quitar (`&quitar=<id>`) pregunta nombrándolo; con campos, ««X» tiene 3 campos. Muévelos antes de quitarlo.», «Mover sus 3 campos a…» («Sin
  grupo» o otro activo) y «Mover y quitar». Vacío: «Todavía no hay grupos» / «Créalos aquí o desde el campo.». Conflicto `PT409` con «Recargar»,
  que conserva lo escrito; tope de 100 con `AvisoDeTope`. Sin permiso, la lista de sólo lectura con el motivo, sin el nombre ni Subir y Bajar.
- **Impacto, siempre con números y dentro del panel:** volver requerido (cuántos leads no podrán guardarse hasta completarlo); cambiar el
  tipo o eliminar con datos; sacar una opción en uso; dejar de ser «solo la cartera». Conflicto con «Recargar».
- **Orígenes del lead, tipos de lead y tipos de seguimiento** (modales `?panel=origenes|tipos|seguimientos`, patrón de `shared/ui/lista`, sin título
  propio: la lista y, en el pie del modal, «Nuevo origen» / «Nuevo tipo»; en el vacío lo lleva el estado vacío): icono
  y nombre, estado y «⋯» (Editar · Subir · Bajar · Activar/Desactivar con «Deshacer» · Eliminar); tocar la fila la edita; lo imposible, apagado con
  motivo. Modal por URL (nombre ≤ 40, sin repetidos). Eliminar, apagado si algo lo usa (la papelera cuenta). Tope 100: al llegar, «Nuevo» apagado con su motivo.
- **Origen por defecto:** a lo sumo uno, siempre activo; no se apaga ni elimina mientras lo sea. **Tipo de lead:** su clase
  («Prospecto»/«Cliente») se elige al crear y no cambia; el último activo de una clase no se desactiva ni elimina. **Tipo de seguimiento:**
  cualquiera se apaga.
- **Dónde se nota:** el alta ofrece los activos (si el elegido se apaga mientras se escribe, el guardado falla y lo demás queda); la ficha
  conserva uno apagado como «(inactivo)»; el CSV acepta nombre o clave de un activo y nunca crea.
- **Embudo, mensaje del portal y teléfonos extra:** un modal de formulario por tarjeta (`ModalDeFormulario`): «Guardar» apagado mientras guarda, cambios sin guardar
  preguntan antes de cerrar, el rechazo junto al campo y `PT409` con «Recargar» dentro del modal (lo escrito queda). «Restablecer» es una confirmación aparte desde la
  tarjeta; apagada si ya es lo de fábrica. «Números repetidos»: cargando, error con «Reintentar» y lista.

### Flujos: configuración (estados propios)

- **Entrada:** la pestaña Fases de un origen con `flujos.configurar` o `logistica.catalogos.gestionar` en ese origen, y Repuestos › Configuración ›
  Flujo con `repuestos.configurar`; sin el permiso, la pestaña va apagada con su motivo y su URL dice «No puedes abrir esta pestaña».
- **Lectura** (sólo los catálogos de logística en el origen): el diagrama y la lista se ven y se tocan (abrir una fase la muestra), sin «Nueva fase»,
  sin mover, vincular ni ordenar, sin «Empezar el flujo» ni «Revisar»; la barra dice «Toca una fase para verla.» y «Las fases las cambia quien tiene el
  permiso «Configurar el flujo».». Los catálogos de arriba sí se cambian.
- **Sin selector:** cada página abre un flujo fijo, nunca el de otro origen. Vacíos: el flujo sin fases («El flujo de <origen> todavía no tiene
  fases.»); el flujo que desapareció.
- **Empezar el flujo** (el vacío del flujo sin fases): «Cópialo de otro origen y ajústalo, o arma las fases una por una.» con «Empezar con las
  fases de…» (primario) y «Empezar en blanco» (abre «Nueva fase»); en el celular, uno bajo otro a lo ancho. Sin otro origen con fases que quien
  mira configure (y siempre en el de repuestos), sólo «Nueva fase». «Empezar con las fases de…» (`?panel=copiar-fases`, modal): «Origen» (los
  flujos de vehículos con alguna fase activa, por su nombre), la línea de qué se copia y «Copiar las fases». Sin nada saltado, toast «Fases de
  <origen> copiadas.» y cierra; con algo saltado, el mismo modal dice «Listo. Esto no se copió:» con una línea por cosa («Y más…» pasadas 50) y
  «Listo». Un conflicto cierra el modal y avisa arriba con «Recargar»; otro rechazo queda en el modal. La URL con el flujo ya con fases o sin de
  dónde copiar no abre: se avisa y se limpia.
- **Barra del flujo** (sobre las fases): «Fases» con «Toca una fase para editarla. El orden se cambia desde su «⋯».» (en la lista, «En el orden del
  flujo: toca una fase para editarla.»), «Reglas del flujo» (abre el panel, según los permisos), el grupo «Catálogos» («Catálogos de logística (drawer)»), «Ver como lista» / «Ver como
  diagrama» (en todo ancho, con fases), «Nueva fase» sólo en la lista (en el diagrama va en su barra flotante; no sin fases: lo ofrece el vacío) y, si no
  se puede ordenar, el motivo en texto. Se parte en renglones; botones de 44 px en el celular.
- **Diagrama** (`diferido()`, por defecto desde 768 px; ocupa el alto que queda de la pestaña, mínimo 24 rem, medido: no salta al llegar): cada
  fase como caja **donde se la dejó** (la posición es una, del flujo, para todos); sin ninguna movida, el acomodo automático en su orden, de
  izquierda a derecha. Las jubiladas apagadas y punteadas; cada caja con el borde de su color, el nombre, «Inicial», «Final», «Subasta» o
  «Jubilada», sus requisitos y quién la mueve en corto y el ícono con sus avisos de «Revisar»; las salidas como flechas con su acción, que siguen
  a sus cajas (punteadas hacia una jubilada). Fondo de puntos cada 2 rem; las cajas caen en la rejilla de 1 rem.
  - **Mover:** arrastrar una caja la deja ahí **sin cambiar el orden** (el orden va por el «⋯»); con una caja enfocada, las flechas la mueven
    1 rem (con Shift, 10), la vista la sigue si sale del lienzo y la ráfaga se guarda junta. Se guarda al soltar; sin conexión, la línea de estado dice «Sin conexión: la posición se
    guarda cuando vuelva.» y se reintenta sola; un conflicto lo descarta con el aviso del flujo. **Ctrl/Cmd+Z** deshace el último movimiento
    (hasta 50; fuera de un campo).
  - **Barra flotante** (arriba a la izquierda, «Herramientas del diagrama»): «Nueva fase» (nace en el centro de lo que se ve), «Ordenar solo»
    (vuelve todas al acomodo automático, toast «Fases reacomodadas» con «Deshacer»; apagado si ya están ahí o con la lista cortada, con su
    motivo), «Acercar», «Alejar», «Ver todo el flujo» y una línea de estado con alto reservado.
  - **Crear:** doble clic en el vacío abre «Nueva fase» (`?panel=nueva-fase&en=x,y`); creada, nace ahí y se abre su panel.
  - **Vincular:** el **asa de la fase** (el punto a su derecha, «Crear una salida desde «X»») se arrastra hasta otra caja: nace la salida (sin
    acción) y se abre el panel de la fase de origen con esa salida en edición. Soltar en el vacío no crea nada; a sí misma, repetida o hacia
    una jubilada, el motivo de la base aparece junto al punto unos segundos.
  - **Flechas:** su etiqueta es un botón «Salida de «X» a «Y»»: tocarla abre esa salida en edición; enfocada, Supr la quita (con
    `<Confirmar>`).
  - Tocar una caja abre su panel y la centra en lo que el panel no tapa. La rueda desplaza el lienzo; Ctrl/Cmd + rueda o el pellizco, zoom.
    Minimapa abajo a la derecha desde 768 px con 6 fases o más. Es un apoyo visual: «Ver como lista» es la versión para lector.
  - **Celular:** con «Ver como diagrama» se ve y se toca (abrir una fase o una salida, zoom), sin asa ni arrastre: la línea de estado dice «Para
    mover o vincular, usa una computadora.».
  - Esqueleto del alto del lienzo mientras llega; si el código no llega, «Sin conexión…» con «Reintentar» y la lista debajo. Muchas fases: el
    lienzo desplaza y hace zoom, la página no se ensancha.
- **Lista de fases** (patrón de `shared/ui/lista`; la del celular por defecto y la de «Ver como lista»): en el orden de la base, nombre con su color
  (texto y color, nunca sólo color), las marcas, la insignia de «Revisar» («1 aviso») y las salidas; la fila abre el panel. Vacía, su
  frase; tope 200 con aviso.
- **Panel del flujo** (`?fase=<id>` o `?seccion=reglas`, `<Drawer>` por URL; sobrevive a recargar, «atrás» y Esc lo cierran):
  desde 1024 px va al costado y no es modal (el diagrama sigue a la vista y tocar otra fase cambia el panel sin cerrarlo); más angosto, el
  drawer modal (en el celular, las pestañas a lo ancho con 44 px). De una fase: arriba el nombre (el título), su «⋯» a la derecha de la ✕ (Mover antes, Mover
  después y Jubilar o eliminar, cada una apagada con su motivo debajo; el foco queda en el «⋯» al mover) y los avisos de «Revisar»; debajo, **tres pestañas**
  (`&pestana=reglas|identidad|ajustes` en la URL: sin ella, o con otro valor, Reglas; cambiar de pestaña reemplaza la entrada del historial y abrir otra fase
  vuelve a Reglas; las tres quedan montadas, así que lo escrito sobrevive): **Reglas** (abre primero; sin acordeones) con «Requisitos para entrar»,
  «Salidas y quién mueve» y «Reglas que la afectan» (cada regla del flujo que deja o no encender un interruptor de la fase, con «Cambiar las reglas del
  flujo»); **Identidad** (nombre, descripción, color e icono) y **Ajustes** («En el flujo», «Alerta por demora», «Transporte y aduana» y «Web y portal»).
  Identidad y Ajustes son un solo formulario: un «Guardar» y un «Cancelar» al pie, que sólo se ven en esas dos pestañas. Una pestaña con un error adentro lleva
  un punto rojo y «con errores» en su nombre accesible; con algo escrito sin guardar, un punto azul y «con cambios sin guardar». Al guardar con un error en la
  pestaña que no se ve, el panel la abre y le da el foco al primer campo con error. Una fase jubilada lleva su aviso con «Reactivar» sobre las pestañas.
  Los roles por nombre («otro rol» si no estaba entre los 100 leídos). Gana `?seccion=` sobre `?fase=`; un id ajeno al flujo o una sección que no se ve se ignoran. Abrir otra fase o
  sección limpia lo que abría la anterior.
- **Conflicto:** «Otra persona cambió este flujo · Recargar» arriba cuando una escritura choca (`PT409`); se va al llegar la versión nueva.
  En un modal, «Recargar» va dentro y lo escrito queda.
- **Estados:** esqueleto (`loading.tsx` y el del `Suspense`), error con «Reintentar» (el de `(app)`), sin permiso. Una URL escrita a mano
  que no apunta a algo que existe se avisa y se limpia.

### Flujos: revisar (estados propios)

- **Lugar:** franja sobre el selector, con un flujo leído. Lo mismo (una sola lectura) se marca sobre el diagrama: el ícono y la
  descripción de cada caja («1 error y 2 avisos de Revisar»), la flecha de una salida a una jubilada, la insignia de la fila de la lista y,
  arriba del panel de la fase, sus avisos con la palabra del nivel. Mientras se lee o si falla, una caja no dice «sin avisos».
- **Cerrada (al entrar):** resumen con icono y color («Revisar: Todo en orden», «Revisar: 1 error y 3 avisos»; la información no cuenta;
  más de 200, «Más de 200 avisos»). Sin filas, el resumen es texto, no botón.
- **Abierta:** cada aviso con icono y la **palabra** del nivel (nunca sólo color) y el texto de la base, error › aviso › información; uno
  de una fase lleva «Abrir la fase» (suma al historial). Tope 200 con aviso.
- **Tras guardar** se relee sola, sin esqueleto y sin cerrarse; cambiar de flujo la cierra. Primera lectura, una línea «Revisando el
  flujo…»; si falla, su línea con «Reintentar» (lo ya leído queda).
- **No frena:** avisa y abre; nunca impide guardar (un flujo a medio armar siempre tiene avisos). No arregla solo.

### Catálogos de logística (drawer)

Orígenes › un origen › Fases: arriba del diagrama, el grupo «Catálogos» con cuatro botones `outline` (Puertos · Navieras · Categorías de gasto · Tipos de
documento; 44 px en el celular, `h-8` desde 768 px; en el flujo de repuestos, sólo Tipos de documento). Cada uno abre su drawer (`?panel=puertos|navieras|
categorias-de-gasto|tipos-de-documento`, suma al historial; «atrás» y Esc lo cierran y el foco vuelve al botón): un solo `<Drawer ancho="amplio">` siempre
montado que cambia de contenido (a todo lo ancho en el celular). Lo ve quien abre la pestaña Fases; lo cambia quien tiene `logistica.catalogos.gestionar`
en el origen (los tipos propios, también quien configura el flujo).

- **Grupos:** «De <origen>» y «Compartidos», cada uno con su título, su vacío («Ninguno sólo de <origen>.», «Ninguno compartido.»; con los dos vacíos,
  «Todavía no hay <catálogo> en <origen> ni compartidos.») y su tope con `<AvisoDeTope>`. Esqueleto de dos bloques; error con «Reintentar».
- **Tapado:** el compartido que tapa un propio activo de su misma clave lleva «Tapado por el de <origen>» («Tapada por la de…») en la línea de su nombre.
- **Nuevo:** un solo «Nuevo …» arriba («Nuevo puerto», «Nueva naviera», «Nueva categoría», «Nuevo tipo de documento»); el modal empieza por «Para»:
  «Sólo de <origen>» (por defecto) o «Compartido con todos los orígenes» (`?de=origen|compartido`).
- **Editar:** un toque en la fila (o Enter) abre «Editar …»; editar un compartido avisa arriba «Cambia para todos los orígenes que lo usan.».
- **«⋯»:** Editar · Activar o Desactivar. Ningún catálogo se elimina (se desactiva), salvo un tipo de documento sin uso.
- **Sin permiso en el origen:** el drawer abre igual, en lectura: «Nuevo …» y el «⋯» apagados con «Pídele a quien administra los roles el permiso de
  configurar la logística.».
- **URL:** un catálogo que no es de este flujo (`?panel=puertos` en el de repuestos) se limpia; otro `?panel=` (una fase nueva, fuera de regla) se ignora.
  Estados de cada catálogo: «Logística: estados propios» (catálogos) y «Flujos: tipos de documento (estados propios)».

### Flujos: tipos de documento (estados propios)

Orígenes › un origen › Fases › «Tipos de documento» arriba del diagrama, en su drawer (`?panel=tipos-de-documento`; también en el flujo de repuestos), el
cuarto de «Catálogos de logística (drawer)». Hermana de «Tipos de seguimiento» (patrón de `shared/ui/lista`, orden con teclado, «⋯», modal por URL), con
**dos grupos**, **sólo lectura con motivo** y **una lista que se relee** (ninguna RPC la devuelve).

- **Grupos:** en el panel, «De <origen>» («Del flujo de repuestos»; «Sólo se piden en <origen>.»: `flujos.configurar`, `repuestos.configurar`
  o `logistica.catalogos.gestionar` del origen) y debajo «Compartidos» («Se piden en cualquier flujo que los use y no los tape con uno propio.»:
  `logistica.catalogos.gestionar` en cada origen que los usa), cada uno con su orden y su tope («N de 100 tipos posibles.»). Un solo «Nuevo tipo de
  documento» arriba del drawer; la fila de un propio dice «Abrir <nombre>» y la de un compartido «Editar <nombre>».
- **Tapado:** el compartido que el flujo tapa con un propio activo de su misma clave (mayúsculas, tildes y espacios de más no cuentan) lleva
  «Tapado por el de <origen>» («… el del flujo de repuestos») en la línea de su nombre, sin salto; se sigue editando y lo que ya lo pide no
  cambia. Un requisito nuevo no lo ofrece; el que ya lo pide lo nombra «X (tapado por el de <origen>)» y «Revisar» lo avisa (información).
- **Filas:** nombre, insignias con texto («Renueva cada 365 días», «Pide fecha», «Portal», «Desactivado»), estado y uso acotado («más de
  50»; «—» a quien no puede cambiar el grupo). **Con uso, «Eliminar» está apagado**: se desactiva en lugar de eliminarse.
- **Sin permiso sobre un grupo:** editar y ordenar apagados con su motivo; sin poder crear en ninguno, «Nuevo tipo de documento» apagado con «Pídele a
  quien administra los roles el permiso de configurar la logística.». En el modal, la opción de «Para» que no puede elegir va apagada con su motivo
  («No puedes configurar los tipos de documento de este flujo.» o el de los compartidos); una URL escrita a mano no abre lo que no puede: avisa y se
  limpia (`de=compartido` sin el permiso abre en «Sólo de <origen>»).
- **Modal** (`?accion=nuevo-tipo&de=origen|compartido`, sin `de` = `origen`; `?accion=editar-tipo&tipo=<id>`): al crear, «Para» («Sólo de <origen>» o
  «Compartido con todos los orígenes»); al editar un compartido, el aviso «Cambia para todos los orígenes que lo usan.»; nombre, descripción, formatos (al menos uno), vencimiento («No
  vence», «Quien lo sube escribe la fecha», «Vence tantos días después de subido») con días de vigencia y de aviso (cambiar de modo vacía
  los que ya no aplican), «Se puede mostrar en el portal» (lo ya mostrado sigue) y, al editar, «Activo». Borrador en `sessionStorage` por
  grupo y tipo.
- **Crear desde un requisito:** «Crear tipo de documento» junto al selector del requisito de documento (y en su vacío) abre el mismo modal sin salir de
  la fase («Sólo de <origen>» por defecto); el creado queda elegido en el selector.
- **Eliminar** (`?accion=eliminar-tipo&tipo=<id>`, `<Confirmar>`): sólo uno sin uso; si entre tanto llegó uso, la base lo desactiva y el
  aviso lo dice.
- **Conflicto:** «Recargar» y lo escrito queda; uno que otra persona eliminó con el modal abierto lo dice. Un nombre repetido en el grupo
  (23505) o un origen que lo usa sin permiso (42501) dicen el texto de la base. Esqueleto de dos bloques.

### Flujos: fases (estados propios)

Lo que el diagrama, la lista de fases y las pestañas Identidad y Ajustes del panel suman a «Flujos: configuración». Mismo patrón que «Tipos de documento».

- **Nueva fase** (`?panel=nueva-fase`, «Se agrega al final del flujo.»): nombre, color de una paleta cerrada (con su nombre en texto) y tipo
  (Intermedia, Inicial, Final); se crea al final del orden. Desde el diagrama (`&en=x,y`), nace donde se pidió y abre su panel; desde la lista, al
  lado de la última y el modal se cierra. Nombre repetido, junto al campo. Con 200 fases, apagado con su motivo.
- **Ordenar:** «Mover antes» y «Mover después» en el «⋯» del panel (con el teclado; el foco sigue en el «⋯» al llegar el orden nuevo) y, en la lista, «Subir/Bajar X». Con
  la lista cortada por el tope (más de 200 fases) todo se apaga con «Hay más de 200 fases: con la lista cortada no se puede ordenar.».
- **Filas de la lista:** «Subir/Bajar X» y el «⋯»: activa → Editar · Jubilar o eliminar; jubilada → Editar · Reactivar (sin
  «Deshacer»).
- **Jubilar o eliminar** (`?panel=eliminar-fase&quitar=<id>`, `<Confirmar>`): al abrirse lee qué usa la fase. Sin unidades ni historial se
  elimina (no se deshace); con ellas se jubila (siguen en ella, deja de ser destino, se puede reactivar). Bloqueada (otras fases la
  esperan, única inicial activa): el motivo y «Confirmar» apagado. Si el uso cambió en el medio, decide la base y el aviso lo dice.
- **Panel › Identidad y Ajustes** (`?fase=<id>&pestana=identidad|ajustes`, `bloques.pestanas`): **Identidad** (nombre, descripción, color,
  icono; sin bloque propio: la pestaña ya lo titula) y, a la vista en **Ajustes**, **En el flujo** (inicial, final, pide nota al entrar, es logística, «Es la
  subasta»: apagado con «Sólo en el flujo de un origen de subasta.» fuera de uno), **Alerta por demora** (días: vacío usa la de la empresa, 0
  la apaga; repetir cada 1 a 720 horas), **Transporte y aduana** (permite contenedor, permite aduana, llegada de repuestos) y **Web y
  portal** (se publica en la web, visible en el portal, nombre y descripción para el cliente). Un solo formulario con un solo «Guardar»: manda sólo lo que cambió y queda abierto.
  - Errores junto a su campo, con el foco en el primero (inicial y final a la vez; portal sin nombre para el cliente); con el error en la otra pestaña, ésta se abre.
    Marcar «Es inicial» no desmarca a la otra: avisa.
  - Una regla del flujo apagada (Aduana, Logística, Vitrina web, Portal del cliente) deja su interruptor deshabilitado con el motivo; en
    repuestos, «No existe en el flujo de repuestos.». Uno ya encendido siempre se puede apagar.
  - Borrador en `sessionStorage` por fase («Recuperamos…»); sin conexión, sale al volver. Una jubilada también se edita, con su aviso.
  - Cerrar el panel con algo sin guardar en Identidad o Ajustes pregunta como siempre, aunque se esté en Reglas (la pestaña lleva su punto).

### Flujos: requisitos para entrar (estados propios)

Bloque de la pestaña «Reglas» del panel de la fase (`?fase=<id>`): el resumen («Datos: 1 (bloquea)»), la lista y «Agregar requisito».

- **Fila:** descripción en una línea («Pagos confirmados: 50 % del precio», «Título · 1 a 3 archivos · PDF, JPG»; clave desconocida, «Dato:
  <clave>»), notas, interruptor «Bloqueante» (`aria-label` con la descripción), `<Badge>` «Bloqueante» o «Informativo», orden y «⋯» con
  Editar y Quitar. Los tipos de documento se nombran al llegar (una lectura por flujo, `leerOpcionesDeRequisitos`).
- **Agregar** (`?agregar=nuevo&forma=elegir|dato|documento|espera`): selector Dato / Documento / Espera («Dato» apagado si ya los pide
  todos; «Espera» si la regla «Esperas» está apagada) y la forma en línea (un modal no abre otro). **Dato:** las claves del ámbito que aún
  no pide; «Pagos confirmados» pide porcentaje (1 a 100); se ofrece aunque su regla esté apagada, con la nota de que nadie podrá cumplirlo.
  **Documento:** tipo (activos; los del flujo marcados; sin ninguno, enlace a Documentos), mínimo y máximo de archivos (enteros ≥ 1, máximo
  ≥ mínimo), formatos (ninguno = los del tipo). **Espera:** una fase activa del otro flujo (un vehículo espera a sus repuestos y viceversa).
  Nace informativo y lo dice. Motivos junto al campo; lo escrito queda.
- **Editar** (`?editar=requisito&requisito=<id>`): el formulario de su tipo en el lugar de «Agregar»; manda sólo lo que cambió (sin
  cambios no llama a la base); no cambia clave, tipo ni «Bloqueante». Una sola forma abierta.
- **Bloqueante:** apagar guarda directo. Encender lee antes cuántas unidades quedarían fuera de regla: sin ninguna guarda; con alguna,
  confirma en línea (no destruye nada) diciendo cuántas y que no se mueven, quedan marcadas («Más de 50…»; si la base revisó 1.000, lo
  dice). Recargar descarta el aviso; el foco vuelve al interruptor.
- **Fuera de regla** (`?panel=fuera-de-regla`): sobre la lista de fases, «N unidades fuera de regla» (acotado) con «Ver cuáles»: por fase,
  el título y cuántos requisitos le faltan; «Verlas en el inventario» (`/vehiculos?origen=&fase=<fase>`, no en repuestos). Lo oculto dice «Un
  vehículo que no puedes ver». Tope 50 con aviso. Sólo lista.
- **Quitar** (`?eliminar=requisito&quitar=<id>`, `<Confirmar>`): irreversible.
- **Estados:** sin requisitos, tope de 500 con aviso, error al leer los tipos, conflicto (el aviso del flujo), sin permiso (`42501`).

### Flujos: salidas y quién mueve (estados propios)

Bloque de la pestaña «Reglas» del panel de la fase (`?fase=<id>`), las flechas del diagrama y los chips de la fila de la lista. «Salida» es una transición que
sale de la fase; «entrada», una que llega. Una salida se agrega en el panel o arrastrando el asa de una caja a otra
(«Flujos: configuración» › Diagrama).

- **Quién puede mover a esta fase:** «Hoy pueden mover: Dueño, Logística» o «Cualquiera con el permiso de mover», con la nota de que quien
  puede mover a cualquier fase siempre puede. Selector de roles (vacío = cualquiera con el permiso) y «Guardar quién mueve». Un rol fuera
  de los 100 leídos se dice «otro rol» y se conserva.
- **Entradas:** «Se llega desde: …»; sin ninguna, lo dice (distinto en una inicial).
- **Fila de salida:** «Embarcar → Embarcado» (sin acción, «Mover → …»), quién mueve por ella (su lista, «(los de la fase)» o cualquiera),
  «Pide nota» y «Jubilada» como `<Badge>`, «Editar» y «Quitar» (`aria-label` con el destino).
- **Agregar salida** (estado local, en línea): destino (activas, distintas, que aún no son salida), acción (≤ 40; vacía, «Mover») y «Pide
  nota al mover». Sin destino posible, apagado con su motivo.
- **Editar una salida** (en el lugar de la fila; `?editar=salida&editada=<id>`, así la abre una flecha del diagrama o la recién vinculada): el destino no cambia (para otro, quitar y crear); acción, nota y «Quién puede mover por
  esta salida» (vacío = la lista de la fase destino). Un «Guardar» manda lo que cambió; el foco vuelve a «Editar»; mientras, lo demás
  espera. Si acción y nota entraron y los roles no, sigue abierta con el motivo y otro «Guardar» manda lo que falta.
- **Quitar** (`?eliminar=salida&salida=<id>`, `<Confirmar>`): irreversible, no mueve a nadie.
- **Chips:** «→ Embarcado · Embarcar» con el color del destino y texto; hasta 3 y «+N más»; no son enlaces.
- **Estados:** sin salidas, tope de 500 con aviso, conflicto, sin permiso (`42501`), red caída (el reintento repite el id: «ya existe» se
  toma por hecho). Cerrar el panel con algo escrito pregunta.

### Flujos: reglas y oferta de transporte (estados propios)

Orígenes › un origen › Fases › «Reglas del flujo» de la barra del flujo, en su panel (`?seccion=reglas`): las reglas del flujo y, con «Transporte»
encendida, la oferta. Escribe quien configura
el flujo; la base vuelve a decidir.

- **Reglas:** una fila por regla del ámbito (repuestos no tiene «Vitrina web», «Portal del cliente» ni «Aduana») con su interruptor
  (`role="switch"`, nombre = la regla), qué permite y qué enciende. Sigue a lo que lee el servidor: un apagado que no se hace no «salta»;
  con un envío en vuelo todos se apagan.
- **Apagar con uso:** no escribe; bajo la regla dice qué fases o requisitos de espera la usan («más de 50») con un enlace al panel de cada una.
- **Sin uso:** apaga al momento con toast y «Deshacer» (también al encender), que usa la última versión conocida del flujo.
- **Oferta de transporte:** casillas de puertos de origen, de destino y navieras activos que usa el origen del flujo (sus propios y los
  compartidos que no tapa; el de repuestos, los compartidos), «Guardar oferta» y «Ofrecer todos»; sin marcar ninguno («Vacío: se ofrecen
  todos.»), se ofrece todo lo que usa el origen. Uno guardado y luego desactivado se ve «(inactivo)» para poder quitarlo. Tope 200 con aviso. Las
  marcas sin guardar sobreviven a cambiar otra regla.
- **Vacíos:** sin navieras o puertos («Todavía no hay navieras cargadas. Se cargan en «Navieras», arriba del diagrama.»; en el flujo de repuestos,
  «…, en las fases de un origen.»), sin flujos configurables, flujo que ya no existe.
- **Conflicto:** «Recargar» arriba (lo marcado queda mientras la oferta guardada no cambie). Una regla que dejó de poder cambiarse se dice
  con un toast y se relee. **Sin permiso:** todo apagado con su aviso.

### Logística: estados propios

La unidad se dibuja de dos maneras: en su página `/logistica/vehiculo/<id>`, **en zonas** (escritorio) o **en bloques con una barra «Mover»** (celular y tableta vertical; `<PaginaDeLaUnidad>`), y, dentro
de un drawer: el de `/logistica/gastos?vehiculo=<id>`, con una **sección a la vista por hueco** que monta su contenido al acercarse (`<PanelDeLaUnidad>`), y el del ítem de repuesto (`?item=`), cuyas piezas (`<QueFaltaDelItem>` y una tarjeta por hueco, `<TarjetaDelHuecoDelItem>`) las coloca `repuestos` en su panel en dos columnas (el atajo de una falta abre la tarjeta
de su hueco).

- **Entrada:** la unidad se lee bajo la RLS de `vehiculos` y se pide `logistica.ver` en su origen; sin esa clave, «No tienes permiso para
  ver esto». Lo que no existe, está en la papelera, no se ve o trae un id inválido: «Este vehículo ya no está disponible» con «No existe o
  ya no tienes acceso.» e «Ir a Logística» (nunca «sin permiso»: confirmaría que existe). En el drawer, el mismo estado va dentro.
- **Cabecera** (≤ 7,5 rem en la página): la portada (`w-28`, 4:3, con las fotos en el lugar), título (el primer `h2`), origen, situación (`<BadgeDeSituacion>`: la fase, «Sin fase», «En subasta» o «Sin resolver»), «Desde hace N días en esta fase», «Abrir
  ficha» y «Relacionados» de un vehículo **en una línea** (con `leads.ver`; ver «Relacionados (estados propios)»; «Desvincular» y los selectores de leads llevan a la ficha). En un drawer, la cabecera es una columna suelta y los relacionados, también en una línea.
- **Zonas** (página, desde 1024 px de pantalla; las dos columnas con alto fijo desde 56 rem de contenedor, por debajo una columna con alto natural): **principal**, «Qué falta» con mover, siempre a la vista, hasta el 55 % del alto, con su propio desplazamiento y la fila del botón pegada abajo;
  debajo, **pestañas** con su propio desplazamiento cada una: Documentos · Transporte · Repuestos · Aduana · **Dinero** (gastos, pagos y margen apilados); a la derecha, **lateral**: Notas · Historial. Cada hueco aparece con su permiso en el origen y su regla del flujo encendida; una pestaña sin
  huecos no se dibuja («Dinero» existe si hay alguno de los tres) y una zona vacía deja que la grilla se reacomode. La pestaña elegida va en `?hueco=` (sin recargar, sin sumar al historial). Lo de cada pestaña se monta la primera vez que se elige y queda montado: la nota a medias, el borrador de transporte
  y la bandeja de documentos no se pierden. Los atajos («Ir a Documentos», «Ir a Gastos») eligen la pestaña y llevan el foco a ella. **Subir documentos** va en un drawer (`?subir=documentos`) abierto por el botón «Subir documentos» del hueco (apagado, con «Necesitas permiso para subir documentos.» escrito debajo, sin `logistica.documentos.subir`); con archivos en la bandeja cerrar pregunta, y al terminar sin fallos se cierra solo (con fallos queda abierto con «Reintentar los N que faltan»). En el celular y en los drawers la bandeja sigue en línea. En escritorio se piden al abrir tres huecos (Qué falta, Documentos, Notas); en el celular, uno.
- **Celular y tableta vertical:** una columna, una sección a la vista por hueco (monta su contenido al acercarse) en este orden —qué falta, documentos, notas, historial, transporte, repuestos, aduana, gastos, pagos, margen— y una barra «Mover» pegada abajo (44 px, sólo con `flujos.mover` del origen y el hueco «Qué falta»)
  que lo trae a la vista y le da el foco. Si el flujo del origen no se pudo leer, los huecos que piden una regla no se dibujan y una línea lo dice; el resto sigue. La ficha del
  vehículo lleva «Ver en logística» (un enlace corto de su cabecera, con `logistica.ver`) a `/logistica/vehiculo/<id>`.
- **«Qué falta» y mover** (el primero): una tarjeta por destino (las salidas de la fase actual; sin fase, las iniciales)
  con cada requisito y su estado **dicho con texto** («Cumplido» / «Falta»), «Obligatorio» / «Informativo», su detalle («1 de 2
  aprobados») y, en cada falta (obligatoria o informativa), **lo que la destraba**: un botón chico con el verbo («Subir», «Revisar», «Completar»,
  «Registrar», «Ir a Documentos/Transporte/Aduana/Pagos/Repuestos/Cotizaciones», «Ir al vehículo», «Ir al proyecto», «Vincular», «Pedirlo»; el nombre accesible
  lleva el objeto: «Subir «BL»») y, si hay más, hasta dos en el «⋯» del requisito («Más acciones de «BL»»). Mide 44 px en
  el celular: la tarjeta no crece. «Subir» abre «Subir documentos» con el tipo elegido (drawer en escritorio, la bandeja del bloque en el celular); con uno
  ya subido, «Revisar» lleva a Documentos con el grupo del tipo a la vista (no se aprueba sin mirar el archivo); «Completar» lleva el foco al campo del
  transporte; «Registrar» abre «Registrar pago» vacío. Quien no puede: «Pedirlo» (con `agenda.tareas.asignar`) o «Pídeselo a quien administra los roles.»
  (en la línea sin otra acción; como nota del «⋯» si hay una). Lo que nunca podrá no aparece. Regla apagada (quien tiene la clave del hueco y el hueco no
  se dibuja): ninguna acción. **En un drawer** (gastos, ítem), lo que sacaría de la pantalla dice «Abrir la unidad». La ficha del vehículo no lo
  dibuja: enlaza a la unidad. **Sin red**: todo apagado y
  «Sin conexión: las acciones vuelven con la red.» en la línea viva. La franja «fuera de regla» sigue con su enlace. **«Pedírselo a alguien»**
  (`?pedir=requisito&falta=<id>`, un modal): la descripción es el título de la tarea («Falta: BL aprobado para pasar a «Embarcado»»); cargando, tres
  renglones; quién puede como radios (una sola persona, ya elegida; con más de 20, «Busca por nombre» desde 3 letras); nadie: «Nadie que pueda recibir
  tareas tiene permiso para <verbo> en este origen.» y a quién pedírselo; error con «Reintentar»; sin permiso de dar tareas o sin acceso, lo dice.
  «Pedírselo a <Nombre>» («Pidiendo…», el modal no se cierra); si esa persona ya no recibe, «Esa persona ya no puede recibir tareas. Elige otra.» y la
  lista se relee; al lograrlo se cierra con «Se lo pediste a <Nombre>: tiene una tarea en su agenda.». Ya no falta al abrir: «Eso ya no falta.». «Elegir» abre en el bloque la nota interna (obligatoria si
  la fase o la salida la piden) y el botón con la acción de la salida; apagado, su motivo va escrito debajo («Falta: BL aprobado.», rol,
  nota, permiso del origen). `Ctrl/Cmd+Enter` envía. Al lograrlo la tarjeta cambia de columna y el foco vuelve al título del panel.
  **«La ganamos»** (`?ganada=si`, desde la ficha o desde la línea «La subasta terminó y nadie dijo si la ganamos.» · «La ganamos» de este
  bloque): cabecera «La ganamos: elige a qué fase pasa. Se anota como ganada al moverla.», sólo los destinos que no son la subasta, el
  primero abierto con su vista previa; mover la anota ganada en la misma operación y avisa «La ganamos: <título> pasó a «X».». Ya no sin
  resolver: «Esta subasta ya no está sin resolver.» y la lista de siempre. Sin destinos fuera de la subasta: «Desde aquí no hay una fase
  después de la subasta.» o, sin fase, «Primero muévela a su fase inicial; después, «La ganamos» ofrece la siguiente.». Rechazos y
  conflicto, como al mover.
  **Conflicto:** dentro del formulario, quién la movió y cuándo, «No se movió nada.», «Ver cómo quedó» (otra pestaña) y «Recargar», que
  conserva la nota. Una unidad **fuera de regla** lo dice arriba. Estados: esqueleto, error con «Reintentar», sin fase, sin destinos, tope
  de 12 destinos con aviso, «Actualizando…» al releer (al volver el foco, mínimo 5 s entre lecturas); sin permiso de mover, la lista sin
  «Elegir».
- **Hueco «Transporte»:** «Ruta» (naviera, puertos de origen y destino), «Contenedor y booking» (en mayúsculas y sin espacios) y «Fechas y
  notas» (zarpe, ETA, arribo, notas ≤ 2.000) con un «Guardar» que manda sólo lo que cambió (apagado sin cambios, guardando o sin permiso).
  El selector ofrece la oferta del flujo que usa el origen (vacía = todo lo activo que usa el origen: sus propios y los compartidos que no tapa)
  y siempre lo guardado, rotulado «(de otro origen)», «(tapado)», «(inactiva)» o «(fuera de la oferta)», en ese orden; nunca se vacía.
  Rechazo de la base por algo de otro origen: «Esa naviera es de otro origen.», junto a su campo.
  Rechazos junto a su campo (ETA antes del zarpe, la fase no permite o exige contenedor) con el foco al primero; conflicto dentro del
  formulario con «Recargar», que conserva lo escrito. Sin `logistica.transporte.editar` del origen, campos apagados con su motivo. Vacíos:
  sin transporte cargado; sin navieras (con `logistica.catalogos.gestionar`, «Cargar navieras»). Guardar relee «Qué falta». Una unidad de
  repuesto: `TEXTO_DE_REPUESTO`. Sobre los campos, una línea de alto fijo (que el esqueleto ya reserva y queda vacía si no hace falta) dice a
  quiénes alcanza lo que se guarda: «Cambia para los N vehículos de este embarque.» (hasta «100+»; con « y otros que no puedes ver» si los
  hay, o «Cambia para este vehículo y otros que no puedes ver.»), «El booking cambia para los N vehículos de este contenedor.» en un
  contenedor sin embarque, o «Esta unidad todavía no tiene transporte cargado.»; tipear o guardar no la mueve. Un booking nuevo crea su
  embarque; uno que ya existe en el origen no acepta, de paso, otra naviera o fechas («El embarque «X» ya existe: guarda el booking y después
  cambia sus datos.», junto a «Booking»).
- **Notas e historial** (zona lateral en la página; secciones a la vista en un drawer o en el celular): «Notas» con «Escribir una nota» (`<Textarea>`, contador de 2.000, «Guardar nota», `Ctrl/Cmd+Enter`; el
  error junto al botón y el texto queda) y las notas de la más nueva: quién, cuándo, texto; la que dejó un cambio de fase dice «al pasar a
  «<fase>»» y no se edita. «Editar» sólo la propia, en el lugar. **No hay «Borrar»**: la base no deja el borrado suave por `update` (pide
  una RPC). «Historial», sólo lectura: una línea por cambio, quién («Sistema» sin persona), cuándo y la nota. Las dos: de a 20 con «Ver
  más» hasta 500 (`<AvisoDeTope>`), «Ir a una fecha» y «Volver a los más recientes»; esqueleto, vacíos y error dentro del bloque.
- **Lote** — con `flujos.mover` en el origen, cada fila de la lista de una fase lleva casilla de 44 px y la cabecera «Elegir los de esta página» (los de la página, hasta 200; «Sin fase» no ofrece selección). Una sola fase: elegir en otra vacía la selección y lo dice. Con elegidos, barra fija abajo («N elegidos en «F»»,
  «Limpiar», «Mover a…») que abre `?panel=lote` (claves `destino`, `contenedor`, `booking`; la selección no sobrevive a recargar). El
  drawer: un botón por salida; con destino, «N listas, M no pueden entrar» y una línea por unidad (las primeras 20 con «Mostrar todas»), la
  nota común, «Mover los N que pueden» (apagado con motivo si ninguna puede) y «Elegir otro destino». El resultado se dice entero («Se
  movieron 6 de 8.», una línea por unidad que no pasó), con «Reintentar los 2» (vuelve a la vista previa con esas) y «Cerrar».
  `?contenedor=` o `?booking=` abre el mismo drawer con las unidades del grupo que estén en una misma fase, y dice cuántas quedan fuera.
- **`/logistica` (la bandeja del día):** a la izquierda en escritorio (arriba en el celular), un bloque por grupo con su título y su número con tope («37», «100+»), las primeras 5 filas y «Ver todos»;
  el orden es Demorados, Trabados, Documentos por aprobar, Documentos por vencer, Llegadas esperadas, Salen hoy y Subastas sin resolver. Cada fila: el nombre del vehículo (enlace a su página; chip de
  origen si hay más de uno), el detalle («Tránsito» · Desde hace 9 días en esta fase, «Falta para «Aduana»: Documento: BL», vence el…, ETA…, zarpa hoy) y su acción a un toque, sólo con su permiso:
  «Mover», «Ver qué falta», «Revisar» (abre «Documentos»), «Renovar» y, en «sin resolver», «La ganamos» y «No la ganamos» (en la fila, con «Deshacer» de 10 s; si otra persona la resolvió, lo dice).
  Estados: esqueleto de tres grupos; **vacía** «Nada pendiente hoy» con «Ver la cadena»; error de **un** grupo «No se pudo cargar «Demorados»» con «Reintentar», sin tumbar los demás; un grupo vacío
  no se dibuja; sin `logistica.documentos.aprobar` o `.subir` esos grupos no aparecen.
- **`/logistica` (la cadena):** pestañas de origen (con uno solo no se dibujan), «dónde está» y la gráfica: una línea con un punto por fase (el color de la fase), su nombre, la cifra grande a la
  derecha (número acotado: `1.000+`), una barra proporcional al máximo del origen con los tramos de demorados y trabados y, en texto, «12 demorados · 3 trabados» (nunca sólo color). Orden: «Sin fase»
  (sólo con vehículos), las activas por orden, las jubiladas con vehículos al final, con «Jubilada» en texto. Cada fase es un enlace a su lista. Estados: esqueleto de la línea; origen sin fases
  (con «Configurar los flujos» si tiene `flujos.configurar`); ningún origen con la logística encendida; sin vehículos («Todavía no hay vehículos en la cadena de este origen.»); error con
  «Reintentar» y «No se pudo comprobar N origen(es).». Un origen sin permiso no tiene pestaña. **Dónde está** (con `q` válido): hasta 10 de todos tus orígenes con su fase; cada nombre lleva a la página
  del vehículo; «Ningún vehículo coincide.», «No se pudo comprobar dónde está.» y «Hay más: escribe más para afinar.». La sub-navegación (Cadena · Embarques · Aduana · Gastos) dibuja sólo lo que la
  persona puede ver; «Cadena» queda marcada también en la lista de una fase y en la de un grupo.
- **`/logistica/fase/[fase]` (la lista de una fase):** encabezado «‹ La cadena», el nombre de la fase («Jubilada» en texto) y su origen si hay varios; `<FilterShell>` (búsqueda y filtros) y una tabla
  desde 768 px (tarjetas por debajo): casilla, vehículo (nombre «<principal> · <título>» como enlace, VIN y lote), estado (días en la fase, «En subasta» o «Sin resolver», «Demorado» en texto),
  contenedor, booking y ETA. De a 50 por cursor, sin total y sin «Anterior» («Siguiente» y «Volver al principio»); la selección sobrevive a «Siguiente». Estados: esqueleto de tabla; vacía «No hay
  vehículos en esta fase.» con «Ver la cadena»; por filtro «Ningún vehículo coincide con los filtros.» con «Limpiar»; página sin filas; error con «Reintentar»; «Esta fase ya no está en la cadena
  de este origen.»; un origen ajeno, «No tienes permiso para ver esto».
- **`/logistica/bandeja/[grupo]`:** el grupo entero, con las mismas filas y acciones que la portada, de a 20 por cursor (con el número «37 en este grupo.» o «100+ en este grupo.» sólo en la primera
  página). Estados: vacío «No hay demorados hoy.» con «Ver la bandeja»; página sin filas; error con «Reintentar»; un grupo que no existe, «Esa bandeja no existe.»; uno que no ve, «No tienes permiso para
  ver esto». En «Trabados» y en los de documentos, si la base paró de recorrer, lo dice («Se revisaron 200 demorados sin encontrar más trabados.») y ofrece «Seguir buscando».
- **Listas de `/logistica/*`** (gastos, embarques, aduana): por cursor de a 50, sin selector, sin total y sin «Anterior» (la base camina
  sólo hacia adelante: «Siguiente» y «Volver al principio»); filtros en la URL; estados: esqueleto de lista, vacío de primera vez, por
  filtro con «Limpiar filtros», página sin filas con «Volver al principio» y error con «Reintentar». Sin permiso, «No tienes permiso para
  ver esto».
- **`/logistica/gastos`** (`logistica.ver` y `logistica.gastos.ver` o `pagos.ver`): vista `?ver=gastos|pagos` (sólo con las dos claves;
  cambiar no conserva filtros); filtros origen (con dos o más), categoría (de todos los orígenes: una propia se nombra «nombre · origen»),
  «Sin confirmar» y rango de fecha; **ninguna suma**. La fila abre
  el panel de la unidad en un drawer (`?vehiculo=`) sin perder filtros ni página y la lista se relee al cerrarlo. El pago confirmado dice «Confirmado»
  con su fecha (quién, en el sello del panel). «Ver todos en Gastos» sale del tope de los huecos «Gastos» y «Pagos», filtrado por origen.
- **`/logistica/embarques`** (`logistica.ver`): `?grupo=embarques|contenedores`; filtros naviera, puertos (de los catálogos activos de
  todos los orígenes: un propio se nombra «Arica · Miami»),
  estado («En tránsito», «Ya llegaron») y búsqueda por booking o contenedor (3). Fila: la clave (abre el resumen), naviera, ruta, zarpe,
  ETA, arribo y unidades acotadas («200+»; «Hay unidades que no ves.»); lo que difiere entre unidades dice «Varias», lo que ninguna tiene
  «—». Si la base revisó una parte sin llenar la página, lo dice y «Siguiente» sigue buscando. **Resumen** (`?booking=` o `?contenedor=`,
  `<Drawer>` que sólo muestra): una fila por unidad con título (enlace si es vehículo), fase, ETA y arribo, con avisos de tope y de ocultas;
  debajo, a la vista y cada uno con su permiso (la base lo exige por unidad): «Mover el grupo», «Subir un documento a las unidades» y
  «Prorratear un gasto entre las unidades». **«Editar grupo»** (con `logistica.transporte.editar` o `repuestos.editar`; `?panel=editar-grupo`
  **tapa** al resumen): ruta, contenedor y booking, fechas; en un grupo por contenedor, una línea sobre los bloques (alto reservado) dice de
  qué embarque es lo que se edita («La naviera, los puertos y las fechas son del embarque «X»: cambian para todos sus vehículos.»; con
  varios, «de sus embarques»); un campo común sale con su valor, uno que difiere sale vacío con «Varios» y
  dejarlo así no lo toca. Con unidades de un solo origen los selectores ofrecen lo que usa ese origen; de varios, sólo los compartidos que no
  tapa ninguno (lo común que no cabe se ve rotulado). «Guardar» manda lo tocado a todas o a ninguna («Se aplicó a las N unidades.»; conflicto «No se cambió ninguna:
  <motivo>» con «Recargar»; el rechazo de una unidad junto a su campo con su título). Más de 200 unidades, ocultas o no editables: botón
  apagado con su motivo.
- **`/logistica/aduana`** (`logistica.ver` lee, `logistica.aduana.gestionar` escribe): filtros `canal`, `pagada` y `q` por número. Fila:
  número (abre el resumen), canal en `<Badge>` con texto, fecha aceptada, tributos («Pagada» o «Faltan los tributos de N», con «y de
  unidades que no ves»; «Sin vehículos»), unidades acotadas y vencimiento en texto (vencida, hoy, mañana, en N días hasta 7, si no la
  fecha; una pagada no se alarma). Resumen en `?declaracion=<id>` (datos y vehículos con «Tiene/Falta el tributo»; sin montos). El hueco
  «Aduana» del panel (regla `aduana`): la declaración vigente, canal, vencimiento y «Tributos pagados: sí|no» con «Ir a Gastos». **Escribir:**
  «Nueva declaración» (`?panel=nueva-declaracion`: número obligatorio y único, fechas, despachante, depósito, notas; borrador) y «Editar»
  (`?panel=editar-declaracion&declaracion=<id>`, no convive con el resumen; conflicto con «Recargar» que conserva lo escrito). «Vehículos
  de la declaración»: «Quitar» marca (con «Deshacer»), buscador (3, hasta 10) con «Agregar» y «Guardar vehículos» manda todo junto (hasta
  200); con canal queda todo apagado: la composición queda fija. «Asignar canal» es un `<Confirmar>` en `?panel=canal` con el selector
  adentro; pide al menos un vehículo. El canal no se quita.
- **Catálogos de logística: estados:** el patrón y la entrada, en «Catálogos de logística (drawer)». Cada catálogo conserva su tope y su aviso.
  Nombre repetido (23505), junto al nombre: «Ya hay un puerto «X» compartido con todos los orígenes.» o «… en <origen>.»; uno
  desactivado lo dice tras el nombre («X» (desactivado)). Sin permiso en un origen que lo usa (42501), arriba: «No puedes cambiar «X»: lo usa <origen>, donde no puedes configurar la
  logística.»; uno propio, «No puedes configurar la logística de <origen>.». Versión vieja o ya no existe («Ese puerto ya no existe.»):
  «Recargar», que conserva lo escrito. Desactivar uno en uso: «Desactivaste «X»: lo usan N transportes u ofertas; siguen mostrándolo.»
  («más de 50»). **Categorías de gasto:** esqueleto, vacío, error con «Reintentar»; el «⋯» lleva Editar y
  Activar/Desactivar (no se eliminan); el orden es un número del modal; una de propósito «Tributos» no cambia de propósito (Aduana la lee).
  **Prorratear** (hueco del resumen de un grupo, `?panel=prorratear`): ofrece las categorías que usan todas las unidades (de varios orígenes,
  sólo las compartidas que no tapa ninguno); muestra cuánto le toca a cada unidad y la suma antes de confirmar;
  sin unidades no hay nada que repartir; más de 200 no se reparte; el equivalente en base lo calcula la base.
- **Estados de la página de la unidad:**
  - Cargando: `EsqueletoDeLaUnidad`, con la forma de las zonas (en `loading.tsx` y en el `Suspense`); un hueco, `EsqueletoDelHueco` mientras llega su código y después el suyo; la foto y los relacionados, esqueletos del mismo tamaño, sin salto.
  - No existe, papelera o no se ve: «Este vehículo ya no está disponible» (sin confirmar que existe); sin `logistica.ver`: «No tienes permiso para ver esto».
  - Sin permiso para un hueco: no aparece, ni su pestaña; la zona vacía no se dibuja. Flujo ilegible: aviso en la cabecera y los huecos con regla no se dibujan. Sin fase: «Sin fase», sin días, y «Qué falta» con los destinos iniciales. «Sin resolver»: la insignia y «La ganamos» en «Qué falta».
  - Error de lectura de un hueco: el suyo, con «Reintentar», dentro de su zona. Error al dibujar un hueco: «No pudimos mostrar «<título>».» con «Reintentar» (`LimiteDelHueco`); sin red al pedir su código: el aviso de `diferido` en su zona. Conflicto (`PT409`): como en mover, transporte y documentos.
  - Topes: documentos 50 con `<AvisoDeTope>`; notas e historial «Ver más» hasta 500 con «Ir a una fecha»; gastos y pagos 50 con «Ver todos en Gastos».
  - Límites: con «Ver como» la franja hace desplazar la página; redimensionar cruzando 1024 px remonta los huecos y pierde lo escrito (`docs/PENDIENTES.md`).

### Tablero: estados propios

- **`/tablero`** (`tablero.metricas.ver`; sin él, «No tienes permiso para ver esto» y sin entrada en el menú; Inicio lo enlaza con «Ver el
  tablero»): período en la URL (`?periodo=mes|mes-anterior|90d`; uno desconocido cae en «Este mes»), tres enlaces con `aria-current`. Cada
  widget con su `<Suspense>` y esqueleto; si falla, «Reintentar» sólo en ése; uno sin permiso no se muestra ni se ofrece.
- **Cifras:** leads creados, convertidos, tasa, cotizaciones, finales; cada una un grupo «Título: valor». Una tasa nula dice «Sin datos»,
  nunca «0 %»; sin leads, «Todavía no hay leads en este período» (con `leads.crear`, «Nuevo lead»).
- **Gráficas** (barras por día de leads y cotizaciones; rankings de leads por origen y por persona y de cotizaciones por origen): leyenda en
  texto, «Ver como tabla» con todos los números (un modal en `?panel=tabla&grafica=<widget>`; el widget no cambia de alto), tope dicho (10 orígenes, 20 personas), vacío y error por widget.
- **«Margen del mes»** (con `logistica.margen.ver` en algún origen; suma sólo esos): monto por `<Monto>` en un grupo llamado sólo «Margen
  del mes» (Modo Live lo oculta entero), nulo «Sin venta registrada»; nota con venta, real y cotizado y cuántos vehículos entran y cuántos
  no tienen venta.
- **«Cola de la web»** (con `web.cola.gestionar`): turnos, tasa de contacto (sin los directos; nula «Sin datos»), mediana hasta «Contacté»,
  la cuenta por estado y «Turnos por persona» con «Ver como tabla».
- **«Personalizar»** (`?panel=personalizar`, conserva el período): una fila por widget visible con «Mostrar X» («Visible» / «Oculto» en
  texto) y «Subir/Bajar X»; guarda al cambiar, sin «Guardar», con los controles apagados mientras guarda; «Restablecer» vuelve al de
  fábrica (apagado si ya está así). Todos ocultos: «Ocultaste todos los widgets».

### Cotización: niveles de acceso y quién crea y quién ve (estados propios)

Configuración › Roles (`/configuracion/roles?bloque=cotizaciones`), dentro del bloque «Cotizaciones» de la matriz. **Un nivel retirado se deshace** y **el motivo de por
qué no se elimina viene de la base**. `?bloque=cotizaciones` desplaza la página hasta el bloque (el título del módulo, o su sección en el celular).

- **Quién entra:** quien ve la matriz (`equipo.roles.ver` o `gestionar`). Con sólo `ver` se lee: sin «+ Nuevo nivel», sin «⋯» y el resumen con los valores en texto; el motivo
  «Para cambiarlo te falta el permiso «Gestionar roles».» está en «Avisos de Roles y permisos» (el «!» del título), no en línea.
- **Niveles de acceso:** un rótulo con ese nombre dentro del bloque y, debajo, «Todos» (renglón fijo con «No se cambia · Lo ve quien ve la cotización», sin celdas ni «⋯») y
  las dos filas de cada nivel (`Ver el nivel «X»`, `Editar el nivel «X»`, con sus celdas por origen). El «⋯» del nivel (Renombrar · Retirar/Restaurar, que guardan solos con
  «Deshacer» · Eliminar) va en la primera fila. Un nivel retirado se apaga y lleva la insignia «Retirado» en sus dos filas; el aviso (`aria-live`) dice ««X» quedó retirado.». «Costos»
  se renombra y retira, no se elimina. «+ Nuevo nivel» va al pie del grupo; en el tope (10 contando «todos» y retirados) se apaga y el motivo queda a la vista. En el celular, el mismo
  grupo va en la lista del rol a la vista.
- **Eliminar con uso:** apagado, con lo que dice la base; sin uso confirma nombrándolo (`?panel=eliminar-nivel&nivel=<id>`). Nuevo y renombrar: modal por URL
  (`?panel=nuevo-nivel`, `renombrar-nivel&nivel=<id>`); vacío, > 40 o repetido se rechaza junto al campo. Estados: si la lista de niveles no carga, «No pudimos cargar los
  niveles de acceso.» con «Reintentar» en el lugar del renglón de «Todos»; la matriz sigue.
- **Dónde se nota:** cada nivel son **dos permisos por origen**; el dueño los recibe al nacer.

#### Quién crea y quién ve

Un modal por URL (`?panel=quien-crea-y-quien-ve`, con `?origen=<id>` para el lugar) que abre el botón «Ver quién crea y quién ve», una fila bajo el título del bloque
«Cotizaciones» de la matriz (en el celular, bajo el título del bloque, en la lista del rol): por rol, si crea cotizaciones y cuáles ve. El botón mide lo mismo siempre;
el cuadro se pide la primera vez que se abre y al cerrar se va también el `?origen=`. Son tres permisos de la matriz de Roles (`cotizaciones.crear`, `cotizaciones.ver`, `cotizaciones.privadas.ver`) dichos en un cuadro;
cada cambio guarda solo, por las mismas RPC que la matriz y con las mismas versiones de rol (un cambio en la matriz y otro en el cuadro no chocan entre sí).

- **Lugar:** «Origen» (`?origen=<id>`) con «Todos los orígenes» y cada origen (los desactivados con «(inactivo)»), sólo con dos orígenes o más o si algún
  rol ya tiene uno de los tres permisos en un origen suelto; sin él, «Todos los orígenes». En un origen vale también lo de «Todos los orígenes»: lo que
  está por debajo de eso queda apagado con «Lo tiene en «Todos los orígenes»: para quitarlo, cámbialo ahí.».
- **El cuadro:** desde 768 px una tabla Rol | Crea | Ve; por debajo, un renglón por rol en la misma tarjeta. «Crea» es un interruptor (`Crea: <rol>`);
  «Ve», un `<select>` nativo (`Ve: <rol>`) con «No ve» · «Sólo las suyas» · «Todas menos las privadas» · «Todas, también las privadas»; debajo, una
  leyenda de cada escalón. Lo que quien mira no tiene no se da: la opción queda apagada con «No puedes dar un permiso que no tienes.». Un rol con permisos
  que quien mira no tiene se lee, con el motivo de la matriz bajo su nombre.
- **Guardar:** una elección puede ser dos RPC sobre el rol (dar «ver» y después las privadas; al bajar, al revés), en orden y con la versión que devolvió
  la anterior; mientras viajan, la fila muestra lo elegido y espera. Conflicto (`PT409`): `AvisoDeConflicto` con lo que dice la base y «Recargar». Si cae
  después de guardar una parte: «Se guardó sólo una parte: recarga para ver cómo quedó.» con «Recargar». Otro error, el toast con su mensaje.
- **Estados:** carga con la matriz (un esqueleto de tres renglones mientras llega su código); sin roles, «Crea uno con «Nuevo rol» para decidir quién crea y quién ve cotizaciones.».

### Cotización: privada (estados propios)

La marca de una cotización que sólo ven quien la creó y quien puede ver las privadas de su origen (glosario: «Cotización privada»). Quién la ve lo decide
la base; la pantalla sólo ofrece la marca a quien la creó y la dibuja.

- **Al guardar una nueva:** en la fila de los pasos de la hoja, el interruptor «Privada» con «Sólo la ves tú y quien puede ver las privadas de este
  origen.» debajo (`aria-describedby`), apagado mientras guarda. Vive en la URL (`?privada=si`); al guardar sale de la URL y «Cotizar otra» nace pública.
- **En una guardada:** el «⋯» de la guardada y el de la fila del listado ofrecen «Hacer privada» o «Hacer pública», sólo a quien la creó (con «Ver como»,
  decide la persona real). Apagada con su motivo: «Una final no se hace privada.», «Es la aprobada de su vehículo: no se hace privada.» o, en la guardada
  con algo sin guardar, «Guarda los cambios primero.». Entra con el toast «La n.º N es privada.» (o «… es pública.») y la página se vuelve a leer.
  Conflicto (`PT409`): el texto de la base y «Recargar»; sin red: «Sin conexión: no se cambió. Reintenta cuando vuelva.».
- **La insignia:** «Privada» con un candado (que no se lee), en la tabla, la tarjeta, la línea de un grupo, el resumen y la cabecera de la guardada.
- **Aprobar una privada:** el botón dice «Aprobar…» y pregunta antes (`?panel=aprobar-privada&para=<id>&desde=…`): «Aprobar la cotización n.º N» con «Al
  aprobarla deja de ser privada: la verá todo el que ve las cotizaciones de su origen.» (en la guardada suma que lo no guardado se pierde). Entra con el
  toast de siempre más «Ya no es privada.» y su «Deshacer» (que no la vuelve privada). Si no entra, el diálogo sigue abierto con el motivo y, si otra
  persona la cambió, «Recargar».
- **Marcarla final:** la pregunta de siempre suma «Al marcarla final deja de ser privada: la verá todo el que ve las cotizaciones de su origen.».
- **Sin permiso:** la privada ajena no existe: no está en el listado, la búsqueda, el buscador, «De este vehículo» ni los relacionados, y su URL dice
  «Esta cotización ya no está disponible: no existe o ya no tienes acceso.».

### Cotización: comentarios (estados propios)

La sección «Comentarios» bajo la hoja de una cotización guardada: un nivel de respuestas, los adjuntos arriba; favorita, reportar y moderar
en la cabecera.

- **Cuándo se lee:** la lista llega la primera vez que la sección está a la vista (o enseguida si la URL trae `?panel=borrar-comentario` o
  `quitar-adjunto`). Esqueleto con el campo dibujado y apagado; vacío; error con «Reintentar»; sin acceso, sin campo.
- **Comentar y responder:** campo arriba (lo más nuevo primero) y «Comentar», `Ctrl/Cmd+Enter`. «Responder» sólo en una raíz (también
  eliminada), al pie de sus respuestas. Vacío o > 4.000: el motivo sin pedir nada; un rechazo deja lo escrito y lo dice bajo el campo.
- **Editar y borrar:** «Editar» sólo lo propio y vivo (`Esc` cancela sin preguntar; conflicto con «Recargar» que conserva lo escrito).
  «Borrar» lo propio o, con `cotizaciones.moderar`, lo ajeno, por `?panel=borrar-comentario&comentario=<id>`; cita el comienzo y, en una
  raíz con respuestas, «Las respuestas quedan.»: queda «Comentario eliminado.» y se va con su última respuesta. Una URL que no abre avisa y
  se limpia.
- **Cuántos:** de a 20 raíces con sus primeras 20 respuestas («Ver más comentarios», «Ver más respuestas») hasta 500; ahí aviso de tope
  con «Ir a una fecha» y «Volver a los más recientes». Sin tiempo real: lo ajeno aparece al recargar.
- **Adjuntos:** leídos con la primera página (esqueleto, vacío, error propio). Quien puede guardar la cotización ve «Adjuntar archivo» (PDF,
  imágenes o Word, ≤ 25 MB, hasta 20 por cotización; imágenes a WebP ≤ 1600 px); en el tope, apagado con su motivo. Lo que no se puede
  subir se dice uno por línea. Cada archivo sube de a uno con su fila; un fallo deja la fila con el mensaje de la base, «Reintentar» y
  «Descartar». Cada adjunto: icono, nombre, tamaño, quién y cuándo; «Descargar» pide una URL firmada al tocarlo (60 s); «Quitar» (quien lo
  subió y aún puede adjuntar, o quien modera) por `?panel=quitar-adjunto&adjunto=<id>`. Sin miniaturas.
- **Favorita, reportar y moderar** (en el «⋯» de la cabecera, tras «Cotizar encima»): «Favorita» (marca privada, optimista; si la base la rechaza vuelve y
  avisa), «Reportar…» (`?panel=reportar`: motivo con contador `n/500`; con uno propio, «Cambiar el motivo» y «Retirar mi reporte» con
  «Deshacer») y, sólo para quien modera (`cotizaciones.moderar` y, en una final, `cotizaciones.final.gestionar` del origen), «Invalidar…»
  en una activa, «Descartar los reportes…» si tiene y «Reactivar…» en una inválida. Insignia «Inválida» (todos) o «Reportada» (sólo quien
  modera: el autor no se entera de un reporte sin juzgar). Moderar: `?panel=moderar&accion=invalidar|descartar|reactivar`, un
  `<Confirmar>` con los motivos (hasta 20) y lo que hace (invalidar: deja de valer y no ancla al vehículo; descartar: borra los reportes;
  reactivar: vuelve a valer y borra los reportes; invalidar y reactivar descartan lo no guardado de la hoja). Entró: aviso y se relee;
  conflicto: el texto de la base con «Recargar»; una acción que ya no corresponde avisa y se limpia. Si la lectura falla, la cabecera sigue
  sin nada de esto.

### Barra de la fórmula (estados propios)

Planilla, Hoja y Tarjeta de la página del origen comparten una barra arriba (glosario: «Barra de la fórmula» y «Estado de la edición»); el editor de la
pestaña va debajo, a todo el ancho, sin otro marco.

- **A la izquierda:** el selector «Fórmula: <nombre> (activa) ▾» y el estado de lo que se edita en una insignia (**Cambios sin guardar**, **Borrador**,
  **Publicada vN**; lo no guardado manda); en la Planilla, junto al estado, el botón ⓘ «Información de la fórmula» (su lugar reservado: nada salta al
  hidratar). **A la derecha:** «Versiones», «Tablas» y lo que manda el editor de la pestaña (`<AccionesEnLaBarra>`):
  «Guardar el borrador», «Publicar…» y su «⋯». En el celular la barra se parte en renglones y nada se sale de su ancho.
- **Versiones** (`?panel=versiones`, en la Planilla): un drawer con las publicadas de la más nueva a la más vieja, con revertir; desde Hoja y Tarjeta el
  botón lleva a la Planilla con el drawer abierto (si hay cambios sin guardar, pregunta antes). **Tablas** (`?panel=tablas`): el drawer de las tablas del
  origen, leídas al abrirlo («Cotización: tablas (estados propios)»).
- **Estados propios:** sin fórmulas, el cuerpo es «Empezar la fórmula» («Empezar en blanco» o «Copiar la de otro origen») y la barra no ofrece
  «Versiones»; con una archivada elegida, «Esta fórmula está archivada: cópiala para seguir editándola.» con «Copiar» e «Ir a la fórmula de trabajo», sin
  el editor; con una `?formula=` que no es del origen o ya no existe, «Esa fórmula no es de este origen o ya no existe: te mostramos la de trabajo.» arriba
  y la de trabajo. Sin permiso para publicar, la acción sigue a la vista apagada con su motivo. Un conflicto (PT409) se dice en el editor, con «Recargar».
- **Fuera de la página del origen** (la puesta en marcha), los botones del editor quedan en su lugar y no hay barra.
- **Mientras carga:** la barra y el editor con su esqueleto; el selector abre su lista (código diferido) al tocarlo.

### Cotización: fórmulas del origen (estados propios)

Configuración › Orígenes › un origen › Planilla, Hoja o Tarjeta (`cotizaciones.configurar` en el origen): las fórmulas del origen, en el selector de la
barra de la fórmula; la activa es la que se cotiza.

- **La lista** (el popover del selector): la activa primero, con ★ y «Activa · vN»; las demás por nombre, con su estado en una insignia («vN publicada,
  no activa», «Borrador»; «Con borrador sin publicar» al lado si tiene las dos). Cada fila: el nombre como enlace a la misma pestaña con esa fórmula
  (`?formula=<id>`) y su «⋯». Lee 51 y dibuja hasta 50; en el tope, «Este origen ya tiene 50 fórmulas: archiva o elimina alguna para crear otra.» y
  «Nueva fórmula» apagada. Un error, «Reintentar».
- **El «⋯»** de cada fila: Renombrar · Copiar · Activar… · Eliminar (si nunca estuvo activa) o Archivar (si lo estuvo).
  La activa no ofrece «Activar…» (lo pendiente se publica desde su planilla o su tarjeta) y dice por qué no se archiva; sin planilla guardada o sin
  tarjeta, «Activar…» va apagada con su motivo. Una archivada sólo se renombra o se copia.
- **«Archivadas»**, plegada debajo: al abrirla lee de a 20 hasta 500 (con su aviso de tope), con «Leyendo las archivadas…», «Reintentar» sin perder
  lo cargado y «No hay fórmulas archivadas.».
- **Nueva fórmula** (`?panel=nueva-formula`; Copiar abre el mismo con `&copia=<fórmula>`): «Cómo empieza» —En blanco, Copia de este origen,
  Copia de otro origen (sólo si la persona configura otro; si no, «No configuras el cotizador de otro origen.»)—, la fórmula y la versión que se
  copia (publicada o borrador; la que no hay va apagada con su motivo; de otro origen no se elige: su publicada y, si no tiene, su borrador, dicho bajo «Fórmula») y el nombre (una copia propone
  «<nombre> (copia)»). Un nombre repetido se dice junto al campo; sin un tipo de cambio, «Abrir Monedas». Entró: abre su planilla.
- **Los avisos de la copia** (de otro origen): la planilla de la copia abre con «Información de la fórmula» (`?panel=info-formula`) y su sección «Lo que
  cambió al copiar la fórmula», un renglón por tabla creada o usada del
  destino (con «Abrir Tablas») y por dato del vehículo que el origen no tiene; esos datos quedan además marcados en su fila («El dato «x» no existe
  en este origen: elige otro o créalo.»). Quedan hasta «Ocultar».
- **Renombrar** (`?panel=renombrar-formula&cual=<id>`), **Archivar** y **Eliminar** (`<Confirmar>`; eliminar una que ya se usó ofrece
  «Archivar» en el mismo lugar): un PT409 con el texto de la base y «Recargar», que conserva lo escrito.
- **Activar…** (`?panel=activar-formula&cual=<id>`): qué se publica (la planilla y la tarjeta con su borrador, si tienen) y qué cambia (cuál deja
  de cotizarse), y la nota obligatoria. Un PT409 (otra persona activó, publicó o guardó) con «Recargar»; un rechazo que nombra una fila
  (`?fila=<nodo>` en la planilla), un lugar de la tarjeta (`?lugar=`) o una pestaña ofrece ir ahí, y la nota no se pierde. Por URL, una que ya
  está activa, archivada o no está: avisa y limpia.
- **Archivar o eliminar la elegida** lleva a la misma pestaña sin `?formula=` (la de trabajo). Una archivada elegida y una `?formula=` que no se
  abre: «Barra de la fórmula (estados propios)».
- **Modo Live:** la lista y los modales no muestran montos.

### Cotización: fórmula (estados propios)

Configuración › Orígenes › un origen › Planilla (`/configuracion/origenes/<id>/planilla?formula=<fórmula>`): ver,
publicar, revertir, descartar y editar una fórmula del origen. `?fila=<nodo>` elige esa fila al abrir y se borra de la URL.

- **Quién entra:** `cotizaciones.configurar` en ese origen, aunque no tenga los permisos de los niveles. La base vuelve a decidir: la policy `formulas: leer` sólo deja ver los orígenes con la clave.
- **Origen:** la página es la de ese origen (también inactivo); para cambiar de origen, el selector de las migas (conserva la pestaña). Sin la clave en
  el origen, la pestaña Planilla va apagada con su motivo; un origen ajeno, «No puedes abrir este origen».
- **La planilla al frente:** arriba de ella no hay tarjetas. La información de la versión va en el modal **«Información de la fórmula»**
  (`?panel=info-formula`, a pantalla completa en el celular), que abre el botón ⓘ junto al estado de la barra (en la puesta en marcha, «Información de la
  fórmula» con su texto, arriba de la planilla), con secciones de un solo nivel: **Publicada** (versión, nota, quién y cuándo o, sin ella, que no se puede
  cotizar en el origen), **Borrador** si hay (de quién, cuándo, nota, versión sobre la que empezó, si se publicó otra después que publicarlo dará conflicto,
  y «Descartar el borrador…», que cambia el modal por su confirmación) y **Lo que cambió al copiar la fórmula** si hay avisos de la copia. Ninguna lleva
  «Editar»: se edita en la planilla. Lo que bloquea no se esconde: el botón lleva una marca (con su texto para el lector) sin publicada, con el borrador
  atrasado o con avisos de la copia pendientes, en ese orden. «Publicar…» va en la barra con el borrador al día; con cambios aplicados sin guardar
  espera, apagado, con «Guarda el borrador antes de publicar: se publica lo guardado.» al lado.
- **Versiones** (en el drawer «Versiones» de la barra; en la puesta en marcha, debajo de la publicada): publicadas y archivadas de la más nueva (sin autor: «Alguien»), de a 20 hasta 500; en el tope, «Ir a la versión» (un
  número) que lee desde ahí hacia atrás con «Volver a la más nueva»; la posición no va a la URL. Estados: esqueleto, error con
  «Reintentar», vacío, vacío desde la N y fallo de «Ver más» sin perder lo cargado.
- **Publicar** (`?panel=publicar-formula`, sólo con el borrador al día): nota obligatoria (≤ 2.000, el motivo junto al campo sin pedir
  nada). Entró: la publicada nueva, sin borrador y la lista desde la primera página. Conflicto (otra persona publicó o guardó el borrador
  después de leerlo): el texto de la base con «Recargar», que conserva la nota; si con lo nuevo el borrador ya no está o quedó atrasado, el
  modal lo dice y no deja publicar. Una regla de la base (falta el diseño, un nivel retirado) va arriba del modal y la nota queda. Por URL
  sin borrador o con uno atrasado: avisa y limpia.
- **Revertir** (`?panel=revertir-formula&version=<id>`, en cada archivada si hay publicada): publica una copia de la N con su diseño; el
  borrador no cambia (queda atrasado). Nota propuesta «Vuelve a la versión N.». Conflicto como al publicar. Por URL: sin publicada, la
  publicada misma o una versión que no está en lo cargado, avisa y limpia. Cambiar de pestaña limpia `panel` y `version`.
- **Descartar** (`?panel=descartar-borrador`, `<Confirmar>`, desde «Información de la fórmula»; «atrás» vuelve a ella; al día **y atrasado**): borra el borrador sin deshacer; publicada y lista no
  cambian. Lo que no entró queda en el diálogo con el mensaje de la base o, sin respuesta, «No sabemos si se descartó: recarga para verlo.»
  (sin reintento solo). Por URL sin borrador: avisa y limpia.
- **Planilla** (la vista por defecto, sobre el borrador o, sin él, la publicada; sin ninguna, el vacío de la publicada y no hay planilla; la única
  forma de editar la fórmula): lee la versión desde el navegador al abrir la pestaña (esqueleto, error con «Reintentar», versión que ya no se
  abre). A todo el ancho, sin guías a la vista. En la barra de la fórmula de la página van «Guardar el borrador» con su línea de estado en letra chica
  y el «⋯» de la planilla («Nueva banda…», «Total y tipos de cambio…» y «Unidad de ejemplo: volver a ceros», apagado en ceros); «Sobre…» sólo en la puesta en marcha (en la página lo dice el estado de la barra). Los avisos del guardado (conflicto, errores, lo
  que el diseño no muestra) van arriba de la planilla. La **Barra de fórmula** queda fija bajo la cabecera de la página al desplazarse, en dos filas
  fijas (escribiendo o no: nada salta al entrar a escribir): arriba lo que se inserta y, a la derecha, «Totales», «Tarjeta» y «?»; abajo, el texto a lo
  ancho con el resultado al lado, «Aplicar» y «Descartar» (en una barra angosta, esa fila se parte). En orden: el nombre
  de la celda («C5», «Ejemplo 5»), `fx ▾` (inserta una función; apagado con su motivo: «Toca una celda para escribir una fórmula.», «Las
  funciones van en C.» o el de la celda), las **operaciones rápidas** (grupo «Operaciones»: «Sumar», «Porcentaje de» y «Si… entonces…», con
  su texto en una barra ancha y sólo el icono de 44 px debajo; apagadas con el mismo motivo que `fx`) y «¿Cómo se escribe?» (libro, a un
  toque), el texto (vacío, «Escribe = y toca las celdas: =C5+C7»; al entrar no hay celda elegida y se ve esa guía), escribiendo una C la caja
  del **resultado al lado** («Resultado con la unidad de ejemplo», `aria-live`: la cifra que daría, con los decimales de la celda, 150 ms
  después de la última tecla; vacía con un texto que no compila, mientras se lee lo de prueba o antes de la pausa, nunca con una cifra vieja;
  en una barra angosta baja al renglón de «Aplicar» y «Descartar»), y a la derecha «Totales», «Tarjeta» y «?» (un popover con los ocho tipos de celda y el fondo
  que cada uno da a C). Debajo, un solo renglón reservado (nada salta al entrar o salir de la edición): sin escribir, la fila elegida
  («De dónde sale: …», lo que el último cambio soltó, lo que dice el texto tras un ⚙ —reescrito o «ya no manda»— y, en un tipo de cambio,
  el camino a Empresa › Monedas); escribiendo, la firma de la función en que está el cursor con el valor que se escribe en negrita
  («SI(condición; **si se cumple**; si no)», cortada con «…» y entera en su `title`) o, si el cursor espera un operando, «Toca una celda para
  usarla.»; a la derecha, «Siguiente» (al próximo lugar por llenar, como Tab) y, en el celular, «Elegir celda» (44 px). La cuadrícula (`role="grid"`, «Filas de la fórmula de
  <origen>»), con las filas en el orden en que se calculan: «#» (el número, el mismo al buscar; arrastrarlo mueve la fila), «A · concepto»,
  «B · %», «C · valor» (lo que guarda la fórmula: el valor fijo, el cálculo en A1 como «=C5+C7» o, en lo que no se escribe, de dónde sale en
  corto) y «Ejemplo» (glosario: «Ejemplo (columna)»: lo que da la fila con la unidad de ejemplo; nada en un valor fijo, porque su número ya
  está en C; se escribe en las filas que se llenan al cotizar; sin cifra, «—» con su motivo en el `title` y para el lector). Cada tramo de una
  banda lleva su cabecera en una línea (la muestra del color, etiqueta, «Plazo: …», «Tipo de cambio: …» del modo elegido y su «⋯»; lo largo
  se recorta con su `title`; en un marco angosto se parte en dos); las filas sin banda, ninguna. Hasta 500 filas con aviso y «Buscar fila»
  (por concepto: «Ninguna fila tiene «x» en el concepto.»); sin filas, «Esta fórmula no tiene filas.» con «Sumar la primera fila».
  **Al costado** (`?costado=totales|tarjeta`, cerrados al entrar; uno a la vez; desde 1024 px no son modales y la página del origen (en la puesta en
  marcha, la planilla) se corre a la izquierda el ancho del panel para que nada quede debajo, ni la barra de la fórmula, más angosto son el drawer modal): «Totales» (el total en dólares y en la moneda local con el modo elegido, la base imponible y lo aparte, cada
  uno con `<Monto>` y cómo sale; lo aparte apagado dice por qué) y «Tarjeta de la cotización» (la plantilla de esta fórmula, el borrador si
  hay, con la unidad de ejemplo y el selector de modo «Tipo de cambio» con dos o más modos; sin plantilla, «Esta fórmula todavía no tiene
  tarjeta.» con «La imagen que recibe el cliente»; si no se leyó, «Reintentar»). En el celular y con el texto al 200 % la cuadrícula se
  desplaza de costado en su marco con «#» y A pegadas y la barra se parte en dos líneas; la página no se ensancha.
- **Escribir, como en Excel:** una celda activa que mueven las flechas, Tab y Shift+Tab, Enter y Shift+Enter, Inicio y Fin, Ctrl+Inicio y
  Ctrl+Fin y RePág y AvPág. F2, doble clic o una tecla escriben en ella (el mismo texto se ve en la barra, que también se edita); Enter o Tab
  aplican y pasan a la de abajo o a la de la derecha, `Ctrl/Cmd+Enter` aplica desde la barra y Esc descarta. Con «=», un clic o un toque en
  otra celda mientras el cursor espera un operando inserta su referencia (Shift+clic, un rango). Una operación rápida inserta su forma con
  lugares por llenar (`=+`, `=PORCENTAJE_DE(; %)`, `=SI(; ; )`) y el cursor en el primero; sin «=», envuelve lo escrito. Tab (sin sugerencias
  abiertas) o «Siguiente» llevan al próximo lugar y, sin ninguno, Tab aplica como siempre; tras tocar una celda en «Sumar», el cursor salta el
  «+» (tocar C5 y C7 deja `=C5+C7`); Enter aplica siempre (un lugar vacío da «Falta un valor aquí: escribe un número o toca una celda.»). En
  el celular, «Elegir celda» cierra el teclado y el renglón dice «Toca la celda que quieres usar.» con «Cancelar»: tocar una celda B o C inserta
  su referencia y el foco vuelve al texto con el cursor en su lugar; otra columna, «Esa celda no entra en una fórmula: toca una de las columnas
  B o C.»; nunca aplica. Apagado si el cursor no espera una celda: «Escribe un signo (+ - * / ;) antes de elegir otra celda.». Cada
  referencia toma un color, con la leyenda
  («C5 Remate · C7 Fees») bajo la barra y el borde del mismo color en su celda. Las sugerencias (funciones con su firma y un ejemplo, conceptos
  de arriba, bandas y, en BUSCARV, tablas y columnas) se eligen con ↑/↓ y Enter o Tab. Un error queda bajo la barra (`role="alert"`) con su
  tramo ondulado y la edición abierta (`aria-invalid`): «C12 está más abajo: una fórmula sólo usa filas de arriba.» con «Mover esta fila debajo
  de la 12», «Una fila no se usa a sí misma (C7).», la columna A, Ejemplo («D5: Ejemplo no se usa en una fórmula: es la unidad de ejemplo. En
  una fórmula va C5.»), una B sin %, un rango fuera de SUMA, MAX o MIN; pisar un valor del ⚙
  pide «Pisar el valor». Con texto sin aplicar, lo demás espera: «Aplica o descarta lo que escribes en la planilla.». Una celda que no se
  escribe lo dice: «Esta celda no se escribe: <de dónde sale>. Cambia su tipo en «Tipo de celda».»; Ejemplo de un cálculo, «Ejemplo es lo que
  da esta fila con la unidad de ejemplo: se calcula sola.», y el de un valor fijo, «El valor fijo se escribe en C5.». Lo escrito en la B o la C
  de un valor fijo escribe `params` y reescribe su texto como el ⚙, sin preguntar. En una fila del asesor, un dato del vehículo, un interruptor
  o la variante, la unidad de ejemplo se escribe en Ejemplo (no se guarda); su C no toma un número: «Esta celda la escribe el asesor al
  cotizar: el ejemplo va en la columna Ejemplo. Para un valor fijo, cambia su tipo en «Tipo de celda».» (o «Esta celda se llena al cotizar:
  …»), y vacía no cambia nada. En Live, los montos de C (valor fijo) y de Ejemplo pasan por `<Monto>` y su entrada va como contraseña.
- **Filas:** el «⋯» de la fila activa (arriba a la derecha de la fila, `Acciones de la fila N`) y el clic derecho abren la misma lista:
  «Insertar arriba», «Insertar abajo» (la fila nueva, «Fila nueva», un valor fijo en 0 con la banda de la de referencia, abre su concepto
  elegido para escribir), «Duplicar», «Mover arriba» y «Mover abajo» (Alt+↑ y Alt+↓; apagados en la primera y la última), «Tipo de celda ›»,
  «Decimales…» (sólo en una celda que se ve como número), «Banda ›» (cada banda, «Sin banda» y «Nueva banda…») y «Eliminar». Mover o arrastrar se rechaza con su motivo si rompe el orden: «C9 usa
  esta fila: no puede quedar arriba de ella.» o «Esta fila usa C5: no puede quedar arriba de ella.». «Eliminar» va apagado con su motivo si
  la usa otra fila («La usan C9 y C12.»), es un tipo de cambio de una banda o del total, la fila del total, la única de su banda, la muestra la
  hoja («La muestra la hoja: quítala en «Hoja» antes.») o la usa la tarjeta («La usa la tarjeta: quítala en «Tarjeta» antes.»); si entra, el
  aviso «Se eliminó «X».» con «Deshacer». Lo elegido en el menú deja el foco en lo que cambió (el concepto de la nueva, la celda movida).
- **Tipo de celda** (`?panel=tipo-de-celda&fila=<id>` para los que piden datos): «Valor fijo», «Cálculo» (se escribe con «=»), «Lo escribe el
  asesor», «Interruptor Sí/No», «Dato del vehículo», «Tipo de cambio», «De una tabla» y «Variante» (una por fórmula; con otra, apagada con su
  motivo). Un dato del vehículo, un tipo de cambio, una tabla y la variante abren su panel («Tipo de celda: <tipo>»; la variante con sus
  opciones, la por defecto y «Se cotiza en par», apagada con menos o más de dos opciones: «Sólo una variante de dos opciones se cotiza en
  par.»). Un cambio que la fórmula no admite se rechaza con su motivo en A1 y la fila queda como estaba.
- **Decimales** (`?panel=decimales&fila=<id>`, glosario «Decimales (de una celda)»): el drawer «Decimales» con `C<n> · <concepto>`, una sola sección con
  «Cuántos decimales muestra»: «Automático», «0», «1», «2», «3» y «4» (radios a la vista, 44 px en el celular, que se parten al 200 %; marcado lo de la
  versión, «Automático» si no tiene) y «Sólo cambia cómo se ve: la cuenta usa el valor completo.»; debajo, con alto reservado, «Se ve así: USD 1.234,57 →
  USD 1.235» (una cifra fija: lo de «Automático» y lo elegido, que no salta al cambiar de opción; un porcentaje, en puntos) y la línea del motivo
  (`aria-live`). Pie «Aplicar» y «Cancelar»; cerrar con algo elegido pregunta. «Aplicar» cambia la fórmula de trabajo (se guarda y publica como lo
  demás), cierra y deja elegida la C de la fila. Estados: en el «⋯», el renglón no está en una bandera, la variante, una condición ni un dato del
  vehículo que no es número, y va apagado con «Aplica o descarta lo que escribes en la planilla.» mientras la fila espera; por URL, una fila que ya no
  está («Esa fila ya no está en la fórmula.»), una celda de texto («Esta celda muestra un texto: no lleva decimales.») o un dato que no es número
  («Este dato del vehículo no es un número: no lleva decimales.»), sin «Aplicar»; un rechazo de la fórmula queda en la línea del motivo con lo elegido
  y el foco en el radio. La hoja, la tarjeta y las demás superficies muestran la celda así (`docs/COTIZADOR.md` › «Los nodos»); el % que la B absorbe
  queda en «Automático».
- **«¿Cómo se escribe?»** (`?panel=como-se-escribe`, sólo lectura; el libro de la barra de fórmula): las referencias (C5, B9, C5:C9), las
  diez funciones con su firma y un ejemplo, y las teclas de la planilla.
- **Guardar el borrador:** espera con texto sin aplicar («Aplica o descarta lo que escribes en la planilla.»), si la fórmula no valida («Corrige
  lo marcado para guardar.») o sin cambios («No hay cambios por guardar.»; un cambio del ⚙ cuenta). Sin confirmación. Sobre la
  publicada crea el borrador con su diseño; sobre el borrador lo pisa con su hora, sin releer. Conflicto: el texto de la base con
  «Recargar» (lo aplicado y no guardado se pierde); regla de la base, sin permiso, sin respuesta y otro error, cada uno con su mensaje. Lo
  que el diseño no muestra (una constante sin celda) se avisa: «Para publicar, el diseño de la hoja tiene que mostrar: «…». Puedes guardar
  igual.»; sin diseño, todavía no se puede publicar.
- **Bandas** (glosario: «Banda (de la planilla)»): «Nueva banda…» (`?panel=nueva-banda`, desde el «⋯» de la planilla o desde «Banda ›» de una
  fila, que nace con ella) y el «⋯» de cada cabecera: «Renombrar, color, plazo y tipo de cambio…» (`?panel=banda&banda=<id>`, «Banda «X»») y
  «Quitar banda» (sus filas quedan sin banda, con «Se quitó la banda «X».» y «Deshacer»; apagado con su motivo si un texto la nombra o la usa
  la tarjeta). El panel: «Etiqueta», «Plazo de pago» (opcional), «Color» (del catálogo, leído al montarse; si no se leyó, «No se pudieron leer
  los colores de la empresa.» con «Reintentar») con «+ Nuevo color» debajo (sólo con `cotizaciones.configurar`; apagado hasta leer los colores):
  abre «Nuevo color» (`?color=nuevo`, el modal de la sección de colores: nombre, color y cómo se ve; «Ya hay 48 colores, que es el máximo.
  Elimina uno que ningún grupo use.», «Ya hay un color «X».», sin red conserva lo escrito y reintenta al volver), lo crea en el catálogo y lo
  deja elegido, y al cerrar el foco vuelve a «Color»; «Tipo de cambio» (una fila «Tipo de cambio» de la fórmula; con modos en la hoja, cada modo elige el de cada
  banda y uno que no tiene bucket se rechaza: «La hoja tiene modos de tipo de cambio: suma este tipo de cambio primero en cada modo, en
  «Hoja».») y sus filas, con «Quitar» y «Sumar una fila» (sin banda, una fila no entra en el total); «Crear banda» o «Aplicar». Arrastrar una
  fila a un tramo de otra banda le pone esa banda. Un rechazo de la fórmula (el doble conteo, «… se contaría dos veces.»; una banda vacía) va a
  la cabecera de su banda y «Guardar el borrador» espera.
- **Total y tipos de cambio** (`?panel=total-y-tipos-de-cambio`): «Tipo de cambio del total», «Fila del total» (una fila de cálculo) y «Tipo
  de cambio de «<bucket>»» por cada uno; «Aplicar». Con modos en la hoja, la cabecera de cada banda y «Totales» siguen al modo elegido.

### Cotización: tarjeta (estados propios)

Configuración › Orígenes › un origen › Tarjeta (`/configuracion/origenes/<id>/tarjeta?formula=<fórmula>`, a todo el ancho; `?lugar=` va a ese lugar al abrir y se borra): el editor de la tarjeta de la cotización como un
Excel. Edita el **borrador** de la plantilla (sólo la forma 2, la cuadrícula), lo publica con nota y lo descarta.

- **Quién entra y origen:** como «Fórmula»; la pestaña va después de «Hoja». **Sin fórmula publicada**, no hay editor: «Falta publicar la fórmula de
  <Origen>: la tarjeta se arma con sus nodos.» con «Ir a la fórmula».
- **Arriba:** «Tarjeta de <Origen>», de dónde nace («Sobre el borrador guardado el …», «Sin borrador: parte de la versión N publicada.» o «Sin borrador ni
  publicada: parte de la de por omisión.») y, si hay publicada, su versión, fecha y nota. A la derecha, una acción principal, «Guardar borrador»;
  «Publicar…» a la vista (apagado con su motivo escrito: «Guarda un borrador para poder publicarlo.» o «Guarda los cambios para poder publicarlos.») y el
  «⋯» («Más acciones de la tarjeta») con «Descartar borrador…», sólo con borrador.
- **Avisos** (en este orden): lo dicho al abrir —«Se convirtió a cuadrícula: revisa y guarda.» (una forma 1, borrador o publicada; con lo corregido al
  alinearla con la fórmula), «Todavía no hay tarjeta: nace de la de por omisión.», «La fórmula tiene más filas de las que entran en una tarjeta: se tomaron
  las primeras 4 de cada grupo. Revisa y guarda.» (o «quedó sólo el total») y una versión ilegible con su motivo (se parte de la que sigue)—; nada se guarda
  solo. Después, «Con esto no se podría publicar: <motivo>» (un nodo restringido que la plantilla ya nombra, un color fuera del catálogo; no apaga
  «Guardar borrador»), «El logo de la empresa no se pudo dibujar: súbelo de nuevo en Empresa.» (el logo de la referencia no cargó; con «Abrir Empresa» o, sin
  `empresa.ajustes.gestionar`, a quién pedírselo) y lo que pasó al guardar.
- **La barra del lienzo:** «Deshacer» y «Rehacer» (su `title` dice qué: «Deshacer: combinar (Ctrl+Z)»), «Combinar», «Separar», «Insertar ▾» (fila arriba,
  fila abajo, columna a la izquierda, columna a la derecha) y «Eliminar ▾» (filas, columnas). Lo que no se puede queda apagado sin perder el foco y, al
  tocarlo, dice por qué; en los menús, el motivo va bajo cada opción («Elige más de una celda para combinar.», «Ya hay 16 columnas.», «Ya hay 120 filas.»,
  «El ancho total pasaría de 1.600 px.», «La tarjeta pasaría de 24 KiB.», «El rango corta una combinación: elige uno que la contenga entera.»). A la
  derecha, «Referencia:» (la cotización más reciente del origen que ves, «Cotización n.º N», o «Cifras de ejemplo»), «Ajustar | 100 %» y el tamaño de la
  tarjeta («690 × 512 px»). Debajo, por qué no se hizo lo último que se pidió.
- **El lienzo:** la tarjeta a escala con el mismo dibujo que el PDF y la imagen, las cabeceras de columna arriba («B · Concepto 190 px»: la letra y, si es
  una columna de la conversión, su nombre; tocarla elige la columna) y las asas de fila a la izquierda (el número de la fila). Es una grilla accesible
  (`role="grid"`, una fila por fila que se dibuja con su índice real, `aria-selected` en lo elegido) con **un solo** `tabindex=0`: el cursor va por
  `aria-activedescendant`, con foco visible, y Tab sale al panel. Cada celda se nombra por lo que muestra, sin montos («Dato: «Remate» · Monto»); una casilla
  vacía es un solo `div` sin hijos.
  - **Elegir:** clic, Shift+clic, arrastrar, flechas y Shift+flechas, Home y End (con Ctrl, la primera y la última casilla), Ctrl/Cmd+A todo, Shift+Espacio la
    fila, Ctrl+Espacio la columna, Esc suelta (el panel vuelve a «Resumen»). Un rango que corta una combinación se agranda hasta contenerla. Las filas ocultas
    con la referencia no reciben el cursor.
  - **Escribir en el lugar:** Enter, F2 o doble clic sobre una celda de texto o vacía abren el campo «Texto de la celda» encima, con «n de 300» y su motivo
    («Un texto llega a 300 caracteres.», «Un texto no lleva «{{».»); tipear una letra empieza a escribir reemplazando. Enter confirma (el cursor queda en la
    celda), Shift+Enter es un salto de línea, Esc descarta, salir confirma. Sobre un dato o el logo, Enter o F2 llevan al campo «Contenido» del panel; sobre un texto con datos (y con doble clic), a su campo «Texto», sin
    escribir en el lugar (perdería los datos). Un
    texto que empieza con «=» es texto: la tarjeta no tiene fórmulas propias.
  - **Atajos:** Supr o Retroceso vacían; Ctrl/Cmd+C copia lo elegido (en el editor, con contenido, formato y combinaciones; al sistema, su texto en TSV) y
    Ctrl/Cmd+V lo pega desde la celda del cursor (sin nada copiado en el editor, el texto del sistema va a la celda activa); Ctrl/Cmd+Z deshace y
    Ctrl/Cmd+Y o Ctrl/Cmd+Shift+Z rehacen, hasta 100 pasos (elegir no es un paso; lo escrito en un campo del panel se junta en uno hasta que cambia la
    selección); Shift+F10 o la tecla Menú abren el menú contextual. ← desde la columna A va al asa de la fila y ↑ desde la primera fila, al borde de la
    cabecera de esa columna (↓ o Esc vuelven).
  - **Anchos y orden:** el borde derecho de cada cabecera se arrastra (el movimiento se divide por la escala; el ancho se ve mientras y es un paso al soltar,
    de 24 a 640 px y con el total ≤ 1.600) o, con el foco, ←/→ cambian 1 px y con Shift 10 px. El asa de una fila se arrastra para ordenarla o, con el
    teclado, Espacio la toma, las flechas la mueven, Espacio la suelta y Esc cancela, con anuncios («Tomaste la fila 4.», «La fila 4 va en el lugar 2 de 9.»,
    «Soltaste la fila 4 en el lugar 2.», «Se canceló: la fila 4 volvió a su lugar.»); tocarla elige la fila. Una fila que es parte de una combinación vertical
    no se mueve: «La fila 4 es parte de una combinación de 3 filas: sepárala para moverla.»
  - **Menú contextual** (clic derecho, que elige la celda si quedaba fuera de lo elegido): «Copiar», «Pegar», «Vaciar», «Combinar», «Separar», «Insertar» y
    «Eliminar», con lo apagado y su motivo como en la barra.
  - **Anuncios** (`role="status"`): lo elegido («Fila 4 › Columna «B · Concepto».») y cada operación («Se combinaron 3 celdas.», «Se pegó una celda.»,
    «Deshiciste: combinar.»).
- **El panel** (a la derecha; debajo del lienzo con el texto al 200 %), según lo elegido:
  - **Nada, «Resumen»:** «Columnas» (cada una con su ancho en número), «Σ ancho N / 1.600 px», «Sumar columna»; «Paleta» (los colores del catálogo, sólo para
    ver) con «Editar en Orígenes › Colores»; «Tamaño: n de 24 KiB».
  - **Una celda, un rango o columnas** (aplicado a todas): la ruta («Fila 4 › Columna «C · Monto»»); con columnas, su «Ancho»; «Contenido» (Texto | Dato |
    Logo | Vacío; el texto con «n de 300» (sólo el texto, sin los datos) y su motivo, y «Insertar dato», que abre el buscador de «Dato» en línea con
    «Listo» y pone el dato en el cursor como una pastilla («% Transferencia a USA»; marcada con el tono de aviso si ya no está o es restringido): Retroceso o Supr
    junto a ella la borran entera, tocarla abre el buscador para cambiarla, con más de 20 partes «Insertar dato» se apaga con «Un texto lleva hasta 20 partes
    entre texto y datos.» al lado, y Ctrl/Cmd+Z dentro del campo deshace como en el lienzo (insertar, cambiar o quitar un dato es su propio paso); «Dato» con «Cuál dato» (Uno | El primero con valor | Según condiciones) y, con «Uno», «Buscar un dato», las
    variables «De la cotización» y los nodos de la fórmula del nivel «todos» por grupo, a lo sumo 50 con «Escribe para acotar.», un restringido que la
    plantilla ya nombra marcado «Restringido», y «Qué mostrar» con lo que admite el nodo); «Color» (fondo y texto: «Automático» y las muestras del catálogo; con un fondo en el que no se lee, el aviso suave «Con este color el texto de la
    tarjeta se lee con dificultad.», que nunca frena); «Formato» (negrita, cursiva, tamaño de los 8 pasos, alineación horizontal y vertical); «Bordes» (el
    lado o todos, y ninguno, fino o grueso); con celdas, «Seleccionar su fila» y «Seleccionar su columna».
  - **Una fila:** «Fila N», su «Alto» (16 a 240 px) y «Ocultar la fila» (Nunca | Si no aplica | Si no aplica o vale 0 | Según condiciones) con «El nodo
    que la decide» (no con «Nunca» ni «Según condiciones»).
  - **«El primero con valor»** (la lista de respaldo): «La celda muestra el primero que tenga valor.» y los datos en orden («Dato 1», «Dato 2»…), cada uno con
    su nombre y su «⋯» («Más acciones del dato N»: «Subir», «Bajar», «Cambiar el dato», «Quitar», apagados con su motivo: «Ya es el primero.», «Ya es el
    último.», «La lista lleva al menos dos datos.»). Sin elegir, «Elegir el dato»; elegir abre el buscador de «Dato» en línea con «Listo» (uno abierto a la
    vez). Debajo, «Agregar un dato» a lo ancho (apagado con «Hasta 5 datos.» al lado).
  - **«Según condiciones»:** una sección por rama, «Si» y después «Si no, si», con su «⋯» arriba a la derecha («Más acciones de la rama N»: «Subir», «Bajar»,
    «Quitar la condición N», «Quitar la rama», apagados con su motivo: «Ya es la primera.», «Queda al menos una condición.», «Queda al menos una rama.»). Cada
    condición se arma como una frase: «Lo que mira» (las variables «De la cotización» y los nodos por grupo, un restringido marcado), «Qué pregunta» (sólo lo
    que ese dato puede responder: «está vacío», «no está vacío», «es 0», «es mayor que», «es» una opción, «está encendido»…) y su «Número» u «Opción»; el grupo
    se nombra con la frase entera cuando está completa («Remate es mayor que 1.000»). Entre condiciones, «Y»; debajo, «Y además…» (apagado con «Hasta 3
    condiciones.»). «Mostrar»: Texto | Dato | Nada, con «Texto que muestra» o el dato. Después de las ramas, «Agregar «si no, si…»» (apagado con «Hasta 5
    ramas con el «si no».») y la sección «Si no» con «Si no, mostrar». Sin separadores de tarjeta: un título por bloque y una línea entre ramas.
  - **«Ocultar la fila» según condiciones:** «Se oculta si» con su «⋯» («Más acciones de las condiciones de la fila») y las condiciones como arriba, sin
    «si no».
  - **A medio armar** (una lista con un dato, una condición sin número u opción): el motivo va bajo su campo («Elige al menos dos datos.», «Elige el dato.»,
    «Falta el número.», «Elige la opción.», con `aria-invalid` y `aria-describedby`) y arriba «Sin terminar: la celda no cambia hasta completarla.» (o «la
    fila»); la celda, el lienzo y «Guardar borrador» siguen con lo de antes hasta completarla. Deshacer afuera trae lo de la plantilla si lo armado estaba
    entero. Un dato que la fórmula ya no tiene: «Este dato ya no está en la fórmula: se salta.» (el lienzo lo dibuja saltado; publicar da
    `nodo_inexistente`). Mientras llega su código, el aviso de `diferido()` en su lugar.
- **Ocultas con esta referencia (N)** (debajo del lienzo): cada fila que no se dibuja con la referencia elegida, con su rótulo, por qué («No aplica en esta
  cotización: la variante es …», «Vale 0», «Su nodo no está en la versión de la referencia», «Se cumplen sus condiciones») y «Seleccionar la fila» (para
  cambiar su «Ocultar si…»); y
  «Cambia a «Cifras de ejemplo» para verla en el lienzo.». Sin ocultas, nada. Con las cifras de ejemplo no se oculta ninguna.
- **La referencia:** sin cotizaciones del origen que veas, sólo «Cifras de ejemplo», apagado, con «Todavía no hay cotizaciones de <Origen> que veas: se
  usan cifras de ejemplo.»; si no se pudo leer, «No se pudo leer la cotización de referencia.» y cifras de ejemplo. Elegirla no va al servidor.
- **Cargando:** el esqueleto de la ruta; antes de hidratar (no se sabe el ancho) y mientras llega el código del editor o del lienzo, esqueletos de alto
  fijo. Sin conexión, el aviso con «Reintentar» en su lugar.
- **Menos de 1.024 px:** «Este editor se usa en una pantalla de al menos 1.024 px.» y la tarjeta debajo en sólo lectura (con la referencia elegida); el
  código del editor no se pide.
- **Guardar borrador:** activo de entrada sin borrador o con uno de la forma 1 (se guarda convertido); con borrador, sólo si algo cambió; apagado con la
  forma rechazada o la tarjeta de más de 24 KiB («La tarjeta pasa de 24 KiB: quita filas o textos.», escrito bajo el botón), un envío en curso o un
  conflicto. Entra: «Se guardó el borrador.»; el panel y la barra se apagan hasta que llega lo guardado. Guardar no remonta el editor: lo elegido y el
  historial de deshacer siguen. Una versión ajena («Recargar» tras un PT409), publicar o descartar sí lo remontan y lo vacían.
- **Conflicto (PT409):** el mensaje de la base, «Ver cómo quedó» (otra pestaña, sin perder lo tipeado) y «Recargar» (descarta lo escrito); se va **al
  llegar** la versión nueva. **Sin conexión:** lo hecho queda, sale solo al volver, con «Reintentar». Lo hecho sin guardar vuelve tras recargar o cambiar
  de pestaña, con «Recuperamos lo que habías escrito y no guardaste.» y «Descartar» (recuperarlo es un paso: Ctrl+Z vuelve a lo guardado).
- **Publicar** (`?panel=publicar-tarjeta`): nota obligatoria (≤ 2.000). Entra: el encabezado dice «Publicada: versión N». PT409: el mensaje de la base,
  «No se publicó nada.» y «Recargar» (la nota queda); sin borrador, «Publicar» apagado. Una regla de la base contra la fórmula va arriba del modal y, si
  nombra un lugar (`donde`), «Ir a la celda» («Ir a la fila», «Ir a la columna») cierra el modal y lo elige en el lienzo. Por URL sin borrador: «No hay
  borrador para publicar.»
- **Descartar** (`?panel=descartar-plantilla`, desde el «⋯»): sólo con borrador, también con cambios sin guardar; se borra sin deshacer y el editor parte
  de la publicada. PT409 con «Recargar»; sin respuesta, «No sabemos si se descartó: recarga para verlo.» (no reintenta solo). Por URL sin borrador: «No hay
  borrador para descartar.»

### Cotización: compartir (estados propios)

«Compartir la cotización» (`PanelDeCompartir`, modal grande): `?panel=compartir` en el detalle (el botón «Compartir», a la vista en su cabecera) y `?panel=compartir&para=<id>` en la lista (también en las
tarjetas, el resumen y la ficha del vehículo). Lo abre toda persona que ve la cotización, sin clave propia.

- **Pestañas:** «Imagen» (la de entrada, sin escribir nada) y «Texto» (`?compartir=texto`; se borra al cerrar). Lo demás (la imagen, el formato, la zona y las
  fotos marcadas) es de este envío: cada apertura empieza de cero.
- **«Imagen»:** «Cotización | Fotos» (botones juntos; «Fotos» sólo si el vehículo tiene fotos y quien mira lo ve). «Cotización»: la imagen de la tarjeta en su marco 15:8;
  mientras se arma, su recuadro con «Preparando la imagen…»; si falla, «No se pudo armar la imagen.» con «Reintentar» (el texto y el PDF
  siguen). «Fotos»: la grilla de miniaturas (480 px, a lo sumo 24, se parte sola), cada una una casilla con la marca en una esquina de 44 px; marcarla baja la
  completa en segundo plano; una que no baja se desmarca con «No se pudo bajar la foto N.»; una miniatura que no carga deja el hueco con el auto. Si la lista no
  llega: «No se pudieron leer las fotos.» con «Reintentar».
- **«Texto»:** formato «Simple | WhatsApp | Facebook | TikTok» (por defecto «Simple») y, sólo con un patio conocido y subasta, «Hora de <ciudad de la
  empresa> | Hora del patio»; el texto de sólo lectura («Armando el texto…» mientras llega; si falla, «No se pudo armar el texto.» con «Reintentar»). El texto
  termina con la firma de quien comparte: «Asesor: <nombre>, <cargo>» y «WhatsApp: <número tal como lo guardó>»; sin cargo, sólo el nombre; sin WhatsApp, sin
  esa línea; si su perfil no se leyó, sin firma. La imagen y el PDF también lo nombran a él.
- **Pie:** «Creado por <autor>» (sin autor, no va) y los botones. Celular con el menú del sistema (que comparte archivos): «Compartir» (principal; la imagen de la tarjeta o
  las fotos marcadas y el texto), «Copiar texto» y «Descargar PDF», en columna a lo ancho y a 44 px. Escritorio: «Copiar imagen» (una sola imagen: con fotos,
  una marcada), «Descargar imagen» (la de la tarjeta en PNG o cada foto marcada), «Copiar texto» y «Descargar PDF», en una fila que se parte. Lo apagado dice su
  motivo debajo, sin repetirse («La imagen todavía no está lista.», «Preparando las fotos…», «Elige al menos una foto.», «Elige una sola foto para copiarla.»,
  «Este navegador no permite copiar imágenes.», «Este navegador no permite copiar texto.», «No hay conexión.»). El PDF que falla, el texto de «Vista previa»
  con «Reintentar». Avisos: «Texto copiado», «Imagen copiada»; con la imagen de la tarjeta fallida, «Compartir» manda el texto y avisa «Se compartió el texto. La imagen no se
  pudo armar.».
- **Sin acceso** (no existe, en la papelera, no se ve o el id no es de una cotización): «No tienes acceso a esta cotización.» con «Cerrar», sin pie de acciones.
- **Modo Live:** ni el botón ni la línea del «⋯»; por URL, «Con el Modo Live no se comparte.» con «Cerrar» (también si se enciende con el panel abierto).
- **Sin red:** arriba «No hay conexión.»; «Descargar PDF» y lo que todavía no se bajó, apagados con ese motivo; lo que ya está en memoria se copia o comparte.
- **Texto al 200 %:** el cuerpo se desplaza con su pista y el pie queda a la vista.

### Cotización: retocar la tarjeta (estados propios)

El modo «Retocar la tarjeta» de «Vista previa» en una guardada (`/cotizaciones/[id]?panel=vista-previa`): cambiar textos y ocultar filas de **esta** tarjeta
(`docs/COTIZADOR.md` › «Retoques de la tarjeta»), sin cifras ni colores. Su interfaz llega con `diferido()` al tocar «Retocar».

- **Quién:** quien la puede guardar (`puede_guardar` de la base). Sin ese permiso, o en la hoja nueva, no hay «Retocar». Con la tarjeta por omisión,
  apagado con «Esta cotización usa la tarjeta por omisión: no hay textos para retocar.»; con cambios sin guardar en la hoja, apagado con «Guarda o descarta
  los cambios de la hoja para retocar la tarjeta.». Cargando la tarjeta o con su error, lo de siempre y sin «Retocar».
- **El modo:** arriba «Toca un texto para cambiarlo; con el ojo de cada fila, ocúltala.»; la tarjeta del borrador con un botón sobre cada celda (el de una
  de texto abre su campo; el de un dato, el logo o una vacía elige su fila) y, a la derecha, un canal de 44 px con un botón por fila (ojo tachado
  «Ocultar la fila «…»», u ojo «Mostrar la fila «…»»); la píldora «Ocultar fila» o «Mostrar fila» sale al pasar, con el foco o con la fila elegida. Una fila
  oculta se ve atenuada. Elegir una fila suma debajo «Fila «…»» con «Ocultar fila» o «Mostrar fila» a 44 px (y, desde una celda de dato, «Esta celda
  muestra un dato de la cotización: no se retoca.»).
- **El campo:** «Texto de la celda», sin `maxLength`, arranca con lo que muestra la celda (un texto con datos, resuelto: «Comisión giro 4,2 %»; dejarlo
  igual no es un retoque), con «n de 300» (code points) y, si pasa, «Tiene N caracteres: el máximo es 300.»; Enter lo deja
  (aunque sea largo: la celda queda marcada), Mayús+Enter es un salto de línea, Esc lo cancela. Va encima de la celda (al menos 240 px, dentro de la
  tarjeta) si la tarjeta se ve casi a su tamaño y la celda es ancha; si no (el celular, el texto al 200 %, una celda angosta), a lo ancho bajo la tarjeta,
  traído a la vista y con el foco.
- **El pie:** «Listo» (principal; con un texto largo, apagado con «Acorta el texto de la celda «X»: tiene más de 300 caracteres.»), «Cancelar» (descarta sin
  preguntar) y, si la cotización tiene retoques guardados, el «⋯» con «Volver a la plantilla», que pregunta en el mismo pie («¿Volver a la plantilla? Se
  quitan los retoques de esta cotización.» con «Seguir retocando», con el foco, y «Volver a la plantilla») y guarda en el acto. En el celular a lo ancho
  (44 px); desde `sm`, en fila.
- **Salir con cambios** (Esc, la ✕, el clic afuera): «Tienes cambios sin guardar.» con «Seguir editando» y «Descartar» en el pie. Sin cambios, cierra.
- **Tras «Listo»:** «Tarjeta retocada.» (al volver a la plantilla, «La tarjeta volvió a la plantilla.»); la página vuelve con la versión nueva y el modal se
  dibuja otra vez, ya retocado. Mientras guarda, los controles van apagados y el modal no se cierra.
- **Retoques que ya no aplican:** «1 retoque ya no aplica: se quitará al guardar.» («N retoques ya no aplican: se quitarán al guardar.»), sólo en el modo.
- **Conflicto (`PT409`):** el aviso con quién y cuándo y «Recargar», que trae la versión nueva y descarta los retoques sin guardar; lo escrito queda hasta
  recargar. **Ya no se puede retocar** (la papelera, el permiso): «Ya no puedes retocar esta cotización.» con «Recargar». **Sin red o un fallo:** «No se
  pudo guardar.» con «Reintentar» (el mismo pedido); lo escrito queda. **Una regla de la base:** su mensaje junto a la celda o la fila (se abre su campo);
  sin lugar, arriba.
- **Modo Live:** los montos de la tarjeta siguen tapados; retocar textos funciona igual.

### Cotización: tablas (estados propios)

Configuración › Orígenes › un origen › «Tablas» de la barra de la fórmula (el drawer `?panel=tablas` sobre Planilla, Hoja o Tarjeta; sus paneles van en
`&accion=`; las compartidas se editan ahí, por cualquiera de los orígenes que las reciben): crear tablas de referencia, cambiar sus columnas, desactivarlas y editar y publicar sus filas
(`tabla_referencia_crear|columnas|desactivar|publicar()`).

- **En el drawer:** abrir una tabla (`&tabla=<id>`) cambia la lista por su editor dentro del mismo drawer, con «Volver a las tablas»; cerrar el drawer con
  cambios sin guardar pregunta antes. Las tablas se leen al abrir el drawer, no con la pestaña.
- **Quién entra y origen:** como «Fórmula»; cambiar de origen con el selector de las migas lleva a la misma pestaña del otro, sin el drawer.
- **Lista:** dos grupos, cada uno con su título: **«De <Origen>»** (las propias, con «Nueva tabla» arriba a la derecha; vacío: «<Origen> no tiene tablas propias.») y
  **«Compartidas»** (las que recibe; sin ninguna, el grupo no se dibuja). Cada fila: nombre, clave, «Tapada por la de <Origen>» (`<Badge>`, una compartida que una propia tapa) y
  «Versión N · <persona> · <cuándo>», con sólo su «⋯» («Editar filas», «Columnas», «Desactivar»: lleva a la tabla con ese panel). Tocar la fila (fuera del «⋯») abre «Editar
  filas» (`?tabla=<id>`); con el teclado la fila es un botón con nombre («Editar <nombre>») y el «⋯» va aparte («Más acciones de <nombre>»). Tope 100 con aviso y «Nueva
  tabla» apagado con su motivo. Esqueleto y error de la ruta.
- **Nueva tabla** (`?panel=nueva-tabla`, un `<Drawer>`): «Nombre» (debajo, «Clave: `x` · no cambia después»), para quién («Sólo de
  <Origen>» o «Compartida con todos los orígenes»; bajo el título del panel, qué significa cada una: la compartida la usan los orígenes sin una propia con su clave) y las columnas (nombre, tipo número, año o texto y
  clave, que sigue al nombre hasta tocarla; «Subir», «Bajar», «Quitar»; «Sumar una columna» hasta 20, apagado en el tope con su motivo). «Crear tabla» /
  «Creando…»; un rechazo de la base va junto a su campo con el foco (la clave tomada, junto al nombre) y uno sin campo, arriba. Sin conexión, el aviso
  arriba y lo escrito queda (repetir devuelve la misma tabla). Entró: «Creaste «X». Suma sus filas y publícala.» y abre la tabla. Cerrar con algo escrito
  pregunta.
- **Columnas** (`?tabla=<id>&panel=columnas-de-tabla`, `<Drawer>` amplio; «Columnas» del «⋯» del encabezado del editor, apagado con cambios sin publicar
  en las filas): renombrar, ordenar, sumar y quitar. La clave y el tipo de una existente se ven y no se cambian; quitar la marca «Se quita» con «No
  quitar» y avisa que su valor se borra de cada fila. Al pie, el resumen («Se renombra 1 · se quita 1») o «Sin cambios en las columnas.»; «Guardar
  columnas» apagado sin cambios. Una columna que usa una fórmula (publicada o borrador): el texto de la base arriba, con quién la usa. Conflicto: el
  texto de la base con «Recargar» (lo cambiado no vuelve). Entró: «Guardaste las columnas de «X».» y el editor se vuelve a montar con la versión nueva.
  Si es compartida, a qué orígenes les cambia.
- **Desactivar** (`?tabla=<id>&panel=desactivar-tabla`, `<Confirmar>` «Desactivar «X»»; apagado con cambios sin publicar): no se deshace y la clave
  queda tomada. En uso: el texto de la base con las fórmulas que la usan. Sin conexión, el aviso dentro y queda abierto; conflicto, «Recargar» dentro.
  Entró: «Desactivaste «X».» y vuelve a la lista.
- **Desde la ayuda de la hoja:** quien configura el origen edita las filas de una tabla en la ayuda de una celda de la hoja nueva y «Guardar» la publica
  con la misma RPC y sus mismos rechazos (Flujo 2 › «Editar la tabla desde la ayuda»); en el inspector de la hoja, «Abrir en Tablas» abre este drawer
  con la tabla del bloque.
- **Abrir una:** sólo si está en la lista del origen elegido; si no, o si ya no está o pasa de 2.000 filas, su motivo con «Volver a las
  tablas». El editor (con `diferido()`) ocupa el lugar de la lista: «Volver a las tablas» (no pregunta: el borrador conserva lo hecho),
  versión y, si es compartida o tapada, a quién le cambia publicarla.
- **Editor:** la tabla entera en memoria, de a 100 filas («Desde la fila 101»…, sin total; «Anterior» y «Siguiente»; la página no va a la
  URL). Un campo por columna declarada, con su etiqueta en la primera fila y el nombre «<Etiqueta>, fila n» en todas; números y años con el
  locale de la empresa (en es-BO «9.200,5» es 9200,5 y «1.5» es un aviso). Se aplica al salir del campo o con Enter; lo que no se lee queda
  escrito con su motivo y la fila conserva el valor de antes. «Subir», «Bajar» y el «⋯» con «Sumar una fila debajo», «Mover al
  principio/al final» y «Quitar la fila» (sin preguntar, con «Deshacer»); «Sumar una fila» al pie; tope 2.000 filas. Mover lo anuncia.
- **Primer error:** el de la fila más temprana (texto sin leer o celda que la base no acepta) arriba, con «Ir a la celda» (cambia de página
  y pone el foco); una columna que la tabla no declara no tiene campo: «Descartar los cambios».
- **Borrador:** cada cambio queda en la pestaña del navegador con la versión leída. Al volver, «Recuperamos tus cambios sin publicar.» con
  «Descartar»; si la tabla se publicó después, no se recuperan y lo dice. Al pie, que los cambios viven en esta pestaña hasta publicar o
  descartar, y «Descartar los cambios» (con «Deshacer»), o «Sin cambios que publicar.».
- **Publicar** (`?panel=publicar-tabla`; apagado sin cambios o con una celda marcada): las fórmulas publicadas que la usan pasan a su
  versión siguiente con estas filas; lo guardado de cada cotización no cambia. Nota como en «Fórmula». Por URL sin cambios o con una celda
  marcada, no se manda. Entró: el aviso con la versión y el editor se vuelve a montar. Conflicto: el texto de la base con «Recargar» (los
  cambios no vuelven); una celda rechazada, su mensaje con «Ir a la celda»; sin permiso (una compartida pide configurar cada origen que la
  usa) y lo demás, arriba del modal.

### Cotización: vigencia (estados propios)

Configuración › Orígenes › «Para todos los orígenes» › Vigencia (tarjeta y modal `?panel=vigencia`): la vigencia, una fila para todas las cotizaciones.

- **Quién:** la ve quien tiene `cotizaciones.configurar` en algún origen; la cambia quien la tiene en todos (la concesión sin origen). Sin
  eso, el «⋯» de la tarjeta apagado con su motivo, la tarjeta sin abrir nada y el motivo en un `<Aviso>` del bloque. La base lo vuelve a exigir en
  `empresa_guardar_ajustes_de_cotizacion()`.
- **Tarjeta:** «Vigencia» y «N días» (o «1 día»). Tocarla o «Editar vigencia…» abre el modal.
- **Modal «Vigencia»:** «Vigencia (días)» (1 a 365; fuera de rango, «La vigencia va de 1 a 365 días.» junto al campo con el foco), y una línea: «Si una
  cotización pide vehículo y lead se decide por rol y origen en «Roles y permisos».», con el enlace «Ir a Roles y permisos» para quien ve o gestiona
  los roles. «Guardar» en el pie del modal; sin borrador. Esqueleto en la tarjeta; si la lectura falla, «Reintentar» en la tarjeta (nunca los de fábrica).
- **Guardar:** «Guardando…» con el campo apagado; entró: «Vigencia guardada» y el modal se cierra. Cerrar con cambios pregunta. Otra persona cambió la fila
  (aquí o en Empresa): el texto de la base con «Recargar» y lo tipeado queda; igual sin conexión o sin permiso.
- **Dónde se nota:** la vigencia mueve «Vencida», «vence el», la tarjeta y el PDF de todas las cotizaciones, también las guardadas (se
  calcula al leer).

### Cotización: hoja (estados propios)

Configuración › Orígenes › un origen › Hoja (`/configuracion/origenes/<id>/hoja?formula=<fórmula>`, el editor de la hoja): la hoja de verdad dibujada en un lienzo,
donde se elige cada pieza (sección, celda, ítem, cabecera, tarjeta del total) y se edita en el inspector de la hoja, a la derecha. Lo que no tiene lugar en la hoja se
suma desde «Sin lugar en la hoja».

- **Quién entra y origen:** como «Fórmula».
- **Qué abre:** el borrador o, sin él, la publicada. Sin versión o sin diseño lo dice (aquí no se crea uno). Cargando,
  el esqueleto del lienzo y el inspector; una lectura que falla sube al «Reintentar» de la ruta.
- **El lienzo:** la hoja con los componentes de cotizar, cifras de prueba (datos en 0; si la fórmula aún no calcula, sin cifras) y el diseño **en edición** (lo
  aplicado aunque no se haya guardado). Es la de quien lo ve todo: las secciones «Avanzado» van debajo, en un recuadro «Detrás del botón «Avanzado» de la hoja:». Lo que dibuja va `inert`
  (ninguna celda recibe el foco); encima de cada pieza, su botón «Elegir «Precio»» (de una sección, «Elegir la sección «Base»», tocando su título).
  **Vistas** («Vista de la hoja», `aria-pressed`, 44 px): «Celular» (412 px), «Laptop» (1.280), «Grande» (1.920) y «Texto al 200 %» (412 con el texto al doble),
  en `?vista=` (recargar la conserva; cambiarla no suma al historial); sin `?vista=`, la que corresponde a la ventana. La hoja se achica para entrar (CSS `zoom`):
  la página no se ensancha.
- **Elegir:** el clic o Enter elige la pieza (`?pieza=`: un nodo, `seccion-<id>`, `atajos-<nodo>`, `cabecera-de-la-hoja`, `tarjeta-del-total`; recargar la
  conserva). Elegida, lleva el contorno, su «⋯» («Mover a la sección anterior», «Mover a la sección siguiente», cada una apagada con «No hay una sección
  antes donde entre.»; «Quitar») y sus dos bordes: el derecho («Ancho de «Precio»: 6 de 12 columnas») y el inferior («Alto de «Precio»: 2 filas»). El
  bloque «Avanzado» (el total suelto, el botón y el cierre) es una pieza más: se elige, se mueve de fila y no tiene «⋯». Sin nada elegido, el inspector lista «Sin lugar en la hoja (N)» con «Agregar «Aduana»» por fila (va al final de la primera
  sección principal y queda elegida); sin filas sin lugar, el lienzo ocupa todo el ancho.
- **Mover:** arrastrar una pieza (a 6 px de tocarla) a un **lugar libre** de su sección **o de otra**, o una sección a uno de la rejilla de las secciones;
  nada se corre mientras se arrastra: la marca, con el tamaño de la pieza, dice qué pasaría al soltar: libre («Columna 7, fila 2»), pisa («Ahí está
  «Flete».»), no entra («No entra: «Precio» mide 6 columnas y desde la 9 quedan 4.»), no va ahí (el motivo de la tarjeta del total) o la vista apila («En
  esta vista las piezas se apilan: elige una vista más ancha para acomodarlas.»). Soltar donde no entra no mueve a nadie. Una sección avanzada se suelta sobre
  otra de su lista y se intercambian. Con el teclado, Alt+flechas sobre la elegida: una celda en esa dirección (una avanzada, un lugar de su lista; el bloque,
  una fila). Cada movida se anuncia («Moviste «Precio» a la columna 7, fila 1.», «Moviste «Flete» a «Extras», columna 1, fila 2.») y la que no se hace dice
  por qué («No se movió: ahí está «Precio».», «Ya está en la primera columna.»). **Mover a una sección con otro nivel** lo dice en el inspector hasta la próxima elección («Ahora la ve
  «Costos»: antes la veían todos.»); si queda `editar_sin_ver` o `nivel_no_admitido`, la pieza va marcada. **El total** no va a una sección avanzada ni con nivel:
  el «+» no lo ofrece, Alt+↓ no entra y la regla se dice en la sección y en la pieza.
- **Ancho y alto:** el borde derecho de la pieza elegida cambia su ancho (columnas de 12) y el inferior su alto (filas, hasta 4); mientras se arrastra se ve lo
  que quedaría («6/12», «2 filas») y crece sólo hasta donde entra, sin empujar a nadie (el anuncio dice con qué se topó). Con el teclado, Alt+Shift+←/→ (una
  columna) y Alt+Shift+↑/↓ (una fila) con el foco en la pieza. En la vista que apila los bordes no empiezan.
- **El lugar en el inspector:** «Columna», «Fila», «Ancho» y «Alto» en una fila (en dos, si el inspector es angosto); cada opción que no entra va apagada con su
  motivo («7 — se pisa con «Flete»», «8 — se sale de las 12 columnas»): cambiar uno nunca mueve ni achica a otra pieza. El «Ancho» de una sección empieza con
  «Automático (la mitad, si hay lugar)». El bloque «Avanzado» sólo tiene «Fila»; una sección avanzada, nada (va en el orden de su lista, a todo el ancho).
- **Sumar:** el «+» de cada sección, a lo ancho en la fila que sigue a la última («Sumar una pieza aquí», un popover con lo que cabe ahí: «Celda de una fila»,
  «Tarjeta del total»…; con 40 piezas, apagado: «La hoja ya tiene 40 piezas: quita una para sumar otra.»; un borrador pasado del tope lo dice en la sección y al
  publicar). Lo sumado va al primer lugar libre de la sección en orden de lectura. Al pie, «+ Sección
  principal» y «+ Sección avanzada»: nace vacía, con su título, y queda elegida.
- **Quitar:** «Quitar» del «⋯» lo hace en el acto, con «Quitaste «Aduana».» y «Deshacer» (es reversible; la fila vuelve a «Sin lugar en la hoja»).
- **El inspector:** el título de la pieza y sus campos, en bloques. **Sección:** «Título» (≤ 80; vacío lo quita), «Dónde va» (Principal | Avanzado), «Quién la ve»
  y «Quién la edita». **Celda:** «Rótulo» y «Formato» (editan la fila de la fórmula: guardar manda la definición editada), «Quién la ve», «Quién la edita» y **«Ayuda»**: sus bloques en orden («Sin ayuda: la celda no muestra el botón «?».»), cada uno con su «⋯» («Mover
  antes», «Mover después», Alt+↑/↓ con el foco en él; el foco vuelve a su «⋯»; «Quitar» con «Deshacer»), y «+ Bloque» (Título, Texto, Enlaces o Tabla; nace
  vacío al final, el de tabla con la primera tabla del origen que la ayuda no usa; cada tipo, apagado con su motivo: «Hasta 8 bloques.», «Hasta 3 tablas por ayuda.»,
  «Este origen no tiene tablas.»). Un bloque vacío o con un rechazo se marca con «Completa este bloque.». **Título** (≤ 80) y **Texto** (≤ 1.000, «Escribe
  **así** para negrita.»). **Enlaces** (de 1 a 5): «Título del enlace N» (≤ 60) y «Dirección del enlace N» validados al tipear («Escribe un título.», «Hasta
  60 caracteres.», «Tiene que empezar con https://.», «No puede llevar espacios ni tildes.»), «Quitar el enlace N» (no el único) y «Agregar enlace» (apagado
  con «Hasta 5 enlaces.»). **Tabla:** «Tabla» (en dos grupos, «De <Origen>» y «Compartidas»; sin catálogo, «No pudimos leer las tablas del origen.» y las
  que nombra la fórmula), «Abrir en Tablas» (el drawer de tablas de la pestaña con ella, sin perder lo armado), sus columnas en el orden de la tabla, cada
  una con «Mostrar «<columna>»» («Muestra al menos una columna.») y «<columna>» llena la celda» («Ninguna» o una celda que acepta un valor; una que ya no,
  «Esa celda no acepta un valor en la hoja.»), y «Resaltar la fila del vehículo». Atajos: «Columna de los chips» y «Cuántos chips (1 a 12)». Interruptor: «Qué hace»: «Habilita» o «Muestra». Variante y
  subtotal se ven y no se editan. Niveles: «Todos» y los vivos; uno retirado que el diseño usa, «<nombre> (retirado)». Elegir quién ve alinea quién edita. **Lo
  que no admite nivel** (el total y lo que va aparte, o una sección que los tiene): «Quién la ve» apagado con su motivo. Con `equipo.roles.gestionar`, «+ Nuevo
  nivel» (el modal de Roles, `?panel=nuevo-nivel`; el creado queda elegido; en el tope, apagado con su motivo). **Una fila que ya no está en la fórmula**
  (`nodo_inexistente`): «Esta fila ya no está en la fórmula.» con «Quitar la pieza».
- **Aspecto** (una sección «Aspecto» a la vista en cada pieza; no se escribe el valor por defecto, se quita): primero, el lugar («Columna», «Fila», «Ancho» y
  «Alto»); por sección, «Relleno» (Chico | Medio | Grande),
  «Separación entre celdas» (Chica | Media | Grande), «Densidad» (Compacta | Cómoda), «Letra» (Chica | Normal | Grande), «Énfasis»
  (Normal | Fuerte) y «Color» («Sin color» y los colores del catálogo, con su muestra, y «+ Nuevo color», `?color=nuevo`: el creado queda elegido; en el tope,
  «Ya hay 48 colores…»); por ítem, «Letra» y «Énfasis»; en la cabecera, «Color», «Relleno», «Letra» y «Énfasis». Un color que el catálogo ya no tiene se ve «<clave> (no está en el
  catálogo)» y el aviso dice «La sección «base» usa un color que no está en el catálogo.» (publicar lo rechaza); **sin catálogo** («Color» apagado con «No se
  pudo leer el catálogo de colores.») nada se marca y el lienzo va sin colores. Un valor fuera de su escala (sólo si llegara de la base) va bajo su select
  (`aria-invalid`) y en el aviso. Un diseño viejo se abre con «Automático», «Medio», «Cómoda», «Normal» y su ancho con nombre por su número.
- **Cabecera de la hoja:** «Ofrecer «Ver total en moneda local»» (la hoja lo muestra apagado) y los modos de tipo de cambio: nombre, «Tipo
  de cambio de <bucket>» por bucket de la fórmula, «Total en» y «Quitar el modo» (sin confirmar: es borrador). «Sumar un modo» copia los
  tipos de cambio de la fórmula, con la clave derivada del nombre (no cambia al renombrar). Sin total en moneda local o sin tipos de cambio
  en la fórmula, «Sumar» se apaga con su motivo y los modos existentes siguen editables. Con un modo o más, los campos **por defecto**, los
  mismos del ⚙ de la cabecera de la hoja: «Tipo de cambio por defecto», «Mostrar el total en moneda local por defecto» (si se ofrece) y
  «Opciones visibles en el encabezado»; se guardan en el borrador. Quitar un modo o apagar «Ver total» limpian lo que nombraban.
- **Tarjeta del total:** lo que muestran la hoja y el PDF: «Total» (los nodos marcados como total; con
  uno solo, apagado) y «Mostrar «<nodo>» junto al total» por cada nodo «aparte»; uno elegido que dejó de ser «aparte» se sigue mostrando
  para poder quitarlo. Se ubica como pieza (`{ tipo: 'total' }`) en una sección principal sin nivel, una sola vez: la hoja la dibuja ahí, a todo el ancho de
  la sección; sin ubicar, va sola arriba de «Avanzado».
- **Avisos** (`role="status"`, no apagan «Guardar»): lo que alguien sin un nivel puede deducir restando («Quien no tiene el nivel «X»
  puede deducir «Y»…», 3 y «Y N más.») y «Revisa el diseño: <regla de la base>» cuando lo aplicado no pasaría al publicar; la pieza del rechazo va marcada en
  el lienzo y el aviso lleva «Ir a la pieza» (`?pieza=`).
- **Guardar el borrador:** «No hay cambios por guardar.», «Guardando…» (el lienzo y los campos esperan), «Se guardó el borrador.». Conflicto (`PT409`): el texto
  de la base con «Recargar» (lo no guardado se pierde); sin permiso, sin respuesta, regla y error, cada uno con su mensaje y los cambios quedan. Lo no guardado
  vuelve al volver a la pestaña, con «Recuperamos lo que habías escrito y no guardaste.» y «Descartar». **Salir con cambios** (otra pestaña, otro origen):
  la barra «Cambios sin guardar» con «Seguir editando» y «Descartar».
- **Publicar…:** en la barra de la fórmula, junto a «Guardar el borrador» (el mismo panel `?panel=publicar-formula` de la Planilla). Con cambios sin guardar,
  apagado: «Guarda el borrador antes de publicar.». Publicada, el editor sigue sobre la versión nueva, sin cambios.
- **Celular (< 1.024 px):** el editor no se usa: «Este editor se usa en una pantalla de al menos 1.024 px.» y debajo la hoja a 412 px en sólo lectura (sin
  inspector ni botones).
- **200 %:** el lienzo se achica igual; el inspector pasa a una columna bajo `@container` estrecho, con blancos de 44 px (el resto, `.claude/rules/ui.md`).

### Cotización: colores (estados propios)

Configuración › Orígenes › «Para todos los orígenes» › Colores (tarjeta y modal `?panel=colores`; los paneles conservan el nombre técnico `tono`): el catálogo de colores de la
empresa, que nombran los grupos de una fórmula y las secciones y la cabecera del diseño. Es de **toda la empresa**, no de un origen, y **se
guarda al instante** (cada color es una escritura propia; no entra en el borrador del diseño).

- **Quién entra:** `cotizaciones.configurar` en algún origen. Leer, cualquiera con sesión; la base pide la clave en cada escritura (42501). Sin él, el bloque no se dibuja y `?panel=colores`
  no abre (se limpia).
- **Tarjeta:** los primeros 6 por nombre, cada uno con su muestra, y «y N más» (sobre lo leído, nunca un total); sin ninguno, «Todavía no hay colores.». Tocarla o «Editar colores…» del
  «⋯» abre la lista.
- **Modal «Colores» (la lista):** «Nuevo color» arriba a la izquierda (primario) y «Cerrar» en el pie. Por nombre, hasta 48 (tope de la base). Fila: nombre, clave en texto suave (no cambia
  nunca: la nombran los grupos), el hex como lo pinta la tarjeta (de fondo, con su texto y el hex en mono) y las dos muestras de la hoja «Aa» («Claro» y «Oscuro», con los colores de
  ese tema sea cual sea el de quien mira). Sin «Editar» suelto: sólo su «⋯» («Más acciones de «nombre»») con «Editar…» y «Eliminar…», y tocar la fila abre «Editar»; con el teclado, la fila es
  un botón («Editar «nombre»»). No se muestra cuántos hay.
- **Nuevo, editar y eliminar** son ventanas hermanas de la lista (`?panel=nuevo-tono`, `editar-tono&tono=<id>`, `eliminar-tono&tono=<id>`): al cerrarlas —por guardar, cancelar o Esc— se vuelve a la
  lista en un solo cambio de dirección.
- **Nuevo y editar** (modal «Nuevo color» o «Editar color»; al editar, «La clave «x» no cambia: la nombran los grupos.»): «Nombre» (≤ 40,
  único) y «Color» (selector y campo `#rrggbb` con el mismo valor; nace en `#31869b`). Debajo, **en vivo**: «En la hoja», las muestras
  «Claro» y «Oscuro» con lo que derivará la base (contraste AA garantizado, no se avisa), y «En la tarjeta», el hex con el texto que se lee
  («Así se ve») y «Con texto negro: n:1» y «Con texto blanco: n:1» (truncado a un decimal). Si ninguno llega a 4,5:1, un aviso suave «Con
  este color el texto de la tarjeta se lee con dificultad.» que **no** frena el guardado. Con el hex a medio escribir no se dibuja ninguna
  muestra. Un hex mal escrito: «Escríbelo como #rrggbb, por ejemplo #31869b.» junto a «Color» (la pantalla y la base) y nada sale; el nombre
  vacío, largo o repetido, junto a «Nombre». Sin cambios, «Guardar» cierra sin escribir; cerrar con algo escrito pregunta; un conflicto
  conserva lo escrito con «Otra persona cambió este color mientras lo editabas.» y «Recargar»; si otra persona lo eliminó, «Ese color ya no
  existe. Recarga para ver cómo quedó.»
- **Eliminar** (desde el «⋯», `<Confirmar>` «Eliminar el color «x»»): la lista no sabe cuáles están en uso; si alguna versión de una fórmula
  lo nombra, la base responde cuál (23503), sale como aviso y el diálogo se cierra. No se deshace.
- **Vacío** «Todavía no hay colores. Crea el primero.» en la lista, con «Nuevo color» arriba; **con 48**, «Nuevo color» apagado con su motivo («Ya hay 48
  colores, que es el máximo. Elimina uno que ningún grupo use.»). Esqueleto en la tarjeta; una lectura que falla deja esa tarjeta con «Reintentar». Sin conexión lo escrito queda y sale al volver.
- **200 %:** cada fila apila nombre, muestras y acciones; el modal es `ModalDeFormulario`.

### Leads: listado (estados propios)

- **Entrar:** `leads.ver`; sin él, sin permiso (a quién pedirlo) y sin consulta. «Propios», sólo la cartera; «todos», todo, con el teléfono
  enmascarado («+591 •••••01») y «Solo la cartera» en los datos privados de lo ajeno. Limbo y papelera no aparecen para nadie.
- **Columnas:** nombre y su número («N.º 1.234» con `leads.numero_global.ver`; «Tu n.º 12» sin él), teléfono, tipo, origen, «Último
  seguimiento» (dos líneas: arriba su tipo con el icono del catálogo y su título, debajo «hace 3 días»; si es privado de otra persona, sólo «hace 3 días»; un clic abre la
  ficha en sus seguimientos), «Recordatorio» (el próximo pendiente de quien mira, en dos líneas: arriba de qué es, debajo «en 2 días»; vencido, resaltado y «vencido hace 1 día»; un clic lo
  abre) y campos «en la tabla». Sin seguimientos: el texto «Sin seguimientos»; sin recordatorio: «—». Son texto, nunca botón: crear es del «⋯». Al guardar un
  seguimiento o un recordatorio desde el «⋯», la lista relee su página y la fila lo muestra (sin recargar, con filtros, cursor y foco donde estaban). Lo relativo se refresca cada minuto. Tarjeta: nombre, número, tipo, teléfono, origen, esos dos datos y hasta dos más.
- **Filtros y búsqueda:** por nombre o número (`#124`), nunca por teléfono; sobre un campo «solo la cartera», quien ve «todos» lee que
  sólo busca en sus leads. Una vista guardada con un campo o etiqueta que ya no existe se aplica sin ese filtro y avisa.
- **Tus marcas (privadas, «Solo las ves tú.»):** «Tachados» (ocultarlos por defecto · mostrarlos también · sólo los tachados),
  «Favoritos», «Etiquetas». No reordenan. Una línea dice cuántos coincidentes ocultan los tachados, con «Mostrarlos». **Mientras se busca
  no se ocultan.**
- **«⋯» de la fila** (la misma lista, en este orden, en fila, tarjeta de la lista, kanban y ficha; `accionesDeLead()`): **«Cotizar lead»**, la acción principal,
  sola arriba, en negrita y la primera con el teclado (`cotizaciones.crear` en algún origen: la hoja con el lead elegido en el primer origen donde quien mira cotiza,
  con `returnTo` a donde estaba y «Volver» junto al título de la hoja; el destino se arma una vez por página, nunca por fila) · «Agendar recordatorio…», «Anotar seguimiento…» y «Nueva oportunidad…»
  (cartera y `leads.editar`, abren su modal con `?panel=…&para=<id>`; en la ficha, sin `para`) y «Ver oportunidades» (lead en la cartera de quien mira: lleva a
  `/leads/<id>?seccion=oportunidades`) · **«Editar lead»** (cartera y `leads.editar`: el panel de edición, `?panel=editar-lead`, con `&para=<id>` fuera de la ficha, que
  lee el lead al abrirse; con sólo `leads.telefonos_extra.editar` dice «Editar teléfonos» y abre el panel en modo teléfonos) · «Ver actividad» (`actividad.ver`:
  `/actividad?registro=<id>`) · «Etiquetas…», «Favorito», «Tachado» (con «Deshacer») · «Enviar a la papelera» (`leads.eliminar`). **«Nueva oportunidad…»
  abre primero un aviso** con las oportunidades del lead que quien mira ve (título, etapa y estado; hasta 5, «y N más» con «Ver todas», cada una con «Ver»; incluida la base con
  que nace todo lead), «Crear igual» (sigue al formulario con «Título» —el nombre del lead— y «Monto estimado» opcional; «Crear oportunidad» deja el aviso y la lista donde estaba; un
  rechazo deja el modal abierto con lo escrito) y «Cancelar». Se lee al abrir el modal, con esqueleto; si falla, lo dice con «Reintentar» y «Crear igual» sigue ahí.
  Sin oportunidades, abre directo en el formulario. **Con una abierta en el embudo por defecto** (una abierta por lead y embudo), «Crear igual» va apagado,
  descrito por su motivo debajo de la lista («Ya tiene una abierta en «Ventas».»), y «Abrir esa» es la principal (su panel en la ficha). Si otra pestaña la
  creó en el medio, el formulario queda abierto con lo escrito y un aviso de peligro arriba con el mensaje de la base y «Abrir esa» enfocado. En el panel de
  la ficha (`?panel=nueva-oportunidad`) los embudos con una abierta salen apagados («Ventas (por defecto) · Ya tiene una abierta») y arranca en el primero
  libre; sin ninguno libre, «Crear oportunidad» apagado y «Ya tiene una oportunidad abierta en cada embudo.». Reabrir con «Mover a…» o restaurar con
  «Deshacer» habiendo otra abierta: la tarjeta vuelve y el error trae «Abrir esa».
- **Vacíos:** sin leads, con «Nuevo lead» y «Ver todos» según permiso; por filtro, con «Limpiar filtros». Esqueleto; error.
- **Abrir:** la lista no tiene resumen. El nombre de la fila y de la tarjeta es un enlace a `/leads/<id>` (el lector lo anuncia con el nombre; Tab llega a él,
  una parada por ítem, y Enter abre); un clic en cualquier otra parte de la fila o la tarjeta navega igual. Ctrl, Cmd o Shift + clic y el botón del medio
  abren otra pestaña; con texto elegido no navega. Lo propio de la fila hace lo suyo: el «⋯», «Último seguimiento», «Recordatorio» y el enlace de un campo.
  La tarjeta del kanban lleva a `/leads/<id>?seccion=oportunidades`; «Mover a…» y el «⋯» no navegan. Al volver de la ficha, la página se relee con sus
  filtros y su cursor.

### Leads: ficha (estados propios)

- **Entrar:** `leads.ver`. Inexistente, en la papelera, en limbo o ajeno **se ven igual** («No encontramos este lead o no tienes acceso.»
  con «Ir a Leads»): ni nombre ni número en la página.
- **Cabecera** (arriba de la columna izquierda): el nombre con el «⋯» arriba a la derecha (el lugar del «⋯» de una tarjeta sin imagen: 44 px, siempre a
  la vista; el nombre largo se parte en líneas sin pasar por debajo); debajo, quién lo tiene en una línea («Dueño: Ana · Compartido con Luis y 1 más»; sólo
  nombres, «(tú)» para quien mira, «y 99+ más» como tope; sin compartidos, «Dueño: Ana»; sin dueño a la vista, «Compartido con …»); los números y las
  marcas de quien mira. «Cotizar lead», «Editar lead» (o «Editar teléfonos»), «Favorito», «Tachado» y «Etiquetas…» en el «⋯»; tope 20 etiquetas por lead; `?panel=etiquetas` las gestiona
  (renombrar, color, eliminar con confirmación si está en uso).
- **Datos:** los datos clave del lead en dos columnas (una en el celular y al 200 %): «Tipo», «Origen del lead» («(inactivo)»), «País» (el campo «País» del
  layout; vacío o sin él, el del teléfono principal; un número enmascarado no da país: «—») y «Teléfono principal» (sin el país al lado; fuera de la
  cartera, enmascarado con «Completo solo para su cartera.»), y «Notas» a lo ancho (el campo de texto largo «Notas»: hasta 4 líneas con «…»; sin el
  campo no se dibuja; vacío, «Sin notas»). Debajo, «Ver más» a lo ancho abre un modal por la URL (`?ver=datos`, con su propia clave: no pisa `?panel=`):
  «Datos de <nombre>», de sólo lectura y desplazable, con el alta, los grupos del layout sin plegar (un `h3` por grupo) y «Teléfonos» (principal y extras con
  etiqueta y país); Esc y «Cerrar» devuelven el foco a «Ver más»; con permiso, «Editar» (o «Editar teléfonos») lo reemplaza por el panel de edición
  (`?panel=editar-lead`, sin `ver`). Sin red, «Sin conexión. No se pudo abrir esto.» con «Reintentar». **Editar** sólo con
  `leads.editar` y el lead **en la cartera** (con «todos» se ve y no se edita); `Ctrl/Cmd+S` guarda y cierra. Conflicto: quién y cuándo,
  «Ver cómo quedó» y «Recargar»; un seguimiento nuevo, compartir o transferir no dan conflicto.
- **Quién lo tiene:** nombres y tipo de acceso («Dueño», «Compartido»); nunca correo ni teléfono. «Compartir» y «Transferir»
  (`?panel=compartir-lead`/`transferir-lead`; entre los dos todo el ancho: mitad y mitad, uno solo a lo ancho y, si no caben lado a lado —el celular angosto, el texto al 200 %—, apilados) sólo para el dueño o, con el permiso en «todos», para quien lo ve; nunca se ofrecen a quien
  mira. «Quitar acceso» con «Deshacer»; «Salir de este lead» confirma (en su fila, a lo ancho). Al dueño se le transfiere, no se le quita.
- **Acceso al portal:** el título con su «⋯» y una línea de estado: «Sin acceso» (también revocado, con quién lo revocó debajo), «Tiene acceso desde
  <fecha>» (debajo el código, quién lo dio, el último ingreso y si sigue con la clave temporal) o «Bloqueado: no puede entrar hasta las HH:MM.». Un botón
  principal a todo el ancho: «Dar acceso», «Compartir acceso» (copia el código: «Código copiado»; la clave no se conoce) o «Desbloquear». «Cambiar la
  clave» (el diálogo de volver a otorgar) y «Quitar el acceso» van en el «⋯», que sigue al botón en el orden del teclado.
- **Enviar a la papelera:** último ítem del «⋯» (`leads.eliminar`); sin preguntar, con «Deshacer» 10 s. Con un vehículo vinculado visible,
  apagado con motivo y «Ir a «Vehículos»» (salta a Relacionados); si lo frena uno que no se ve, la base rechaza nombrando al lead, no al vehículo.
- **La derecha:** el índice que baja y cuatro bloques compactos, de lo más usado a lo menos, cada uno por su permiso (sin permiso, ni el bloque ni su
  entrada en el índice), con un solo título, una sola acción en él y lo demás en su «⋯»; sin subtítulos que repitan; 3 a la vista y «Ver todos» o «Ver
  todas» (sin número) sólo si hay algo que no se ve. **Seguimiento** (ver «Leads: seguimientos y recordatorios»). **Cotizaciones** (ver «Cotizaciones del
  lead y del vehículo»). **Vehículos** (con `vehiculos.ver`; `?seccion=vehiculos` y `#relacionados` llevan acá): el compacto de Relacionados (ver
  «Relacionados (estados propios)») con «Vincular o marcar» en el título (cartera y `leads.editar`: abre `?panel=agregar-vehiculo`, que busca por título, VIN,
  lote o #número, con «Vincular» y nota de interés ≤ 500); vinculados, interesados (con nota) y cotizados con sus acciones en el «⋯» de cada fila
  («Desvincular»: con la cartera, en el lugar con «Deshacer»; sin ella, confirma en `?panel=desvincular&vinculado=`; «Quitar interés»). Al pie, «Ver los
  vínculos anteriores» (sólo si hay alguno): un botón que abre el drawer «Vínculos anteriores» (`?panel=vinculos-anteriores`), hasta 50 con su tope. **Oportunidades** (con la cartera): el **embudo del lead**.
  Un selector de embudo (sólo si quien mira tiene más de uno; lo elegido se recuerda por persona) y una columna por etapa del embudo elegido, con el nombre sobre su color y
  las oportunidades de este lead en ella (abiertas, ganadas y perdidas), hasta 3 por columna. Cada tarjeta: título (hasta dos líneas), vehículo si lo tiene, monto con `<Monto>`,
  motivo si es perdida y su «⋯» arriba a la derecha con «Mover a», «Editar» y «Eliminar». **Arrastrar** una tarjeta a otra columna la mueve (mouse; con el teclado, Tab a la
  tarjeta, Espacio la toma, las flechas la llevan a la etapa de al lado y Espacio la suelta; Esc cancela; cada paso se anuncia en español); soltar en una perdida pide el motivo
  como «Mover a» (`?panel=mover-oportunidad`). Desde 36 rem de bloque, columnas de 11 rem en una fila que se desplaza de costado; debajo (el celular, el texto al 200 %), las etapas una
  bajo otra, una vacía es sólo su encabezado, y se mueve con «Mover a» (no se arrastra). «Nueva» en el título (su nombre accesible, «Nueva oportunidad»; `?panel=nueva-oportunidad`,
  empieza en el embudo que se ve) y, a su lado, el «⋯» del bloque con «Ver en el embudo» (`/leads?vista=embudo&embudo=<id>&lead=<id>`, el embudo que se ve); si algo no se dibuja (más por leer o
  más de 3 en una etapa), «Ver en el embudo» también al pie, como enlace de texto sin número.
- **Estados de los bloques:** cada uno tras su `<Suspense>` con su esqueleto del alto de lo que viene (el índice sale enseguida: son los permisos); uno que
  falla al leer o al dibujar muestra su título, «No pudimos cargar «<título>».» y «Reintentar», y los demás siguen; vacíos de una línea («Sin
  seguimientos todavía.», «Sin cotizaciones que puedas ver.», «Sin vehículos.», «Sin oportunidades en «<embudo>».»); sin recordatorio pendiente no se dibuja su
  fila; fuera de la cartera se ve y no se edita (teléfonos enmascarados con «Completo solo para su cartera.», privados «Solo la cartera», sin «+», sin «⋯»
  en las filas de seguimiento, sin «Vincular o marcar» y sin «Oportunidades»); sin `cotizaciones.crear`, «Cotizaciones» sin «Cotizar»; sin red el índice sigue (son anclas) y lo diferido dice «Sin
  conexión. No se pudo abrir esto.»; al 200 %, una sola columna sin ensanchar la página.

### Leads: papelera, importar y teléfonos (estados propios)

- **Papelera** (`/leads/papelera`): para `leads.eliminar`, `leads.crear` (ve lo que envió) o `leads.papelera.purgar` (ve todo). Enviar es
  todo o nada (hasta 200). Por lote, con nombre y número; **nunca teléfono ni datos privados**. Restaurar no reabre el portal; un lead cuyo
  teléfono tomó otro queda adentro con motivo. Purgar (`leads.papelera.purgar`) nombra lo que borra y un lote de varios pide «purgar N»;
  vehículo vinculado, pagos o portal vigente lo impiden.
- **Importar:** vista previa en grilla alineada (contenedor ≥ 42 rem; si no, nombre sobre motivo). «País» vacío se completa con el del
  teléfono. **Deshacer importación** (24 h): el diálogo cuenta cuántos leads van a la papelera y el resultado cuántos se movieron y cuántos
  quedaron, nunca nombres ni teléfonos.
- **Teléfonos de la ficha:** la ficha los muestra **sólo para leer** (el principal en los datos clave; todos, con los extras, en «Ver más»); se editan en el panel de edición. Los extras, con la cartera y
  `leads.telefonos_extra.editar` (sin `leads.editar`, «Editar teléfonos» abre el mismo panel en modo teléfonos: «Teléfonos de <nombre>», sólo los teléfonos,
  «Los demás datos los edita quien tiene el permiso.» y «Cerrar»); el principal, con la cartera y `leads.editar`; si no, enmascarados y sin botones.
  «Cambiar el principal» (en el panel de la ficha; apagado con «Guarda o descarta los cambios para cambiarlo.» si hay algo escrito) pasa a
  `?panel=cambiar-telefono`: el actual pasa a extra «Anterior»; el nuevo se verifica al tipear y uno existente, ajeno o el mismo deshabilitan el botón
  con su frase. Extras (`?extra=nuevo` dentro del panel de edición; hasta el máximo de la empresa, 6 de fábrica): número con país y
  etiqueta ≤ 40, «Quitar» con «Deshacer». El número se verifica al tipear: con «Los teléfonos extra cuentan como el principal» un número
  de otro lead bloquea (con «Ver ese lead» si lo ve); sin ella, avisa. Con el máximo alcanzado «Agregar» se apaga con su frase; con más del
  máximo, «quita K para agregar otro» y, con `leads.configurar`, «Cambiar el máximo».

### Leads: seguimientos y recordatorios (estados propios)

- **Quién ve qué:** un seguimiento nace privado, sólo para su autor; «Visible para el cliente» lo muestra a quienes ven el lead y al
  portal. Ni el co-asesor ni quien ve «todos» leen lo privado ajeno, y la pantalla no lo insinúa (sin conteo ni «último seguimiento»).
- **Anotar** (cartera y `leads.editar`): modal `?panel=anotar-seguimiento` con los campos del alta más «Visible para el cliente».
  `Ctrl/Cmd+Enter` o `Ctrl/Cmd+S` guardan; recargar lo reabre con lo escrito; «atrás» deja un borrador; sin tipos activos, apagado con
  motivo. **Editar/eliminar** sólo lo propio (`?panel=editar-seguimiento&seguimiento=<id>`); eliminar con «Deshacer». Conflicto con
  «Recargar», conservando lo escrito.
- **En la ficha, el bloque «Seguimiento»:** en una columna. En el título, un «+» («Anotar o agendar», cartera y `leads.editar`) que despliega «Anotar
  seguimiento» (apagado con su motivo sin tipos activos) y «Agendar recordatorio», y un «⋯» con «Ver tus recordatorios»; al cerrarse el modal, el foco
  vuelve al «+». Arriba, tu recordatorio pendiente más próximo en una fila, con «Completar» a la vista y «Editar» y «Eliminar» en su «⋯» (vencido: borde y
  fondo de aviso y «Vencido»; sin pendientes no se dibuja). Debajo, los 3 últimos seguimientos en línea de tiempo: el icono de su tipo en un círculo sobre
  una línea vertical, el título, «Llamada · hace 2 h · Ana · <vehículo>» (el nombre del tipo a la vista: uno sin icono o desactivado sigue nombrando a
  los suyos), el ojo si lo ve el cliente y dos líneas del detalle, con «Editar» y «Eliminar» en el «⋯»
  de los propios; un borrador sin guardar se dice arriba en una línea («Tienes un seguimiento sin guardar.» y «Continuar»). «Ver todos» (si hay más) y
  «Ver tus recordatorios», sin número, abren un drawer en `?todos=seguimientos|recordatorios` («Seguimientos de <nombre>», «Tus recordatorios sobre
  <nombre>») con la lista completa; con él abierto, los modales de la URL son del drawer.
- **Línea de tiempo** (en «Ver todos»): de a 20 hasta 500; «Ir a una fecha» (no va a la URL) trae ese día y lo anterior; vacío.
- **Tus recordatorios:** sólo los propios; «Agendar recordatorio» (cartera); vencidos primero con «Vencido»; «Completados» a la vista, leídos al acercarse (en «Ver todos»);
  «Completar»/«Reabrir», «Editar», «Eliminar» con «Deshacer». Modal por URL (`?panel=agendar-recordatorio`,
  `editar-recordatorio&recordatorio=<id>`): «De qué es», «Cuándo» y «Vehículo (opcional)»; no se agenda en el pasado.

### Totales y topes (`.claude/rules/escala.md`)

Un número que se muestra nunca es el total exacto: se cuenta hasta un tope y se dice «más de N» (en una frase) o «N+» (en una cabecera).
Toda lista que crece dibuja a lo sumo un tope y lo dice, con un camino a lo antiguo.

- **Listado de leads y vehículos:** sin total ni «página 3 de 800»: Anterior y Siguiente y, arriba, «Los más recientes» o «Creados hasta
  el 2 sep 2026» con «Volver al principio». Para lo antiguo, **filtrar** o **buscar**.
- **Exportar:** con más de 5.000 leads en los filtros no exporta y pide filtrar más.
- **Embudo:** cabecera de columna y pestaña dicen «37» o «500+». Una columna dibuja a lo sumo 500 y ahí ofrece «Buscar en el embudo»
  (`?q=`, desde 2 caracteres; busca título y nombre del lead en todas las columnas; es de la vista de embudo).
- **Relacionados:** cada grupo muestra «n» o «100+» en su chip o en su título (una ventana de 101 por grupo, lo que no se ve incluido, nunca un total exacto), hasta 3 filas y «Ver todos» de a 20 por cursor hasta 500 con `<AvisoDeTope>`.
- **Vehículos y ficha:** «Vínculos anteriores» (hasta 50) y «Agregar vehículo» dicen su tope al pie con `<AvisoDeTope>`; vinculados e interesados son
  los grupos de Relacionados («100+», «Ver todos» hasta 500); el bloque «Seguimiento» muestra 3 seguimientos y tu recordatorio más próximo, y «Ver
  todos» lee de a 20 hasta 500; «Cotizaciones» muestra las 3 más recientes y «Ver todas» es el listado; «Oportunidades» dibuja hasta 3 por etapa y lo
  demás está en «Ver en el embudo», el embudo filtrado por el lead.
- **Papeleras:** de a 5 lotes por página (`?cursor=`); un lote trae hasta 200 y muestra 20 con «Mostrar los 200». Sin «Ítems por página»:
  su unidad es el lote.
- **Sin red:** abrir un modal, panel o pestaña nunca pedidos dice «Sin conexión. No se pudo abrir esto.» con «Reintentar»; paginar sin red
  no navega y lo dice.

### Repuestos: listado (estados propios)

- **Estados:** esqueleto de lista (8 filas, 6 columnas); vacío de primera vez con «Nuevo proyecto» si hay `repuestos.editar` (con el
  filtro «Abiertos» aclara que los cerrados no se muestran); vacío por filtro con «Limpiar filtros»; cursor fuera de rango con «Volver al
  principio»; error de `(app)`; sin `repuestos.ver`, «No tienes permiso».
- **Sin «Anterior»:** «Siguiente» y, con cursor, «Volver al principio». Más de 200 ítems se escribe «200+».
- **Vista «Stock»:** «Proyectos», «Cadena» y «Stock» en «Vista y opciones» › «Qué ver» (en «Stock», que no tiene barra, el botón va solo arriba a la izquierda; cambiar no conserva filtros ni página; «Nuevo proyecto» sólo en «Proyectos»).
- **⚙ «Configurar»:** con `repuestos.configurar`, un enlace con nombre «Configurar los repuestos» en la fila de filtros de las tres vistas (en Stock, junto a «Vista y opciones»), a `/repuestos/configuracion`; sin la clave no se dibuja. Ver «Repuestos (config)».
  Columnas: ítem, proyecto (`#N` · vehículo, con «Cerrado»), en stock y desde; sin filtros, por cursor. Vacío: «No hay repuestos en
  stock.» con «Lo que sobra de un ítem se pasa a stock desde la hoja de su proyecto.». La fila abre el ítem en la hoja de su proyecto con
  su panel de stock. El «⋯» (sólo con `repuestos.editar`, también con el proyecto cerrado): «Reasignar a un proyecto» (destino abierto,
  distinto del de origen, y cantidad), «Vender suelto» y «Devolver al proveedor» (cantidad y nota); cada uno un drawer con URL que, si el
  ítem ya no está en la página, avisa y limpia la URL. Tras el éxito se cierra, la página se relee y un aviso lo dice (reasignar, con «Ver
  proyecto»).
- **Nuevo proyecto:** «De un vehículo» (buscador del inventario) o «Externo» (vehículo y VIN); un `?vehiculo=` que no se ve abre como
  «Externo» con un aviso. El cliente:
  - Con `leads.ver`, **«Cliente (lead)»** en los dos orígenes (opcional): el buscador de leads (≥ 3 letras o `#n`, nunca por teléfono, sólo lo
    que quien mira ve) y, con el campo vacío y `leads.crear`, «Nuevo lead» (44 px y a lo ancho en el celular). En «De un vehículo» viene puesto
    el lead vinculado al vehículo («Vinculado al vehículo»; mientras se lee, «Buscando el cliente del vehículo…» y «Crear proyecto» espera);
    «Cambiar» lo vacía y cambiar o quitar el vehículo, o pasar a «Externo», sólo quita ese propuesto. Un vehículo sin lead, o con uno que no se
    ve, deja el campo vacío sin texto. Si la lectura falla: «No pudimos traer el cliente del vehículo. Búscalo aquí.».
  - «Nuevo lead» abre el alta del shell (`?nuevo=proyecto&panel=nuevo-lead&elegir=lead`, con `replace`): el formulario se esconde y, al
    cerrar el alta (Esc, «Cancelar»), vuelve con lo escrito y el aviso del borrador; al guardar, «Trayendo el lead que creaste…» y el creado
    elegido. Un `?lead=` que no se ve: «No encontramos ese lead o no tienes acceso.». «Atrás» desde el alta sale del formulario (lo escrito
    queda en el borrador).
  - Sin `leads.ver`, como siempre: en el externo, «Cliente (opcional)» y «Teléfono del cliente (opcional)» escritos; en «De un vehículo»,
    sin cliente.
  - Un lead que la base rechaza al crear (dejó de verse, papelera, limbo) se suelta y su motivo queda junto al buscador, con el foco ahí;
    lo demás queda escrito.

### Repuestos: proyecto (estados propios)

- **Estados:** cabecera esqueleto (el título y el recuadro del vehículo) y lista esqueleto (6 tarjetas); sin `repuestos.ver`, «No tienes permiso»; error de `(app)`. No existe,
  eliminado o sin acceso se dicen igual: «Este proyecto ya no está disponible: no existe o ya no tienes acceso.» con «Volver a Repuestos».
- **Barra de progreso:** esqueleto de una fila (`h-14`) y el de las pestañas (`h-9`) con la cabecera. Sin ítems, los pasos sólo con su nombre y «Agrega ítems para ver cuántos van en
  cada paso.». Progreso de una fase = los ítems que llegaron (están en ella o en una a la que se llega desde ella hacia adelante): «3 de 5»,
  con la hoja topada «37+ de 200+»; un ítem «Perdido» no cuenta en «Recibido». «Precio al cliente»: «2 de 5 con precio». «Pago del
  cliente», con `repuestos.costos.ver`: «5 de 5 · Registrado» o «0 de 5 · Sin registrar»; sin la clave, los que llegaron a la fase que lo
  pide, sin decir nada del pago. Flujo sin fases: «El flujo de repuestos todavía no tiene fases: los pasos aparecen cuando las tenga.»
  (con `repuestos.configurar`, «Configurar el flujo»); ilegible: «No pudimos leer el flujo de repuestos: los pasos no se muestran.» con
  «Reintentar»; con más fases o salidas de las que se muestran, una línea que lo dice. En los tres, las pestañas siguen
  con las permitidas, la hoja sigue y no hay botones del siguiente. La fila se desplaza de costado con su pista.
- **Contenido de una pestaña** (Cotizaciones, Pagos, Compras): mientras llega, el esqueleto de su lista en un alto reservado (`min-h-80`); su `h2` es sólo para lectores de pantalla y recibe el foco si la abrió el botón de un ítem o un hito, sin «Cerrar» (se cambia de pestaña). Si su lectura falla, «No se pudieron
  cargar…» con «Reintentar» ahí (la hoja sigue); sin red, «Sin conexión. No se pudo abrir esto.» con «Reintentar».
- **Siguiente:** en la tarjeta del ítem, tras cantidad y precio, a lo ancho y a 44 px. Nombre accesible «Comprar · Bomba». Sin fase: «Mover a
  «X»» con una sola fase inicial, «Elegir fase» con varias, nada sin inicial. Fase final (también «Perdido») o proyecto cerrado: nada (la
  fase la dice el encabezado del grupo; sin flujo legible, la insignia de su fase). Sin la clave de lo que toca (`repuestos.mover`, `repuestos.cotizar`, `repuestos.costos.editar`): «Sigue: «X»», sin botón (un hito
  bloqueante que falta y quien mira no puede hacer: «Sigue: «Precio al cliente»», nunca «Mover»). Un hito informativo no cambia el botón. Tras registrar un pago, la página se vuelve a pedir y los botones del siguiente se apagan mientras dura.
- **Ítems** (pestaña Ítems): arriba, la barra (`role="group"` «Buscar y filtrar los ítems»): el buscador «Buscar ítems» (tipo de pieza, descripción, tracking y notas; 3 letras o más, como toda búsqueda), las
  fichas **Fase · Tipo de pieza · Condición · País de origen · Vía de transporte** (una sola opción cada una; las opciones son las que los ítems del proyecto tienen) y la ficha
  «Sin precio»; con algo puesto, «Limpiar filtros» y «3 de 12 ítems» (`role="status"`; con la hoja topada, «3 de 200+ ítems»). El buscador y las fichas viven en la URL
  (`?q=&fase=&tipo=&condicion=&pais=&via=&sin_precio=1`, `shallow`, `replace`: filtrar no pide nada al servidor ni suma entradas al «atrás») y se aplican en el navegador sobre lo ya leído. Debajo,
  los ítems como **tarjetas agrupadas por paso** (grilla de `18rem` mínimo; un `h2` por grupo con el punto de su color y «Comprar · 3»; «Sin fase» al final; un paso sin ítems no tiene grupo): nunca una
  tarjeta dentro de otra ni una tabla. Cada tarjeta dice qué es el ítem («Tipo · Condición» o su descripción), la cantidad y el precio («2 × Monto»; sin precio, «2 · Sin precio»), «En stock: N» si tiene, y su
  «Siguiente» o su fase. En su esquina, el «⋯» (`Más acciones de <ítem>`): **Imágenes** y **Stock** (también sin `repuestos.editar` y con el proyecto cerrado), **Mover a…** (con `repuestos.mover`, el ítem fuera de una fase final y el proyecto abierto: abre el drawer del ítem para elegir
  el destino) y **Eliminar el ítem** (con `repuestos.editar`; `<Confirmar>`, ver «Eliminar»). El clic en la tarjeta (o Enter en su nombre, `Abrir <ítem>`) abre el **drawer del ítem**.
- **Drawer del ítem** (`?item=<id>`, de abajo; sin cabecera de proyecto: su título es la descripción del ítem): el **panel del ítem en dos columnas** (abajo). En escritorio ocupa el **60 %** del alto y su
  **asa** (arriba, `Cambiar el alto del panel`; arrastrar o ↑ ↓ Inicio Fin) lo agranda o lo achica mientras está abierto; en el celular, la pantalla completa. Esc y «atrás» lo cierran (el modal o el drawer de una tarjeta,
  primero) y el foco vuelve a la tarjeta (también tras recargar). Mover el ítem de fase lo pasa a su grupo nuevo. Un precio sin moneda lleva la primera activa. La fila de hoja de cálculo sigue en «Agregar ítem».
- **Panel del ítem (dos columnas).** Desde 56 rem del propio panel (`@container`) van lado a lado (izquierda 11/20, derecha 9/20); por debajo, una columna con la izquierda primero. **Un solo nivel de secciones**: cada
  grupo y cada tarjeta es una sección con su `h2`, nunca un acordeón ni una tarjeta dentro de otra.
  - **Izquierda, en el orden en que se usa**, cada grupo como texto (los valores como `ValoresDeLaTarjeta`, «Sin dato» si falta) con su «Editar <grupo>» (con `repuestos.editar` y el proyecto abierto; sin ellos, sólo texto):
    **Qué es** (portada del ítem —la primera imagen, o el marcador— y la descripción; edita tipo de pieza, condición y descripción), **Estado** (la insignia de la fase, el botón de su siguiente y «Qué falta» con sus destinos y el botón de
    mover, con el destino de `?destino=` ya abierto; no se edita aquí), **Cantidades y precios** (cantidad, en stock, precio al cliente) y **Origen y envío** (país, vía de transporte, tracking), lado a lado desde 36 rem de la columna; **Proveedor** («x (última compra)»; sólo con
    `repuestos.costos.ver`) y **Notas del ítem**.
  - **Editar un grupo** abre su **modal** (`?editar=<grupo>`, no `?panel=`: el panel del ítem sigue debajo) con las mismas celdas de la hoja (cada una se guarda sola, Enter o al salir) y «Listo». El modal no abre otro modal. Esc cierra
    primero el modal. Un conflicto (`PT409`) lo dice dentro del modal con «Recargar»; lo escrito no se guarda.
  - **Derecha, tarjetas de alto fijo y tocables**, cada una con su «⋯» (la acción principal primero): **Vehículo y cliente** (sólo con un proyecto a la vista; lleva al vehículo o al cliente, según haya; sin ninguno, apagada con
    «Este proyecto no tiene una ficha que abrir.»), **Compras** (con `repuestos.costos.ver`; «Última: proveedor · monto»; abre el panel de compras, y «Registrar compra» en el «⋯»), **Imágenes** (cuántas, «N de 8»; abre `?panel=imagenes&item=`),
    **Stock** («En stock: N de M» o «Nada en stock.»; abre `?panel=stock&item=`), **Documentos**, **Historial** y **Notas** (una línea fija que dice qué hay; abren su hueco de logística en un drawer al costado, `?seccion=<clave>`, sin cerrar el panel).
    Lo que lee una tarjeta lo dice en su propio renglón de alto fijo: mientras lee, dos renglones de esqueleto; si falla, «No pudimos mostrar «<título>».» con «Reintentar»; nunca cambia el tamaño de la tarjeta. Sin conteos exactos: Documentos, Historial y Notas no leen
    nada hasta abrirse.
  - **Sólo lectura** (sin `repuestos.editar`, proyecto cerrado o la Cadena): sin «Editar»; mover sale apagado con su motivo. **Sin permiso de costos:** ni Compras ni Proveedor, ni su lectura.
- **Agregar ítem** (`?panel=nuevo-item`, con `repuestos.editar`; botón junto al buscador): drawer de abajo con **una fila nueva** de la misma hoja; la descripción (Enter) crea el ítem, que queda arriba editable celda a
  celda, y deja otra fila nueva con el foco. Sólo la descripción es obligatoria; un ítem nuevo sin fase cae en «Sin fase». No hay fila nueva dentro de la lista. Con 200 ítems el botón no está y se avisa con
  `<AvisoDeTope>` (cada encabezado, «N+»). Flujo sin fases o ilegible: un solo grupo «Sin fase · N» y, en cada tarjeta, la fase del ítem. Sin ítems: «Este proyecto todavía no tiene ítems.» y, con `repuestos.editar`, «Agregar ítem».
  Con filtros que no dejan ninguno: «Ningún ítem coincide con la búsqueda o los filtros.» con «Limpiar filtros».
- **Sólo lectura:** sin `repuestos.editar` o con el proyecto cerrado («El proyecto está cerrado: reábrelo para editar los ítems.»), texto
  plano, sin «Agregar ítem» ni «Eliminar» (el drawer abre igual, en lectura).
- **Conflicto:** «Otra persona cambió este ítem. Recarga para ver lo nuevo.» con «Recargar»; lo escrito no se guarda. **Eliminar:**
  `<Confirmar>` con URL que nombra el ítem; uno con historial, documentos, compras, gastos o stock dice por qué y no se elimina.
- **Cerrar:** sin confirmación; toast con «Deshacer».
- **Vehículo** (en la cabecera, en un recuadro bajo el título; llega en su propio `<Suspense>`, con su esqueleto de miniatura y dos líneas): la miniatura de
  la portada (480 px; sin fotos, el marcador), el título enlazado a `/vehiculos/<id>`, «VIN X · Lote N» (o el que tenga; sin ninguno, no se dibuja esa línea),
  el origen y la situación. Un vehículo que quien mira no ve o que está en la papelera: «Vehículo que no puedes ver», sin miniatura ni datos. Si falla su
  lectura, «No pudimos cargar el vehículo.» con «Reintentar» en el recuadro, y los pasos y la hoja siguen; sin la fase del vehículo, sin la situación; sin los
  orígenes, sin el origen. Proyecto externo: «Proyecto externo · sin vehículo» y, si los tiene, la etiqueta y «VIN …». Con el texto al 200 % la miniatura pasa
  arriba.
- **Cliente** (en la cabecera): con lead y `leads.ver`, el nombre enlazado a `/leads/<id>`, sus números (`<NumeroDeLead conSecundario>`) y, si no
  es de la cartera de quien mira, «Fuera de tu cartera»; un lead que no se ve (otra cartera sin alcance, papelera, limbo) o sin `leads.ver`, «Cliente
  que no puedes ver», sin datos; un proyecto viejo, el nombre escrito a mano; sin cliente, «—». Nunca el teléfono. Si falla la lectura del lead, el
  error de `(app)` con «Reintentar».
- **Imágenes del ítem:** «Imágenes» en el «⋯» de la tarjeta, también sin `repuestos.editar`; abre `?panel=imagenes&item=<id>` (se
  recarga; «atrás» lo cierra y el foco vuelve a la tarjeta). Esqueleto, error con «Reintentar», vacío (con permiso, la zona de subir). Con
  imágenes: «3 de 8 imágenes» (exacto: el tope es duro), rejilla de 2 a 4 columnas que enlaza al original, «Quitar» de 44 px con
  «Deshacer». Lleno: zona apagada con su motivo. Sólo lectura (o proyecto cerrado): sin zona ni «Quitar». Sin conexión: zona apagada.
  Elegir sube al momento; lo repetido dice «ya estaba».
- **Tarjetas del panel del ítem:** «Imágenes»: los estados del panel de imágenes (esqueleto, error, vacío) en un renglón de alto fijo. «Stock»: «En stock: N de M» o «Nada en stock.» y «Abrir el stock» (`?panel=stock&item=`).
  «Compras» (con `repuestos.costos.ver`): un renglón mientras lee; «No se pudieron cargar las compras del ítem.» con «Reintentar»; «Este ítem no tiene compras registradas.»; «Registrar compra»
  (`?pestana=compras&panel=compra&compra=nueva&item_de_compra=<id>`, con el ítem ya elegido; sin `repuestos.costos.editar` o cerrado, su motivo) y «Ver todas en Compras» en el «⋯» de la tarjeta.
- **Compras:** panel sólo con `repuestos.costos.ver` (sin él no hay pestaña y `?pestana=compras` deja sólo la hoja, sin leer nada).
  - «Margen del proyecto»: una tarjeta por moneda con precios, compras y margen (`<Monto>`; Modo Live los oculta); con algún ítem sin
    precio o sin moneda, «Sin precio en N ítems» («más de 200»), nunca 0; sin nada, su vacío.
  - Lista de la más reciente: proveedor («Sin proveedor»), fecha, ítem («Sin ítem»), monto y, fuera de la moneda base, «Equivale a …».
    Esqueleto, vacío, tope 200 con aviso, error en el panel con «Reintentar».
  - **Escribir:** «Registrar compra» arriba (también con la lista vacía); sin `repuestos.costos.editar` o con el proyecto cerrado, apagado
    con su motivo al lado y la fila sin «⋯». Drawer `?panel=compra&compra=<id|nueva>` (se recarga, «atrás» lo cierra, una que ya no está
    avisa) con un título («Registrar compra» / «Editar compra») y la forma de todo panel de dinero: **arriba**, el monto con su moneda en un
    solo campo grande, el estado («Sin registrar» / «Registrada»), la fecha y el proveedor; luego, a la vista y sin plegar, «Qué se compró»
    (el ítem), «Notas» y «Comprobante de la compra». El equivalente en la base lo calcula el sistema al guardar y se lee bajo el monto.
    **La zona del comprobante** está siempre a la vista, vacía («Arrastra aquí el comprobante o elígelo. PDF o imagen de hasta 10 MB.» y
    «Elegir archivo» a 44 px en el celular) o con su vista previa (miniatura de una imagen, icono y nombre de un PDF), «Ver comprobante»
    (URL de 60 s), «Reemplazar» y «Quitar»; sube al elegir o soltar y mide siempre lo mismo; el rechazo («Sólo PDF o imagen de hasta
    10 MB.») y «Reintentar» salen en su renglón reservado. Un archivo por compra. Motivos junto a su campo; conflicto con «Recargar»; sin
    conexión, sale al volver; cerrar con algo escrito pregunta. Guardar relee lista y margen. «⋯» → «Editar» y «Eliminar» (sin preguntar, con
    «Deshacer»).
- **Pagos** (`repuestos.costos.ver`): «Registrar pago» arriba (apagado con su motivo sin `repuestos.costos.editar` o con el proyecto cerrado) y la
  lista de pagos del proyecto con su tope; cada pago con «Confirmar pago» (con `logistica.pagos.confirmar`), «Ver comprobante» y su «⋯»
  («Editar» y «Eliminar» sólo sin confirmar; «Anular pago» sólo confirmado). Tocar un pago abre `?panel=pago&pago=<id|nuevo>`: «Registrar
  pago» y «Editar pago» con la misma forma que la compra (arriba el monto con su moneda, el estado «Sin confirmar», la fecha y el concepto;
  luego «Cómo se pagó» —método y tipo de cambio, que se apaga con su motivo en la moneda base—, «Notas» y «Comprobante» con la zona de
  archivo de arriba). Un pago confirmado, o cualquiera sin permiso de editar, se abre como **«Pago»**, sólo lectura: el mismo orden con el
  sello («Confirmado por … el …»), el comprobante con su vista previa y «Ver comprobante», y «Anular pago» con `logistica.pagos.confirmar`
  (pasa a `?panel=anular-pago`, que pide el motivo). Un pago que ya no está avisa «Ese pago ya no está.». El hueco «Pagos» del vehículo
  usa el mismo panel.
- **Stock del ítem:** «Stock» en el «⋯» de la tarjeta, también sin `repuestos.editar` y con el proyecto cerrado; al lado, «En stock: N»
  (`<Badge>` de texto; con 0 nada). Abre `?panel=stock&item=<id>` (se recarga; «atrás» lo cierra; un ítem que ya no está avisa). Arriba
  «En stock: N de <cantidad>»; con `repuestos.editar` (también con el proyecto cerrado: los sobrantes nacen al terminar), «Pasar a stock»
  con cantidad (entero ≥ 1, no más que la del ítem; el tope exacto lo dice la base junto al campo) y nota (≤ 500); tras pasar, el panel
  queda abierto, el formulario se vacía y el historial se relee. Sin permiso: sólo los movimientos. **Movimientos**, del más nuevo:
  esqueleto, error, vacío; cada uno con motivo («Pasar a stock», «Vender suelto», «Devolver al proveedor», «Ajuste», «Reasignado»),
  cantidad con signo, fecha, quién y nota; de a 20 hasta 500. Conflicto (el stock cambió): toast con «Recargar».

### Equipo y roles (estados propios)

- **Equipo:** sólo tú (aviso con invitación); con más de 100 personas, las 100 primeras por nombre; sobre la cuenta propia el menú dice por
  qué no se puede bloquear ni dar de baja. Dar de baja confirma nombrando a la persona y cuántos leads van al limbo (hasta 1.000); con
  muchos sigue por lotes («Pasando sus leads…»). Invitar: si el correo falla, el enlace queda a la vista.
- **Roles:** «Recibir turnos de la web» es un interruptor más de la matriz; un rol sin él vende igual pero no recibe turnos. Rol que no
  dominas: columna de sólo lectura, con su motivo en «Avisos de <rol>»; permiso que no tienes: celda deshabilitada con el motivo en su descripción;
  conflicto «Otra persona cambió este rol · Recargar» (sigue arriba: no es un aviso del rol).

## Decisiones de UX

- Inicio = bandeja de trabajo por rol, no dashboard; el tablero analítico vive en `/tablero`.
- El teléfono principal se verifica al tipear, no al guardar: el duplicado no cuesta un formulario entero.
- Mover de fase en la página de la unidad, con «Qué falta» a la vista (la bandeja, la cadena y la ficha llevan ahí); nunca drag & drop (oculta el
  porqué del rechazo).
  Documentos se suben al confirmar, nunca al elegir el archivo.
- Chat con menciones `#` que abren el drawer de la entidad sin salir; referenciar no otorga acceso.
- Los roles de una persona se cambian con un interruptor por rol (permisos = unión de sus roles); la matriz guarda cada celda sola.
- Los campos de los leads y los nombres de orígenes, fases, tipos de documento y categorías salen de la base: ningún texto fijo los nombra.
  «Solo la cartera» se recorta en la base, no en la pantalla.
- Empresa son cuatro sub-rutas: quien tiene uno de sus dos permisos ve la parte del otro deshabilitada con motivo. El tipo de cambio se
  cambia en un panel con su historial a la vista.
- La situación de un vehículo (su fase, o «En subasta», «Sin resolver» o «No ganada») se ve en el inventario, la ficha y logística; la fase
  se cambia en logística y la subasta se resuelve desde la ficha. Un vehículo nace en la fase inicial cuando hay una sola; si no,
  «Sin fase».
- `Ctrl/Cmd+Enter` en un alta guarda y deja el panel listo para otro; `Ctrl/Cmd+S` guarda y cierra, salvo en «Nuevo lead», donde guarda y
  deja el drawer listo.

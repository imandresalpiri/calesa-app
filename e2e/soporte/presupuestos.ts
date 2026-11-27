// Los presupuestos de JS en frío por pantalla, en KB con gzip (`e2e/soporte/js-en-frio.ts`). Se fijan con lo medido más un 5 %
// (redondeado hacia arriba a la decena); `e2e/presupuesto-js.spec.ts` falla por encima. Subir un presupuesto es una decisión (va en
// `docs/DECISIONES.md` con su razón), no un arreglo para que pase. Medido en la 9e: `/leads` 544 KB, `/perfil` 435 KB,
// `/vehiculos` 505 KB. Medido en el cierre 5b, con el `index.ts` de cada módulo sin componentes (una pantalla paga lo que
// reexporta lo que importa): `/leads` 498,6 KB, `/perfil` 413,0 KB, `/vehiculos` 467,7 KB (antes 565,4, 443,3 y 520,0).
export const PRESUPUESTO_DE_JS_EN_KB: Readonly<Record<string, number>> = {
  // Sin el resumen del lead (la fila lleva a la ficha), 526,5 KB en 36 chunks (antes, con el drawer en frío, 530,3): el tope no se baja.
  '/leads': 560,
  '/perfil': 440,
  // El «Nuevo» de la barra que abre también el de la agenda (T37) lo llevó a 500,3 KB en 33 chunks: regla del 5 %, lo medido más un 5 % a la decena.
  '/vehiculos': 530,
  // El listado de cotizaciones (4.16-4a), sin el resumen (4.16-4b): medido 358,4 KB en 23 chunks, más un 5 % hacia arriba a la decena. Con las tarjetas de la lista
  // (T319: la imagen de la tarjeta en frío, el conmutador, «Agrupar» y sus preferencias; el despliegue y «Comparar» diferidos) midió 386,9 KB: regla del 5 % sobre 380, a la decena.
  // Con el resumen en pestañas y su lectura sobre las fichas (T414) midió 391,2 KB: regla del 5 % sobre 390, a la decena.
  '/cotizaciones': 400,
  // La hoja de cotizar con la subasta de la semilla (`?origen=`, el diseño más grande del juego), su presupuesto formal desde el 4.13-4d: medido 429,5 KB en 25 chunks, más un 5 % hacia arriba a la decena.
  // Con la línea «Descargar PDF» y el contexto del «⋯» de la guardada, que viajan con la hoja (T321; el pedido del PDF sin la lectura de la tarjeta), llegó a 460,4 KB en 28
  // chunks: 465 (regla del 5 %). Con la hoja en par (T317: el ítem que dibuja las celdas en par, las piezas del resumen y la opción del recálculo; la hoja en par va con
  // `diferido()`) midió 462,6 KB en 29 chunks: entra en 465. Con la cotización privada (T413: el interruptor «Privada», «Hacer privada» del «⋯» de la guardada y la
  // insignia) y los botones «Recargar la página» y «Copiar el enlace de esta página» del marco, 466,6 KB en 29 chunks: 470 (regla del 5 %). Con el pisado de un
  // cálculo (T521: la marca y «Calculado» de la celda, el aviso y su región; el aviso y la lista del resumen van con `diferido()`), 469,4 KB en 30 chunks: entra en 470.
  // Con la tarjeta del total como pieza de una sección (T522: `TotalDeHoja` y su caso en la lectura de la hoja; nada del editor), 473,9 KB en 31 chunks: 480 (regla
  // del 5 %).
  // Con el Modo Live configurable (T587: su proveedor y el silencio del push en el marco, la barra del cliente según sus ajustes), 480,4 KB en 31 chunks: 485
  // (regla del 5 %).
  '/cotizaciones/nuevo': 485,
  // La página de una cotización guardada (4.15-3), con una cotización sembrada en la subasta de la semilla: el mismo marco y la misma hoja, sin las barras del vehículo y del cliente: medido 438,6 KB en 27 chunks, más un 2 % hacia arriba. Con la burbuja del chat en el marco (7.11-1: el botón, el contador y su store; el panel y Realtime van con `diferido()`) pasó de 447,3 a 449,2 KB en 28 chunks: 452. Con las acciones de los avisos (`avisarError` con `<AccionesDelAviso>`, que importa `toasts.ts`) llegó a 452,2: 460 (regla del 5 %). Con el título de la cotización (T307: su proveedor sobre la cabecera y la hoja, y la cáscara de la barra del vehículo, que va con `diferido()`) llegó a 463,7 KB en 30 chunks: 470 (regla del 5 %). Con la cabecera compacta (T321: el «⋯» con su menú de Base UI y las líneas que suman las áreas, en vez de
  // ocho botones) llegó a 472,0 KB en 29 chunks: 480 (regla del 5 %). Con la hoja en par (T317, la guardada de una hermana va con `diferido()`), 475,0 KB en 30 chunks. Con la
  // cotización privada (T413: «Hacer privada» del «⋯» y la insignia) y los botones «Recargar la página» y «Copiar el enlace de esta página» del marco, 480,1 KB en 30 chunks: 490
  // (regla del 5 %). Con el grupo de campos como catálogo (T576: `grupoId` y `ordenDelGrupo` en el layout del origen y el orden de los bloques por
  // grupo de `shared/lib/campos`), 490,5 KB en 33 chunks: 500 (regla del 5 %).
  '/cotizaciones/[id]': 500,
  // «Comparar cotizaciones» (T311), con dos cotizaciones de un vehículo de la subasta de la semilla: el marco, la tabla, `<Monto>` y la action de aprobar, sin la hoja.
  // Medido 358,7 KB en 25 chunks, más un 5 % hacia arriba a la decena.
  '/cotizaciones/comparar': 380,
  // La cadena como gráfica con «Dónde está» y la barra de Logística (T19): medido 365,0 KB en 26 chunks con la bandeja al lado (el kanban marcaba 401,0), más un 5 % hacia arriba a la
  // decena. La bandeja del día, en su pestaña (T571), con el mismo tope hasta su primera medición.
  '/logistica': 390,
  '/logistica/bandeja': 390,
  // La lista de una fase (T19): medido 367,0 KB en 27 chunks, más un 5 % hacia arriba a la decena.
  '/logistica/fase/[fase]': 390,
  // La lista de embarques, la página de un embarque y la aduana (T572), con la subasta de la semilla: medido 386,1, 385,7 y 382,3 KB en 27 chunks,
  // más un 5 % hacia arriba a la decena.
  '/logistica/embarques': 410,
  '/logistica/embarques/[id]': 410,
  '/logistica/aduana': 410,
  // El detalle de un vehículo en logística (T20), con el vehículo medido de la subasta de la semilla: medido 438,9 KB en 28 chunks antes de las zonas y 442,3 KB en 27 después, más un 5 % hacia arriba a la decena.
  '/logistica/vehiculo/[id]': 480,
  // La ficha de un vehículo (T34), con el vehículo medido de la subasta de la semilla: medido 504,3 KB en 33 chunks con las pestañas, más un 5 % hacia
  // arriba a la decena. La ficha en dos columnas tiene que caber en lo mismo. Con la cotización privada (T413: la insignia de las tarjetas y la pregunta de «Aprobar
  // esta») midió 529,6 KB en 35 chunks y, con los botones «Recargar la página» y «Copiar el enlace de esta página» del marco, 530,7; con la cuenta regresiva de la subasta en la izquierda, 531,8: 540 (regla del 5 %).
  // Con el Modo Live configurable (T587: su proveedor y el silencio del push en el marco), 541,0 KB en 35 chunks: 545 (regla del 5 %).
  '/vehiculos/[id]': 545,
  // La ficha de un lead (T33), sin tope hasta las dos columnas: medido 548,5 KB en 36 chunks con pestañas y 554,7 KB en 36 con todo a la vista
  // (el marco de bloques, el índice y el resumen de seguimientos), con un lead recién creado; más un 5 % hacia arriba a la decena.
  '/leads/[id]': 595,
  // La matriz de Roles con los niveles de acceso y «Quién crea y quién ve» adentro (T511), sin tope hasta entonces: medido 388,2 KB en 29 chunks (la matriz, el «⋯» y los
  // modales de los niveles y el cuadro van con `diferido()`); más un 5 % hacia arriba a la decena. «Quién crea y quién ve» tenía 420 en Catálogos, con su marco.
  '/configuracion/roles': 410,
  // La puesta en marcha de un origen (T420): `/nuevo` (el paso a paso y el formulario del alta) y el paso Fórmula con la planilla de la subasta de la semilla (la
  // planilla y la tarjeta en vivo van con `diferido()`). Provisionales hasta su primera medición en el e2e: lo medido más un 5 %, a la decena. Con «Para todos los orígenes» (T512: la tarjeta tocable y su límite de error en el barril de tarjetas de ajustes) el paso Fórmula midió 461,4 KB: 470 (regla del 5 %).
  '/configuracion/origenes/nuevo': 420,
  '/configuracion/origenes/[id]/puesta-en-marcha/formula': 470,
  // Las pestañas de la página del origen, con la subasta de la semilla: lo medido antes de las pestañas planas más un 5 %, a la decena (Fases era la
  // pestaña Flujo; Planilla, Hoja y Tarjeta, el editor de una fórmula). Medido el 2026-11-21: 442,9 · 496,0 · 410,8 · 418,1 · 407,1 · 405,1
  // (`docs/RENDIMIENTO.md`). La barra de la fórmula y la cabecera con las migas viajan en las seis.
  '/configuracion/origenes/[id]/fases': 460,
  '/configuracion/origenes/[id]/planilla': 510,
  '/configuracion/origenes/[id]/hoja': 420,
  '/configuracion/origenes/[id]/tarjeta': 430,
  '/configuracion/origenes/[id]/campos': 420,
  // Con el grupo de campos como catálogo (T576: el layout del origen trae el grupo y su orden), 410,8 KB en 30 chunks: 420 (regla del 5 %).
  '/configuracion/origenes/[id]/categorias': 420,
}

// Lo que aporta la ficha del lead **entera** al documento sobre `/perfil`, en KB (T33: con todo a la vista, `?seccion=` sólo dice a qué bloque
// saltar y no cambia el documento). Se mide con un lead con 10 oportunidades, 3 seguimientos con detalle (de 10), 3 recordatorios pendientes,
// un vínculo, cuatro interesados y el portal otorgado (`e2e/leads-ficha-dos-columnas.spec.ts`): 130,8 KB (con 1.000 de cada uno, 131,6); sobre
// lo medido más un 5 %, a la unidad. Lo que pesa: el HTML de los ítems con sus acciones (cada botón trae sus clases) y su payload RSC; lo que
// crece va por «Ver todos» y «Ver más». Antes se medía por sección: «Datos» 43 y «Oportunidades» con 10, 66.
export const PRESUPUESTO_DE_LA_FICHA_EN_KB = 138

// Lo que viaja (RSC) al abrir la ficha desde el nombre de una fila del listado (sin prefetch: todo con el clic), en KB (`e2e/leads-ficha.spec.ts`):
// medido 30,7 en escritorio y 29,7 en el celular con el lead de la semilla de ese spec; el tope sigue en 39.
export const PRESUPUESTO_DEL_RSC_DE_LA_FICHA_EN_KB = 39

// Lo que la ficha de un vehículo (T34, en dos columnas) aporta al documento sobre `/perfil`, en KB: con 60 documentos y 600 cotizaciones pesa lo
// mismo que con una (los dos bloques se leen desde el navegador al acercarse; `e2e/vehiculos-ficha-dos-columnas.spec.ts`). Se mide restando el
// documento de `/perfil`, así que sube cuando el perfil se aligera: con el perfil en tarjetas (T431: 112,8 KB contra 123,8 en escritorio, unos
// 11 KB menos) la ficha aporta 69,3 KB en el CI y su documento entero no cambió (la izquierda con la aprobada, los datos clave y los enlaces
// cortos, cada uno tras su `<Suspense>`, y las referencias a las islas de las tarjetas): 69,3 más la regla del 5 %.
export const PRESUPUESTO_DE_LA_FICHA_DEL_VEHICULO_EN_KB = 73

// El documento de `/perfil` (los bytes del HTML con el payload RSC, sin comprimir), en KB, con 100 orígenes y 100 tipos de lead: lo que paga
// toda pantalla del marco (`e2e/presupuesto-js.spec.ts`). Antes del cierre 5b-fix el shell mandaba el contexto del alta de lead (los
// catálogos y el layout de campos) en cada documento: 79,3 KB con la semilla y 106,6 con 100 + 100 (~26 KB de más); ahora pesa lo mismo con
// los dos (77,4 KB, tolerancia ±1 KB). Con las entradas del marco que se fueron encendiendo (Logística, 6.01) pesa 82,8 KB (84.810 B en
// escritorio) y con la campana en la barra (7.02-2: su botón, las rutas con pantalla y el usuario por props) 86,6 KB (86.627 B). Con el bloque
// «Notificaciones» del perfil (7.04: su <Bloque>, el esqueleto de su <Suspense> y las props del bloque diferido) 91,2 KB (93.382 B): sobre lo medido más un 5 %. Con las acciones de la paleta (7.13-3: las de crear, ir a y Configuración que la dueña puede, como props del hueco del buscador) 98,1 KB (100.444 B): lo medido más un 5 %. Con «Turnos de la web» y «Tu ficha en la web» en el perfil (8.05-2: el interruptor de disponibilidad, el bloque plegado de la ficha y el interruptor de su formulario, que se monta recién al abrirla) 107,0 KB (109.522 B): lo medido más un 5 %. Con el bloque «Vistos» del perfil (A3a: tres opciones y la preferencia en el proveedor) 113,3 KB (116.028 B): 119 (regla del 5 %).
export const PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB = 124

# shared

Infraestructura transversal sin reglas de negocio: clientes de Supabase, permisos, errores como valores, formato de números y fechas, configuración y los componentes de interfaz que usan todos los módulos.

## Entra y sale

- Entra: nada de `src/modules` ni de `src/app` (`shared` sólo importa `shared`). Sale: lo consumen `app/` y las tres capas de cada módulo.

## Archivos clave

- `lib/supabase/`: `server.ts` (`createClient()`, uno por request), `browser.ts`, `admin.ts` (secret key, salta la RLS), `proxy.ts`
  (`actualizarSesion()`), `consultas.ts` (`citar()`, `aplicarCondicionDeAtributo()`, `aplicarRango()`, `aplicarCursor()`, `ordenarPorCursor()`),
  `almacen.client.ts` (`subirPorHash()`, `quitarSiHuerfano()`).
- `lib/safe-action.ts`: `actionClient` (exige sesión; `ctx` con `supabase`, `usuarioId`, `permisos`) y `actionClientPublico`. Toda mutación.
- `lib/errores.ts`: `Resultado<T>`, `ok()`, `fallo()`, `conflicto()`, `errorDePostgrest()` (`PT409` → conflicto, `42501` → sin_permiso), `datosO()`.
- `lib/permisos.ts`: `puede()`, `alcanceDe()`, `origenesCon()`, `CLAVES_PERMISO`; las claves de nivel (`esClaveDeNivel()`) las crea la empresa.
- `lib/rutas.ts` (`decidirAcceso()`, `returnToSeguro()`), `lib/navegacion.ts` (`redirigir()`).
- `lib/formato.ts`, `lib/fechas.ts`: todo número y fecha, en el locale y la zona de la empresa; `formatearFechaHoraConZona()`, `formatearDiaLargo()` («jueves 19 de noviembre»), `ciudadDeLaZona()` y
  `abreviaturaDeZona()` para la fecha que se lee en otra zona (la de una subasta, en `useRegional().zonaDeLaPersona`). `lib/numero-tipeado.ts`: `leerNumeroTipeado(texto,
locale)`, el único lector de un número tipeado. `lib/redondeo.ts`: `redondear(x, n)`, el `round(x::float8::numeric, n)` de
  Postgres bit a bit (15 cifras y mitad lejos de cero; lo usan el motor de la fórmula y las cifras con decimales fijos).
- `lib/paginacion.ts`: tamaños (`TAMANOS_DE_PAGINA`, `tamanoDePagina()`, `TAMANO_DE_VER_MAS`, `TOPE_DE_LO_CARGADO`, `TAMANO_DE_COLUMNA`,
  `TOPE_DEL_EQUIPO`) y keyset (`leerCursor()`, `codificarCursor()`, `armarPagina()`; por otra columna `armarPaginaPor()` con un `OrdenDeCursor`,
  `POR_ALTA` por defecto). El cursor lleva `instante`. `lib/conteo.ts`: `conteoAcotado()`, `cantidadAcotada()`, `cortarAlTope()`, `textoDelTope()`.
- `lib/compartir.ts`: lo que el navegador deja hacer al compartir, sin saber qué (`capacidadesDelNavegador()`, `copiarTexto()`, `copiarImagen()` en PNG,
  `descargarArchivo()`, `compartirConElSistema(texto, archivos)`, `pngDesde()` y los motivos `MOTIVO_SIN_*`): «Compartir» de los tipos de cambio y de la cotización.
- `lib/memoria-de-lectura.ts`: `memoriaDeLectura(leer, vidaMs)`, lectura del navegador compartida y de vida corta.
- `lib/catalogos/propios.ts`: un catálogo propio de un origen o compartido (puertos, navieras, categorías de gasto, tipos de documento).
  `claveDeCatalogo()` es el espejo exacto de `_catalogo_clave()` (sin mayúsculas A–Z, tildes ni espacios de más; probado contra la base en
  PGlite), `claveDePuerto(nombre, pais)` la de un puerto; sobre filas `FilaPropiaOCompartida`, `loQueUsaElOrigen()` (sus propios y los
  compartidos que no tapa), `tapadoPor()` (el propio activo que tapa a un compartido) y `loQueUsanLosOrigenes()` (de varios orígenes, sólo los
  compartidos que no tapa ninguno).
- Formularios con `useAction`: `lib/enviar-accion.ts` (envío con `sinRed`), `lib/formularios.ts` (errores por campo), `lib/borrador.ts` +
  `ui/use-borrador.ts` (borrador en `sessionStorage`).
- `lib/filtros/`: filtros declarativos sin nuqs (`EsquemaDeFiltros`, `leerFiltros()`, `chipsDe()`, `cumpleElMinimo()`; `campos.ts`: campos del
  layout a filtros). `ui/filtros/`: `<ChipDeEleccion>` (la ficha de una sola opción: un `<select>` nativo con su rótulo y «Todas»; lo usan los filtros declarativos y los de la pestaña Ítems de repuestos), `<FilterShell>` (barra plana: buscador que crece, «Filtros», «Vista y opciones» con `opciones` y «Ítems por página»,
  y `acciones` para «Nuevo»); `ui/vista-y-opciones/`: `<VistaYOpciones grupos>` (el botón en frío; el panel, popover o hoja, con `diferido()`),
  `useVistaYOpciones()` (`cerrar`, `cerrarYLuego`: lo que abre otro panel corre al terminar de cerrarse), `CLASE_DE_OPCION`; `ui/por-pagina.tsx`, `ui/paginacion.tsx` (con `alIr`, sin ir al servidor),
  `ui/aviso-de-tope.tsx`, `ui/ir-a-una-fecha.tsx` y `ui/desde-una-fecha.tsx` (entregan un día `YYYY-MM-DD`; el instante lo arma quien lee).
- `lib/campos/`: motor de campos configurables sin I/O (`TIPOS_DE_CAMPO`, `esquemaDeValor()`, `valorMostrado()`, `campoDeFormulario()`; `rango.ts`,
  espejo de `_valor_fuera_de_rango` y `_campo_rango`). `ui/campos/`: `<EditorDeCampos>` (el de todo layout: buscador `?q=` con `lib/campos/buscar.ts`, filas con insignias y un «⋯» de
  `acciones-de-campo.ts`, el panel `?campo=` con el formulario diferido, «Desactivados» a la vista; opcionales, `casillas` —las de dato clave,
  `CasillasDelEditor`— y `fijos` —«Comunes», `FijosDelEditor`—; el arrastre en `arrastre/`, dnd-kit tras `diferido({ enFrio })`, y lo que
  decide cada soltada, puro, en `lib/campos/soltar.ts`), `campo-rango.tsx`, `<DatosPorGrupo>`, `<CampoDeFormulario>`.
- `lib/catalogo/`: el nombre de un elemento que se elige (glosario «Grupo de campos»): `nombreLimpio()` y `claveDeNombre()` (espejo de
  `_nombre_limpio()` y `_nombre_de_catalogo()`, con test), `ElementoDeCatalogo`, `CatalogoLeido` y `TOPE_DE_CATALOGO`, y `opcionesDelCombo()`
  (qué ofrece el combo para lo escrito: las coincidencias, el que ya existe con otra escritura y «Crear «x»»). `ui/combo-de-catalogo/`:
  `<ComboDeCatalogo>` (un botón con aspecto de campo y su lista en un popover, cmdk tras `diferido()`; `alCrear` devuelve un `Resultado` y lo
  creado se muestra hasta que la lista de afuera lo trae). Lo usa el grupo del editor de campos (`GruposDelEditor`, `useGruposDelEditor()`).
  `lib/catalogo/orden.ts` (`despuesDeAlMover()`, `usosPorElemento()`) y `gestion.ts` (`DestinoAlQuitar`, `rechazoDelCatalogo()`: el `hint` de la
  base al dato del formulario: `nombre`, `items`, `destino`). `ui/catalogo-en-drawer/`: `<DrawerDeCatalogo panel catalogo usos operaciones textos>`
  (el botón y su drawer `?panel=<panel>`: el nombre para agregar o renombrar, `<ListaDeCatalogo>` con su «⋯» y «Quitar» en `&quitar=<id>`, que con
  ítems pide a dónde moverlos; el cuerpo diferido; `motivoSinPermiso` lo deja de sólo lectura) `operacionesDesdeAcciones()` (cinco actions →
  `OperacionesDelCatalogo`) y `useConLosCreados()` (lo creado desde el combo, que no revalida, queda en la lista del combo y del drawer hasta
  que la lectura lo trae; lo quitado sale). En el editor de campos, «Grupos» (`<DrawerDeGrupos>`, si `GruposDelEditor.operaciones` llega).
- `ui/campo-para-quien.tsx`: `<CampoParaQuien>`, el «Para» de lo propio o compartido (radios «Sólo de <origen>» o «Compartido con todos los orígenes»; una
  opción con `motivo` va apagada y lo dice debajo). Lo usan las tablas de referencia, los catálogos de logística y los tipos de documento.
- `lib/ancho.ts` (`anchoDeLaPeticion()`, `CORTE_DEL_TABLERO`/`CORTE_DE_LA_TABLA`/`CORTE_DEL_PANEL`), `ui/ancho-de-pantalla.tsx` (`useAlMenos()`).
- `lib/atajos.ts` + `ui/atajos/`: `ATAJOS`, `teclasDelAtajo()`, `<ProveedorAtajos>`, `useAtajo()` (responde el último registrado); `<AyudaDeAtajos>`
  registra `?` y abre `<ListaDeAtajos>` por `diferido()`.
- `lib/instalacion.ts` (`ofrecerInstalacion()`: `ninguna`, `prompt` o `instrucciones` en iOS) y `ui/{use-instalacion.ts,instalar-app.tsx}`.
- `lib/color.ts` (`tokensDeMarca()`, `cssDeMarca()`), `lib/imagenes.ts` (`comprimirImagen()`, `extensionDe()`, `hashDe()`), `lib/almacen.ts`,
  `lib/iconos.ts` (catálogo cerrado), `lib/apibara.ts`, `lib/numeros-de-lead.ts`.
- `lib/email/`: `enviarEmail()`, la única puerta del correo (`EMAIL_PROVEEDOR`: `mailpit`, `resend`, `cloudflare`; `proveedor.ts`;
  `pnpm email:probar <destino>`). Ningún archivo se llama `resend.ts`: el lint prohíbe importar algo llamado `resend`.
- `config/esquemas.ts`: el entorno en Zod (`entornoPublico()`, `entornoDelServidor()`, `pnpm env:check`; lectores en `scripts/lib/entornos/`).
  `config/app.ts`: nombre y colores.
- `ui/diferido.tsx`: `diferido()` (con `aviso: 'aqui'`, `respaldo(props)` se dibuja bajo «Sin conexión» si el código no llega). `ui/modal.tsx`, `ui/drawer.tsx`, `ui/confirmar.tsx`: diálogos por URL; `ui/modal-de-formulario.tsx`,
  `ui/use-envio-de-modal.ts` (envío sin versión), `ui/use-envio-con-version.ts` (`useEnvioConVersion()`: con versión y conflicto; «Recargar»
  hace `router.refresh()` o, con `recargar`, relee la lista que se lee desde el navegador). `<Drawer desplazamiento="propio">`: el cuerpo no se desplaza y lo de adentro llena su alto (el resumen de una cotización: cabecera fija y pestañas). `<Drawer alto="ajustable">` (sólo `lado="bottom"`): el alto lo cambia `<AsaDelPanel>` (arrastrar o ↑ ↓ Inicio Fin; `lib/alto-del-panel.ts`, puro) y se recuerda mientras el panel está montado; en el celular, a pantalla completa. `<Drawer alCostado>`: no modal y sin fondo (lo de atrás se sigue usando; tocar afuera no
  cierra, Esc y la ✕ sí), para el panel que acompaña a una pantalla ancha. `ui/bloque.tsx`: `<Bloque>` es siempre una `<section>` a la vista
  con su `h3` (enfocable), nunca plegable; `<BloquesALaVista>` (`ui/bloques-a-la-vista.tsx`) fija el nivel. El anidado (`h4`, sin caja) sólo lo usa el panel de una fase en Configuración.
  `campos/bloque-de-campos.tsx` y `<DatosPorGrupo>`, también a la vista.
- `ui/vuelta-del-foco.ts`: `abrirConVuelta()` y `useVueltaDelFoco()`: tras recargar con un panel por URL, «atrás» devuelve el foco a quien lo abrió
  (marca en `history.state`; desde un menú, al botón del menú). La entrada queda también en `sessionStorage` porque `shallow: false` la borra del
  historial; con `router.push`: `abrirConVuelta(clave, () => { push(url); return alLlegarA(url) })`. La usa `usePanelPorUrl()`.
- `ui/visor-de-imagenes/`: `<CarruselEnElLugar>` (la portada y, al acercarse, el resto por la `cargar` que recibe; `modo="abrir"` en un lugar
  chico), `<CarruselConTira>` (el de una ficha: pide al montarse y dibuja `<TiraDeMiniaturas>` debajo; `sobreLaFoto` para lo que va en su esquina),
  `<TiraDeMiniaturas>` (con `conTeclado`, ← → Home End marcan y Enter elige), `useImagenes()` y `useVisorDeGaleria()` (una galería ya leída); el visor vive en `?visor=<clave>&foto=<n>` (la foto cambia con `replace`).
- `ui/lista/`: `UnaSolaVista` (con `preferida`), `ConmutadorDeVista` («Tabla | Tarjetas», `lib/vista-de-lista.ts`; va en «Vista y opciones»), `TablaDeLista`,
  `FilaDeLista`, `TarjetaDeLista`, `EsquinaDeAcciones` (el lugar del «⋯» en la tarjeta; `sobreImagen` sobre una foto), `MasAcciones`, `AbrirResumen`, `EnlaceDeLaFila` (el nombre como enlace a la ficha en una lista sin resumen: la fila y la tarjeta reciben `href` en vez de `alAbrir`, `ir-desde-la-fila.ts`), `SimbolosDeLista`, `PestanasDelResumen` (con `alto="lleno"` ocupa el alto de su contenedor; `panelDesplazable` hace que cada pestaña se desplace en su marco; `reparto="igual"`: toda la fila en partes iguales, con desplazamiento de costado si no caben).
- `ui/monto.tsx` + `live.ts` + `guion-live.tsx` (Modo Live), `ui/monto-con-decimales.tsx` (`<MontoConDecimales>`: un monto con los «Decimales» de su
  celda, redondeado antes como la base; sin ellos, `<Monto>`), `regional.tsx`, `densidad.tsx`, `marca.tsx`, `estilo-de-marca.tsx`.
- `lib/acciones-del-aviso.ts` (las acciones de un aviso como datos: `AccionDelAviso`, `resolverAcciones()`, `pedidoDe()`, `hrefDePanel()`; `ErrorApp.causa`)
  y `ui/acciones-del-aviso.tsx` (`<AccionesDelAviso>`, todo `<Button>`: en un toast sólo los botones reciben el puntero).
- `ui/ficha-en-bloques/`: `<FichaEnDosColumnas>` (desde 56 rem de contenedor, `@container/ficha`: la página quieta con el alto de la ventana y cada columna con su desplazamiento por dentro —la izquierda hasta 24 rem, la derecha con el índice arriba—, `usePosicionDeLasColumnas()` que
  las recuerda por ruta; por debajo una columna con el desplazamiento de la página), `<IndiceDeBloques>` (barra de enlaces `#ancla`, pegajosa en el celular, `aria-current="location"` del bloque a la
  vista por `lib/bloque-a-la-vista.ts`), `<BloqueDeFicha>` (ancla, título, límite de error y `alAcercarse`), `irAlBloque()` (desplaza y enfoca el `h2`),
  `useIrAlLlegar()` y `<EsqueletoDeFichaEnDosColumnas>` (el `loading.tsx` lo importa por su ruta, no por el barril). `ui/use-a-la-vista.ts`: si un nodo ya
  estuvo a 200 px de la vista (leer o pedir código recién ahí; con `seguir`, si lo está ahora; dentro de una columna de ficha que se desplaza, los 200 px se cuentan desde la columna).
- `lib/cola.ts`: `crearCola(maximo)`, a lo sumo `maximo` turnos a la vez en el orden en que se pidieron (`pedir()` → `{ turno, soltar }`; soltar antes
  del turno deja la fila): las imágenes de la tarjeta de una lista.
- `ui/barra-de-cambios-sin-guardar.tsx`: `<BarraDeCambiosSinGuardar>` (la barra pegada abajo de un formulario de página) sobre
  `ui/use-salida-con-cambios.ts` (`useSalidaConCambios()`: enlaces frenados en la captura según `lib/destino-de-un-clic.ts`, `beforeunload` y
  `anotarCambiosSinGuardar()` de `ui/salida-con-cambios.ts`; el «atrás» no se frena).
- `ui/estados/`, `ui/esqueletos/` (sin tope de ancho; `EsqueletoFormulario` sólo para un formulario, `EsqueletoTarjetas` con las columnas de `<TarjetasDeAjustes>`); `ui/toasts.ts` (`avisarError()`, `avisarConDeshacer()`), `ui/sonner.tsx`, `ui/pie-del-panel.tsx`,
  `ui/zona-de-archivos.tsx` (varios archivos; sólo los entrega). Los paneles de dinero (pago, compra, gasto): `ui/zona-de-archivo.tsx` (`<ZonaDeArchivo>`: un archivo, siempre a
  la vista con el mismo alto, vacía o con su vista previa `miniatura-de-archivo.tsx`, «Ver», «Reemplazar», «Quitar», error y «Reintentar» en un renglón reservado) sobre
  `use-archivo-de-la-zona.ts` (sube al elegir, recuerda el último para reintentar), `ui/campo-de-monto.tsx` (el monto grande con su moneda pegada en un campo),
  `ui/grupo-de-campos.tsx` (una sección plana con su `h3`) y `ui/campo-de-notas.tsx` (tres renglones de alto fijo). `types/database.types.ts`: lo genera `pnpm db:types`; no se edita.

## No se rompe

- Locale, moneda, zona, nombre, logo, color y densidad entran por props desde `app/`.
- `permisos.ts` espeja la tabla `permisos` de `supabase/seed.sql` (un test lo compara). `puede()` decide qué se muestra; protege la base.
- `toFixed` está prohibido por lint. `<Monto>` manda al DOM el valor y su reemplazo y el CSS elige con la clase `live` de `<html>`: nunca una cifra
  a la vista antes de hidratar.
- `cssDeMarca()` sólo recibe colores que pasaron por `tokensDeMarca()`: a un `<style>` nunca llega texto libre.
- `<Marca>` con `logoOscuroUrl` dibuja los dos logos y el tema elige por CSS (`dark:hidden` / `hidden dark:block`, `data-logo`), nunca por JS.
- Registro obligatorio: cada `<Confirmar>` (por `usePanelPorUrl()`) en `scripts/guardas/confirmar-con-url.ts`, cada `<Drawer>` en
  `drawers-con-salida.ts`, cada `<Modal>` con algo escrito en `modales-con-salida.ts`; toda lista nueva usa `ui/lista` (`listas-con-patron.ts`).
- Cada `history: 'push'` de `src/` usa `abrirConVuelta()` y `useVueltaDelFoco()` (`scripts/guardas/paneles-con-vuelta.test.ts`).
- Sin `transition-all`: nada anima `font-size` ni el alto (`scripts/guardas/sin-transition-all.test.ts`).
- `lib/iconos.ts` es la lista de `_iconos_del_catalogo()`: se guarda la clave, nunca un nombre libre ni un SVG.

## Ojo

- `use-instalacion.ts` pone sus oyentes (`beforeinstallprompt`, `appinstalled`) al evaluarse el módulo, no en un efecto: el navegador avisa una vez y
  el menú se monta tarde. Un evento sirve una sola vez.
- `admin.ts` importa `server-only`; el lint sólo deja importarlo desde `equipo/infra/invitaciones.ts`, `empresa/infra/revalidacion-prueba.ts` y
  `web/infra/portal/rpc.ts`.
- Esc dentro de un diálogo lo atiende Base UI (cierra el de más arriba y detiene el evento): el atajo «cerrar» no lo ve, por eso `<Modal>` no lo
  registra. Un `<Modal>` abierto desde un `<Drawer>` se dibuja dentro de los hijos del Drawer.
- Un `<fieldset disabled>` no apaga los `Switch` de Base UI: pásales `disabled`.
- `nuqs` es `'use client'`: `lib/filtros` lee la URL a mano, y de ahí salen las claves compartidas (`CLAVE_DE_CURSOR`, `CLAVE_DE_PANEL`). En tests
  con `NuqsTestingAdapter`, `waitFor` la escritura.
- Un cambio `shallow: true` con otra navegación pendiente la pisa; `useFiltros().cerrarPanel` va al servidor si la lista aún se está pidiendo.
- Un campo de texto en la URL no lleva `key` atada a su valor (pierde el foco): `useTextoDeUrl()`.
- `avisarError()` con `no_autenticado` ofrece «Ingresar» (no redirige); con `conflicto`, «Recargar»; con `{ acciones }` o `alReintentar`, el toast queda hasta cerrarlo y enfoca la principal. El `<Toaster>` no recibe el puntero: un aviso
  con otro control necesita `pointer-events-auto`.
- shadcn usa variables (`bg-primary`) que `globals.css` apunta a los tokens.
- Safari devuelve PNG si le pides WebP: `comprimirImagen()` reintenta en JPEG; la extensión sale de `extensionDe(blob.type)`.
- `entornoPublico()` valida al primer uso; las `NEXT_PUBLIC_*` se leen con el nombre literal.
- Los `MENSAJE_*` de `errores.ts` también hablan de tú.
- `vitest` no limpia entre pruebas: un test que monta diálogos usa `afterEach(cleanup)`.
- La vuelta del foco de un hook se prueba con `probarLaVuelta()` de `ui/vuelta-del-foco.soporte.tsx` (sólo pruebas): cuatro por función que abre.

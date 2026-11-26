# cotizaciones

Cotizador configurable: fórmulas por origen (una activa, la que se cotiza) como grafo de nodos versionado, XCell con ⚙ de default global, tablas de referencia, snapshot por cotización, preventa/final, versiones, comentarios, adjuntos, reportes, plantilla de tarjeta y PDF, comprobantes.

El dominio (nodos, motor, reglas, niveles, cómo se guarda) está en `docs/COTIZADOR.md`: esta ficha no lo repite.

## Entra y sale

- **`/cotizaciones/nuevo?origen=&lead=&vehiculo=`** (pide `cotizaciones.crear` y `cotizaciones.ver` del origen, 4-32). Lead y vehículo son ids,
  sin importar esos módulos: sobre la hoja van la barra del vehículo de `vehiculos/pantallas/cotizar` (`?panel=vehiculo`, escribe `CLAVE_DE_VEHICULO`)
  y la del cliente de `leads/pantallas/cotizar` (`?panel=cliente`, `CLAVE_DE_LEAD`); un lead o vehículo que quien mira no ve se suelta. Lead y vehículo son
  **obligatorios salvo con `cotizaciones.crear.sin_lead` y `cotizaciones.crear.sin_vehiculo` del origen** (una final, siempre): la página los calcula con
  `sesion.permisos` (`obligatoriosAlCotizar()`, `eleccionesDeLaHoja()`: con «Ver como», los del rol elegido; la base usa los reales) y manda booleanos y
  textos; `loQueFalta()` (el lead primero, como la base) da el motivo junto a «Guardar» (`FALTA_EL_LEAD`, `FALTA_EL_VEHICULO`) y `<ElegirLoQueFalta>` el
  botón «Elegir el cliente» o «Elegir el vehículo» (abre `?panel=cliente` o `?panel=vehiculo`, nombres que pasa `src/app`) o, sin `leads.ver` o
  `vehiculos.ver` del origen, el pedido a quien administra los roles; si la regla cambió con la hoja abierta, el rechazo (`falta_lead`, `falta_vehiculo`) trae
  la misma salida. El pedido lleva `leadId` nulo con la clave. El borrador de la hoja va por persona, origen y
  vehículo, **sin el lead** (elegir el cliente remonta la hoja y repone lo tipeado); el pendiente del guardado va por lead. Guardar: la action
  `features/hoja/actions/crear-cotizacion.ts` (`cotizacion_crear`, siempre `ok(ResultadoDeCrear)`, sin `revalidatePath`).
- **El título de la cotización** (`entities/titulo-de-la-cotizacion.ts`, glosario): `tituloDeLaCotizacion({ titulo, vehiculo, numero })` es la única regla de lo
  que se muestra (el suyo, el del vehículo o «Cotización n.º N», con su `fuente` para no repetir el número o el vehículo); la tarjeta y el PDF usan
  `tituloAparteDelNumero()`. Lo que se edita vive en `<ProveedorDelTitulo>` (`features/hoja/components/titulo/`, por `pantallas/cotizar` y `pantallas/cotizacion`), que
  `src/app` pone **sobre las barras y la hoja** (fuera de la `key` de la hoja; `key` del origen en la nueva y de la versión en una guardada); `useTituloDeLaCotizacion()`
  (`client.ts`) da `mostrado`, `estado`, `escribir`, `pedirFoco`, `rechazo` y `alGuardar` (nulo fuera del proveedor: la hoja no lo pide). Su borrador va en la pestaña
  (`claveDelTitulo()`, por el vehículo con que se abrió; `claveDelTituloDeUnaGuardada()`, por versión). El campo (`CampoDelTituloDiferido`) entra al panel del vehículo
  por el hueco `arribaDelPanel` de la barra; la barra recibe el título ya resuelto. `loQueFalta()` suma `'titulo'` (sin vehículo, después del lead y del vehículo;
  `FALTA_EL_TITULO`, «Escribir el título», que pide el foco y abre `?panel=vehiculo`); el rechazo `falta_titulo` / `titulo_largo` (`campo: 'titulo'`) se repite
  debajo del campo. El pedido lleva `titulo` (sólo el manual) y `tituloManual` (`tituloParaGuardar()`); la base pone el automático.
- **`/cotizaciones`** (`cotizaciones.ver` en algún origen): `?q=` (el buscador: número, título, cliente, vehículo y autor; 3 letras o un número,
  `MINIMO_DE_BUSQUEDA_DE_COTIZACIONES`; con texto la página lee `cotizaciones_buscar()` en vez de `cotizaciones_listado()`, con los mismos filtros y cursor, y la
  página dice `acotada` si una fuente nombró más de `TOPE_DE_COINCIDENCIAS`), las vistas guardadas en «Vista y opciones» (`pantalla = 'cotizaciones'`, `VistasDeCotizacionesDiferido`:
  `<VistasGuardadas>` pesa ≈ 70 KB gz y el presupuesto de la ruta es 380), `?origen=` (sólo con 2 o más), `?clase=preventa|final`, `?cuales=mias` (las que creó quien
  mira), `?por=`, `?cursor=`; `?vehiculo=` y `?lead=` no son del esquema (ni chip ni los borra «Limpiar»): los escribe `rutaDelListado()` como camino a
  lo antiguo del historial del vehículo y del lead, y el aviso de arriba (`textoDelAviso()`) sólo nombra lo que quien mira ve. Los nombres llegan por
  clave primaria (leads sólo con `leads.ver`) y los une `filasConNombres()`: lo que no llega es «—». Lee `cotizaciones_listado()` (invocadora: decide la
  RLS) por cursor, con `MAXIMO_DE_PAGINA_DE_COTIZACIONES` (50: la base da 50 sin pedido y admite 100). **«Tabla | Tarjetas» y «Agrupar por vehículo»** (T319, `docs/UX.md`): la vista por
  `useVistaDeCotizaciones()` (`?vista=`, `cotizaciones.vista`, sin elegir tarjetas; sólo del cliente) y la agrupación por `useAgruparCotizaciones()` (`?agrupar=si|no`,
  `cotizaciones.agrupar`, sin elegir agrupada; relee la página sin `?cursor=`); las dos preferencias se guardan con la action de `equipo`
  (`guardarPreferenciaDeLaLista()`). La página decide con `agruparDelListado()` (con `?vehiculo=` nunca) y `src/app/(app)/cotizaciones/lecturas-de-la-pagina.ts`
  lee: agrupada sin texto, `leerListadoPorVehiculo()` (`cotizaciones_listado_por_vehiculo()`, `PaginaAgrupada` de `EntradaDelListado`: `grupo` con su `cabeza` y su
  `conteo`, o `suelta`, con `cortada`); con texto, la búsqueda agrupada en la página (`agruparLaPagina()`); sin agrupar, `entradasSinAgrupar()`. Los nombres, el modo
  (`leerModosDeCotizaciones()`, `cotizaciones_modos_de()`), el «⋯» y lo visto van sobre las cotizaciones que se dibujan. La tarjeta (`TarjetaEnLaLista`) lleva la
  imagen de la tarjeta por el hueco `Imagen` (`ancho={480}`, `recorte="cubrir"`, `lugar="lista"`: su visor es `?visor=imagen-de-la-lista-<id>`), el «⋯» sin «Compartir» (`MenuDeFila(fila, { sinCompartir })`) y «Compartir» (`compartirDe`, nulo
  sin la oferta o en Modo Live); la tabla, la columna «Título». «N cotizaciones de este vehículo» (`BotonDelConteo`) abre el modal del grupo (`ModalDelGrupoDiferido`, `features/listado/components/grupo/`; la URL `?panel=cotizaciones-del-vehiculo&vehiculo=<id>`
  por `useModalDelGrupo()` con `usePanelPorUrl()`; `PANEL_DE_COTIZACIONES_DEL_VEHICULO`, `tituloDelModalDelGrupo()` y `idDelVehiculoDelModal()` del núcleo; con ese panel la página **no lee `?vehiculo=` como filtro**,
  `pedidoDeLaPagina()`; `Modal` con `completoEnCelular`): lo lee `useGrupoDelListado()` desde el navegador (`areas/listado/composicion.client.ts`, `leerGrupoDelListado()`:
  `cotizaciones_listado(p_vehiculo)` o `cotizaciones_buscar(p_texto, p_vehiculo)` con los filtros de la página, de a `TAMANO_DE_ESTE_VEHICULO` hasta `TOPE_DE_ESTE_VEHICULO`, y los autores por
  `perfiles` y el modo por `cotizaciones_modos_de()` en paralelo); la cabeza va primero (`lineasDelGrupo()`; nula si el grupo no está en la página) y si su primera página no empieza por `ordenId`
  (`grupoQueCambio()`), `router.refresh()`. Elegir una línea hace `cerrar()` + `abrir(id)` del resumen en un paso y el foco no vuelve al botón. Las casillas y «Comparar» llegan por el hueco `Comparar` (`PropsDeCompararDelGrupo`: guarda las elegidas, envuelve al modal y le da `casilla()` y `pie()`; «Comparar» va en el pie del modal). El clic abre el resumen `?cotizacion=` (por `diferido()`, `ancho="amplio"`; abrir o cerrar borra `?pestana=`; la abierta queda marcada en la tabla, la tarjeta y la
  línea del modal de un grupo). **Ir al vehículo** (`entities/listado/ruta-del-vehiculo.ts`: `rutaDelVehiculoDeLaFila(fila, visibles)`; `visibles` = `origenesCon(permisos, 'vehiculos.ver')`, que pasa `src/app` como `vehiculosVisibles`): el título de la tarjeta de la lista, la celda «Vehículo» y «Título» de la tabla, y el título y el dato «Vehículo» de la cabecera del resumen son `<EnlaceAlVehiculo>` a `/vehiculos/<id>` (propio, sin prefetch; su clic no abre el resumen); sin vehículo o sin permiso, texto; la ficha del propio vehículo no lo enlaza (`enlazarVehiculo={false}`). **La barra del resumen** (`AccionesDelResumen`): «Abrir cotización» (con `volverA` si se abrió sobre una ficha), «Compartir cotización» (`compartirDe`) y el «⋯»
  (`menuDeFila(fila, { sinCompartir: true, conBorde: true })`), sólo con la cotización a la vista; debajo, `CabeceraDelResumen` (la miniatura del hueco `Imagen` con `ancho={480}`, `recorte="cubrir"`, `miniatura`, y título,
  total con su modo, clase e insignias «Aprobada» y «Vencida», cliente, vehículo, creada y vigencia: ≤ 120 px) y, con el resto del alto, las pestañas. El `Drawer` va con `desplazamiento="propio"`: la barra y la cabecera quedan fijas.
  **Fuera del listado**: `pantallas/listado-resumen.ts` (`ResumenFueraDelListado`) lo monta con `?cotizacion=` sobre la ficha del lead y la del vehículo; su lectura, su «⋯» y sus diálogos los une `src/app/(app)/cotizaciones/resumen-de-la-pagina.tsx`
  (nombres con `leads` y `vehiculos`: no se pueden importar acá) y `use-menus-de-las-filas.tsx`, el mismo que usa el listado. «Abrir cotización» desde una ficha lleva `?returnTo=` y `/cotizaciones/[id]` dibuja «Volver» (`returnToSeguro()`). Los `dialogos` del listado van dentro del Drawer mientras está abierto y montado (`alMontarse`; si no, abrirlos lo cerraría) y en el listado si no. La
  del resumen que no está en la página entra a los menús, a `quienesDelResumen()` y a los datos de los diálogos por `conLaDelResumen()`
  (`src/app/(app)/cotizaciones/la-del-resumen.ts`), y `leerLaDelResumen()` trae su modo; la que no está
  en la página la lee el servidor con `leerUnaDelListado()` (su fila y `cotizaciones_listado()` de tamaño `UNA` con el cursor `(creado_en, id + 1)`) y, si
  no llega, `usePedidoAlServidor()` pide una vez (escribe la clave con `shallow: false`, no `router.refresh()`: nuqs escribe la URL después) y luego «Reintentar»; `idDelResumen()` es la única lectura de la clave. **Las pestañas del resumen** (`?pestana=todo|adjuntos|revisiones|comentarios|vehiculo`, `entities/pestanas-del-resumen.ts`; «Todo» no escribe nada; «De este vehículo» sólo con un vehículo que quien mira ve, y sin él `vehiculo` abre «Todo») son un hueco
  (`HuecosDelResumen`, `features/hoja/components/huecos-del-resumen.ts`): `src/app` une `pantallas/comentarios-resumen.ts` (`Pestanas`, sólo la cáscara `diferido()`) y
  `pantallas/comprobantes-resumen.ts` (`Comprobantes`, bajo los adjuntos) en `src/app/(app)/cotizaciones/huecos-del-resumen.ts` (`HUECOS_DEL_RESUMEN`: un área no importa otra), y el servidor manda `quienesDelResumen()` (`puedeAdjuntar` y `puedeModerar` por
  id, de las reglas del «⋯» sobre la fila: ninguna pregunta a la base; una cotización sin entrada ahí no adjunta ni modera). Detalle: `areas/comentarios/CLAUDE.md` › «El resumen». «Nueva cotización»
  (`origenParaNueva()`) y la tecla `N`. **El «⋯» de cada fila** (`accionesDeCotizacion()`, la lista del núcleo que también dibuja el «⋯» de la guardada: primero y solo «Compartir cotización…», aprobar, marcar final, favorita, reportar, invalidar / descartar /
  reactivar y, al final, la papelera) se compone en `src/app/(app)/cotizaciones/`: `menus-de-la-pagina.ts` (servidor) lee las marcas y la versión de la
  página (`leerMarcasDeLaPagina()`, tres lecturas por clave primaria) y arma lo que cada fila ofrece con las reglas de cada área (`ofertasDeLaFila()`;
  `puedeGuardarDesdeElListado()` espeja `_cotizacion_puede_guardar()`); `listado-con-acciones.tsx` y `use-acciones-de-la-lista.ts` (navegador) llaman a las
  actions de la guardada y montan una vez los diálogos de compartir, marcar final, reportar y moderar (`?panel=…&para=<id>`, `CLAVE_DE_LA_FILA`, `usePanelDeFila()`). Una
  fila sin sus marcas no tiene «⋯». La lista del menú sale por `pantallas/listado.ts`, nunca por `client.ts` (ese barril trae el JS de la hoja).
- **`/cotizaciones/[id]`** (`cotizaciones.ver`): la hoja de una guardada con SU versión (`cotizacion_hoja_guardada()` y `cotizacion_evaluar(p_cotizacion)`
  con lo guardado; `entradasDeLoGuardado()` espeja `_cotizacion_entradas_de`); sin `puede_guardar` de la base, sólo lectura. El recálculo usa tablas y
  vehículo de hoy: si difiere (`difiereAlAbrir()`) se dice y se muestra «Total guardado». «Guardar» (`cotizacion_guardar`, siempre
  `ok(ResultadoDeCrear)`, `revalidatePath` sólo si entró) manda la versión vista (`actualizadoEn`), las entradas al día, el título y si es manual (del
  proveedor), las notas sin tocar y el vehículo de la hoja; apagado sin cambios (cambiar el título o el vehículo es un cambio), salvo con un pendiente (4-21) o si lo de hoy no es lo
  guardado. Sin vehículo y sin título pide el título como la nueva (`panelDelTitulo`, que pasa `src/app`). La cabecera (`CabeceraDeLaGuardada`, hueco `barra`)
  dibuja la barra del vehículo de `vehiculos` que arma `src/app/(app)/cotizaciones/[id]/` (`barra-de-la-guardada.tsx`, diferida): el título grande y el
  vehículo debajo; con `puede_guardar` abre el panel con el campo del título arriba. Pendiente y borrador van por persona y cotización, el
  borrador además con la versión (`claves-de-la-hoja.ts`).
- **La cabecera de una guardada, compacta** (`docs/UX.md` › «Cotización guardada»): a la vista la clase, la vigencia, las insignias, «Guardar» (sólo con
  `puede_guardar`: el `BotonGuardar` de la hoja se dibuja en su lugar por un portal, `useRanuraDeGuardar()`; sin él, «Sólo lectura: no puedes guardar esta cotización.», P13) y «Compartir» (`compartir()` del hueco de la vista
  previa); lo demás en el «⋯» (`features/hoja/components/menu-de-la-guardada/`: `ProveedorDelMenuDeLaGuardada`, que la página pone sobre la cabecera y la hoja,
  `useAporteAlMenu()` y `<MenuDeLaGuardada>`). Suman líneas la vista previa (`vista-previa`; también la abre el paso «Vista previa»), `<PdfDelMenu>` del área `tarjeta`
  (`pdf`), las revisiones, `<AvisoDeVersion>` (`encima`, sólo si el aviso lo ofrece) y las áreas por `Acciones`; quien suma no lee las líneas (si no, se vuelve a
  dibujar en bucle) y el foco vuelve al «⋯» (`botonRef`). La lista y su orden son del núcleo (`entities/acciones-de-cotizacion.ts`: `accionesDeCotizacion(ofertas,
{ aLaVista })`, `A_LA_VISTA_EN_LA_GUARDADA`), la misma del «⋯» del listado.
- **Cambiar el vehículo de una preventa guardada** (T315): `cambioDeVehiculo({ clase, puedeGuardar })` (`entities/vehiculo-de-la-guardada.ts`, del núcleo) da
  `elige` (la barra en modo `cambiar`: el panel de cotizar sin «Quitar», con alta; el dato del vehículo de una tabla no se elige ahí), `final` (`ver_elegido` con
  `MOTIVO_DE_LA_FINAL`) o `no` (`solo_mostrar`). Lo elegido vive en `?vehiculo=` (`CLAVE_DE_VEHICULO`, lo escribe el panel con `shallow: false`): `leerHojaDeUnaGuardada(id,
{ vehiculo })` calcula con él si `vehiculoParaCalcular()` lo deja (preventa, `puede_guardar`, otro que el guardado) y devuelve `vehiculoNuevo`; si la base lo rechaza,
  calcula con el suyo y `vehiculoSoltado` (la barra dice «No se puede usar ese vehículo.» con «Elegir otro vehículo»). `PantallaDeUnaGuardada` recibe `vehiculoNuevo`
  (congelado con la hoja) y `cambiaVehiculo`; la `key` de la hoja suma el vehículo (el borrador repone lo tipeado), el aviso de C11 no se dice con otro vehículo
  (el «Total guardado», sí), guardar manda `cambiaElVehiculo` (no va a la RPC: con él, un 42501 sin detalle es `vehiculo_sin_acceso`, que ofrece «Elegir otro
  vehículo») y, guardado, suelta `?vehiculo=` con `nuqs` sin ir al servidor; «Recargar» lo suelta yendo (`useSoltarElVehiculo()`). Tarjeta, PDF, huecos y cabecera
  siguen con lo guardado; la barra, el título y la hoja, con el nuevo.
- **Las cotizaciones hermanas** (glosario: «Variante en par» y «Cotizaciones hermanas»; `docs/COTIZADOR.md` › «Cotizaciones hermanas»): con `hoja.par`, la página
  nueva pide un primer cálculo por opción (`recalcularAlAbrirEnPar()`) y dibuja `PantallaDeCotizarEnParDiferida` (`pantallas/cotizar.ts`, por `diferido()`: lo del
  par no viaja en frío); la guardada lee la hermana en paralelo (`src/app/(app)/cotizaciones/[id]/par-de-la-guardada.ts`, `modoDeLaHermana()`) y, si está
  disponible y con el mismo permiso de guardar, dibuja `PantallaDeUnParGuardadoDiferida`; bajo la cabecera, `EnlaceALaHermana` (sin JS propio). La hoja en par
  (`features/hoja/components/par/`) es `useHoja` dos veces (`useHojaEnPar`: una columna por opción, cada una con su recálculo; las acciones de lo común escriben en
  las dos; un borrador para las dos), las celdas `enPar` en dos por `ContextoDelPar` (`ItemEnPar`) y los dos totales sueltos encima de «Avanzado» (`TotalesEnPar`, dos tarjetas). Guardar: las actions
  `crear-cotizaciones-en-par.ts` y `guardar-cotizaciones-en-par.ts` (sobre el núcleo del guardado; el título va sin la opción y con `topeDelTituloEnPar()`); cotizar
  encima, `cotizar-encima-en-par.ts` (`encimaEnParDe()`). La tarjeta de la vista previa suma la de la hermana (`hermana` de `PropsDeLaVistaPrevia`,
  `TarjetaDeLaHermana`), el PDF una página por hermana (`hermanaDelPdf()`) y «Compartir» sus `versiones` y las dos imágenes de la tarjeta apiladas (`apilarImagenes()`). Una
  hermana abierta sola no cambia el vehículo (`cambioDeVehiculo({ hermanaSola })`).
- **La cotización privada** (glosario: «Cotización privada»; `docs/COTIZADOR.md` › «Cotizaciones privadas»): quién la ve lo decide la base; la de otra persona sin
  `cotizaciones.privadas.ver` del origen no existe para ninguna lectura. La pantalla sólo ofrece (`entities/privada.ts`, del núcleo, con los textos): el interruptor
  «Privada» de la hoja nueva y en par (`useMarcaDeLaNueva()` de `features/privada/`, en los pasos de la hoja; el valor vive en `?privada=si`, sobrevive a que la
  hoja se vuelva a montar y se borra al guardar; el pedido lleva `privada` sólo encendido, `p_privada`); «Hacer privada» / «Hacer pública» en el «⋯» de la guardada
  (`<PrivadaDelMenu>`, por `encima`) y del listado (`cambiarLaPrivada()` de `pantallas/listado.ts`) sólo a quien la creó (`ofertaDePrivada()`: apagada con su motivo en
  una final o la aprobada; en la guardada, si es la aprobada lo anota el área `aprobada` en `useAprobadaAnotada()`, y sin anotación decide la base), con la action `cambiarPrivadaDeLaCotizacion` (`cotizacion_privada_cambiar`, con la versión; al entrar, `router.refresh()`); y la insignia
  «Privada» con candado (`<InsigniaPrivada>`: tabla, tarjeta, resumen y cabecera de la guardada). Aprobarla (área `aprobada`) o marcarla final (área `final`) la hace
  pública: las dos lo dicen antes.
- **`/cotizaciones/comparar?ids=a,b[,c]&returnTo=`** (pide sesión; `cotizaciones.ver` de cada una lo decide la base): «Comparar cotizaciones», del área
  `aprobada` (`areas/aprobada/CLAUDE.md` › «Comparar cotizaciones»; `pantallas/aprobada-comparar.ts` y `aprobada-esqueleto-de-comparar.ts`). Lo guardado sin
  recálculo. El enlace (`rutaDeComparar`) y la lectura de `ids` (`idsParaComparar`: 2 o 3 guids distintos, en minúsculas, en el orden de la URL) son del
  núcleo (`entities/ruta-de-comparar.ts`): los usan «De este vehículo» y la lista agrupada.
- La hoja guarda en la URL lo que abre (se borra al guardar): `?panel=avanzado`, `?panel=vista-previa` (la tarjeta; sólo con `<ProveedorDeLaTarjeta>`,
  también para quien sólo ve; en una guardada dibuja lo guardado), `?ayuda=bloques&nodo=<id>` (la ayuda en bloques, glosario: «Ayuda (de una celda)»; `texto` y `tabla`, de antes, abren lo mismo y se reemplazan por `bloques`; la URL no abre lo que la hoja no dibuja)
  y, con el proveedor del área, `?ajuste=celda&nodo=<id>` (el ⚙, también dentro de «Avanzado») y `?ajuste=cabecera` (el ⚙ de la cabecera: «Configuración por
  defecto de <Origen>», junto a los modos; sólo con `cabecera.ajustes` de la base y el hueco `AjusteDeLaCabecera` lleno).
- **Los pasos de la hoja** (`<PasosDeLaHoja>`, `entities/pasos-de-la-hoja.ts`, en `ColumnaDeLaHoja` debajo de `CabeceraDeHoja`): «Privada · Vista previa».
  «Privada» es el `InterruptorPrivada` (sólo la hoja nueva y para quien puede marcarla; va en el orden de Tab); «Vista previa», sólo con
  `ContextoDeLaVistaPrevia`, fuera del orden de Tab (la tarea de oro no suma paradas): con el teclado, la hoja nueva cierra con `VistaPreviaConElTeclado` (después de «Guardar», se ve al enfocarlo); una guardada la abre desde el «⋯». Sin ninguno, la fila no se dibuja. La línea de arriba de «Avanzado» sale de `explicacionDelAvanzado()`; el título y los bloques de la ayuda, de `tituloDeLaAyuda()` y `bloquesDeLaAyuda()`.
- **El aspecto de V1** (`docs/DECISIONES.md` › «La hoja con el aspecto de V1»): «Avanzado» es un botón a lo ancho (`BotonDeAvanzado`: los títulos que esconde,
  en un `hidden` por `aria-describedby`) y su modal es `ancho="grande"` con las secciones `sinMarco` (`SeccionDeHoja`, `claseDelMarcoDeLaSeccion()`). **La hoja sin resumen** (`docs/DECISIONES.md` › «La hoja sin
  el resumen de la derecha»): el total va en la región del total (`RegionDelTotal`, `data-total-de-la-hoja`, ocupada mientras recalcula): la tarjeta y, debajo y
  fuera de ella, sus avisos en una región viva de alto reservado, el total guardado, lo pisado y los secundarios. Lo que dice además de la cifra llega por
  `ContextoDelTotal` (`useDelTotal()`). Con la pieza `{ tipo: 'total' }` en una sección principal, `TotalDeHoja` la dibuja ahí a todo el ancho; sin ella, o en par,
  va suelta justo encima de «Avanzado» (`totalSuelto()`, `ordenDeLaHoja()`). Debajo de «Avanzado», el cierre (`CierreDeLaHoja`, `data-cierre-de-la-hoja`):
  «Guardar» a todo el ancho con su motivo y lo que falta elegir, y la región viva de `AvisoDelGuardado`. El Modo Live, sólo en la barra de arriba (y en el pie de la
  vista previa, `LiveDeLaVistaPrevia` de `tarjeta`).
- **La ranura de la cabecera** (glosario: «Ranura de la cabecera»; `features/hoja/components/ranura-de-la-cabecera/`): `src/app` pone
  `ProveedorDeLaRanuraDeLaCabecera` sobre las barras y la hoja y `<RanuraDeLaCabecera reserva>` en la fila de las barras (`data-cabecera-de-la-hoja`, dentro de un
  `@container/cabecera` aparte: una consulta de contenedor no mira al propio contenedor; en la nueva, `barras-de-la-hoja.tsx`; en una guardada, `CabeceraDeLaGuardada`);
  `CabeceraDeHoja` (modos como control segmentado, «Ver total en moneda local» como `InterruptorChico`, el ⚙) va ahí por un portal. `reserva` es la `CabeceraQuieta`
  que arma la página (las mismas `PiezasDeLaCabecera`, `inert`, sin `data-cabecera`; nada si `cabeceraSeDibuja()` es falso): se ve mientras el portal está vacío y se
  esconde por CSS (`peer-empty`) en el mismo cuadro en que llega la de verdad. Un alto reservado no alcanza: en el celular la cabecera se parte en dos líneas o no
  según el ancho. Sin proveedor (el editor, las pruebas), la cabecera va en su lugar.
- `index.ts`: `recalcularAlAbrir()` va DESPUÉS de leer la hoja (4-28), con `modoInicial()` (el modo por defecto del diseño o, sin él, el primero); `contarCotizacionesDelVehiculo()`
  («Cotizado (n)») es acotado y con la RLS de quien mira; `rutaDeLaHoja()` la usan «Cotizar» de `/vehiculos` y de `/leads/[id]`;
  `datosDelVehiculoDeLaHoja(hoja)` dice qué campo del vehículo casa con qué tabla (qué se elige lo decide `vehiculos`). Lo consumen `logistica`, `chat`,
  `buscador`, `web` (precio público), `tablero`.
- `client.ts`: `useLectorDeOpciones()`, las opciones de un dato del vehículo (los textos de su columna en `cotizacion_tabla`, 5 min en la
  memoria de tablas que comparte con la ayuda, `memoriaDeLaTabla()`): con él la página arma el lector del panel del vehículo (`vehiculos` no conoce `cotizaciones`). La celda sin valor de un campo que
  se elige (`seEligen`; `campo_sin_valor`, `fila_sin_coincidencia`) dice «Elige el dato del vehículo en «Vehículo»…».
- **«Revisiones»** (`?panel=revisiones`): lee `cotizacion_revisiones` desde el navegador por `composicion-revisiones.client.ts`, con «Ver más» por
  cursor (el id de la última); lo leído es de una versión (`actualizadoEn`). La RPC recorta cada diff al nivel de quien mira; `cambiosDeLaRevision()` da el
  total sólo si llegan los dos números. Un cambio de vehículo se nombra al leer (T315): `idsDeVehiculosDe()` junta los ids de la página y una lectura de `vehiculos`
  por pk (≤ 2 × `TAMANO_DE_VER_MAS`, RLS de quien mira, sin papelera) los vuelve `conVehiculos()` («Cambió el vehículo: A → B», primero; lo que no vuelve es «un
  vehículo que no puedes ver», un lado nulo «sin vehículo»); si esa lectura falla, «Cambió el vehículo». Ningún título se copia a la revisión. «Ir a una fecha»: `p_hasta` es el inicio del día siguiente en la zona de la empresa (exclusivo); el salto
  reemplaza lo leído, «Ver más» sigue sin `p_hasta` y la ventana no va a la URL (`useTurno`). La base supone que el id crece con `creado_en`
  (`docs/PENDIENTES.md`, 4-95).
- **La cadena** (`cadena` de `cotizacion_hoja_guardada`): «Versión V de la n.º N» con enlace a la anterior si se ve, «Hay una versión nueva: n.º M
  (versión W).» o «Hay una versión nueva que no puedes ver.».
- **«Cotizar encima»** (`features/encima/`): el aviso (`avisoDeVersion()`: otra versión que la publicada hoy, o vencida) lo ve todo el que abre; el
  botón, sólo con `cadena.puedeCotizarEncima` (lo decide la base, no `puede()`: una anterior sin lead pide `sin_lead` y una sin vehículo, `sin_vehiculo`). El intento es el id de la nueva y se conserva sólo tras una pérdida; con
  cambios sin guardar o un pendiente el botón espera, porque la nueva lleva lo guardado.
- **Historial** (el del panel del vehículo de la hoja, `HistorialDelVehiculo`: un botón que abre el modal `?ver=historial`, `ModalDelHistorial`, que vive con el panel; las fichas del vehículo y del lead usan la fila de tarjetas): el modal lo lee al montarse desde el navegador
  por `composicion-historial.client.ts` (por `cotizaciones_vehiculo_creado_idx`), de a 20 hasta 500, y el tope dice «Ver todas en Cotizaciones». Va aparte de `composicion.client.ts` y
  cada cáscara de `diferido()` en su `diferidos.tsx` porque lo que importa la hoja viaja en la carga en frío de `/cotizaciones/nuevo` (4-73).
  `usePaginasDelHistorial(de)` descarta lo viejo con `ultimo`; `<ListaDelHistorial>` espera 300 ms el esqueleto salvo con `esperarEsqueleto={false}`.
  El bloque «Cotizaciones» de `/leads/[id]` (con `cotizaciones.ver` en algún origen, sin mirar la cartera: la RLS recorta; `pantallas/listado-fichas`, bajo el título con «Cotizar» que arma `src/app`) es la fila de tarjetas.
- **La configuración** vive en la página de cada origen (la arma `src/app/(app)/configuracion/origenes/[id]/`): las pestañas Planilla · Hoja · Tarjeta
  (`…/planilla|hoja|tarjeta?formula=<id>`; sin `?formula=`, la fórmula de trabajo), cada una con la **barra de la fórmula** arriba (glosario; área
  `formulas-del-origen`, su ficha en `areas/formulas-del-origen/CLAUDE.md`: el selector con la lista y su «⋯», el estado, «Versiones», «Tablas» y lo que el
  editor de la pestaña lleva a la ranura con `AccionesEnLaBarra`). «Versiones» (área `formula`, `pantallas/formula-versiones.ts`) abre en Planilla el drawer
  `?panel=versiones` con la lista de versiones; en Hoja y Tarjeta lleva a la Planilla con el drawer abierto. «Tablas» (área `tablas`,
  `pantallas/tablas-drawer.ts`) abre el drawer `?panel=tablas` (`&tabla=<id>`, y el panel de la tabla en `&accion=`) con `SeccionDeLasTablas`, sin dejar la
  pestaña. Cada sección del módulo recibe el **origen abierto** (`{ id, nombre, activo }`) que `src/app` ya validó, sin selector propio; las URL las
  arman `rutaDeLaFormula(origenId, formulaId | null, parte, consulta?)`, `rutaDeParteDelOrigen(origenId, parte, consulta?)` y
  `consultaDelDrawerDeLasTablas(consulta?)` (el drawer «Tablas» sobre la Planilla), de `@/shared/lib/rutas`; las actions de la planilla, la hoja, la tarjeta y las tablas revalidan `RUTAS.origenes` con `'layout'`. Lo de toda la
  empresa está en Configuración › Orígenes › «Para todos los orígenes» (colores y vigencia: tarjetas con su modal; las actions de los colores revalidan
  `RUTAS.origenes` con `'layout'`) y, para los niveles de acceso, en la matriz de Roles
  (sus actions revalidan `RUTAS.roles`). Planilla, Hoja y Tarjeta reciben `formula: FormulaDelOrigen` de su página (`abrirLaFormulaDeLaPestana()`) y leen y escriben **esa** fórmula del origen (la de la URL):
  cada lectura va por su id y cada escritura lo manda (`p_formula_del_origen`); sus `key` llevan el id de la fórmula. Las RPC sin id y una pestaña sin `?formula=` usan la
  **fórmula de trabajo** (glosario; `leerFormulaDeTrabajoSobre()` de `infra/queries/formula-de-trabajo.ts`, espejo de `_fdo_de_trabajo()`). El ⚙ de la
  hoja (celda y cabecera) lee y cambia la publicada de la **activa**. Los avisos de la copia (`entities/avisos-de-la-copia.ts`, `useAvisosDeLaCopia()`) y los
  datos del vehículo que faltan (`useCamposDeLaFormula()`, `entities/campos-que-faltan.ts`, espejo de `_fdo_campos_que_faltan`) son del núcleo y los
  dibuja la planilla. La pestaña Tarjeta va a ancho completo y su página pide la referencia del lienzo sin esperarla
  (`origenes/[id]/(pestanas)/tarjeta/referencia.ts`, con `leerListadoDeCotizaciones()` y `UNA` del área `listado`, `leerHojaDeUnaGuardada()`, y `referenciaPlana()` y
  `calculoDeLoGuardado()` del núcleo).
- Niveles: en la matriz de Roles, bloque «Cotizaciones» (`/configuracion/roles?bloque=cotizaciones`; `equipo.roles.ver|gestionar`; `?panel=nuevo-nivel|renombrar-nivel|eliminar-nivel&nivel=<id>`). `pantallas/configuracion.ts` sale `NivelesEnLaMatriz`: una render prop que da a la matriz de `equipo` los huecos (`cabeza`, `menuDelNivel`, `pie`, `ventanas`); la une `src/app/(app)/configuracion/roles/matriz-con-niveles.tsx`.
- Con Live, las cifras de la ayuda de una celda de dinero pasan por `<Monto>`; las de otra celda quedan a la vista.
- **Llenar una celda desde la ayuda:** en un bloque de tabla, la cifra de una columna con `llena` es un botón si `destinoDeLaAyuda()` (`entities/destino-de-la-ayuda.ts`)
  encuentra el lado de la celda dibujado y sin candado (`bloqueoDeLado`). Tocarla llama a `acciones.alAplicar(nodo, valor)` de `use-hoja.ts` (el mismo camino que
  tipear, con «Editado a mano» si pisa un cálculo), cierra la ayuda, deja el foco en el botón del valor (`data-lado` de la XCell) y avisa «IVA % = 14,94 %» con
  «Deshacer» (`useAplicarDesdeLaAyuda`), que repone lo de antes sólo si la hoja sigue como la dejó el clic. Con Live y un destino de dinero, el aviso no dice la cifra.
  Sin `alAplicar` (la hoja en par, el lienzo del editor) nada se elige. «Tu vehículo» (`resaltar`): `filaDelVehiculo()` (`entities/fila-del-vehiculo.ts`, igualdad
  estricta como el motor, la primera gana) con los valores de los nodos del recálculo y `valoresDelVehiculo` del `ContextoDeHoja`, que arma `src/app` con
  `valoresParaCasar()` de `vehiculos` sobre `camposQueCasanLaAyuda(hoja)` (de `index.ts`).
- **Editar una tabla desde la ayuda** (área `tablas`; glosario: «Bloque de la ayuda»): en la hoja nueva de quien configura el origen (`src/app` pone
  `ProveedorDeLaEdicionDeLaTabla` de `pantallas/tablas-hoja.ts` con `puede(…, 'cotizaciones.configurar', origen)`), un bloque de tabla con el id de la tabla viva y
  sin Modo Live dibuja el hueco `ContextoDeLaEdicionDeLaTabla` (`features/hoja/components/ayuda/hueco-de-la-edicion.tsx`; sus props, `PropsDeLaEdicionDeLaTabla`
  de `huecos.ts`) por `diferido()` (`features/tablas/components/ayuda/`; mientras llega, la tabla quieta). ✎, 🗑 o «+ Añadir fila» leen la tabla viva entera
  (`leerTablaParaEditarEnElNavegador()`, `areas/tablas/composicion.client.ts`; más de 2.000 filas o una que no se lee: «Esta tabla se edita en la configuración.») y
  lo pedido se hace al llegar, salvo si cambió desde que se abrió la hoja (`tablaCambio()`: sólo se abre, con el aviso). Lo puro en `entities/tablas/edicion-en-la-ayuda.ts`
  (una fila abierta a la vez, las quitadas tachadas con «Volver», «Cancelar» saca la sumada vacía); «Guardar» publica la tabla entera con `publicarTabla` (versión leída,
  nota «Desde la ayuda de «<rótulo>».», `useGuardadoEnLaAyuda`: PT409 con «Recargar», el 22023 de una celda en su campo, sin red sale al volver). Sin borrador: cerrar
  la ayuda con cambios pregunta (`useCambiosSinGuardar(…, { preguntaAlCerrar: true })`). Publicada, si una fórmula de este origen pasó a la versión siguiente
  (`origenId` del `ContextoDeHoja`), `router.refresh()`: la hoja vuelve con otra abierta y el borrador repone lo tipeado (`loQueNoVuelve()` avisa si algo no volvió);
  si a los 10 s sigue ahí, «Recargar». Si no, la tabla se lee de nuevo (`olvidarYLeer()`). En una guardada o con Live, a quien configura sólo «Editar en la
  configuración» (`?tabla=<id>` del drawer de tablas).
- Los `loading.tsx` de la hoja importan `pantallas/esqueleto-de-hoja.ts`, nunca el barril de su pantalla (con él, el HTML en frío baja dos chunks casi
  iguales). El núcleo del guardado (`useNucleoDelGuardado`: pendiente, un envío a la vez, reintento al volver la red) es el mismo de la hoja nueva y de la
  guardada. `hoja-de-una-guardada.ts` viaja al navegador sin Zod; su lectura es `hoja-de-una-guardada-lectura.ts` (sólo servidor).
- **Tablas de referencia** (área `tablas`; `/configuracion/origenes/<id>/planilla?panel=tablas&tabla=`, `cotizaciones.configurar`): `SeccionDeLasTablas` con `destino` = `{ origen, en }` lee la
  lista del origen y las compartidas que recibe (`leerTablasDeReferencia()`) y `ListaDeTablas` la parte en dos grupos, «De <origen>» y «Compartidas»; ya no hay un destino
  «compartidas» ni sección de Configuración, y el buscador de Configuración no las ofrece: viven en el drawer de cada origen. Tope 100; una compartida tapada por una propia va `tapada`; con `?tabla=` de esa lista, el editor por `diferido()` de a 100 filas.
  `leerTablaParaEditar()` lee **todas** las filas por cursor `(orden, id)` hasta 2.001: con una fila que no se lee o más de 2.000 no devuelve nada, porque
  publicar reemplaza todas. Se edita en memoria y se valida con el espejo de la base (`entities/tablas/validacion.ts`, `TOPE_DE_FILAS` = 2.000); el
  borrador va por versión en `sessionStorage` (pausado mientras publica) y el editor lleva `key` id:versión. «Publicar» (`?panel=publicar-tabla`,
  `tabla_referencia_publicar()`): el PT409 y el 22023 con `hint` llegan tal cual (`porCampo` con el camino de la celda). **La estructura** (glosario:
  «Crear una tabla de referencia», «Cambiar las columnas», «Tabla desactivada»): «Nueva tabla» (`BotonDeNuevaTabla`, `?panel=nueva-tabla`, `PANEL_NUEVA_TABLA`;
  apagado en el tope con su motivo) abre `PanelDeNuevaTabla` (nombre, clave que sale de él, «Sólo <Origen>» o «Compartida» sólo con origen, y las columnas
  de `EditorDeColumnas`); el id del intento nace con el panel (`key` por apertura) y al entrar lleva a `?tabla=<id>`. Abierta una tabla, el «⋯» del encabezado
  (`AccionesDelEditor`) da «Columnas» (`?panel=columnas-de-tabla`, `PanelDeColumnas`, `ancho="amplio"`: renombrar, ordenar, sumar y quitar con «Se quita»; la
  clave y el tipo de una existente no se cambian) y «Desactivar» (`?panel=desactivar-tabla`, `<Confirmar>`), los dos apagados con cambios sin publicar en las
  filas (`menuDeTablaEnElEditor()`); el «⋯» de cada fila de la lista (`menuDeTablaEnLaLista()`) lleva a la tabla con su panel. Las reglas, en
  `entities/tablas/` (`edicion-de-columnas.ts`, el reductor; `validacion-de-columnas.ts`, espejo de `_tabla_referencia_columnas_validas()`; `estructura.ts`,
  `claveDeLaTabla()` y los topes; `resultado-de-estructura.ts`, los rechazos de las tres RPC). Los dos paneles preguntan al cerrar con cambios
  (`<CambiosSinGuardar preguntaAlCerrar>`).
- **La fórmula** (área `formula`; la pestaña «Planilla»: `/configuracion/origenes/<id>/planilla?formula=<fórmula>`, `cotizaciones.configurar`, a ancho completo): la planilla al frente: arriba
  sólo el ⓘ «Información de la fórmula» y «Publicar…» (suben a la barra; en la puesta en marcha, en su fila) y las versiones
  (`VersionesDeLaFormula`, en el drawer de la barra o en su lugar); la publicada, el borrador y los avisos de la copia, en el modal (`components/informacion/`,
  `?panel=info-formula`, por `diferido()`), y abajo la sesión de edición (`SesionDeLaFormula` por `diferido()`: lee la versión desde el navegador y
  llama **una vez** a `useEditorDeLaFormula`), que dibuja la planilla (`components/planilla/`, por `diferido()`; lo que arma, `usePlanilla()`), sobre la misma
  fórmula del origen. **La planilla edita como una hoja de cálculo** (`docs/COTIZADOR.md` › «La planilla»): la cuadrícula `role="grid"` (`cuadricula/`, la celda
  activa por `aria-activedescendant`, eventos delegados; columnas # · A concepto · B % · C valor · Ejemplo, con la clave interna `D` para Ejemplo y lo que
  muestra cada una de `contenidoDeLaFila()`, calculado una vez por fórmula de trabajo en `useEdicionDeLaPlanilla`), la barra de fórmula (`barra/`: el nombre de
  la celda, `fx ▾` con `useFuncionEnLaBarra` e `insertarFuncion()`, el texto en A1 pintado por referencia con su placeholder, la leyenda, las sugerencias, el
  error con su tramo, «Totales», «Tarjeta» y el «?» de los tipos de celda; debajo, `LineaBajoLaBarra`: «De dónde sale: …» de la fila elegida), el «⋯» y el
  clic derecho de cada fila y banda (`menu/`) y los paneles por URL (`paneles/`: banda, «Total y tipos de cambio», «Tipo de celda» y «¿Cómo se escribe?»; al
  costado, `?costado=totales|tarjeta`, `Drawer alCostado` desde `CORTE_DEL_PANEL`). En la página, «Guardar el borrador» y su línea de estado suben a la barra
  de la fórmula y «Sobre…» no se dibuja (`useEnLaBarra()`); en la puesta en marcha, los dos van arriba de la planilla. Lo guardado sigue en ids: A1 es sólo del navegador (`entities/formula/referencias-a1.ts` sobre la hoja numerada de
  `hoja-de-la-planilla.ts`); las operaciones de fila (`insertar-fila.ts`, `mover-fila.ts`, `eliminar-fila.ts`, `tipo-de-celda.ts`) y de banda (`bandas.ts`)
  son puras y devuelven la fórmula nueva o el motivo. El
  catálogo de tablas del origen (`leerCatalogoDeTablas()` del núcleo, `infra/queries/catalogo-de-tablas.ts`: id, clave, nombre y columnas de las `tablas_referencia`
  activas del origen y las compartidas, la del origen gana; tope 100; nulo si falla; `tablasParaElCompilador()` lo proyecta) lo lee la sección en paralelo con la fórmula y llega a la sesión para revisar BUSCARV al compilar. La unidad
  de ejemplo y el modo viven en la sesión; «Publicar…» espera con cambios aplicados sin guardar (`alCambiarPendientes`, en `useLayoutEffect`). La `key` de la
  sesión es `<origen>:<vuelta>:<sesión>` (`otraSesion()`). La página pasa `tarjeta` (la promesa de `leerLaTarjetaDeTrabajo()`), `TarjetaEnVivo` y
  `puedeCambiarTiposDeCambio` y los tipos de cambio de la empresa (`tiposDeCambio`, clave y nombre, para «Tipo de celda»). Las celdas editables usan `BOTON_DEL_VALOR` y `ENTRADA` de `@/shared/ui/xcell`; los colores de las bandas, `leerTonosDelCatalogo()`
  con claro y oscuro y `<EstiloDeTonos>`.
- **La barra de la fórmula** (glosario): en las pestañas Planilla, Hoja y Tarjeta de la página del origen los botones del editor («Guardar el borrador»,
  «Publicar…», «⋯») van envueltos en `<AccionesEnLaBarra orden>` del núcleo (`features/barra-de-la-formula/`) y suben a la ranura de la barra; sin
  `<ConLaBarraDeLaFormula>` (la puesta en marcha) se dibujan donde estaban. Con `lugar="estado"` van a la ranura junto al estado (`<RanuraDelEstado>`, de
  44 px reservados: sólo el ⓘ de la Planilla). El estado lo registra cada editor con `useEstadoEnLaBarra()`, de una función pura por área
  (`estadoDeLaFormulaGuardada()`, `estadoDeLaHoja()`, `estadoDeLaTarjeta()`). En la Hoja, «Publicar…» (orden 2) es del área `formula` y lo compone la página
  (`PublicarEnLaHoja`, `pantallas/formula-publicar.ts`: el mismo panel `?panel=publicar-formula` y sus modales): se ve con un borrador al día y espera, apagado con
  «Guarda el borrador antes de publicar.», mientras el editor de la hoja registra cambios sin guardar.
- **El PDF** (área `tarjeta`): `GET /cotizaciones/[id]/pdf` (`requerirSesion()`; 404 en texto igual al de la página para lo que no existe, está en la
  papelera o no se ve; `rutaDelPdf(id)`) arma la página (fecha del último guardado en la zona de `leerAjustes()`, que falla en vez de dar lo de fábrica) y
  pide `pdfDeUnaGuardada()` con el contexto de `contextoDeLaPagina()` (el cliente sólo con `leads.ver`: `src/app/(app)/cotizaciones/datos-de-la-tarjeta.ts`, que
  comparte con la página): `cotizacion_tarjeta` como quien pide, sin memoria, y `infra/tarjeta/pdf/` (Geist TTF recta e itálica). Lo baja quien ve la cotización, sin
  clave propia (pie de «Vista previa» y «⋯» de la cabecera de una guardada, `<PdfDelMenu>`; `<a download>` en la tarjeta de lo guardado de la hoja nueva). Las pruebas leen su texto con
  `scripts/pdf/texto-del-pdf.ts`.
- **«Compartir la cotización»** (área `tarjeta`; glosario, `docs/UX.md` › «Cotización: compartir»): el panel `PanelDeCompartir` (`features/tarjeta/components/compartir/`, por
  `diferido()`), en `?panel=compartir` en el detalle (`CompartirDeLaGuardada`, a la vista en la cabecera por el hueco `compartir` de la vista previa, sólo con
  `cotizacionId`) y en `?panel=compartir&para=<id>` fuera de él (`DialogoDeCompartirDeLaFila` y `useAbrirCompartirDeLaFila()` por `pantallas/tarjeta-compartir.ts`:
  el «⋯» del listado; también para las tarjetas, el resumen y la ficha del vehículo); la pestaña en `?compartir=texto` (`entities/tarjeta/compartir/url.ts`). Con
  el Modo Live ni el botón ni la línea del «⋯»; por URL, el aviso. Lee `GET /cotizaciones/[id]/compartir` (`DatosParaCompartir`: `paraCompartirDeUnaGuardada()`
  da los montos de la tarjeta de lo guardado con `lineasDeLaTarjeta()`; `src/app` suma el vehículo con `zonaDelPatioDe()` de `vehiculos` y la subasta) y, al
  elegir «Fotos», `…/compartir/fotos` (`leerVehiculoDeLaCotizacion()` por `cotizaciones_pkey` y `leerGaleria()`); la imagen de la tarjeta (`pedirLaImagenParaCompartir()`), por su
  ruta con la caché del navegador, pasada a PNG en el navegador. El texto lo arma `textoParaCompartir()` (puro), con la firma del asesor (quien comparte: `DatosParaCompartir.asesor`; «Creado por» es `autor`, de
  `leerAutorDeLaCotizacion()`); los motivos de los botones, `motivosDeCompartir()`. Desde el navegador,
  por `areas/tarjeta/composicion-compartir.client.ts` (la importa sólo el panel). Lo genérico del navegador, `src/shared/lib/compartir.ts`.
- **La imagen de la tarjeta** (área `tarjeta`; glosario, `docs/COTIZADOR.md` › «La imagen de la tarjeta»): `GET /cotizaciones/[id]/imagen` (`rutaDeLaImagen(id,
{ ancho?, intento? })`, el mismo 404 que el PDF; `?ancho=480` es la miniatura de las listas y otro ancho se ignora; `?intento=`, sólo otra URL) se arma **al pedirla, para
  quien la pide**, y no se guarda. Lee la huella (`leerHuellaDeLaImagen()`, `cotizacion_imagen_huella()`; lo que no se ve, 404) y, con un `If-None-Match` que
  `coincideLaEtiqueta()` con `etiquetaDeLaImagen()` (huella, usuario, `VERSION_DEL_DIBUJO` y ancho), responde 304 sin dibujar; si no, `armarLaImagen(id, { contextoDe,
ancho })` (en `features/tarjeta/` porque cruza con `empresa`: la hoja de lo guardado, los ajustes, el logo y el WebP de `webpDeUnaGuardada()`, `sharp` con
  `import()`) con el contexto de quien pide (`datos-de-la-tarjeta.ts`, como el PDF: el cliente sólo con `leads.ver`, y él como asesor). Con la ETag, `private,
no-cache`; con «Ver como» (sin leer la huella), sin el primer recálculo o incompleta (una lectura del contexto falló o no llegó el logo o la foto: `completa`),
  `no-store` y sin ETag; un fallo, 500 en texto. `Server-Timing` dice lo que tardó la
  huella y el armado. El componente `<ImagenDeLaTarjeta>` sale por
  `pantallas/tarjeta-imagen.ts` (marco de la proporción que le den, pedida a la vista y de a cuatro por página con `useCargaDeLaImagen()`, recuadro con el total, visor por `diferido()` con la clave de
  `claveDelVisorDeLaImagen()`, que acepta también la de antes, `portada-…`; Modo Live por CSS en `globals.css`).
- **El editor de la hoja** (la pestaña «Hoja»: `/configuracion/origenes/<id>/hoja?formula=<fórmula>`, `cotizaciones.configurar`; glosario: «Inspector de la
  hoja»): lee el borrador o la publicada y los niveles de `cotizaciones_niveles` (no de `niveles_con_uso()`) y edita **sobre la hoja**: el lienzo
  (`components/editor/`) dibuja el diseño de trabajo con las piezas de cotizar (`hojaDeLaVistaPrevia()`, `ItemDeHoja`, `TotalDeHoja`, `CabeceraDeHoja`,
  `TotalSueltoDelLienzo` sin la pieza, cada una `inert` bajo su botón «Elegir «Precio»» con `data-pieza` y `data-elegir`) y a la derecha el inspector (`components/inspector/`) edita
  la pieza elegida, que va en `?pieza=` (`entities/diseno/pieza-de-la-hoja.ts`: el id del nodo, `atajos-<nodo>`, `seccion-<id>`, `tarjeta-del-total`,
  `cabecera-de-la-hoja`; `usePiezaElegida()`); sin nada elegido, «Sin lugar en la hoja (N)» (`filasSinLugar()`, espejo de `nodo_sin_seccion`: «Agregar» la suma al
  final de la primera sección principal). Cada pieza: el rótulo y el formato de su fila (editan la `definicion` que se guarda: `entities/diseno/edicion-de-nodos.ts`),
  ver y editar juntos con `ponerNiveles()` (`admiteNivel` apaga lo que la base rechazaría con `nivel_no_admitido`), atajos, interruptor, ayuda, modos, la tarjeta
  del total (variante y subtotal comparten inspector) y **el aspecto** (`components/aspecto/`, `entities/diseno/edicion-del-aspecto.ts`: el valor por defecto
  quita la clave), con el aviso «se deduce restando» (sin bloquear). **Mover y sumar:** arrastrar la pieza entera (dnd-kit con `PointerSensor` a 6 px; nada se
  reordena mientras se arrastra, la marca dice dónde cae: el lienzo va con `zoom`), Alt+↑/↓ y el «⋯» (Mover antes, Mover después, Quitar con «Deshacer»)
  dentro de su sección o a otra (`moverItemA()` de `orden-del-diseno.ts`; si cambia quién la ve, `avisoDelCambioDeNivel()` lo dice en el inspector); el ancho, con
  el borde (`useAnchoConBorde()`), Alt+←/→ o el select (`ancho-de-la-pieza.ts`); el «+» de cada sección («Sumar una pieza aquí», `ofertasParaSumar()` con el tope
  de 40 y las reglas del total de `total-de-la-hoja.ts`) y «+ Sección principal / avanzada» (`insercion-del-diseno.ts`). **Las vistas** (`?vista=412|1280|1920|200`,
  `useVistaDelEditor()`; sin ella, la de la ventana): el lienzo es un hijo de ese ancho en px achicado con CSS `zoom` (`MarcoEscalado`, `escalaDelLienzo()`; los
  cortes `@4xl/hoja` miran al hijo; «Texto al 200 %» es 206 px con `zoom: 2`). **Por debajo de 1.024 px**, la hoja a 412 en sólo lectura con «Este editor se usa en
  una pantalla de al menos 1.024 px.» (`HojaSoloLectura`). **La ayuda de una celda** (`components/inspector/ayuda/`, glosario: «Bloque de la ayuda»): sus bloques en orden con su «⋯» (Mover antes, Mover después, Quitar
  con «Deshacer»; Alt+↑/↓) y «+ Bloque» (Título, Texto, Enlaces, Tabla; apagado con su motivo: `motivoParaSumar()`, `tablaParaElBloqueNuevo()`); las operaciones, puras,
  en `entities/diseno/edicion-de-la-ayuda.ts` y `tabla-del-bloque.ts`, y atadas en `hooks/ediciones-de-la-ayuda.ts`. Un bloque de tabla elige la tabla del catálogo
  (`leerCatalogoDeTablas()`, que la sección lee en paralelo; en dos grupos, «De <origen>» y «Compartidas»; nulo: las que nombra la fórmula), sus columnas con la celda que
  llena cada una (`celdasQueAceptanValor()`) y «Resaltar la fila del vehículo»; «Abrir en Tablas» abre el drawer de tablas de la pestaña con ella. El rechazo de forma
  de un bloque marca el bloque (`errorDelBloque()`). «+ Nuevo nivel» (con `equipo.roles.gestionar`: `NuevoNivelAlVuelo` del núcleo monta una vez el modal de
  la matriz, `?panel=nuevo-nivel`) y «+ Nuevo color» bajo el color de una sección (con `cotizaciones.configurar`: `NuevoColorDeLaSeccion`, `?color=nuevo`) dejan
  elegido lo creado y lo suman a lo leído (`useCreadosAlVuelo()`) hasta que la página lo traiga. El color sale del catálogo (`catalogo` nulo si no se leyó: no se
  elige y `contextoDelEditor()` cuenta los colores que el diseño ya nombra); un rechazo de forma del aspecto va bajo su select (`campoDelRechazo()`) y uno de la base,
  en su pieza (`lugarDelRechazo()`). «Guardar el borrador» (`formula_guardar_borrador`, con la esperada de la publicada o la hora del borrador) manda la
  `definicion` editada y los `params`; salir con cambios pregunta (`BarraDeCambiosSinGuardar`) y el borrador de la pestaña va por
  `hoja-editor:<origen>:<versión>:<actualizadoEn>` (`useGuardadoDelDiseno()`). La `key` del editor no lleva la versión (guardar no lo remonta); la remontan «Recargar» y una versión que cambió
  por otra cosa (`pideOtroEditor()`: «Publicar…» de la barra). dnd-kit sólo viaja en el `diferido()` de la pestaña. El área `diseno` replica la lectura y escritura
  de `formula` porque un área no importa otra.
- **Los colores** (Configuración › Orígenes › «Para todos los orígenes» › Colores, `cotizaciones.configurar`; también se crean al vuelo desde el panel de una banda de la
  planilla, «El color nuevo de la planilla» en «Los huecos»; `?panel=colores` abre la lista y `nuevo-tono|editar-tono|eliminar-tono&tono=<id>`
  son ventanas hermanas que vuelven a ella con `usePanelPorUrl(…, { volverA })` y `useFamiliaDeColores()`; URL con el nombre técnico). `SeccionDeLosColores` (la lectura, `pantallas/diseno-colores.ts`) dibuja
  `TarjetaDeColores`: hasta `COLORES_EN_LA_TARJETA` por nombre y «y N más» (`resumirColores()`); tocarla o su «⋯» abre `ColoresDelCatalogoDiferido` (el modal de la lista; la fila, `FilaDeColor`, es
  tocable con `ToqueDeLaTarjeta` y lleva sólo su «⋯»). Las actions revalidan `RUTAS.origenes` con `'layout'`. Son de la empresa, un nombre y un #hex, y se guardan al instante (`tono_crear(p_id, p_nombre, p_hex)`, `tono_guardar` con
  `{nombre?, hex?}` y `tono_eliminar` devuelven la lista entera). `entities/diseno/tonos.ts` espeja `_tono_nombre()` y `_tono_hex()` (los mismos textos);
  `entities/colores.ts` (núcleo: lo usan diseño, plantilla y tarjeta) espeja `_color_derivar()` (la hoja derivada con AA) y `_color_tinta_de_la_tarjeta()`,
  con el juego `supabase/tests/casos-de-colores.json`. El modal muestra en vivo la hoja y la tarjeta (`como-se-ve-el-color.tsx`) y avisa sin bloquear si el
  texto de la tarjeta no se lee. Un color en uso: 23503 con la fórmula que lo usa. Componentes y hooks se llaman «color»; tabla, RPC, actions, schemas e
  infra conservan «tono».
- **La hoja del lienzo** (el editor de la hoja y su sólo lectura): `hojaDeLaVistaPrevia()` espeja `_cotizacion_hoja()` (con el aspecto y los colores de las
  secciones que dibuja y de la cabecera, y la pieza del total) **sin niveles, tablas ni `dato_del_vehiculo`**; usa la misma rejilla que la hoja (`CONTENEDOR_DE_SECCIONES`,
  `REJILLA_DE_SECCIONES`, `enLaRejilla`); `cifrasDelDiseno()` evalúa con datos en 0 y nunca lanza. Dibuja con las piezas del núcleo y **no con `LugaresDeLaHoja`** (lee
  `?ayuda=` y `?panel=`, que chocarían con la pestaña); lo que dibuja va `inert`.
- Depende de `leads`, `vehiculos`, `empresa` (tipos de cambio; los ajustes, en `armarLaImagen()`) y `equipo` (`<VistasGuardadas>`); los orígenes entran por props desde `src/app`.

## Áreas

El módulo se parte por **área**: `listado`, `tarjeta`, `plantilla`, `formula`, `formulas-del-origen`, `diseno`, `tablas`, `papelera`, `final`, `comprobantes`,
`comentarios`.
Lo demás es el **núcleo** (la hoja, guardar, encima, revisiones, historial, la fila de tarjetas de las fichas (`features/fichas/`), niveles, el motor, el compilador, los validadores, el diseño, la apertura, la
ruta): lo que comparten. La lista y las carpetas del núcleo están en `scripts/guardas/areas-de-cotizaciones.ts`.

- **Dónde va:** `features/<área>/`, `entities/<área>/`, `infra/<área>/` y sus entradas `areas/<área>/{index,client,composicion}.ts` (la composición empieza
  con `import 'server-only'`). Su pantalla es `pantallas/<área>.ts`; otra, `pantallas/<área>-<pantalla>.ts` (una pantalla paga lo que reexporta su archivo).
  Una carpeta nueva se suma a un área o al núcleo en la guarda.
- **Las entradas de la raíz** (`index.ts`, `client.ts`, `composicion.ts`) sólo llevan `export * from './areas/<x>/<mismo nombre>'` por el núcleo y cada
  área; un nombre repetido entre dos áreas es un error de `tsc`. T13 de `scripts/mapa.test.ts` pide al menos 87 nombres en la API del mapa.
- **La dirección:** un área importa lo suyo y el núcleo, **nunca otra área**; el núcleo no importa ningún área; adentro nadie importa las entradas de la
  raíz (los casos de uso del núcleo importan `areas/nucleo/composicion.ts`). Cuentan `import type`, `import()` y los tests. Lo que dos áreas necesitan va
  al núcleo. Lo vigila `scripts/guardas/areas-de-cotizaciones.test.ts` (también que cada área tenga sus lugares).
- **La composición del navegador** del núcleo (`composicion.client.ts`, `-historial.client.ts`, `-revisiones.client.ts`) queda en la raíz (la nombran los
  `vi.mock`). La de un área va en `areas/<área>/composicion.client.ts`, la importa sólo su feature y ningún barril la reexporta: lo que suma un
  `areas/<área>/client.ts` lo paga toda pantalla que importa `@/modules/cotizaciones/client`.

## Los huecos

Lo que un área llena en una pantalla del núcleo es un **hueco** (tipos sin código en `features/hoja/components/huecos.ts`); la página de `src/app` los une
por `pantallas/<área>-<pantalla>.ts`. Un hueco vacío es un objeto sin componentes: no se dibuja nada.

- **La hoja** (`HuecosDeLaHoja`, `pantallas/formula-hoja.ts`): `EnlaceSinPublicar` (el enlace de «Falta publicar la fórmula») y `Proveedor`, que enciende
  el ⚙ por `ContextoDelAjuste` (`{ Ajuste, AjusteDeLaCabecera }`: el de cada celda y el de la cabecera): sin él ninguna celda lo dibuja ni se llama ningún hook del
  ajuste. Los campos «Por defecto» de la cabecera son del núcleo (`features/hoja/components/por-defecto/`): los usan el ⚙ de la cabecera y el editor del diseño. La base dice qué celda lo lleva (`ajustes`);
  `<LugarDelAjuste>` se monta con las secciones principales y también **dentro del modal «Avanzado»**, como la ayuda.
- **La guardada** (`HuecosDeLaGuardada`): `Acciones` (las líneas que el área suma al «⋯» de la cabecera con `useAporteAlMenu()` y sus diálogos, nada a la vista;
  el orden lo da `accionesDeCotizacion()`), `Insignias` (cabecera, tras la clase y la vigencia), `BajoLaCabecera`
  (entre la cabecera y la hoja: la línea de «De este vehículo») y `Debajo` (bajo la hoja, fuera del proveedor del ⚙). Los llenan
  `pantallas/{final,aprobada,comprobantes,comentarios,papelera}-cotizacion.ts` (cada uno con un vacío en `features/<área>/components/huecos-en-la-guardada.ts`)
  y `src/app/(app)/cotizaciones/[id]/huecos-de-la-guardada.tsx` los dibuja en el orden de las insignias y de lo de debajo («Aprobada» antes de «Reportada»;
  «De este vehículo» antes de «Comprobantes»). Cada componente recibe `{ cotizacion, puedeGuardar, permisos, vehiculo }` (`vehiculo`, el que la página leyó
  si quien mira lo ve, o nulo). Fichas: `areas/<área>/CLAUDE.md`.
- **El resumen del listado** (`HuecosDelResumen`): `Imagen` (primero tras la barra, arriba de los datos: `pantallas/tarjeta-resumen.ts`), `Pestanas`, `Comprobantes` y
  `DeEsteVehiculo` (entre los datos y las pestañas, sólo con un vehículo que quien mira ve; `aprobarEn` lo manda la página y `alCambiar` refresca el
  listado; `pantallas/aprobada-resumen.ts`). Cerrar el resumen borra también `?visor=&foto=` (el visor de la imagen).
- **La ficha del vehículo** (`/vehiculos/[id]`, columna izquierda, la compone `src/app`): el «Costo estimado» de la aprobada (lo dibuja `vehiculos`, como en la lista) con
  `leerAprobadasDeVehiculos([id])` (`index.ts`); lo que lo abre y el diálogo, `useAbrirCompartirDeLaFila` y `DialogoDeCompartirDeLaFila` de `pantallas/tarjeta-compartir.ts`.
  A la derecha, «Cotizaciones de este vehículo»: `TarjetasDelVehiculo` de `pantallas/aprobada-fichas.ts` (la isla del área `aprobada`, abajo, al acercarse, sin título propio: lo dibuja el
  servidor con «Cotizar» y una ranura `ID_DE_LA_RANURA_DE_COMPARAR` donde la isla pone «Comparar» con un portal); `src/app` le pasa la fila de tarjetas del listado (`Tarjetas`, de
  `pantallas/listado-fichas.ts`) con la imagen (`pantallas/tarjeta-imagen.ts`) y `compartir` (`useAbrirCompartirDeLaFila()`, nulo en Modo Live) ya unidos, `aprobarEn` y `alCambiar`, que refresca la página.
- **La fila de tarjetas** (glosario: «Fila de tarjetas»): las últimas `TARJETAS_EN_LA_FICHA` (10) cotizaciones que quien mira ve, cada una `TarjetaEnLaLista` (la de la vista Tarjetas del listado, con
  `sinCliente`, `casilla` y `aprobar`; `FilaParaLaTarjeta` = `DatosDeLaTarjeta`, del núcleo) dentro de `FilaDeTarjetas` (snap, flechas ‹ ›, `useDesborde`, la última «Ver más» a `rutaDelListado({ lead | vehiculo })`);
  el clic abre el resumen sobre la ficha (`useResumenDeCotizacion({ delServidor: true })`: `?cotizacion=` pide la página, el servidor dibuja el resumen) y deja marcada la abierta. **Una sola lectura**, sin cursor.
  Se parte por área, porque un área no importa otra: el **núcleo** (`features/fichas/components/`) lleva `FilaDeTarjetas`, `EsqueletoDeLasTarjetas`, `SinCotizaciones` y `PropsDeLasTarjetasDeLaFicha` (lo que la fila
  pide a quien lee), y `entities/tarjetas-de-la-ficha.ts` (`DatosDeLaTarjeta`, `tarjetasALaVista()`: corta a 10, sin repetir, y dice si hay más); el **listado**
  (`features/listado/components/fichas/`) dibuja `TarjetasDeLaFicha` (estados + tarjetas, `TarjetasDeLaFichaDiferida` para el hueco del vehículo) y `TarjetasDelLead` (al acercarse; `useTarjetasDelLead()` y
  `leerTarjetasDelLead()` de `infra/listado/tarjetas-del-lead.client.ts`: `cotizaciones_listado(p_lead)`, 10 + 1 por `cotizaciones_lead_creado_idx`, y en paralelo autores, modos y aprobadas de esas 10; monta
  `DialogoDeCompartirDeLaFila` por `dialogos` sólo con el resumen cerrado); `aprobada` (`features/aprobada/components/fichas/`) lleva la isla del vehículo (`cotizaciones_de_este_vehiculo()` con la aprobada fijada
  primero, `useDeEsteVehiculo`, `tarjetaDeEsteVehiculo()`, la casilla, «Aprobar esta» —una privada abre su pregunta con `desde=ficha`— y «Comparar»). Las dos lecturas traen `privada`: la tarjeta lleva la insignia. Sin «⋯» en la tarjeta: el resumen lo trae.
- **El listado** (`HuecosDelListado`): `Junto`, en el grupo «Más» de «Vista y opciones» (el vacío ofrece sólo «Nueva»), y `hayJunto(permisos)`: la página pasa
  `Junto` sólo si quien mira lo vería (si no, «Más» quedaría vacío); lo llena `pantallas/papelera-listado.ts`.
- **La lista** (`HuecosDeLaLista`, `features/listado/components/tipos.ts`): `Imagen` (la imagen de cada tarjeta, en frío: `pantallas/tarjeta-imagen.ts`) y
  `Comparar` (las casillas y «Comparar» del modal de un grupo, `CompararDelGrupoDiferido` de `pantallas/aprobada-listado.ts`); los une `listado-con-acciones.tsx`.
- **La edición de una tabla desde la ayuda:** `ContextoDeLaEdicionDeLaTabla` (un componente con `PropsDeLaEdicionDeLaTabla`: la tabla viva, el rótulo de la celda, lo
  que la ayuda dibuja, el enlace a la configuración y `alPublicada`, que dice si la hoja vuelve con otra versión o se relee la tabla); lo llena
  `ProveedorDeLaEdicionDeLaTabla` (`pantallas/tablas-hoja.ts`). Detalle arriba, en «Editar una tabla desde la ayuda».
- **La vista previa de la tarjeta:** `ContextoDeLaVistaPrevia` (`features/hoja/components/hueco-de-la-vista-previa.tsx`) lleva `dibujar(props)`
  y `compartir()` (lo que la cabecera de una guardada dibuja a la vista: «Compartir»); la llena
  `<ProveedorDeLaTarjeta>` (`pantallas/tarjeta.ts`) con la cáscara del modal y lo que sabe la página (vehículo, asesor, número, logo). El modal lee
  `cotizacion_tarjeta(p_formula)` al abrirse (5 min por versión) y dibuja `geometriaDeLaTarjeta()` (pura) con `<TarjetaDeCotizacion>`: un lienzo del ancho de
  la tarjeta con cada celda en posición absoluta (`<CeldaDeLaTarjeta>`, en orden de lectura, con `data-celda`, `data-fila`, `data-columna`, `data-nodo`,
  `data-mostrar`, `data-variable`, `data-color` y `data-total-usd`), escalado como una imagen (`useEscalaDeLaTarjeta()`, nunca agranda); la página manda título,
  cliente, vehículo con lote y VIN, asesor, número, vencimiento, nombre de la empresa y logo (`PaginaDeLaTarjeta`). **El asesor** (`AsesorDeLaTarjeta`: nombre,
  teléfono, cargo y foto) es **quien mira o comparte**, nunca quien la creó (el autor): lo lee `leerAsesorQueMira()` (`perfiles` por PK con `cache()`; con «Ver
  como», la persona real) y `src/app` lo arma con `asesorQueMira()` de `datos-de-la-tarjeta.ts` (la foto, URL pública de `avatares`) para la página de una
  guardada, la hoja nueva (en paralelo con sus lecturas), el PDF (también el de la hermana), «Compartir» y la referencia del editor. La celda «Foto del
  asesor» es `<FotoDelAsesorDeLaCelda>` (como el logo; sin URL o si no carga, `circuloDeLasIniciales()`; con `''`, las cifras de ejemplo, la muestra punteada
  «Foto»). La celda logo es `<LogoDeLaCelda>`: sólo
  el logo (`next/image`, `data-logo-de-la-celda`), `contain` en la caja interior de la celda y alineado como ella; sin URL (las cifras de ejemplo), la muestra
  punteada «Logo»; si no carga, la celda queda vacía y llama a `alFallarElLogo` (el editor de la tarjeta lo avisa, con «Abrir Empresa» si quien mira tiene
  `empresa.ajustes.gestionar`, que baja de la página). «Vencida» va en los avisos del modal, no en la tarjeta. El pie:
  Live y «Copiar texto» (`textoDeLaTarjeta()`, de la misma geometría, apagado sin tarjeta, con «Total desactualizado.» o sin total) y, en una guardada,
  «Descargar PDF» (`pedirElPdf()`: `fetch` sin seguir la redirección ni caché; un 404, la sesión que no vale u otro fallo se dicen en el pie con «Reintentar»).
  **Los retoques** (`docs/COTIZADOR.md` › «Retoques de la tarjeta»): la página de una guardada pasa `DatosDeLaPagina.retoque` (`{ retoques, actualizadoEn,
puedeRetocar }`, de `HojaDeUnaGuardada`; la hoja nueva no lo pasa) y el modelo los aplica (`lecturaRetocada()`). «Retocar» va en el pie con
  `puedeRetocar` (apagado con su motivo: la tarjeta por omisión o la hoja con cambios) y pasa el mismo modal al modo «Retocar la tarjeta»: el estado
  (`useEstadoDelModo()`, `useModoRetocar()`) vive en la vista previa y su interfaz llega en un chunk propio (`components/retoques/diferidos.tsx`: tarjeta
  retocable con un botón por celda y el canal de filas, el campo, la fila elegida, el pie y la pregunta de «Volver a la plantilla»). «Listo» llama a la
  action `retocarLaTarjeta` (revalida la página: la hoja se vuelve a montar con la versión nueva). El modal es `propio` en
  `scripts/guardas/modales-con-salida.ts` (pregunta al salir con cambios).
- **La tarjeta en vivo de la planilla de la fórmula** (los tipos sin código de `entities/tarjeta-en-vivo.ts`): el área `plantilla` lee la tarjeta de trabajo del
  origen con `leerLaTarjetaDeTrabajo({ id, nombre })` (`index.ts`; la lectura de la pestaña «Tarjeta», nunca rechaza: `lista`, `sin_tarjeta` o `no_se_leyo`) y
  `lecturaDeLaTarjetaDeTrabajo()` (pura: el borrador antes que la publicada, leída con la fórmula publicada y sólo con lo del nivel «todos»). El área `tarjeta` la
  dibuja con `TarjetaEnVivo` (`pantallas/tarjeta-formula.ts`, con su propio `diferidos.tsx`: el del área viaja con la hoja): `geometriaDeLaTarjeta()` con
  `CONTEXTO_DE_EJEMPLO`, `role="group"` «Tarjeta de la cotización» y `data-tarjeta-de-cotizacion`, achicada a su panel (`?costado=tarjeta`). El área `formula` arma el cálculo con la
  unidad de ejemplo (`calculoDeLaUnidad()`: sólo los ids que la lectura nombra; sin cifra, las filas a la vista sin valores) y `src/app` une las tres.
- **El color nuevo de la planilla** (los tipos sin código de `entities/nuevo-color.ts`: `ColorCreado`, `PropsDelNuevoColor`): «+ Nuevo color» bajo el selector de
  color del panel de una banda (`comunes/nuevo-color-del-grupo.tsx`, `?color=nuevo`, una clave propia porque `?panel=` es el de la banda). El área `diseno` lo
  dibuja con `NuevoColorAlVuelo` (`pantallas/diseno-nuevo-color.ts`, con su `diferidos.tsx`): el `ModalDeColor` de la sección de colores con `ColoresParaCrear`
  (los colores leídos, el tope, `crear` y `enCurso`), y el color creado sale de la lista que devuelve `tono_crear()` por el id del intento (`colorCreadoDe()`).
  La planilla lo suma sin releer (`useTonos().sumar`) y lo deja elegido. Las dos páginas lo pasan sólo con `cotizaciones.configurar` (sin origen, como la action).

## Archivos clave

- Motor y grafo (`docs/COTIZADOR.md`: léelo antes de tocar el motor): `entities/nodos.ts` (Zod por `tipo`), `nodos-referencias.ts` (`referenciasDe()`), `formula.ts`, `motor.ts` y
  `motor-*.ts` (`evaluar()`, una pasada; redondea con `redondear()` de `@/shared/lib/redondeo`, `round(numeric)` de Postgres), `compilador*.ts` (texto a nodos, puro, nunca lanza),
  `casos-del-motor.json`.
- Validación: `entities/validar*.ts` espeja `validar_formula()` (`docs/COTIZADOR.md` › «Las reglas») y `validar-diseno*.ts` a `validar_diseno()` (con el
  tope de 40 ítems, `demasiados_items`, primero tras la forma); juegos `casos-de-{formula,diseno}.json` (regla nueva = su caso).
- La planilla de la fórmula (área `formula`; `docs/COTIZADOR.md` › «La planilla»), pura y con su test: `entities/formula/hoja-de-la-planilla.ts` (la hoja
  numerada, la `pct` que absorbe la B y los tramos de banda), `referencias-a1.ts` y `de-a1.ts` (ids ↔ A1, con el mapa de los tramos de error),
  `referencias-tipeadas.ts` (colores, leyenda y bordes de lo tipeado), `autocompletar.ts` y `ayuda-de-funciones.ts`, `insertar-funcion.ts` (`fx ▾`),
  `contenido-de-c.ts` (qué muestran C y Ejemplo), `texto-de-la-celda.ts` y `escrito-en-la-celda.ts` (qué abre y qué hace lo escrito en cada columna), `teclas-de-la-cuadricula.ts`, `filas-a-la-vista.ts` (buscar y el tope sin
  renumerar), las operaciones de fila (`insertar-fila.ts`, `mover-fila.ts` y `eliminar-fila.ts` sobre `usos-de-la-fila.ts`), `tipo-de-celda.ts` y
  `tipo-de-celda-nodos.ts`, `opciones-de-la-variante.ts`, las bandas (`bandas.ts`, `buckets.ts`, `total-de-la-formula.ts`, `sumas-de-banda.ts`),
  `mensaje-en-a1.ts` y `params-para-validar.ts`; en el núcleo, `entities/nodos-del-diseno.ts` (lo que la hoja muestra: la planilla no lo borra).
- La plantilla: `validar_plantilla()` (`docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»), espejo `entities/plantilla/validar-plantilla.ts` (code points,
  `btrim`, orden C, tope en bytes del texto jsonb, sin prototipo) con su juego `casos-de-plantilla.json`; dos formas: la de grupos (`forma-de-plantilla.ts`,
  `nodos-de-plantilla.ts`) y la cuadrícula (`forma-de-cuadricula.ts`, `celdas-de-cuadricula.ts`, `condiciones-de-cuadricula.ts` —la forma de la lista de
  respaldo y de las condiciones—, `texto-con-datos-de-cuadricula.ts` —la de las partes de un texto con datos—, `reglas-de-la-grilla.ts`, `nodos-de-cuadricula.ts`; todo dato que nombra, aplanado, en `datos-de-la-cuadricula.ts`
  (`datosNombrados()`, espejo `_plantilla_cuadricula_datos()`); tipos y topes en el núcleo, `entities/cuadricula-de-la-tarjeta.ts`; lo que leen del texto con datos la plantilla y la tarjeta, `entities/texto-con-datos.ts`). Lo que se dibuja de una
  lista o unas condiciones lo resuelve `entities/tarjeta/condiciones-de-la-celda.ts` (`resolverElContenido()`, sobre `valor-del-dato.ts`) antes de la geometría. La conversión de la forma 1 (`convertir-plantilla.ts`, `armado-de-la-conversion.ts`,
  `grupos-de-la-conversion.ts`, `ids-de-la-conversion.ts`, `altos-de-la-conversion.ts`), espejo `_plantilla_convertir()`, con su juego `casos-de-conversion.json`
  (lo genera `casos-de-conversion.test.ts` con `ACTUALIZAR_CASOS=1`; Prettier no lo toca). **Lo que va a un `jsonb` o `text` pasa por
  `revisarTextoParaLaBase()`** (un `\u0000`, un surrogate suelto o más de 8 niveles no los lee la base). Los dos ayudantes de un validador espejo están en el
  núcleo (los usan `plantilla` y `tarjeta`): `entities/json-de-la-base.ts` (`jsonb_typeof`, bytes del texto jsonb, code points, `btrim`, orden C) y
  `entities/texto-de-la-base.ts` (`revisarTextoParaLaBase(valor, { raiz })`).
- El editor de la tarjeta (área `plantilla`): sus operaciones puras en `entities/plantilla/edicion/` (mapa de la grilla, selección, contenido, el texto con datos (`texto-con-datos.ts`: las partes en unidades, insertar y quitar una pastilla), estilo,
  combinar, insertar, eliminar, portapapeles, topes medidos, ids, historial, atajos, disposición de la capa y el reductor que las une, cada una con su test).
  Las condiciones: `condiciones.ts` (la condición a medio armar, sus motivos y topes), `borradores-de-la-celda.ts` (la lista y las ramas en borrador, y
  completarlas), `frases-de-las-condiciones.ts` («Remate es mayor que 1.000»); el borrador del panel, `features/plantilla/hooks/use-borrador-de-la-regla.ts`.
- Los retoques de la tarjeta: `validar_retoques()` y su espejo `entities/tarjeta/retoques/validar-retoques.ts` con el juego `casos-de-retoques.json`
  (lo corren Vitest y `supabase/tests/areas/tarjeta/retoques.sql`); `aplicar-retoques.ts` (la cuadrícula retocada, las combinaciones reparadas y los que no
  aplican), `para-guardar.ts` (lo que se manda: sólo lo que aplica y cambió), `borrador-de-retoques.ts` (el reductor del modo), `modo-de-la-tarjeta.ts`
  (las filas con su banda, dónde va el campo, los motivos) y `fallo-del-modo.ts`; `infra/tarjeta/rpc-de-los-retoques.ts`.
- Base: `evaluar_formula()` (espejo exacto de `motor.ts`), `cotizacion_evaluar()`, `cotizacion_hoja()`, `cotizacion_crear()`, `cotizacion_guardar()`,
  `_nodos_visibles()`, `_publicar_formula()` / `_preparar_publicacion()`; semillas `supabase/semillas/cotizador-*.sql`. Detalle: `docs/COTIZADOR.md` ›
  «El diseño de la hoja», «Niveles de acceso», «Quién escribe una cotización y cómo», «Cómo se guarda», «La lectura que abre la hoja», «La hoja abierta».
- Hoja en el cliente: `entities/{hoja,recalculo,entradas,binding,guardado,claves-de-la-hoja,borrador-de-hoja,…}.ts`, `infra/queries/`. **La rejilla y el
  aspecto:** `entities/rejilla-de-la-hoja.ts` (la regla de los 16 rem, `corteDe()`), `entities/aspecto-de-la-hoja.ts` (copia sólo las claves que vinieron) y
  `features/hoja/components/clases-de-la-rejilla.ts` (tablas de clases escritas enteras; sin aspecto, la clase de siempre). `<SeccionDeHoja enLaRejilla>` pone
  sus columnas sólo en la rejilla de las secciones (en el modal «Avanzado», un `grid` sin pistas, no); el color de una sección va en `data-tono`. `features/hoja/`
  marca para los e2e `data-nodo`, `data-atajos`, `data-seccion`, `data-avanzado`, `data-cabecera`, `data-secciones`, `data-modo`, `data-total-bs`,
  `data-pie-de-panel`.
- El par con `secundario.como === 'monto'` manda `secondaryProminent` a la XCell (`propsDeCelda()`): el % primero y grande, el monto chico detrás.
  `entities/binding-resumen.ts` lleva lo que la hoja muestra fuera de la XCell (el número de un valor, el subtotal, la tarjeta del total y su Bs).
- **Decimales de una celda** (`docs/COTIZADOR.md` › «Los nodos»; glosario: «Decimales (de una celda)»): `decimales` del nodo, 0 a 4, sólo la vista.
  `entities/decimales-de-celda.ts` (`decimalesDe()`, `aceptaDecimales()`, `ejemploDeDecimales()`, `datosQueNoSonNumero()`) es la única regla: la hoja la
  lee de `cotizacion_hoja()` (`hoja-esquema.ts`: la celda, su secundario, el subtotal, el total y la tarjeta del total) y la pasa a la XCell (`decimals`,
  `secondaryDecimals`, `calculatedDecimals`); la tarjeta, de `cotizacion_tarjeta()` (`decimales`, `decimales_del_pct`) a `valor-del-dato.ts` (el texto del
  PDF, la imagen y el texto con datos) y `<MontoConDecimales>`; comparar y las revisiones, de la hoja de la versión. La planilla la elige con
  `cambiarDecimales()` (`entities/formula/decimales-de-la-fila.ts`), «⋯» › «Decimales…» y `paneles/panel-de-decimales.tsx` (`?panel=decimales&fila=`); los
  campos del origen con su tipo los lee `infra/formula/campos-del-origen.client.ts` (`leerCamposDelOrigen()`, por `useCamposDeLaFormula()`).
- **Lo pisado** (`docs/COTIZADOR.md` › «Pisar un cálculo»; glosario: «Editado a mano»): `entities/binding-pisado.ts` (`ladoPisado()` y `propsDelPisado()`: la
  marca, «Calculado» y ↺ «Volver al calculado» de la XCell, con `formatoDeCelda()` de `formato-de-celda.ts`; `esPisadoNuevo()`, si lo escrito abre el aviso) y
  `entities/pisadas-de-la-hoja.ts` (`pisadasDeLaHoja()`, la lista bajo la tarjeta del total). Lo calculado llega en `calculados` de la respuesta (`calculadoDe()`, recortado por
  el nivel; nunca se guarda) y el porcentaje de un par con el monto escrito, de la respuesta (`secundario.sigueAlMonto`). El aviso de la primera pisada
  (`useAvisoDePisado()` en `useHoja`; `features/hoja/components/pisadas/`: `RegionDelAvisoDePisado` en frío sobre las secciones, el aviso y la lista bajo la tarjeta del total por
  `diferido()`) no vuelve hasta remontar la hoja. Las revisiones nombran el cálculo con `etiquetas.calculos` de `cotizacion_revisiones()` (`cambiosDeLaRevision()`).
- El modo de tipo de cambio es parte de `Entradas`; «Ver total Bs» no (no cambia el cálculo), pero vuelve con el borrador.

## Tablas

`formulas_del_origen` (las fórmulas del origen: nombre, `activa`, `archivada_en`; agrupan las versiones de `formulas` y la plantilla de `plantillas_tarjeta` por
`formula_del_origen_id`), `formulas`, `tonos`, `cotizaciones_niveles`, `tablas_referencia`, `tablas_referencia_filas`, `plantillas_tarjeta`, `cotizaciones`, `cotizaciones_revisiones`,
`cotizaciones_comentarios`, `cotizaciones_adjuntos`, `cotizaciones_reportes`, `cotizaciones_favoritos`, `cotizaciones_aprobadas`, `comprobantes`,
`comprobantes_contadores`, `comprobantes_ajustes`. `cotizaciones.hermana_id` (la cotización hermana, con su FK diferida, `on delete set null`, única y con `grant select` de columna) la escriben sólo las RPC en par. `cotizaciones.tarjeta_retoques` (jsonb nulo, con `grant select` de columna: viaja en `cotizacion` por
`_cotizacion_respuesta()`) guarda los retoques de la tarjeta de cada cotización.

RPC: `formula_del_origen_crear` (en blanco, copia de una del mismo origen o de otro), `formula_del_origen_renombrar|archivar|eliminar|activar` (con la versión;
`activar` publica con su nota los borradores de la fórmula y de la tarjeta, y valida la tarjeta contra la versión que se va a cotizar), `formula_guardar_borrador`, `formula_publicar`, `formula_descartar_borrador`, `formula_cambiar_constante`, `formula_cambiar_cabecera` (el ⚙ de la
cabecera: modo por defecto, «Ver total» por defecto y modos visibles) y `formula_revertir` (publican la N+1 desde la publicada sin pisar el borrador; las de la fórmula y las de `plantilla_*` reciben `p_formula_del_origen`, nulo = la de
trabajo; el ⚙ escribe en la activa), `tabla_referencia_publicar` (reemplaza las filas, sube la versión y publica la N+1 de cada fórmula que la usa),
`tabla_referencia_crear` (con el id del intento), `tabla_referencia_columnas` (sube la versión sin N+1 y borra de las filas la clave quitada) y
`tabla_referencia_desactivar`,
`tono_crear|guardar|eliminar` (los colores), `nivel_crear|renombrar|retirar|restaurar|eliminar`, `niveles_con_uso`, `validar_formula`, `validar_diseno`,
`validar_plantilla`, `evaluar_formula`, `cotizacion_evaluar`, `cotizacion_hoja`, `cotizacion_tabla`, `cotizacion_tarjeta`, `cotizacion_crear`,
`cotizacion_guardar` (`p_titulo_manual` al final), `cotizacion_crear_en_par`, `cotizacion_guardar_en_par` y `cotizacion_encima_en_par` (las cotizaciones hermanas, sobre las de siempre con
`importadora.en_par`), `cotizacion_retocar_tarjeta` (los retoques de la tarjeta, con la versión; valida con `validar_retoques`
contra la plantilla publicada de hoy), `cotizaciones_listado`, `cotizaciones_listado_por_vehiculo` (la lista agrupada, invocadora, con su lote
`_cotizaciones_lote_del_listado`), `cotizaciones_modos_de` (el nombre del modo de hasta 100), `cotizaciones_buscar` (la búsqueda del listado, invocadora; el título por
`_cotizaciones_ids_por_titulo`), `plantilla_guardar_borrador|publicar|descartar_borrador` (versión esperada y candado por origen; esperada
nula al guardar = crear), `cotizacion_marcar_final`, `cotizacion_aprobar` (con la versión de la que se aprueba), `cotizaciones_de_este_vehiculo` (el bloque «De este vehículo», invocadora), `cotizaciones_aprobadas_de_vehiculos` (el «Costo estimado» de `/vehiculos`, invocadora), `cotizacion_moderar` (con la versión),
`cotizacion_comentarios|comentario_respuestas|comentar|comentario_editar|comentario_borrar`, `cotizacion_adjuntar|adjunto_quitar`,
`cotizacion_reportar|reporte_retirar`, `cotizacion_favorito_poner`, `cotizacion_imagen_huella` (la huella de la imagen de la tarjeta para quien
la pide: la base de su ETag), `comprobante_emitir|anular`, `comprobantes_serie_cambiar`, `margen_vehiculo`.

## No se rompe

- Una cotización se recalcula **siempre** con su `formula_id`, nunca con la vigente. El snapshot (`valores`, `fuentes`, `tipos_cambio`, `totales`) es la
  autoridad.
- Versionado append-only: un borrador y una publicada por fórmula del origen, y a lo sumo una activa por origen (`formulas_del_origen_activa_unica`): se
  cotiza con la publicada de la activa (`_publicada_de_la_activa()`); revertir = publicar una copia. El ⚙ de una constante publica N+1; el de un tipo de
  cambio lo cambia para la empresa (`tipo_cambio_guardar`).
- **El listado** (`cotizaciones_listado()`) corre como quien mira y cada ruta va por su índice: la clase nunca es columna de un índice (`enum_eq` no es
  leakproof; la final va por parciales con `'final'` literal) y `lead_id` y `origen_id` tienen un solo índice entero al frente
  (`cotizaciones_lead_creado_idx`, `cotizaciones_origen_creado_idx`; L8 de `cotizaciones-listado.sql`). Con `p_lead` es una sola ruta por
  `cotizaciones_lead_creado_idx`, sin la cartera, y el vehículo es un filtro sobre esas filas (L9). Lo que devuelve es la regla (L2 de
  `cotizaciones-visibilidad.sql`). **La lista agrupada** (`cotizaciones_listado_por_vehiculo()`) recorre lotes de `_cotizaciones_lote_del_listado()`, **espejo de
  `cotizaciones_listado()`** sin la ruta del vehículo: si cambia una ruta del listado, cambia la del lote (L7 de `areas/cotizaciones/listado-por-vehiculo.sql`); sus
  lecturas derivadas van en laterales con `limit` (sin ellos el plan genérico recorre la tabla) y no lee `vehiculos`. La sonda, la cabeza y el conteo leen
  `cotizaciones` bajo la RLS sin las rutas del lote: dan lo mismo porque las rutas del listado son la policy «cotizaciones: leer» por índice; si cambia la policy,
  cambian las rutas del listado y del lote. **La búsqueda** (`cotizaciones_buscar()`, `supabase/tests/areas/cotizaciones/buscar.sql`, `medir-cotizaciones-buscar.sql`) es
  invocadora: nombra hasta `v_tope` (50) ids por fuente —clientes por `leads_candidatos()` y `leads_vista_por_ids()`, vehículos por origen, autores por
  `perfiles`, títulos por `_cotizaciones_ids_por_titulo()` (definer, `cotizaciones_titulo_trgm`, sólo lo que quien busca ve)— y de cada uno lee una página por `cotizaciones_lead_creado_idx`, `cotizaciones_vehiculo_creado_idx` o `cotizaciones_creador_idx` (el número, por
  `cotizaciones_numero_key`; el título, por la PK); lo que quien busca no ve no se nombra. La cotización de otra persona sólo se busca por autor donde se ve «todos».
- **Las cotizaciones hermanas** se apuntan entre sí y comparten lead, vehículo, origen y versión (`trg_cotizaciones_hermanas`, diferido); nadie escribe
  `hermana_id` directo; la versión y las revisiones no lo miran. Una hoja nueva de una versión en par sólo se guarda en par (`cotizar_en_par`; cotizar encima de una hermana sin la otra
  disponible usa el `cotizacion_encima` de siempre) y la opción nunca la manda la persona (`variante_en_par`). Una hermana abierta sola dibuja sus celdas `enPar`
  como las de siempre (sin `ContextoDelPar`).
- Crear con un vehículo, o guardar una que pasa a otro, mueve `vehiculos.cotizado_en` (trigger `trg_vehiculo_cotizado`, «sólo si es mayor»): cotizar toma
  la fila del vehículo `for no key update` hasta confirmar. Historial y «Cotizado (n)» van por `cotizaciones_vehiculo_creado_idx`
  (`vehiculo_id, creado_en desc, id desc`).
- A lo sumo una final activa por vehículo. `cotizacion_marcar_final` toma lead → vehículo → la cotización y las vivas del vehículo (detalle:
  `areas/final/CLAUDE.md`). Al entrar a logística la final se congela; si sale, vuelve a preventa.
- Sin motor de expresiones al cotizar: sólo las operaciones cerradas de `calculo`. La fórmula como texto se compila a nodos **al configurar**; lo que no
  compila se rechaza. Un nodo nuevo = tipo discriminado (`nodos.ts`) + caso en `referenciasDe()` (`nodos-referencias.ts`) + caso en `validar_formula()`, `_diseno_auxiliares()`,
  `_nodos_en_par()` y en el juego.
- **Toda copia de una versión lleva el diseño** (el ⚙, revertir y la N+1 de una tabla; publicar lo exige). Un color o nivel que una versión nombra no se
  elimina (`_tono_en_uso()`, `_nivel_uso()`; un nivel se retira). Colores y niveles salen de un solo punto (tabla `tonos`, `_niveles_de_cotizacion()`): nada
  escribe «costos» a mano ni razona por el nombre o la clave de un nivel. `formulas_del_origen`, `formulas` y `plantillas_tarjeta` sólo las lee quien tiene
  `cotizaciones.configurar` del origen (los demás leen la plantilla por `cotizacion_tarjeta`).
- **La hoja calcula en la base** (`cotizacion_evaluar()` sobre `evaluar_formula()`) para todos; la fórmula (`definicion`, `params`, texto) viaja sólo a
  `cotizaciones.configurar` (`motor.ts` queda para el editor y la paridad), salvo el `dato_del_vehiculo` de una celda de tabla que se ve (qué columna casa
  con qué campo, sin las entradas del `match` que nombran un nodo; `_hoja_datos_del_vehiculo()`); lo que un nivel esconde no viaja por ninguna lectura
  (`docs/COTIZADOR.md` › «Niveles de acceso»).
- **Nadie escribe `cotizaciones` ni `cotizaciones_revisiones` directo** (sin grants ni policies de escritura): una escritura nueva es una RPC
  `security definer`, nunca un grant (`cotizacion_crear`, `cotizacion_guardar`, `cotizacion_encima`, `cotizacion_retocar_tarjeta`…). `authenticated` no lee `valores|fuentes|totales|tipos_cambio` ni el `diff`; lo oculto sale por
  `cotizacion_leer|evaluar|revisiones|tabla`, recortado con `_cotizacion_recorte()` y `_nodos_visibles(formula_id)` de SU versión.
- **Inventario de lo oculto:** una función nueva que pueda devolver esas columnas, `formulas.*` o las tablas de referencia, o un guardado/lectura nuevos del
  diseño, se registra en el inventario de `supabase/tests/cotizaciones-visibilidad.sql` y entra a la matriz por nivel de `cotizacion-hoja.sql`.
- `cotizacion_guardar` es la única edición: calcula con SU fórmula y SUS tipos de cambio y conserva lo que quien guarda no ve ni edita; mismo `intento` con
  otros datos = `intento_reusado`; quién guarda lo decide sólo `_cotizacion_puede_guardar()` (ver y editar; una final, ver y
  `cotizaciones.final.gestionar`), antes y después del candado. La revisión guarda `totales` por clave (grupos enteros) y su lectura no delata un grupo.
- **La hoja abierta la firma la base** (`abierta` = fórmula.µs.huella.HMAC con la clave de Vault `cotizacion:abierta`; la huella, de las tarifas que vio): `cotizacion_crear`, `cotizacion_evaluar` y
  `cotizacion_tabla` la reciben como `p_abierta`, nunca una hora del cliente (4-27); el recálculo y la tabla de una ayuda usan la versión (y el recálculo,
  las tarifas) de la hoja dibujada (4-28). La pantalla la trata como opaca. Un cálculo o alta nuevo recibe `p_abierta`; una prueba SQL la firma por persona.
- En el cliente: entradas inmutables; lo que se busca por id usa `Map`; los textos del candado, estado y faltante son **propios, nunca el mensaje de la
  base**, salvo: el PT409 de `cotizacion_guardar` (`version_cambiada`: una persona y cuándo), los de `formula_publicar()`, `formula_cambiar_constante()`,
  `formula_revertir()` y `tabla_referencia_publicar()` (una persona, una versión y cuándo), los de `plantilla_*` (cuándo, sin nombre) y los de
  `comprobante_emitir|anular` y `comprobantes_serie_cambiar` (escritos para la persona). El porcentaje de un par va a `inputs` u `overrides` según
  `secundario.tipoDeNodo` (4-31); todo error con SQLSTATE suelta el pendiente; la `key` de la hoja lleva la abierta.
- La hoja calcula **por su origen o por su cotización, nunca por las dos** (`DeDondeCalcula`: la base rechaza `p_abierta` con `p_cotizacion`); una
  guardada no manda `p_origen` ni `p_abierta`; `p_vehiculo`, sólo el elegido en una preventa para cambiarlo (T315). `actualizadoEn` (y toda versión esperada) es el texto de la base con sus microsegundos:
  **nunca pasa por `Date`**.
- «Recargar» en una guardada remonta la hoja (la `key` suma una lectura pedida): sin remonte `useRecalculo` ignora el primer cálculo nuevo y lo rechazado
  se reenvía. `difiereAlAbrir` compara `valores` y `totales.usd` de lo guardado con el primer recálculo.
- **La hoja de una guardada** (`cotizacion_hoja_guardada`) edita sólo con `_cotizacion_puede_guardar()` (no con `_nodos_visibles()`, que da editar con
  `crear`). **Cotizar encima** (`cotizacion_encima`) crea la N+1 en el acto, una viva por anterior (`cotizaciones_encima_unica`), y se lleva lo oculto (se
  guarda, no se devuelve); es la excepción a «un alta nueva recibe `p_abierta`».
- **La tarjeta** (`cotizacion_tarjeta(p_formula)`) dibuja la plantilla publicada de la fórmula del origen de esa versión como cuadrícula (la de la forma 1, convertida) **validada otra vez
  contra la versión de esa cotización**: si no le sirve, `sin_plantilla` sin motivo. Sólo sale lo que la cuadrícula nombra y del nivel «todos» (nodos, grupos,
  tipos de cambio por su nombre y su nodo, variante, colores); ningún id ni texto de un nodo de un nivel, para nadie (K4 de `cotizacion-tarjeta.sql`, en las dos
  formas). **Lo que nombra incluye sus listas de respaldo, sus condiciones y las partes de un texto con datos** (`_plantilla_cuadricula_datos()`, espejo `datosNombrados()`): un lugar nuevo de
  la forma 2 que nombre un dato entra a ese aplanado, o quedaría fuera de las reglas y de K4. La geometría **resuelve cada celda antes de dibujar**
  (`resolverElContenido()`): los dibujos sólo ven un contenido simple y un cambio en cómo se resuelve sube `VERSION_DEL_DIBUJO`. La geometría toma valores, estados y totales por id de nodo (`CalculoDeLaTarjeta`), nunca de la hoja de quien mira. En una guardada dibuja **lo guardado** (`calculoDeLoGuardado()`: el
  snapshot, con los estados del primer recálculo) y lo que difiere se dice fuera.
- **El editor de la plantilla** (la pestaña «Tarjeta»: `/configuracion/origenes/<id>/tarjeta?formula=<fórmula>`) escribe **sólo la forma 2**: una forma 1 se convierte
  al abrirla (`cuadriculaParaEditar()`) y no se guarda sola. Al navegador llega sólo el contexto reducido (`contextoParaElNavegador(contexto, cuadricula)`:
  los nodos del nivel «todos» y los restringidos que la cuadrícula nombra, nunca el cuerpo de un nodo) y nada se importa del área `formula`. **Lo
  incompleto no sale del panel:** una lista o unas condiciones a medio armar viven en el borrador del panel (`useBorradorDeLaRegla()`) y al reductor llegan
  sólo enteras. Los modales de
  publicar y descartar (`?panel=publicar-tarjeta|descartar-plantilla`) **viven fuera de la `key` del editor** para que «Recargar» tras un PT409 no pierda
  la nota; esa `key` cambia sólo con una versión que no es la que el editor acaba de guardar (`useClaveDelEditor()`): guardar no lo remonta y el historial sigue. El lienzo es un hueco: los tipos sin código de `entities/vista-previa-de-la-plantilla.ts` (`PropsDelLienzoDeLaPlantilla`,
  `GeometriaParaEditar`), que llena el área `tarjeta` (`LienzoDeLaPlantillaDiferido` por `pantallas/tarjeta-plantilla.ts`: dibuja con
  `geometriaDeLaTarjeta()` y llama a `capa(g, escala)` y `debajo(g)`; «Ajustar» mide el contenedor del marco, `data-medida-del-lienzo` con `contain: inline-size`,
  y deja el margen de la capa a los dos lados); la referencia (`entities/referencia-de-la-tarjeta.ts`, plana) llega recortada a los
  ids del contexto reducido (`recortarLaReferencia()`). Las operaciones se miden con los topes (manda el de 24 KiB) y la capa no toca el dibujo compartido.
- **El PDF** dibuja la misma geometría que la tarjeta de esa guardada, en una página A4 escalada entera (`escalaDelPdf()`): lo guardado y sólo lo que la lectura nombra.
  El título de la cotización es la variable `titulo` (`PaginaDeLaTarjeta.titulo`, `tituloAparteDelNumero()`; nunca de `cotizacion_tarjeta`): en la hoja nueva, el que se
  está escribiendo (`useTituloDeLaCotizacion()`). Los montos van con `formatearMonto()` y siempre con
  cifras aunque Live esté encendido: es lo que se entrega al cliente (la excepción a `<Monto>`, `docs/DECISIONES.md`). react-pdf se carga sólo al pedir un
  PDF (`import()` en `areas/tarjeta/composicion.ts`) y nunca llega al navegador. El logo y la foto del asesor del PDF y de la imagen los bajan a la vez
  `logoParaDibujar()` y `fotoParaDibujar()` (sobre `imagenParaDibujar()`), sólo si la tarjeta los dibuja; el logo, `logoParaDibujar()`
  (`infra/tarjeta/logo-de-la-tarjeta.ts`) con tope (`PESO_MAXIMO_LOGO`) y 2 s, y llega como `Buffer` con sus medidas, nunca URL: PNG y JPEG de hasta 1.024 px y
  el SVG que react-pdf dibuja fiel, tal cual; lo demás que `sharp` lee (WebP, SVG con estilos, un raster grande), a PNG de hasta 1.024 px; un SVG que nombra
  otro archivo o lo que no se lee, sin logo. Los dos lo ubican con `cajaDelLogo()` (`entities/tarjeta/caja-del-logo.ts`). Los
  metadatos no nombran al cliente, al asesor ni al vehículo. «Copiar texto» sale de la misma geometría. **La imagen** (`imagenDeUnaGuardada()`,
  `infra/tarjeta/imagen/`, `ImageResponse` con `import()`): la misma geometría como PNG al ancho de la tarjeta, la base de la imagen de la tarjeta (`webpDeUnaGuardada()`; su ruta suma las fuentes
  de `infra/tarjeta/pdf/fuentes/` a `outputFileTracingIncludes`).
- **Las tablas de referencia se escriben sólo por RPC: crear, columnas, desactivar y publicar** (`tabla_referencia_crear|columnas|desactivar|publicar`;
  sin insert, update ni delete para `authenticated`). Todas con versión esperada entera salvo crear (intento por id). Candados: la tabla (`for update`) y
  después `formulas:<origen>` en orden de origen, como el ⚙ y revertir; crear toma el candado `tablas_referencia:crear` (el tope de 100 y la clave entre propias y compartidas). Una columna o tabla
  **en uso** (`_tabla_referencia_usos()`: una fórmula publicada o un borrador que la nombra) no se quita ni se desactiva. Pruebas:
  `supabase/tests/areas/tablas/` (`crear.sql`, `columnas.sql`, `desactivar.sql`), `scripts/carreras/tablas*.mjs` (`tablas-estructura.mjs`).
- **Comentarios, adjuntos, reportes y favoritas se escriben sólo por RPC.** Todas piden ver la cotización; adjuntar pide lo que pide guardarla, igual que
  las policies del bucket `cotizaciones` (`cotizacion_puede_adjuntar`, 4-69). Candados: la raíz antes que la respuesta (comentar la toma `for share`,
  borrar `for update`); la cotización antes que sus reportes. Borrar no deja respuestas eliminadas ni raíces eliminadas sin respuestas
  (`cotizaciones_comentarios_respuesta_viva_check`). Pruebas: `supabase/tests/areas/comentarios/`.

- **La imagen de la tarjeta no se guarda** (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): ni tabla ni objetos en el bucket; cada persona recibe la suya. La
  huella (`cotizacion_imagen_huella()`, definer: pide ver la cotización, 42501 igual para lo que no existe, está en la papelera o no se ve, y devuelve sólo un md5)
  mira todo lo que el dibujo lee **y lo que quien pide ve**: la cotización, la plantilla publicada, su versión de la fórmula, los colores y los tipos de cambio, el
  cliente y el vehículo sólo si los ve (`puede_lead`, `puede_vehiculo`), su perfil (el asesor) y los ajustes de la empresa. Algo nuevo que la tarjeta dibuje entra
  ahí; un cambio en cómo se dibuja sube `VERSION_DEL_DIBUJO` (`entities/tarjeta/etiqueta-de-la-imagen.ts`). La ETag lleva el usuario: dos personas nunca comparten
  una. La imagen no depende del nivel de quien la arma: la tarjeta sólo nombra nodos del nivel «todos» (K4) y los totales viajan para todos. Pruebas:
  `supabase/tests/areas/tarjeta/imagen.sql`, `src/app/(app)/cotizaciones/[id]/imagen/route.test.ts`.
- **La aprobada** (`cotizaciones_aprobadas`, una fila por vehículo; `docs/COTIZADOR.md` › «La cotización aprobada»): **nadie la escribe directo**, sólo
  `cotizacion_aprobar()` y `_aprobada_reponer()`, que corre al confirmar (`trg_cotizaciones_aprobadas_al_confirmar`, diferido: en un bloque de prueba que se
  revierte hay que forzarlo con `set constraints … immediate`). Invariante: con alguna cotización activa y el vehículo vivo, exactamente una fila y apunta
  a una activa suya. Candados: vehículo `for key share` → cotización `for share` → el candado de aviso por vehículo (en orden de id); sin FK a `vehiculos`.
  Su policy espeja «cotizaciones: leer» (si una cambia, cambia la otra). Pruebas: `supabase/tests/areas/aprobada/`, `scripts/carreras/cotizaciones-aprobada.mjs`.

## Ojo

- `fuentes[id]` pinta la XCell: `override` → anillo, `sugerido` → punto. No derivarlo comparando números.
- `comprobantes_contadores` es tabla, no sequence: la numeración no puede tener huecos.
- Cambiar una fórmula del seed = cambiar su caso del juego (`semilla.test.ts`) **y su diseño**.

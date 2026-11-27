# empresa

Ajustes de la empresa (marca, datos legales, país, formato regional, zona horaria, políticas), monedas y tipos de cambio nombrados con historial, integraciones activables.

## Entra y sale

- Entra: Configuración › Empresa, cuatro sub-rutas (`src/app/(app)/configuracion/empresa/`): «Datos de la empresa» (`/configuracion/empresa`:
  `TarjetasDeLaEmpresa`, seis tarjetas: Identidad, Región, Enlaces de ayuda, Datos legales y de contacto, Políticas, Íconos de la app; en ese orden entran a 1440×900), «Monedas y tipos de cambio» (`/monedas`: `MonedasYTiposCambio`, tarjetas: la moneda base, un grupo por par con una `TarjetaDeTipoCambio` cada tipo, las monedas activas y «Al compartir»), «Integraciones» (`/integraciones`:
  `TarjetasDeIntegraciones`, una tarjeta por integración con su estado), todas de `pantallas/configuracion-empresa.ts`, y «Comprobantes» (`/comprobantes`, del módulo `cotizaciones`). Configuración › Orígenes › «Para todos los orígenes» › Vigencia (`SeccionDeLaVigencia`, de
  `pantallas/configuracion-cotizacion.ts`: `TarjetaDeVigencia` y su modal `?panel=vigencia`, con `useEnvioConVersion()`; la versión entra por props, nunca en la `key`): la vigencia de las cotizaciones (si el vehículo y el lead son obligatorios se decide por rol y origen, en «Roles y permisos»). Sin poder cambiarla (`puedeCambiarAjustesDeCotizacion`), la tarjeta no abre y el motivo (`MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION`) va en un `<Aviso>` de la página; `?panel=vigencia` sin permiso se limpia con `useRevisionAlAbrir`.
  Perfil › «Ayuda» (`TarjetaDeMisEnlaces`, de `pantallas/perfil.ts`): los enlaces de ayuda de quien mira. El menú del perfil (`src/app/(app)/_shell/ayuda/`)
  los lee al abrir «Ayuda» por `shell.client.ts`.
- Sale (`index.ts`, **sin componentes**):
  - `getAjustes()`: lo mínimo de la empresa (nombre, logos, color, íconos, formato regional, zona, moneda base, registro abierto, primer registro), una
    lectura por request, sin sesión; nunca tumba (si la base no responde, identidad neutra con registro cerrado y error en el log). Lo usan `app/` y
    `equipo`. `registroDisponible()`.
  - `leerAjustes()`: como `getAjustes()` pero falla en vez de dar lo de fábrica (la pantalla y el PDF de una cotización). `PESO_MAXIMO_LOGO` (1 MB,
    `entities/marca.ts`): el PDF no baja un logo más pesado.
  - `getPoliticaDeLimpieza()` (sin poder leerla, apagada), `getTiposCambio()` (vigentes, el por defecto adelante; vacía si falla),
    `integracionActiva('apibara')` (si la base no responde, no).
  - Asistente de IA: `atajosDelAsistente()` (`{configurado, atajos}`: encendido, con clave y legible, y los atajos activos como `{id, nombre}`, para
    el panel de compartir de `cotizaciones`), `redactarConElAsistente(pedido)` (generar con un atajo o reescribir con una instrucción; quien llama
    comprueba antes el acceso a lo que se redacta) y `leerUsosDelAsistente()` (`asistente_ia_usos_del_mes()`: hasta 5 personas a la vista y el
    resto acotado; con la RLS, quien gestiona ve a todos). Tipos `PedidoAlAsistente`, `AsistenteParaCompartir`, `UsosDelMes`.
  - Pantalla: `leerMonedasYTiposCambio()`, `leerHistorial()`, `leerUltimosCambios()` (el último cambio de cada tipo por `tipos_cambio_vigentes()`, con tope; sin él la tarjeta cae a su fecha), `leerIntegraciones()`, `leerVehiculosQueCambian()` (conteo acotado de
    `web_publica_vehiculos_que_cambian()`, sólo con `empresa.ajustes.gestionar`), `zonasHorarias()`. Íconos: `iconosDelManifest()`, `urlDeIcono()`,
    `claveDeIconoVigente()` (para `app/manifest.ts` y `app/iconos/vigente/[tamano]`).
  - Ajustes de cotización: `leerAjustesDeCotizacion()` (con la versión; falla en vez de dar los de fábrica), `puedeCambiarAjustesDeCotizacion()`
    (`cotizaciones.configurar` en todos los orígenes, espejo de la RPC), `type AjustesDeCotizacion`. La action `guardarAjustesDeCotizacion` no sale
    por `client.ts`: la usa `<FormularioDeAjustesDeCotizacion>`, de este módulo.
  - Enlaces de ayuda: `leerEnlacesDeAyuda()` (los de la empresa, con los desactivados, tope + 1) y `leerMisEnlacesDeAyuda()` (`enlaces_de_ayuda_de_mi()`).
- Pantallas: `pantallas/perfil.ts` (`<TarjetaDeMisEnlaces>`), `pantallas/configuracion-empresa.ts` (`<TarjetasDeLaEmpresa>`, `<TarjetasDeIntegraciones>`, `<MonedasYTiposCambio>`) y
  `pantallas/configuracion-cotizacion.ts` (`<FormularioDeAjustesDeCotizacion>`).
- Compartir los tipos de cambio: `responderCompartirTiposCambio('texto' | 'imagen', parametros)` (la usan las rutas `src/app/(app)/tipos-de-cambio/texto` e `imagen`,
  tras `requerirSesion()`, con los `searchParams`: `ids` = guid separados por coma, de 1 a 30, validados por `idsParaCompartir()`, y `sin-moneda=1`, la vista del Modo Live; 400, 404 o 500 en `text/plain`, sin caché) y
  `leerLeyendaDeTiposCambio()` (con la versión de la fila; falla en vez de dar una vacía). La action `guardarLeyendaDeTiposCambio` la usa
  `<ModalDeLeyenda>` (`?panel=leyenda`, desde la tarjeta «Al compartir» de `<MonedasYTiposCambio>`).
- `shell.ts`: `getAjustes()`, `getTiposCambioDeLaBarra()` (los de la barra: hasta 3, sólo `{id, nombre, monedaA, valor}`, de la misma lectura
  por request), `<TiposCambioVigentes>` (el botón de la barra; el popover lee `tipos_cambio_vigentes()` al abrirse).
- `shell.client.ts` (sólo el modal diferido de «Ayuda» del menú del perfil): `leerMisEnlacesDeAyuda()` (navegador, por
  `composicion-ayuda.client.ts`: trae supabase-js y no viaja en el marco), `armarMisEnlaces()`, `type EnlaceDeAyudaDelMenu` y las constantes de
  `?panel=` adonde manda (`PANEL_DE_ENLACES_DE_AYUDA`, `PANEL_NUEVO_ENLACE_PROPIO`).
- `client.ts`: `guardarTipoCambio` y `EntradaDeGuardarTipoCambio`, para el ⚙ de un tipo de cambio de la hoja (`cotizaciones`); la action exige
  `empresa.tipos_cambio.gestionar` en el servidor. Del asistente de IA, para el panel de compartir: sus topes
  (`LARGO_MAXIMO_INSTRUCCION_DEL_ASISTENTE`, `LARGO_MAXIMO_TEXTO_DEL_ASISTENTE`) y la acción de un error con `causa`
  (`accionDelAsistente()`, `esCausaDelAsistente()`, `ACCIONES_DEL_ASISTENTE`).
- Depende de ningún otro módulo.

## Archivos clave

- `entities/`: `ajustes.ts` (`AJUSTES_POR_DEFECTO`), `ajustes-empresa.ts` (`AjustesEmpresa` con versión; `telefonoCc` completa teléfonos de lead sin
  «+» ni «00»), `ajustes-de-cotizacion.ts` (`VIGENCIA_MINIMA_DIAS`/`VIGENCIA_MAXIMA_DIAS`, 1 a 365 como la base), `marca.ts`
  (`validarColorDeMarca()`: contraste AA con motivo y tono cercano; reglas del SVG), `regional.ts` (contra `Intl`), `tipos-cambio.ts`
  (`CAMBIOS_A_LA_VISTA` = 30; «En la barra»: `TOPE_EN_LA_BARRA` = 3, espejo de la RPC, `tiposEnLaBarra()` y `motivoParaNoMarcar()`), `integraciones.ts` (`CLAVES_INTEGRACION`), `iconos.ts`, `uso-apibara.ts`, `motivos.ts`, `repositorios.ts`.
- `infra/queries/` (`server-only`); `infra/{empresa,tipos-cambio,integraciones}.ts` escriben por RPC; `infra/{logo,iconos}.client.ts` (Storage);
  `infra/tipos-cambio-vigentes.client.ts` (el popover de la barra, por `composicion-barra.client.ts`: sólo lo pide su contenido diferido);
  `infra/apibara.client.ts` (`consultarUso()` por `invocarFuncion()`). `infra/revalidacion-prueba.ts`, **excepción del cliente admin**:
  `probarRevalidacion()` comprueba el permiso y valida la dirección guardada antes de crear el admin, que sólo llama
  `integracion_secreto('web_publica')`. `infra/asistente-ia/proveedor.ts`, **la otra excepción del cliente admin**: `redactarConElAsistente()`
  y `probarElAsistente()` comprueban la sesión (al probar, `empresa.ajustes.gestionar`), leen la fila con el cliente de quien pide (`lectura.ts`),
  validan la dirección y arman el pedido antes de crear el admin, que sólo llama `integracion_secreto('asistente_ia')`; el uso se cuenta con el
  cliente de quien pide. `http.ts` hace el `POST` (sin redirecciones, 20 s, sin caché) y nunca loguea la clave ni el cuerpo.
  `composicion.ts` / `composicion.client.ts`.
- `features/empresa/` (`guardar-con-logo.ts`: commit diferido contra puertos), `features/iconos/`, `features/integraciones/` (apibara, web pública,
  avisos push y asistente de IA: tarjetas con su estado y un modal por escritura: `?panel=apibara|clave-apibara|web-publica|secreto-web-publica|
asistente-ia|indicaciones-asistente-ia|clave-asistente-ia`, cada uno con `useEnvioConVersion()` y montado por `modales-de-integraciones.tsx`;
  los textos del secreto en `entities/textos-del-secreto.ts`; el prompt base y los atajos se editan como borrador local en un modal y se guardan
  enteros, con los motivos de cada atajo por su id), `features/tipos-cambio/` (`<AvisoDeTope>` con más de 30 cambios; `components/popover-de-la-barra/`, el contenido diferido del popover
  de la barra, con `<PieDelPopover>` para las acciones sobre todos; `entities/tipos-cambio-vigentes.ts`, sus filas y el conflicto),
  `features/ajustes-de-cotizacion/` (sin borrador, remonta con `key` = versión).

## Tablas

`ajustes_empresa` (fila única), `monedas`, `tipos_cambio`, `tipos_cambio_historial`, `integraciones`: sólo lectura para la app, se escriben por RPC.
RPC: `web.ajustes_acceso` (lo único que lee `anon`), `empresa_guardar_ajustes`, `empresa_guardar_ajustes_de_cotizacion` (`cotizaciones.configurar`
sin origen), `empresa_con_datos_cargados`, `moneda_crear`, `moneda_guardar`, `tipo_cambio_crear`, `tipo_cambio_guardar`, `integracion_guardar` (en
`web_publica` valida `revalidar_url`: `https://` o `http://` de loopback, con `hint = 'revalidar_url'`, y guarda sólo esa clave),
`integracion_guardar_secreto`, `integracion_secreto` (sólo `service_role`), `web_publica_vehiculos_que_cambian` (de 0 a 51;
`empresa.ajustes.gestionar`). En `asistente_ia`, `integracion_guardar` valida la config con `_asistente_ia_config` (`hint` = el campo) y
descarta `clave_termina_en`, que escribe sólo `integracion_guardar_secreto`. `asistente_ia_usos` (persona, mes, cantidad; la RLS deja leer las
propias, y todas a quien tiene `empresa.ajustes.gestionar`) se escribe sólo por `asistente_ia_contar_uso()`; `asistente_ia_usos_del_mes()` lee
hasta 6 personas del mes y cuenta el resto con tope 100. `empresa_guardar_leyenda_de_tipos_cambio` (`empresa.tipos_cambio.gestionar`; `ajustes_empresa.leyenda_tipos_cambio`, 1 a 120 caracteres sin saltos de línea,
vacía la quita; misma versión que `empresa_guardar_ajustes`). `tipos_cambio.en_la_barra` («En la barra») se escribe con `tipo_cambio_guardar(… p_en_la_barra)`: exige activo y
menos de 3 activos marcados (22023, `hint = 'en_la_barra'`), tras el candado consultivo de la barra, tomado antes que la fila.
`tipos_cambio_vigentes()` (definer, toda persona activa): los activos con su versión y el último cambio del valor (del historial) con el nombre de
quien lo hizo, nunca el correo.
`enlaces_de_ayuda` (los de la empresa: título ≤ 80, `https://`, descripción ≤ 140, orden, activo; hasta 30) se escribe sólo por
`enlace_de_ayuda_crear`, `enlace_de_ayuda_guardar`, `enlace_de_ayuda_mover` y `enlace_de_ayuda_quitar` (`empresa.ajustes.gestionar`; cada una devuelve la
lista entera; `hint` = el campo o `tope`). `enlaces_de_ayuda_personales` (de cada persona: una fila por enlace de la empresa que ordenó u ocultó, o uno
propio, hasta 20; la RLS deja leer sólo las propias) se escribe sólo por `enlaces_de_ayuda_guardar_mios(p_actualizado_en_esperado, p_elementos)`, que
reemplaza la lista entera con la versión de la persona (`enlaces_de_ayuda_versiones`, aparte de sus filas para que la cascada de un enlace quitado
no la haga retroceder; nula si nunca guardó). `enlaces_de_ayuda_de_mi()`: los activos
de la empresa y las filas propias, en una lectura.

## No se rompe

- Toda edición manda `actualizado_en`; otra es `PT409`. La fila de ajustes la editan los modales de Datos, los íconos y los ajustes de cotización con la
  misma versión (guardar en uno deja con `PT409` al otro): la versión llega por props al abrir el modal y nunca va en su `key`; cada apertura
  (`useApertura()`) empieza de lo guardado.
- Datos de la empresa se edita en un modal por tarjeta (`?panel=identidad|region|datos-legales|politicas|iconos`, `usePanelesDeLaEmpresa()`), cada uno
  con su `useGuardarTarjeta()` sobre `useEnvioConVersion()`: sólo viaja lo que cambió respecto de lo guardado (`cambiosDeLaTarjeta()`), la
  RPC no toca lo ausente. Un `?panel=` sin permiso (o íconos sin logo) se avisa y se limpia. Datos legales (siete campos) guarda borrador en
  `sessionStorage`. La moneda base se edita en Monedas (`?panel=moneda-base`, tarjeta `moneda-base` de `CAMPOS_DE_LA_TARJETA`, con `empresa.ajustes.gestionar`). Monedas: `?panel=moneda-base|monedas|leyenda` (`usePanelesDeMonedas()`), `?par=USD-BOB` (el panel de crear con el par elegido), `?tc=` y `?moneda=`; «En la barra» de la tarjeta guarda al tocarlo; «Gestionar monedas…» y «Editar la leyenda…» (en el «⋯» de su tarjeta, que se abre también al tocarla) piden `empresa.tipos_cambio.gestionar`. Ninguna tarjeta de Empresa lleva botón de acción suelto: sólo el «⋯» y los interruptores que guardan al instante.
- Los íconos se dibujan desde el logo **guardado** y se suben al confirmar la vista previa; su dirección es el hash y cambia al regenerar.
- El logo se sube al guardar: si la fila no se guarda, se descarta el subido; si se guarda, el anterior; siempre por `storage_refcount`. El logo oscuro
  viaja en el mismo guardado (`guardarConLogos()`): un subido que ya es uno de los guardados, o un anterior que pasa al otro espacio, no se descarta.
  Un logo no pasa por `comprimirImagen()`: el SVG sube tal cual; un raster > 1024 px se reduce a PNG.
- Un color sin contraste AA con el texto de los botones se rechaza con el motivo, en el campo y en el servidor. Locale y zona se validan contra
  `Intl`; con uno inválido, `formato.ts` usa el de fábrica.
- El borrador de Datos legales guarda sólo lo cambiado; quien no puede editar no tiene borrador.
- **Mientras guarda, el modal no se edita** (`enCurso` apaga los campos): lo tecleado en ese momento se perdería al llegar lo guardado.
- La moneda base no se cambia con datos cargados (UI deshabilitada y `empresa_guardar_ajustes()` lo rechaza).
- Un valor vigente por clave; el historial lo escribe `tipos_cambio_historial_trg`; **no** altera cotizaciones guardadas (snapshot). Entre dos
  monedas un solo por defecto (único parcial; marcar otro desmarca el anterior en la misma RPC); el por defecto, la moneda base y las que usa un tipo
  activo no se desactivan. La clave de un tipo de cambio sale del nombre al crearlo y no cambia (la nombran las fórmulas). Nada se borra: se
  desactiva.
- El secreto de una integración entra una vez y no vuelve a salir. La dirección de apibara sólo puede ser de `apibara.tech` (Zod y RPC). apibara no
  se activa sin clave guardada (RPC). «Probar» de la web pública manda un cuerpo fijo a la dirección **guardada**, no sigue redirecciones y devuelve
  sólo el código; la app rechaza redes internas y, con la base en la nube, el loopback (`esDireccionDeRevalidacion()`).
- La clave del asistente de IA nunca sale del servidor: ni a la interfaz, ni a un log, ni en un error (el texto del proveedor no se devuelve
  tal cual). De ella se ven sólo la fecha y sus últimos 4 (`config.clave_termina_en`, que escribe sólo la RPC del secreto). Cambiar el origen de
  la dirección borra la clave y apaga el asistente (RPC; el modal lo avisa antes con `guardarBorraLaClave()`); no se enciende sin clave. Llamar
  vuelve a validar la dirección guardada en el servidor, y un uso se cuenta sólo con una respuesta 2xx.
- Los tipos de cambio pasan por `<Monto>` (Modo Live también en la barra superior).
- «En la barra» se elige en el panel de cada tipo de cambio, en el mismo «Guardar» que el valor (una versión por fila): sumarlo pide activo y
  lugar (hasta 3 activos marcados; la base lo repite tras su candado), quitarlo siempre se puede y desactivar no lo quita. La barra muestra
  `tiposEnLaBarra()`: los activos marcados (un inactivo marcado no se ve) y, sin ninguno, el por defecto.
- El último cambio de cada tipo de cambio (popover de la barra) sale del historial, no de `actualizado_*` (que se mueve al renombrar o marcar), y
  lo ve toda persona activa con el nombre, nunca el correo; el historial entero sigue siendo de quien gestiona.
- En el popover de la barra quien tiene `empresa.tipos_cambio.gestionar` cambia el valor con `guardarTipoCambio` (`{id, actualizadoEnEsperado,
valor}`, la misma revalidación): sin el permiso no hay lápiz; con el Modo Live sí (los números se ven, sólo se ocultan los símbolos de moneda).
  El PT409 se dice con lo releído («<Nombre> lo cambió a <Monto> hace N minutos»), armado en el cliente: un monto escrito por la base
  esquivaría `<Monto>`. Con algo sin guardar, guardando o esperando la red, el popover no se cierra al tocar afuera ni con Esc.
- `registro_abierto = false` lo aplica la base (trigger en `auth.users`); `registroDisponible()` lo repite: registro abierto **o** todavía no hay
  nadie (la primera cuenta nace siempre, y dueña).

- **Compartir** (`features/compartir-tipos-cambio/responder.ts`, `infra/compartir/`, `infra/queries/compartir.ts`, `entities/compartir-tipos-cambio.ts`): el texto y
  la imagen salen del servidor con la sesión de quien pide, de una lectura (`tipos_cambio_vigentes()` + la fila de `ajustes_empresa` por su clave primaria;
  nunca los ajustes de fábrica: un cliente no recibe otro nombre o locale). Los ids no activos se omiten y ninguno activo es 404. La imagen es
  `ImageResponse` (1080 px, alto según los tipos y la leyenda, Geist de `infra/compartir/fuentes/`, que `next.config.ts` lleva al desplegar con
  `outputFileTracingIncludes`); el logo se baja en el servidor (≤ `PESO_MAXIMO_LOGO`, PNG, JPEG, GIF o SVG) y uno que falla deja sólo el nombre. El panel
  (`components/popover-de-la-barra/compartir/`, diferido) pide texto e imagen por separado (una falla no tapa a la otra), guarda el resultado y los botones
  son síncronos con el gesto; lo que el navegador no puede (`src/shared/lib/compartir.ts`, genérico) se apaga con su motivo (`motivos-de-las-acciones.ts`). Con el Modo Live
  la vista previa pide también `?sin-moneda=1` (`valorParaCompartir(…, { sinMoneda })`: «1 USD = 6,96») y los botones usan la completa.

- **Enlaces de ayuda** (`features/enlaces-de-ayuda/`, `features/mis-enlaces-de-ayuda/`): se guarda lo que la persona oculta y su orden, nunca una
  lista cerrada de visibles: uno nuevo de la empresa le aparece visible al final, y uno quitado o desactivado desaparece sin error
  (`armarMisElementos()`). Los propios no los ve nadie más (RLS). El menú los lee al abrir «Ayuda», nunca en el layout. Empresa: `?panel=enlaces-de-ayuda`,
  `nuevo-enlace-de-ayuda`, `editar-enlace-de-ayuda` y `quitar-enlace-de-ayuda` (`&enlace=`); Perfil: `enlaces-de-ayuda`, `nuevo-enlace-propio` y
  `editar-enlace-propio` (`entities/paneles-de-enlaces-de-ayuda.ts`). En Perfil «Mostrar», mover y quitar guardan al instante con «Deshacer».

## Ojo

- `ajustes_empresa` sólo la lee `authenticated`; acceso y manifest corren como `anon`, por eso `getAjustes()` va por `web.ajustes_acceso()` con
  columnas contadas. Una columna necesaria antes de ingresar se suma ahí, no con un grant a `anon`.
- No hay permiso de «ver»: abre Empresa quien tiene `empresa.ajustes.gestionar` o `empresa.tipos_cambio.gestionar` (`PERMISOS_DE_EMPRESA`, la unión
  de sus sub-secciones, en `configuracion/empresa/seccion.ts`); lo que no puede editar, deshabilitado con el motivo. Empresa no tiene pestañas:
  cada parte es una sub-ruta. La del área de comprobantes (`configuracion/empresa/comprobantes/subseccion.ts`, con `empresa.ajustes.gestionar`) va
  apagada con su motivo para quien no la abre y sólo pide claves de la entrada «Configuración» de `NAVEGACION`. Cada action revalida la sub-ruta
  dueña de su dato.
- `<Marca>` y `<EstiloDeMarca>` viven en `src/shared/ui` y reciben todo por props. El color entra como `<style>` con `:root` y `.dark`.
- El secreto va a Vault por `integracion_guardar_secreto()`; la app sólo lee `integraciones.secreto_guardado_en`; `integraciones.config` lleva lo no
  secreto. Variables de entorno sólo para infraestructura del despliegue (`docs/DECISIONES.md`).
- Una escritura por modal en Integraciones: la dirección o las plataformas, y la clave o el secreto, usan la misma versión de la fila y encadenadas la
  segunda chocaría consigo misma (`PT409`). Los interruptores (`Activa`) guardan al instante desde la tarjeta. `estadoDeIntegracion()`: Activa, Apagada o
  Falta la clave (apibara y el asistente de IA sin clave; web pública prendida sin secreto; push prendido sin clave pública). El proveedor, el
  prompt base con los atajos, la clave y el interruptor del asistente comparten la versión de la fila.
- `push_web` («Avisos push»): un interruptor con la versión de la fila; encender no exige la clave pública (si falta, la tarjeta lo dice; la calcula
  `app/` y llega por props); cada persona lo enciende en su perfil. `web_publica` revalida el sitio desde la base (cola
  `interno.web_revalidar_pendiente`, job `web-revalidar`; contrato en la ficha de `web`). Integración nueva: `CLAVES_INTEGRACION`; con secreto,
  también `esquemaGuardarSecreto`.
- «Retención» = `papelera_dias` y `actividad_dias`. La limpieza (`limpieza_automatica`, `limpieza_dias_gracia`, 1 a 90) se edita en «Políticas»; su
  regla es de `vehiculos`. `demora_dias_default` y `lead_dormido_meses` sin interfaz. `logo_oscuro_ruta` tiene su campo en «Marca» y lo devuelve
  `web.ajustes_acceso()`; íconos, tarjeta y PDF usan el logo normal. `vigencia_dias` sólo por
  `guardarAjustesDeCotizacion` (`empresa_guardar_ajustes()` la rechaza).
- Los paneles de tipo de cambio y de moneda apagan sus campos mientras `enCurso` (el `<fieldset>` no basta con Base UI; remontan con
  `key={id-actualizadoEn}`) y avisan de lo escrito (`useHayCambiosEnFormulario()`). La barra superior dibuja el tipo de cambio desde 24 rem.

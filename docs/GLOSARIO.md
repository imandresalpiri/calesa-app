# Glosario

Un término del negocio = un nombre en el código: al aparecer uno nuevo se agrega aquí antes de crear el tipo o la tabla. Si ya existe, se usa
ese nombre: nunca un sinónimo ni su traducción al inglés.

- **Equipo** — `perfiles` / `/configuracion/equipo`: las personas que usan el sistema. No: «usuarios» en la UI.
- **Rol** — `roles`: conjunto de permisos con nombre, creado por el dueño; `dueno` es de sistema.
- **Permiso** — `permisos` (clave `modulo.recurso.accion`): capacidad fija por código; se asigna, no se crea.
- **Concesión** — `roles_permisos`: un permiso dado a un rol, acotado a un origen y con alcance.
- **Alcance** — `alcance_permiso` (`propios` | `todos`): si el permiso aplica a lo propio (cartera/creado por mí) o a todo.
- **Dominancia** — `rol_dominado()`, `concesion_dominada()` / `entities/dominancia.ts`: nadie otorga, edita, asigna ni quita lo que no tiene.
  Sobre la persona, `persona_dominada()` / `personas_dominadas()`: nadie bloquea, da de baja ni cambia los roles de quien tiene permisos que él
  no cubre (el dueño sí).
- **Avisos de un rol** — `entities/avisos-de-roles.ts` (`avisosDelRol()`, `avisosDeLaPagina()`): por qué un rol no se puede cambiar o eliminar (no lo
  dominas, es de sistema, tiene personas) y qué dice la página de Roles. Se leen en un modal que abre el «!» junto al nombre del rol o al título.
- **Guardián** — `rbac_guardian()`: siempre queda alguien que opera y gestiona roles y personas; el rol dueño conserva los permisos de equipo.
- **Invitado** — `app_metadata.invitado` / `perfiles.invitado_en` / `invitarPersona()`: cuenta creada por alguien del equipo, con un rol,
  aunque el registro esté cerrado.
- **Invitación pendiente** — `EstadoPersona` `invitacion_pendiente` (`invitado_en` sin `invitacion_aceptada_en`): aún no eligió contraseña.
- **Perspectiva («ver como»)** — `permisos_efectivos()` / `usePerspectiva()` / cookie `perspectiva`: mirar la app con los permisos de otro rol.
- **Permisos efectivos** — `permisos_efectivos()` / `Sesion.permisos`: los propios ∩ los del rol de la perspectiva.
- **Bloquear** — `perfiles.bloqueado` / `equipo_bloquear`: impide operar sin perder nada.
- **Dar de baja** — `perfiles.activo = false` / `equipo_dar_de_baja`, `equipo_vista_previa_baja`: sale del equipo.
- **Baja en curso** — `equipo_bajas` (`terminada_en` nulo) / `_bajas_en_curso()`, `_baja_lote()`, job `equipo-bajas`: ya dada de baja.
- **Sesión** — `Sesion` / `mi_sesion()` / `requerirSesion()`: la persona del request: estado de la cuenta, perfil, roles reales, permisos
  efectivos y preferencias.
- **Estado de la cuenta** — `EstadoCuenta` (`activa` | `bloqueada` | `baja`): si puede operar; bloqueada o de baja no se queda adentro.
- **Perfil** — `perfiles` / `/perfil`: lo que cada persona edita de sí misma, en cinco tarjetas de ajustes: Tú (nombre y foto), Preferencias, Turnos de la web, Tu ficha en la web y Notificaciones.
- **Preferencia** — `preferencias_usuario` / `Preferencias`: elección de interfaz por persona (densidad, tema), igual en todos sus dispositivos.
- **Menú plegado** — `menu.plegado` / `Preferencias.menuPlegado`, `useMenuPlegado()`, `<LateralPlegable>` (`_shell/`): el menú lateral de escritorio reducido a una columna de sólo
  íconos, con su nombre en `title` y para el lector y el contador de Chat como punto. Se alterna con «Plegar menú» / «Desplegar menú» o `Ctrl/Cmd+B`. No: «colapsado», «mini», «compacto» (la densidad es otra cosa).
- **Última pestaña del origen** — `origenes.ultima_pestana` / `PestanasRecordadas`, `recordarLaPestana()` (`equipo/entities/ultima-pestana.ts`): la pestaña que cada
  persona abrió por última vez en cada origen (hasta 30 orígenes). Entrar a `/configuracion/origenes/<id>` lleva ahí; sin recordar (o si ya no la abre), a la primera que abre. No viaja en `Preferencias`.
- **Zona de quien mira** — `preferencias_usuario.zona_horaria` / `useRegional().zonaDeLaPersona`: en qué zona ve cada persona las fechas de
  subasta (`/perfil` › Preferencias › «Zona horaria»); sin elegir, la de la empresa. Lo demás sigue en la zona de la empresa.
- **Cuenta regresiva del cierre** — `cuentaDelCierre()` (`vehiculos/entities/cuenta-regresiva-del-cierre.ts`), `<CuentaRegresivaDelCierre>`: lo que le falta a una subasta
  viva para cerrar, contado cada segundo («Cierra en 2 d 04:12:33»; ámbar con menos de 24 h, roja con menos de 1 h; «Cerrando…», «Cerró hace 3 min», «Sin fecha de
  cierre»). La dibujan la tarjeta y la fila de la lista de vehículos en subasta y la ficha (arriba de «Puja actual», «Compra directa» y «Costo estimado»), con un solo temporizador por página.
- **Hora del patio** — `zonaDelPatio()` / `<FechaDeSubasta>`: la hora de una subasta en la zona de su patio, estimada por el estado de la
  ubicación (`ubicacion_estado`); un estado con dos zonas toma la de la mayoría.
- **Densidad** — `useDensidad()` / `--fila` (`compacta` | `comoda`): altura de las filas; compacta con mouse, cómoda en táctil, o la elegida.
- **Aviso de acceso** — `?aviso=clave` / `AVISOS`: por qué alguien llegó redirigido a una pantalla de acceso; el texto sale del catálogo.
- **Aviso con acciones** — `AccionesDeUnAviso` / `resolverAcciones()`, `<AccionesDelAviso>`, `avisarError(error, { acciones })`: aviso de
  error, advertencia o bloqueo que ofrece ahí mismo de 1 a 3 salidas (ir, abrir un panel, reintentar, deshacer, recargar), filtradas por permiso.
- **Subasta cerrada (aviso al cotizar)** — `subastaCerrada()` / `<AvisoDeSubastaCerrada>`, `avisoDeSubastaCerrada()`: aviso de la hoja de cotizar cuando el
  vehículo elegido sigue en el tramo de subasta y su subasta ya pasó; con «Refrescar la subasta», «La ganamos» / «No la ganamos», «Elegir otro
  vehículo» y «Cotizar igual». Información con salida: no bloquea. No es la situación: la usa y la nombra.
- **Causa (de un error)** — `ErrorApp.causa`: clave estable de la regla que frenó (viaja en `hint`); de ella salen las acciones del aviso.
- **Canje** — `/auth/callback` / `canjearAcceso()`: convertir el código de Google o el enlace de un correo en una sesión.
- **Primer registro** — `ajustes_acceso().primer_registro`: aún no hay nadie en el equipo; la primera cuenta nace con el rol dueño.
- **Registro abierto** — `ajustes_empresa.registro_abierto`: si alguien puede crear cuenta solo; lo aplica un trigger en `auth.users`.
- **Empresa** — `ajustes_empresa` / `AjustesEmpresa`: fila única: marca, datos legales, país, formato regional, zona horaria, moneda base y
  políticas.
- **Color de la marca** — `ajustes_empresa.color_acento` / `tokensDeMarca()`: color primario; de él salen los `--color-primario*`.
- **Formato regional** — `ajustes_empresa.locale`: idioma y país (`es-BO`) con que `Intl` escribe números, montos y fechas.
- **Íconos de la app** — `ajustes_empresa.iconos` / `Iconos`, «Regenerar íconos»: ícono de pestaña y app instalada, desde el logo.
- **Retención** — `ajustes_empresa.papelera_dias`, `actividad_dias`: días que se conserva la papelera y el registro de actividad.
- **Moneda base** — `ajustes_empresa.moneda_base`, `monedas`: moneda en la que se guardan los montos (`monto_base`).
- **Moneda** — `monedas` / `Moneda`: moneda con la que trabaja la empresa (ISO, símbolo, decimales); no se borra, se desactiva.
- **Tipo de cambio** — `tipos_cambio` (clave: oficial, paralelo…) / `TipoCambio`: valor nombrado entre dos monedas; uno vigente por clave; se
  congela en cada cotización.
- **Par de monedas** — `claveDelPar()`, `gruposPorPar()` / `GrupoDePar`: las dos monedas de un tipo de cambio («USD → BOB»); en Configuración › Empresa › Monedas
  cada par es un grupo con sus tipos de cambio como tarjetas, el de la base primero (`?par=` pide crear uno en ese par).
- **Tarjeta de tipo de cambio** — `<TarjetaDeTipoCambio>`: un tipo de cambio dentro de su par: nombre, «★ Por defecto», el valor grande, quién y cuándo lo cambió y el
  interruptor «En la barra»; abre su panel (`?tc=`).
- **Tipo de cambio por defecto** — `tipos_cambio.es_default`: el que se usa entre dos monedas si no se elige otro; uno por par.
- **Historial de un tipo de cambio** — `tipos_cambio_historial` / `CambioDeValor`: de cuánto a cuánto, quién y cuándo; lo escribe un trigger.
- **En la barra** — `tipos_cambio.en_la_barra` / `TipoCambio.enLaBarra`, `tiposEnLaBarra()`: el tipo de cambio que la empresa eligió para verlo
  a la vista en la barra superior; hasta 3 activos; sin ninguno, la barra muestra el por defecto.
- **Último cambio de un tipo de cambio** — `tipos_cambio_vigentes()` / `UltimoCambio`: quién (el nombre, nunca el correo) y cuándo cambió el
  valor por última vez; sale del historial, así que renombrar o marcar no lo mueve.
- **Enlaces de ayuda** — `enlaces_de_ayuda` / `EnlaceDeAyudaDeLaEmpresa`, `enlaces_de_ayuda_personales` / `EnlaceDeAyudaDelMenu`: las direcciones
  (título hasta 80 caracteres, `https://`, descripción opcional hasta 140) que se abren en otra pestaña desde «Ayuda» del menú del perfil
  (`?panel=ayuda`). La empresa prepara hasta 30 en Configuración › Empresa (`empresa.ajustes.gestionar`; uno desactivado no se ve en el menú de
  nadie); cada persona, en Perfil, oculta los que no quiere, los ordena a su gusto y suma hasta 20 **propios**, que sólo ve ella. Uno nuevo de la
  empresa le aparece visible al final. No es la **Ayuda (de una celda)** de la hoja, ni sus `EnlaceDeAyuda` (los de un bloque de la ayuda): ésos
  son del diseño de un origen y se abren junto a una celda. No: «links», «enlaces útiles», «recursos».
- **Leyenda de los tipos de cambio** — `ajustes_empresa.leyenda_tipos_cambio` / `LeyendaDeTiposCambio`: el texto (hasta 120 caracteres, una línea; vacía =
  ninguna) que va al pie de lo que se comparte con un cliente; se escribe en Configuración › Empresa › Monedas con `empresa_guardar_leyenda_de_tipos_cambio()`.
- **Compartir los tipos de cambio** — `ParaCompartir`, `armarTextoParaCompartir()`, rutas `/tipos-de-cambio/imagen` y `/tipos-de-cambio/texto`: la imagen
  (PNG con logo, nombre, momento en la zona de la empresa, los tipos elegidos y la leyenda) y el texto para WhatsApp, armados en el servidor con lo mismo.
- **Monto en moneda base** — `gastos.monto_base`, `pagos.monto_base` / `_monto_en_base()`: lo calcula la base con el tipo de cambio elegido
  (su valor queda en `tipo_cambio_aplicado`); quien carga nunca lo manda.
- **Prorratear** — `gastos_prorratear()` / `gastos.lote_id`: repartir un gasto entre 1 y 200 vehículos en partes iguales; los centavos que
  sobran van a los primeros y la suma es exacta. Un reparto es un lote; se hace desde el resumen de un grupo, con vista previa por unidad.
- **Sello (de un pago)** — `pagos.confirmado_por`, `pagos.confirmado_en` / `textoDelSello()`: quién confirmó y cuándo; lo pone
  `pago_confirmar()`, nadie lo edita; «Confirmado por <nombre> el <fecha>». Un error se corrige con `pago_anular()`, nunca se deshace.
- **Confirmar un pago** — `pago_confirmar()` / `logistica.pagos.confirmar`: acto aparte de registrarlo; confirmado ya no se edita ni elimina.
- **Anular un pago** — `pago_anular()` / `logistica.pagos.confirmar`: saca de la venta un pago confirmado (de un vehículo o de un proyecto de repuestos), con
  motivo y constancia `pago.anulado` en `actividad`; no vuelve ni deja sin cumplir lo que pide de pagos la fase actual del vehículo o de un ítem del proyecto.
  Eliminar es sólo para uno sin confirmar.
- **Comprobante de un gasto o pago** — `comprobante_ruta` de `gastos`, `pagos` y `repuestos_compras`, bucket `comprobantes` /
  `comprobante_puede()`: archivo que los respalda (`<unidad|proyecto>/<sha-256>.<ext>`, uno por fila); lo lee quien ve la fila (una compra, con
  `repuestos.costos.ver`). Se sube y se ve en la «zona del comprobante» del panel del pago, del gasto y de la compra. No es el **Comprobante** de venta.
- **Integración** — `integraciones` / `Integracion`, `integracionActiva()`: interruptor + config no secreta (apibara, push, web pública).
- **Secreto de una integración** — `integraciones.secreto_guardado_en` / `integracion_guardar_secreto()`: clave de API en Vault.
- **Origen** — `origenes`: de dónde viene un vehículo (subasta USA, China, oficina…); tipo subasta o manual.
- **Layout de campos** — `origenes_campos` / `leads_campos`: campos de un vehículo (o lead) y cómo se muestran, filtran y editan; motor
  `shared/lib/campos`. Se edita con el editor de campos de `shared/ui/campos` (`<EditorDeCampos>`), el mismo en un origen y en los leads.
- **Grupo de campos** — `leads_campos_grupos`, `origenes_campos_grupos` (uno por origen) / `GrupoDeCampos`, `campo.grupo_id`: bloque con nombre que
  ordena el formulario y la ficha. Se elige de un catálogo (`<ComboDeCatalogo>`), no se escribe: el nombre es único sin importar mayúsculas,
  tildes ni espacios (`_nombre_de_catalogo()` ↔ `claveDeNombre()`), y lo nuevo se crea desde el combo («Crear grupo «x»»). Se renombra, ordena,
  desactiva y quita en el drawer «Grupos» (`?panel=grupos`); quitar uno con campos pide a dónde moverlos. Un campo sin grupo va en «Otros datos».
  No: «sección», «bloque», ni los otros «Grupo» (de la hoja, de un vehículo, de transporte, de la bandeja).
- **Preconfiguración** — `origen_preconfigurar_campos()`: campos que nacen con el origen según su tipo (subasta/apibara o manual).
- **Categoría** — `categorias`: agrupación dentro de un origen (marca, segmento). No es el grupo de campos de un origen ni la categoría de una FAQ.
- **Sustantivo del origen** — `origenes.sustantivo`: cómo se llama lo que entra por ese origen («vehículo», «unidad», «lote»).
- **Género del sustantivo** — `origenes.genero` / `Genero`: para concordar sin texto fijo; lo sugiere `generoSugerido()` y se corrige.
- **Clave del origen** — `origenes.clave` / `claveDeNombre()`: identificador estable que sale del nombre al crearlo y no cambia.
- **Campo de fábrica** — `origenes_campos.es_sistema`, `leads_campos.es_sistema`: preconfigurado; no se elimina ni cambia de tipo o clave.
  «Sistema» nombra otra cosa (rol dueño).
- **Campo desactivado** — `origenes_campos.activo = false`: sale del formulario y filtros; sus datos siguen en `vehiculos.atributos`.
- **Campo principal** — `origenes_campos.principal`: identifica al vehículo en la lista y en logística; uno por origen como mucho,
  activo y no de monto; sin él, el título.
- **Datos clave** — `origenes.datos_clave` / `DatoClave`, `leerDatosClave()`, `origen_datos_clave_guardar()`: los hasta 4 datos, en orden,
  que la ficha de un vehículo muestra primero. Los elige cada origen en «Campos», en sus cuatro casillas de dato clave («Datos clave (n de 4)»;
  «Hacer dato clave» y «Quitar de los datos clave» en el «⋯», o soltando un campo en una casilla libre); cada uno es un dato
  común o un campo activo del origen. Vacíos = los de fábrica de su tipo (subasta: plataforma, enlace de la subasta, kilometraje y año;
  manual: año, kilometraje, VIN y categoría). La ficha del vehículo los dibuja en «Datos principales» (columna izquierda, `datosClaveDelVehiculo()`).
- **Casilla de dato clave** — `CasillasDelEditor` / `CasillaDelEditor` (`shared/ui/campos`): uno de los 4 lugares de «Datos clave (n de 4)» en el
  editor de campos de un origen. Llena, dice el dato y su lugar, se arrastra a otra o se sube, baja y quita desde su «⋯»; libre, recibe un campo
  o un dato común soltado encima. Con las 4 llenas no se reemplaza: primero se quita una. Los leads no tienen casillas.
- **Ficha completa (del vehículo)** — `<ModalDeFichaCompleta>`, `?ver=ficha`: el «Ver más» de «Datos principales» en la ficha del vehículo. Un modal
  grande, de sólo lectura y con tipografía de vitrina, para mostrarle el vehículo a un cliente: las fotos con su tira, los datos comunes, «Precio» y
  todos los grupos del layout del origen.
- **Rango (de un campo)** — `minimo`/`maximo` de `leads_campos` y `origenes_campos`, `_valor_fuera_de_rango()`: límites de un `numero` o
  `moneda` (nulo = sin límite); se rechaza el valor que cambia y queda fuera, no el que ya estaba. `*_campo_impacto().fuera_de_rango` los cuenta.
- **Valor por defecto de un campo** — `valor_defecto` / `valorDefectoPara()`, `valorDefectoVigente()`: lo que el alta trae puesto; sólo precarga.
- **Origen inactivo** — `origenes.activo = false`: no recibe vehículos ni cotizaciones nuevos; sus fichas se siguen viendo. Reversible.
- **Origen sin uso** — `motivoParaNoEliminar()` / `origen_eliminar()`: sin vehículos (papelera incluida), cotizaciones ni fórmula publicada.
- **Uso de un origen** — `origenes_resumen()` / `UsoDeOrigen`: vehículos, cotizaciones, campos, categorías, fases, ¿fórmula publicada? y
  concesiones.
- **Para cotizar y mover** — `pasosParaCotizarYMover()` / `pasosQueFaltan()`: lo que le falta a un origen activo para cotizar y mover sus
  vehículos, en cinco pasos con su estado (✓ listo, ⚠ aviso, ✗ bloquea): Datos (apibara en una subasta), Campos, Flujo (con fases), Fórmula
  (una activa) y Tarjeta (publicada en la activa), cada uno con el lugar donde se arregla (`pasos.ts` de `src/app`). Un inactivo no tiene faltas. Se ve en el
  inicio de Configuración como **lo que falta** (`faltasPorSeccion()`, `<QueFaltaDeLaSeccion>`: una línea por origen en Orígenes, apibara en Empresa) y, en
  la página del origen, como el ⚠ de la pestaña donde se arregla (`faltaDeCadaPestana()`). Mientras el origen no termina su puesta en marcha
  (`siguePendienteLaPuestaEnMarcha()`), su cabecera ofrece «Seguir la puesta en marcha». No: «siguientes pasos», «checklist».
- **Página del origen** — `/configuracion/origenes/<id>/<pestaña>` (`MarcoDelOrigen`, `PESTANAS_DEL_ORIGEN`): todo lo de un origen en un lugar, a todo
  el ancho: las **migas** con el selector de origen, la cabecera («Seguir la puesta en marcha», «Datos» y el «⋯») y seis **pestañas** planas: Fases,
  Planilla, Hoja, Tarjeta, Campos y Categorías (las tres de la fórmula, con la barra de la fórmula). Cada pestaña pide su permiso en ese origen; la que no
  se abre va apagada con su motivo y la que tiene algo pendiente, con ⚠. Los datos del origen van en su drawer (`?panel=datos`, `PANEL_DATOS_DEL_ORIGEN`).
- **Selector de origen** — `SelectorDeOrigen` (`src/app/(app)/configuracion/origenes/[id]/`): el último paso de las migas de la página del origen
  («<origen> ▾»), un popover con los orígenes que la persona abre (buscador desde 11) que lleva a la misma pestaña del elegido
  (`destinoAlCambiarDeOrigen()`) o, si allí no la abre, a la primera que abre. No: «switcher», «cambiador».
- **Puesta en marcha** — `/configuracion/origenes/nuevo` y `/configuracion/origenes/<id>/puesta-en-marcha/<paso>` (`rutaDeLaPuestaEnMarcha()`,
  `estadoDeLaPuestaEnMarcha()`, `<PasoAPaso>`): el paso a paso que lleva a quien crea un origen hasta cotizar con él: Datos, Campos, Flujo, Fórmula,
  Tarjeta, Publicar y **Listo** («Cotizar con <origen>»). El avance se deriva de lo que hay (campos, fases, fórmula de trabajo, fórmula activa), sin
  guardar un «paso actual»: cada paso guarda con sus botones, «Seguir» va al siguiente y la raíz lleva al que falta. Un paso sin el permiso en ese
  origen se salta y dice su motivo. Se retoma con «Seguir la puesta en marcha» de la página del origen. No: «asistente», «wizard», «onboarding».
- **Configuración de logística** — `/logistica/configuracion/<clave>` (`RUTAS.configuracionDeLogistica`): la página de Logística con las pestañas Puertos, Navieras, Categorías de gasto y
  Tipos de documento; se entra con el botón ⚙ «Configurar» de la cabecera de Logística. No: «Catálogos de logística» como sección de Configuración.
- **Configuración de repuestos** — `/repuestos/configuracion/<flujo|cotizador|catalogos>` (`RUTAS.configuracionDeRepuestos`): la página de Repuestos con las pestañas Flujo, Cotizador y Catálogos; se entra
  con el botón ⚙ «Configurar» (nombre accesible «Configurar los repuestos») de la fila de filtros de `/repuestos`. No: «Configuración › Repuestos» como sección de Configuración.
- **Flujo de repuestos** — `/repuestos/configuracion/flujo` (`RUTAS.flujoDeRepuestos`): el flujo de los repuestos, que se configura en la primera pestaña de la configuración de repuestos
  con el mismo editor que la pestaña Fases de un origen.
- **Fórmula pendiente** — origen sin **fórmula activa** (`origenes_resumen().formula_publicada`): un origen nuevo no se cotiza hasta publicar la primera.
- **Vehículo** — `vehiculos`: el dato central; recorre el flujo de su origen.
- **Atributos** — `vehiculos.atributos`, `leads.atributos`: campos del layout que no son columna. En un lead se leen por `leads_vista`, recortados.
- **Dato común** — `camposComunes()` / columnas de `vehiculos`: lo que tiene todo vehículo y es columna (título, marca, año, VIN, precio…).
  Como dato clave valen marca, modelo, año, VIN, categoría, kilometraje, placado y, en subasta, lote, plataforma y enlace de la subasta
  (`DATOS_COMUNES` de `origenes`, por el nombre de su columna: `anio`, `categoria_id`, `url_origen`). En el editor de campos van en el grupo
  «Comunes», con la insignia «Común» (`FijosDelEditor`).
- **Sin fase** — `vehiculos.fase_id` nulo / `<BadgeDeFase>` (dentro de `<BadgeDeSituacion>`): aún no entró al flujo de su origen; lo ubica quien mueve.
- **Inventario** — `/vehiculos` / `<ListadoDeVehiculos>`: listado de vehículos, una pestaña por origen; con «propios» se lee por
  `vehiculos_inventario()` (por rutas, filtros en SQL), con «todos» por PostgREST (`fuenteDelInventario()`).
- **Lote (de mover)** — `cambiar_fase_lote()` / `<DrawerDelLote>`, `?panel=lote`: 1 a 200 vehículos de una fase movidos a otra con nota
  común, cada uno por sí mismo (resultado parcial). No es el «lote de papelera» ni el «lote de subasta».
- **Lote de subasta** — `vehiculos.lote` + `plataforma`: identificador en la subasta (Copart/IAAI). No es el lote de papelera. En `/vehiculos` es el chip
  «Lote N» sobre la foto de la tarjeta de la lista (`<ChipDelLote>`, `loteALaVista()`) y la columna «Lote» de la tabla, sólo en un origen de subasta.
- **Foto** — `vehiculos_imagenes` / `Foto`, `<SeccionDeFotos>`: una imagen de un vehículo (hasta 24).
- **Visor de imágenes** — `<CarruselEnElLugar>`, `useVisorDeGaleria()`, `?visor=<clave>&foto=<n>`: las fotos de una entidad en grande,
  con flechas, ← →, «3 de 12» y miniaturas; en su lugar, la portada y, al acercarse, el resto (una sola lectura).
- **Tira de miniaturas** — `<TiraDeMiniaturas>`, `<CarruselConTira>`: las miniaturas de una entidad en fila, desplazable de costado (hasta 24), con
  la actual marcada (`aria-current` y borde). En el visor va bajo la foto grande; en la ficha del vehículo, bajo el carrusel (un clic abre el visor en
  esa foto; ← → la recorren); en la ficha completa, arriba de los datos. No es la «Miniatura» (una sola foto chica).
- **Alta suelta** — `vehiculo_crear(…, 'suelto')`, `vehiculos.crear`: dar de alta un vehículo desde el inventario (`/vehiculos`, «Nuevo», `N`) o por
  importación. **Alta desde cotizar** — `vehiculo_crear(…, 'cotizar')`, `vehiculos.crear.desde_cotizar`: desde la hoja de cotizar («+» y «Traer»
  del panel del vehículo). Cada una, su permiso por origen; `vehiculos.creado_desde` dice cuál fue.
- **Portada** — `vehiculos_imagenes.es_portada` / `vehiculo_foto_portada()`: la foto principal, una sola.
- **Miniatura** — `vehiculos_imagenes.ruta_miniatura` / `<Miniatura>`: la versión chica de una foto (≤ 480 px).
- **Hash** — `hashDe()` / `vehiculos_imagenes.hash`: SHA-256 de un contenido; es el nombre del objeto en Storage (nunca cambia).
- **Refcount** — `storage_refcount(bucket, ruta)`: cuántas filas referencian un objeto; sólo se borra con 0, contado bajo candado.
- **Cola de limpieza** — `cola_gc_storage` / `storage_gc_reclamar()`, `storage_gc_confirmar()`: objetos de Storage quizá sin uso.
- **Bandeja de subida** — `reducirBandeja()` / `<BandejaDeSubida>`: lo elegido para subir que aún no es foto; nada toca Storage hasta confirmar.
- **Interesado** — `vehiculos_interesados` / `vehiculo_interesado_marcar()`, `vehiculo_interesado_quitar()`: lead interesado en un vehículo
  (N:M), nota ≤ 500. Es un tipo de **Relacionados**.
- **Relacionados** — `vehiculo_relacionados()`, `lead_relacionados()` (y `*_pagina()`), `<Relacionados>` / `?relacionados=<tipo>`: el bloque siempre
  visible de cada detalle (ficha del vehículo, la unidad de logística y ficha del lead) con tres grupos por tipo:
  **Vinculado**, **Interesado** y **Cotizado**. Desde un vehículo se ven leads; desde un lead, vehículos. Cada grupo lleva su cantidad (con tope),
  sus primeras filas, lo que quien mira no ve contado («1 que no puedes ver») y «Ver todos» por cursor. Lo que está en una papelera no cuenta. Un
  grupo sin nada no se dibuja. Se ve en una línea de chips en logística, y compacto en las fichas (`PresentacionDeRelacionados`).
- **Vinculado** — tipo de relación (`TipoDeRelacion` `vinculado`): el lead dueño o comprador de un vehículo (el vínculo vigente), y desde un
  lead, sus vehículos vinculados. Su «Ver todos» en un vehículo incluye los vínculos anteriores.
- **Cotizado (relación)** — tipo de relación `cotizado`: leads con una **cotización activa** de ese vehículo (y al revés), una fila por
  contraparte con su cotización visible más nueva. No es **Cotizado (n)**, el conteo de cotizaciones de un vehículo.
- **Cotización activa** — `eliminado_en is null and estado in ('activa','reportada')`: la que cuenta para «Cotizado» y su índice parcial.
- **Vínculo** — `vehiculos.lead_id` + `vehiculos_vinculos` / `vehiculo_vincular()`: lead dueño o comprador actual, uno a la vez, con historial.
- **Vincular / Desvincular** — `vehiculo_vincular(p_vehiculo, p_actualizado_en_esperado, p_lead)` (nulo desvincula): con la versión del vehículo.
- **Vehículos del lead** — `lead_vehiculos()`, `<GestionDeVehiculosDelLead>`, `?seccion=vehiculos`: en la ficha del lead, el bloque **Relacionados**
  se llama «Vehículos» (en su título y en el índice; su ancla sigue siendo `#relacionados`), con «Vincular o marcar» en el título; al pie, la gestión
  («Ver los vínculos anteriores», que abre su drawer en `?panel=vinculos-anteriores`, el panel «Vincular o marcar un vehículo» y la confirmación de desvincular); vinculados e
  interesados, con sus acciones, son los grupos de Relacionados. Sólo lo visible.
- **Agregar vehículo** — `vehiculos_para_lead()`, `?panel=agregar-vehiculo`: buscar entre los vehículos visibles para vincular uno o marcar
  interés desde el lead.
- **Vehículo de una nota** — `seguimientos.vehiculo_id`, `recordatorios.vehiculo_id`: vehículo opcional del lead que quien escribe ve.
- **Carreras** — `pnpm db:carreras` (`scripts/carreras.mjs`): prueba de concurrencia con dos conexiones reales a la base local sobre el mismo
  lead o vehículo.
- **Causa de bloqueo** — `_vehiculo_bloqueo()` / `CAUSAS_DE_BLOQUEO`: por qué un vehículo no va a la papelera (`vinculado`, `fase`,
  `comprobante`, `final`, `documentos`, `pagos`, `aduana`, `repuestos`; `cotizacion_papelera` sólo frena una purga).
- **Publicado** — `vehiculos.publicado_web` / `vehiculo_vitrina()`: quien tiene `vehiculos.vitrina` decidió que salga en la web. Condición,
  no garantía.
- **En vitrina** — `interno.vitrina_vehiculos.visible` / `web.vehiculos`, `vitrina_del_origen()`: se ve hoy en la web: publicado, fuera de
  papelera, fase que publica, origen activo y visible, integración web activa.
- **Vitrina** — `web.vehiculos` / `vehiculo_vitrina_previa()`: lo que la web muestra: identidad, precio público, campos públicos y portada.
- **Revalidar (la web pública)** — `interno.web_revalidar_pendiente`, `web_revalidar_correr()`, job `web-revalidar`: avisar al sitio, una vez
  por minuto y por etiqueta (`guias`, `faqs`, `testimonios`, `ajustes`, `asesores`, `vehiculos`), que algo cambió. Dirección en
  `integraciones.config.revalidar_url`; secreto en Vault (`integracion:web_publica`).
- **Precio público** — `vehiculos.precio_web` / `precio_web_hasta`: lo que muestra la web; NULL = «Consultar».
- **Papelera** — `lotes_papelera`, `eliminado_en` / `vehiculos_papelera_*`, `leads_papelera_*`, `cotizaciones_papelera_*` (y la genérica
  `papelera_*`, sólo de cotizaciones): borrado reversible hasta la purga.
- **Lote de papelera** — `lotes_papelera` / `LoteDePapelera`: envío de 1 a 200 a la papelera; se restaura o purga entero o por partes.
- **Purga** — `vehiculos_papelera_purgar()`, `cotizaciones_papelera_purgar()`, `papelera_purgar()`, `papelera_purgar_vencidos()`: borrar para
  siempre, a mano (`vehiculos|leads|cotizaciones.papelera.purgar`, cada papelera la suya) o a los `papelera_dias`; lo que otra tabla necesita
  (un pago, un comprobante, una cotización de la papelera que lo nombra) queda bloqueado, con motivo, en la papelera.
- **Limpieza de Storage** — `cola_gc_storage` / función `storage-gc`, `storage_gc_*()`: borrar lo que nadie referencia; job cada hora.
- **Pase** — `cola_gc_pases` / `storage_gc_disparar()`, `storage_gc_abrir()`; `push_pases` / `push_disparar()`, `push_abrir()`;
  `importaciones_pases` / `importacion_pase_emitir()`, `importacion_abrir()`: uuid de un solo uso (10 min) con que la base autentica su llamada
  a una función edge (`storage-gc`; `push`, atado a una notificación; `importar-csv`, atado a una importación total).
- **Restaurar** — `vehiculos_papelera_restaurar()`: vuelve al inventario sin publicar; lo que choca con un VIN o lote tomado queda pendiente,
  con motivo. `cotizaciones_papelera_restaurar()`: lo que choca con otra viva (versión nueva, final del vehículo) o cuelga de un vehículo o
  cliente en la papelera queda pendiente, con motivo.
- **Lead** — `leads` / `leads_vista`: prospecto o cliente; el teléfono principal lo identifica.
- **Origen del lead** — `origenes_lead` / `origen_lead_crear()`, `OrigenDeLeadConUso`: de dónde llegó (Facebook, referido…).
- **Origen del lead desactivado** — `origenes_lead.activo = false`: con leads no se elimina, se desactiva.
- **Tipo de lead** — `tipos_lead` / `tipo_lead_crear()`, `leads.tipo_lead_id`, `TipoDeLeadConUso`: qué es cada lead (Prospecto, Cliente, los
  que agregue), de una clase fija. No: el enum `tipo_lead`.
- **Clase (de un tipo de lead)** — `tipos_lead.clase` (`clase_tipo_lead`), `ClaseDeTipoDeLead`: «Prospecto» o «Cliente»; no cambia. El sistema
  razona por clase, nunca por nombre ni clave.
- **Tipo de lead desactivado** — `tipos_lead.activo = false`: como el origen del lead; el último activo de su clase no se desactiva.
- **Tipo de seguimiento** — `tipos_seguimiento` / `tipo_seguimiento_crear()`, `TipoDeSeguimientoConUso`: cómo se contactó (Llamada, WhatsApp…).
  El sistema no razona por nombre ni clave.
- **Icono (del catálogo)** — `icono` en `origenes_lead`, `tipos_lead`, `tipos_seguimiento`; `CLAVES_DE_ICONO`, `<IconoDelCatalogo>`: catálogo
  cerrado de 24 (`src/shared/lib/iconos.ts`).
- **Origen del lead por defecto** — `origenes_lead.por_defecto`, `origen_lead_guardar(… {por_defecto})`, `origen_por_defecto_id`: el que
  propone el alta.
- **Teléfono principal** — `leads.telefono_principal` / `telefono_lead()`: único entre leads vivos; completo sólo para la cartera.
- **Campo de lead** — `leads_campos` / `CampoDeLead`: dato configurable de los leads (además de nombre, teléfono, tipo y origen, fijos).
- **Layout de leads** — `leads_campos` / `leerLayoutDeLeads()`: campos de los leads con orden, grupo de campos, requeridos, filtros, columnas y
  quién los ve.
- **Privado de cartera** — `leads_campos.solo_cartera` / `atributos_lead()`: campo que sólo recibe quien tiene el lead en su cartera (correo y
  documento nacen así).
- **Atributos públicos** — `leads.atributos_publicos` / `leads_vista.atributos_publicos`: los atributos sin los privados, por trigger.
- **Cambio de privacidad pendiente** — `leads_campos.solo_cartera_pendiente` / `CampoDeLead.privacidadPendiente`: campo que cambia de
  privacidad por lotes: «Pasando a privado/público».
- **En la tabla** — `leads_campos.en_tabla`: campo que sale como columna del listado de leads.
- **Valor de la empresa** — `leads_campos.valor_defecto_empresa`: «la ciudad (o país) de la empresa» como valor por defecto de un texto.
- **Cartera** — `leads_asesores` (fuente) / `leads.cartera` (copia por trigger): quién tiene acceso a un lead (dueño, compartido, adoptado);
  vacía = limbo.
- **Cartera corta** — `leads_cartera_corta()` / `leerMiosDeLaCartera()`: cartera de ≤ 5.000 filas (`_leads_cartera_corta_tope()`).
- **Limbo** — `lead_en_limbo()` / `_leads_al_limbo_de()`: lead sin asesores vigentes; invisible hasta que alguien lo toma al registrar su teléfono.
- **Adoptar** — `crear_lead()` con `adoptar` / «Tomar lead»: tomar un lead del limbo al registrar su teléfono.
- **Alta rápida** — `crear_lead()` / `<AltaDeLead>`: alta con primer seguimiento y recordatorio opcional desde cualquier pantalla («Nuevo
  lead» o `N`), en una transacción.
- **Widget** — `WIDGETS_TABLERO` / `widgetsVisibles()`: tarjeta de `/tablero` con su clave, permisos y grupo de RPC; la persona los oculta y
  ordena en «Personalizar» (preferencia `tablero.widgets`). En Inicio se llama «bloque».
- **Más datos** — `camposDelAlta()` / `<BloqueDeCampos>`: sección a la vista del alta con los campos no requeridos, ya precargados.
- **Primer seguimiento** — `crear_lead()` (`p_seguimiento`): el que se anota al dar de alta: tipo, resumen y recordatorio opcional.
- **En cartera** — `leads_vista.en_cartera` (de `leads.cartera`) / `en_cartera()`: el lead está en la cartera de quien mira; da el teléfono
  completo y los privados.
- **Lectura por la cartera** — `leads_cartera_vista` / `fuenteDelListado()`, `leads_asesores.lead_creado_en`, `leads_asesores_listado_idx`:
  «míos» de quien tiene «propios», leído por su cartera.
- **Reciente (de un lead)** — `leads_asesores.lead_reciente_en` (copia en toda fila de la cartera, también revocadas), `reciente_en` de
  `leads_vista` y `leads_cartera_vista`: `coalesce(ultimo_seguimiento_en, creado_en)`; ordena «míos» del panel del cliente. No: «actividad».
- **Candidatos de la búsqueda** — `leads_candidatos()`, `leads_vista_por_ids()`, `leads_busqueda_idx` / `entities/candidatos.ts`: primeros
  leads que coinciden con un nombre, sacados de un índice.
- **Buscador** — `buscador_leads()`, `buscador_vehiculos()`, `buscador_cotizaciones()` / `src/modules/buscador`: búsqueda por sección con el
  mínimo en la base y tope 5 por sección; la dibuja la paleta.
- **Nuevo (barra superior)** — `<NuevoDeLaBarraSuperior>`, `opcionesDeNuevo()`, `ClaveDeNuevo` / `src/app/(app)/_shell/nuevo/`: el botón «Nuevo» (y `Shift+N`) que abre un modal con lo que quien mira puede crear
  (lead, vehículo, cotización, proyecto de repuestos, seguimiento, recordatorio, evento, tarea); `?panel=crear`. El mismo modal filtrado a lo que se agenda (evento, tarea,
  recordatorio: `CLAVES_DE_LA_AGENDA`, `delGrupo()`) lo abre «Nuevo» de la agenda por `?panel=nuevo-en-la-agenda`; un destino con `conservaLaPantalla` sólo escribe su `?panel=`
  si ya se está en esa ruta. No es «Nuevo lead» (la tecla `N` y el drawer, `<AltaDeLead>`).
- **Buscador de Configuración** — `<BuscadorDeConfiguracion>`, `buscarEnConfiguracion()`, `palabras` de `secciones.ts` / `configuracion/_navegacion`: el campo «Buscar en
  Configuración» (la tecla `/`) que filtra secciones y sub-secciones por nombre y por palabras clave y dice el camino de cada una; lee el registro, no la
  base. No es el «Buscador» global (`src/modules/buscador`) ni la «Paleta».
- **Paleta** — `<Paleta>`, `AccionDeLaPaleta` / `src/modules/buscador`: superposición `Ctrl/Cmd+K` que busca y ejecuta acciones; sin URL; sus
  acciones se ofrecen con `puede()`.
- **Visto** — `vistos` / `visto_registrar()`, `vistos_de()`, `ProveedorDeMarcasDeVisto`, `MarcasDeVistoDeLaPagina`: un registro que la persona abrió (ficha,
  resumen o panel) en _ese_ módulo (su contexto: abrir un vehículo en Vehículos no lo marca en Logística); su nombre va en peso normal; el de lo que aún no abrió (**no visto**, `MarcaDeVisto` `nuevo`) va en negrita, como un
  correo sin leer; sin marca (con «Vistos» apagado o antes de leer) queda en su peso de siempre. Por
  persona; se recuerda 7, 30, 90 o 365 días (`/perfil` › Preferencias › «Marcar lo que abrí»).
- **Último visto** — `vistos_de().ultimo` / `<SufijoDeVisto>`: el registro más reciente del módulo, de cualquiera de sus tipos (en la agenda, un evento o una
  tarea: uno solo); borde de acento y un ojo chico junto al nombre (tooltip y texto para el lector «Último visto»; sin texto a la vista), en peso normal como lo visto.
- **Últimos abiertos** — `visitados` / `visita_registrar()`, `visitados_usuario_visto_idx`: lo último que cada persona abrió (lead, vehículo o
  cotización), a lo sumo 50; se lee bajo la RLS de cada entidad.
- **Míos / Todos** — `?alcance=todos` / `alcanceDelListado()`, `<SelectorDeAlcance>`: modos del listado de leads; «míos» (defecto) = `en_cartera`.
- **Mías** (cotizaciones) — `p_mias` de `cotizaciones_listado()`, `PedidoDelListado.mias`: las que creó quien mira (`creado_por`). No es «Míos».
- **Enmascarado** — `enmascarar_telefono()` / `telefono_lead()`: teléfono fuera de tu cartera: 3 primeros y 2 últimos dígitos («591•••••01»).
- **País del teléfono** — `paisDelNumero()` / `TABLA_DE_PAISES`: país del código de llamada, calculado en el navegador.
- **Ítems por página** — `listas.por_pagina`, `tamanoDePagina()`, `?por=`: 10, 25, 50 o 100 por cuenta; cada lista tiene un máximo (100). Se
  elige en «Vista y opciones».
- **Número propio** — `leads.numero_propio` / `leads_numeros_propios`, `NumerosDeLead.numeroPropio`: consecutivo por creador (desde 1): «Tu
  n.º 12». Se busca con `12` o `#12`.
- **Número global** — `leads.numero` / `leads_numeros_globales`, `leads.numero_global.ver`, `NumerosDeLead.numero`: consecutivo de la empresa
  («N.º 1.234»); nulo sin el permiso.
- **Resumen** — `?cotizacion=` / `<ResumenDeCotizacion>`: vistazo de una cotización sin salir de la lista, con «Abrir cotización», «Compartir cotización» y el
  «⋯» de la fila arriba (la **barra del resumen**, `<AccionesDelResumen>`), la **cabecera del resumen** (`<CabeceraDelResumen>`: la miniatura de la imagen de la tarjeta y los datos de la fila, fija y de ≤ 120 px) y las
  pestañas debajo. También abre sobre la ficha del lead y la del vehículo (`<ResumenFueraDelListado>`). Las listas de vehículos y de leads no
  tienen: abren la ficha (`<EnlaceDeLaFila>`).
- **Enlace de la fila** — `<EnlaceDeLaFila>` (`src/shared/ui/lista/`), `href` de `<FilaDeLista>`/`<TarjetaDeLista>`: el nombre de una fila o una tarjeta
  como enlace a la ficha, en una lista sin resumen; el resto del ítem navega igual (Ctrl o el botón del medio, otra pestaña).
- **Línea de tiempo (de una cotización)** — pestaña «Todo» del resumen (`?pestana=`, `useLineaDeTiempo`, `lineaDeTiempo()`): adjuntos, revisiones y comentarios
  mezclados por fecha, lo más nuevo arriba; una página de cada fuente y sólo se dibuja hasta donde llegó la que menos retrocedió. Las otras pestañas del resumen:
  «Adjuntos», «Revisiones» y «Comentarios».
- **Patrón de lista** — `@/shared/ui/lista` (`<UnaSolaVista>`, `<FilaDeLista>`, `<MasAcciones>`…): tabla o tarjetas, nombre a la izquierda,
  «⋯» arriba a la derecha en la tarjeta de la lista (`<EsquinaDeAcciones>`) y en la columna pegada a la derecha en la tabla.
- **Vista de la lista** — `VistaDeLista` (`tabla` | `tarjetas`), `?vista=`, `<ConmutadorDeVista>` (en «Vista y opciones»): cómo se ve una lista en
  escritorio; en el inventario la recuerda `vehiculos.vista`. Por debajo de 768 px siempre tarjetas. No es una «Vista guardada».
- **Vuelta del foco** — `abrirConVuelta()`, `useVueltaDelFoco()` (`src/shared/ui/vuelta-del-foco.ts`): tras recargar con un panel por URL,
  «atrás» devuelve el foco a quien lo abrió (desde un menú, al botón del menú).
- **Más acciones («⋯»)** — `<MasAcciones>` / `accionesDeLead()`, `accionesDeVehiculo()`, `accionesDeCotizacion()`: menú de fila, tarjeta, resumen, ficha o
  cabecera de una cotización guardada (`<MenuDeLaGuardada>`: lo que no está a la vista, en el mismo orden que el «⋯» de la fila del listado).
- **Acción principal del «⋯»** — `principal` de `AccionDeMenu` (`@/shared/ui/lista`), `ACCION_PRINCIPAL_DEL_LEAD`: la primera línea del «⋯», sola en su
  bloque, en negrita y la primera que enfoca el teclado. Una por menú: «Cotizar lead» en el del lead y «Cotizar vehículo» en el del vehículo
  (`ACCION_PRINCIPAL_DEL_VEHICULO`).
- **«Cotizar lead»** — `cotizar` de `accionesDeLead()`: la acción principal del «⋯» del lead (fila, tarjeta de la lista, kanban y ficha): la hoja de cotizar con
  el lead elegido en el primer origen donde quien mira cotiza, con `returnTo` (`conVuelta()`) a donde estaba. Sin `cotizaciones.crear` en ningún origen, no está.
- **«Editar lead»** — `editar` de `accionesDeLead()`, `edicionDelMenu()`: el panel de edición del lead (`?panel=editar-lead`; fuera de la ficha con `&para=<id>`)
  desde su «⋯». Con sólo `leads.telefonos_extra.editar` se llama «Editar teléfonos» y abre el panel en modo teléfonos.
- **Esquina de acciones** — `<EsquinaDeAcciones>` (`@/shared/ui/lista`): el lugar del «⋯» en una tarjeta de la lista (cada ítem de la vista
  Tarjetas, también la del kanban): arriba a la derecha; con `sobreImagen`, flotando sobre la foto con fondo translúcido y borde, y la casilla en
  la esquina izquierda como espejo. En la tabla el lugar es la columna pegada (`CeldaPegada lado="acciones"`).
- **Condiciones (de una cotización de repuestos)** — el último bloque de la hoja de una cotización de repuestos: sus notas y la configuración con que se calculó (y «Guardar» en la borrador). La cotización no guarda otras condiciones ni un cliente propio: el cliente es el del proyecto.
- **Filtro descartado** — `filtrosDescartados()` / `<AvisoDeFiltrosDescartados>`: filtro de la URL sobre un campo desactivado o eliminado.
- **Ficha del lead** — `/leads/[id]` / `lead_ficha()`, `<FichaDeLead>`: en dos columnas (`<FichaEnDosColumnas>`): a la izquierda la cabecera (el nombre
  con el «⋯» arriba a la derecha y quién lo tiene debajo), «Datos» (los datos clave del lead y «Ver más»), «Quién lo tiene» y «Acceso al portal»; a la
  derecha el índice y los bloques, en su orden (`BLOQUES_DE_LA_FICHA` de `leads`): «Seguimiento», «Cotizaciones», «Vehículos» y «Oportunidades». Edición
  en `?panel=editar-lead`.
- **Datos clave del lead** — `entities/datos-clave-del-lead.ts` (`campoDelPais()`, `campoDeNotas()`, `datoDelCampo()`, `paisDeLosDatos()`),
  `<DatosClaveDelLead>`: lo que «Datos» de la ficha del lead muestra a la vista: tipo, origen, país y teléfono principal, y «Notas» a lo ancho. «País» y
  «Notas» son campos del layout de leads encontrados por su etiqueta o clave (sin tildes ni mayúsculas; «Notas» sólo si es texto largo); sin «País» o
  vacío, el país del teléfono principal. No son los «Datos clave» del vehículo: éstos son fijos y no se eligen.
- **Ver más (ficha del lead)** — `?ver=datos` (`CLAVE_DE_VER`, `VER_DATOS`), `<ModalDeDatosDelLead>`: el modal de sólo lectura con todos los datos del
  lead (el alta, los grupos del layout y los teléfonos con sus extras), con «Editar» para quien puede. Su propia clave en la URL: no pisa `?panel=`.
- **Ficha del vehículo** — `/vehiculos/[id]` / `BLOQUES_DE_LA_FICHA`, `bloquesDeQuienMira()`, `<FichaEnDosColumnas>`: en dos columnas; a la izquierda la
  cabecera (`<CabeceraDeVehiculo>`), la subasta y el costo (`<CostoYSubasta>`) y «Datos principales»; a la derecha el índice y sólo lo de ventas, por permiso
  («Cotizaciones de este vehículo», «Relacionados», «Actividad reciente», «Vitrina»). `?seccion=<ancla>` lleva al bloque. No: «detalle del vehículo».
- **Teléfono extra** — `leads_telefonos` / `lead_telefonos()`, `lead_telefono_guardar()`, `lead_telefono_quitar()`: número alterno con
  etiqueta opcional; se edita en el panel de edición de la ficha; la ficha lo muestra sólo para leer.
- **Máximo de teléfonos extra** — `ajustes_leads.telefonos_extra_maximo` / `telefonos.maximo`: cuántos extras admite un lead (0 a 20; 6 de
  fábrica). Quien ya tiene más los conserva y no agrega hasta bajar del máximo.
- **Extras como el principal** — `ajustes_leads.telefonos_extra_como_principal` / `telefonos.comoPrincipal`, «Los teléfonos extra cuentan como
  el principal» (apagado de fábrica): con ella, un extra es único entre leads vivos y registrar ese número encuentra a su lead.
- **Choque de teléfonos** — `telefonos_extra_choques()` / `<ChoquesDeTelefonos>`: un extra cuyo número es el principal o el extra de otro lead
  vivo; la lista «Números repetidos» (modal `?panel=numeros-repetidos` de la tarjeta Teléfonos extra, sólo con la regla encendida), enmascarada, por cursor y sin total; se lee al abrirla.
- **Editar teléfonos extra** — permiso `leads.telefonos_extra.editar` (con alcance): agregar, rotular y quitar extras; el principal sigue con
  `leads.editar`.
- **«Anterior»** — `leads_telefonos.etiqueta` / `ETIQUETA_DEL_ANTERIOR`: etiqueta del principal reemplazado, que queda como teléfono extra.
- **Cambiar teléfono principal** — `cambiar_telefono_lead()` / `?panel=cambiar-telefono`, `<PanelDeTelefono>`: sólo la cartera, con la
  versión del lead.
- **Teléfono extra de otro lead** — `_lead_verificar().alterno` / `Verificacion.libre.alterno`: aviso, sin bloquear, de que un número libre es
  extra de otro lead (o, al agregar un extra, el principal de otro: `como: 'principal'`).
- **Versión del lead** — `leads.actualizado_en` / `lead_version()`: lo que la ficha manda al guardar para detectar cambio ajeno.
- **Código de país** — `ajustes_empresa.telefono_cc` / `normalizarTelefono()`: prefijo que completa un teléfono sin «+» ni «00».
- **Compartir / Transferir** — `lead_compartir()`, `lead_transferir(p_dueno_esperado)`: dar acceso / pasar el lead (el saliente queda
  compartido); nadie se lo da a sí mismo.
- **Quién lo tiene** — `lead_cartera()` / `<BloqueDeCartera>`: nombres y tipo de acceso; nunca correo ni teléfono.
- **Quitar acceso** — `lead_revocar_acceso()`: sacar a un compartido de la cartera; al dueño no, se transfiere. Ofrece «Deshacer».
- **Salir de este lead** — `lead_salir()` / `ETIQUETA_DE_SALIR`: un compartido se quita a sí mismo.
- **Supervisión** — `leads.compartir` / `leads.transferir` en «todos»: mueve la cartera de leads ajenos sin tenerlos; no ve teléfono ni privados.
- **Papelera de leads** — `leads_papelera_*`, `/leads/papelera`: borrado reversible por lote, todo o nada; revoca el portal.
- **Seguimiento** — `seguimientos`, `tipos_seguimiento` / `seguimiento_*()`, `lead_seguimientos()`: contacto con el lead; nace privado; sólo
  su autor lo edita.
- **Bloque «Seguimiento»** — `ResumenDeSeguimientos`, `#seguimientos`: el primer bloque de la derecha de la ficha del lead, con su «+» («Anotar o
  agendar»), tu recordatorio pendiente más próximo y los últimos seguimientos en línea de tiempo; «Ver todos» y «Ver tus recordatorios» abren el
  drawer `?todos=`. No es **Seguimiento**, el registro.
- **Último contacto (de una fila)** — `ultimo_seguimiento_en`, `ultimo_seguimiento_visible`, `proximo_recordatorio` de `leads_vista` y
  `leads_cartera_vista` / `entities/ultimo-contacto.ts`, `<UltimoSeguimientoDeFila>`, `<RecordatorioDeFila>`: lo que el listado dice del último
  seguimiento (su tipo y su título si quien mira lo ve; si es privado de otra persona, sólo «hace X») y del próximo recordatorio pendiente de quien
  mira, en palabras relativas («hace 3 días», «en 2 días», «vencido hace 1 día»). No: «actividad», ni «reciente» (ése ordena «míos»).
- **Recordatorio** — `recordatorios` / `recordatorio_*()`, `recordatorios_vista`: aviso personal con fecha y hora; sólo su dueño lo ve y toca.
- **Próximo contacto** — `recordatorio_crear()` / `p_recordatorio` de `seguimiento_crear()` y `crear_lead()`: el que nace con un seguimiento.
- **Visible para el cliente** — `seguimientos.visibilidad = 'publico'` / `ETIQUETA_DE_VISIBLE`: lo ven quienes ven el lead y el portal;
  apagado, sólo el autor. La UI no dice «portal».
- **Detalle de un seguimiento** — `seguimientos.detalle_doc` / `_seguimiento_detalle()`, `validarDocumento()`: JSON de ProseMirror (nunca
  HTML) validado.
- **Co-asesor** — `leads_asesores` (`tipo_acceso = 'compartido'`): quien comparte un lead con su dueño.
- **Recordatorio vencido** — `lead_ficha().recordatorios_vencidos` / `estadoDelRecordatorio()`: propio, con hora pasada y sin completar.
- **Marca** — `MarcasDeLead` / `leads_vista.es_favorito`, `esta_tachado`, `etiquetas`: favorito, tachado y etiquetas que una persona pone a
  un lead; privadas.
- **Etiqueta** — `etiquetas`, `leads_etiquetas` / `etiqueta_*()`, `lead_etiquetas_poner()`: marca con nombre y color, privada (hasta 50; 20
  por lead).
- **Color de etiqueta** — `etiquetas.color` / `CLAVES_DE_COLOR`, `--etiqueta-<clave>`: uno de ocho de la paleta cerrada, guardado como clave.
- **Favorito / Tachado** — `leads_favoritos`, `leads_tachados` / `lead_favorito_poner()`, `lead_tachado_poner()`: marcas por persona; no
  reordenan. Una cotización también se marca favorita (`cotizaciones_favoritos` / `cotizacion_favorito_poner()`: de quien mira,
  `poner(valor)`, sin versión; en la guardada y en el «⋯» del listado).
- **Tus marcas** — `SECCION_MARCAS` / `filtrosDeMarcas()`: sección de arriba del panel de filtros («Solo las ves tú»).
- **Tachados ocultos** — `?tachados=` (`ocultar` · `incluir` · `solo`) / `ocultaTachados()`, `ocultos`: el listado oculta lo tachado y avisa
  cuántos, con «Mostrarlos».
- **Gestionar etiquetas** — `?panel=etiquetas` / `<DialogoDeEtiquetas>`: crear, renombrar, recolorear y eliminar las propias.
- **Embudo / Etapa / Oportunidad** — `embudos`, `embudos_etapas`, `oportunidades` / `embudo_*`, `oportunidad_*`: embudo personal de 3 a 12
  etapas (inicial, ganada, perdida). Un lead tiene como mucho **una oportunidad abierta por embudo** (`_oportunidad_abierta_unica`): crear, reabrir
  o restaurar otra abierta ahí se rechaza con «Abrir esa».
- **Oportunidad base** — `_lead_oportunidad_base()`: la que nace con todo lead nuevo (alta rápida, importación, «Datos», turno de la web), abierta,
  en la etapa inicial del embudo por defecto de quien lo crea y con el nombre del lead de título. Intacta, no cuenta como trabajo al deshacer.
- **«Nueva oportunidad…»** — `?panel=oportunidad-rapida&para=<id>` / `<ModalDeOportunidadRapida>`: crear una oportunidad desde el «⋯» de un lead (fila, tarjeta, kanban y ficha). Primero
  avisa de las que el lead ya tiene (`<AvisoDeOportunidadesDelLead>`: «Crear igual» o «Cancelar»); después, el nombre del lead de título y el monto opcional, en la etapa
  inicial del embudo por defecto. **«Ver oportunidades»**, la otra línea del «⋯»: la ficha en su bloque «Oportunidades».
- **Embudo por defecto** — `embudos.es_default` / `embudo_por_defecto()`: el creado la primera vez («Ventas»); no se elimina, se renombra.
- **Plantilla del embudo** — `ajustes_leads.embudo_etapas` / `embudo_plantilla_guardar()`: etapas con que nace el embudo por defecto de cada
  persona; nula = las seis de fábrica (`_embudo_etapas_de_fabrica()`). Sólo afecta a los que nacen después.
- **Mover a…** — `oportunidad_mover()` / `<MenuMoverA>`: cambiar de etapa desde un menú; ganada o perdida cierra, abierta reabre.
- **Motivo de pérdida** — `oportunidades.motivo_perdida`: opcional, hasta 200, al mover a perdida; se limpia al reabrir.
- **Vista de embudo** — `/leads?vista=embudo` / `<VistaDeEmbudo>`: kanban de tus oportunidades en un embudo; los filtros de la lista no aplican.
- **Embudo filtrado por lead** — `/leads?vista=embudo&embudo=<id>&lead=<id>` / `embudo_tablero_del_lead()`, `<ChipDelLead>`: las oportunidades de
  quien mira sobre un lead en un embudo, en todas sus etapas, con el chip «De <nombre>» y «Ver todas» (quita el filtro; se llega con «Ver en el embudo» de la ficha del lead). Es la vista de todas las
  de un lead; cambiar de embudo lo conserva y un `lead=` que no se ve se quita.
- **Embudo del lead** — `<OportunidadesDelLead>` / `entities/tablero-del-lead.ts`, preferencia `leads.embudo_de_la_ficha`: el bloque «Oportunidades» de la ficha: una columna por etapa
  del embudo elegido con las oportunidades de ese lead, que se mueven arrastrando o con «Mover a». No es la vista de embudo (`/leads?vista=embudo`, el kanban de todos tus leads); su «Ver en el
  embudo» lleva al embudo filtrado por lead.
- **Portal del cliente** — `accesos_portal` / `web.portal_*` / `?seccion=portal`: lo que el cliente ve en la web con código y clave: sus
  vehículos, lo «Visible para el cliente» y novedades.
- **Mensaje del portal** — `ajustes_leads.portal_mensaje` / `portal_mensaje_guardar()`: texto para WhatsApp al dar acceso, con `{cliente}`,
  `{empresa}`, `{codigo}`, `{clave}` y `{direccion}`; nulo = el de fábrica. Es una tarjeta de Configuración › Leads (`?panel=portal`) que se edita con el
  «Editor de texto con variables»; «Restablecer» (`?panel=restablecer-portal`) está en su «⋯».
- **Ajustes de leads** — `ajustes_leads` / `ajustes_leads_leer()`: fila única con las plantillas de leads (embudo y mensaje del portal), cada
  una con su versión.
- **Código del portal** — `accesos_portal.codigo` / `codigoDictado()`: `XXX-YYYYY`: prefijo de la empresa y cinco símbolos sin I, O, 0 ni 1.
- **Clave temporal** — `otorgar_portal(p_clave)`: la da el equipo al otorgar (8 a 64 o generada).
- **Dar acceso / Volver a otorgar** — `otorgar_portal`: volver a otorgar cambia código y clave; los anteriores y la sesión abierta dejan de valer.
- **Revocar (el acceso)** — `revocar_portal`: el código deja de valer y la sesión se corta; irreversible, se da uno nuevo.
- **Desbloquear** — `portal_desbloquear`: limpiar el bloqueo de 15 minutos que dejan cinco intentos fallidos.
- **Límite por IP (del portal)** — `interno.portal_intentos` / `web.portal_intento()`: 10 intentos por IP cada 15 minutos; la IP se guarda
  sólo como **huella** (HMAC con la sal `portal:sal`).
- **Versión del acceso** — `accesos_portal.otorgado_en`: da conflicto en «Volver a otorgar» y vence la sesión del portal.
- **Sesión del portal** — cookie `portal` / `SesionDelPortal`, `firmarSesionDelPortal()`, `leerSesionDelPortal()`: HMAC-SHA256
  (`PORTAL_COOKIE_SECRETO`), 7 días; lleva `lead_id` y `otorgado_en` y deja de valer al volver a otorgar o revocar.
- **Novedades** — `web.portal_snapshot().novedades`: lo «Visible para el cliente» sin vehículo suyo; las 30 más nuevas.
- **Dirección de la web** — `ajustes_web.direccion_publica` / `leerDireccionPublica()`: la dirección pública del sitio.
- **Cotización** — `cotizaciones`: cálculo de una fórmula para un lead/vehículo, con snapshot.
- **Preventa / Final** — `clase_cotizacion`: borrador comercial / la que cierra el vehículo (una activa por vehículo).
- **Cotizaciones hermanas** — `cotizaciones.hermana_id` (`HermanaDeLaGuardada`, `EnlaceALaHermana`): las dos cotizaciones de una **variante en par**, una por
  opción, creadas y guardadas juntas (`cotizacion_crear_en_par`, `cotizacion_guardar_en_par`); se apuntan entre sí y comparten lead, vehículo, origen y versión.
  Cada título lleva « · <etiqueta de su opción>». No son el **Par porcentaje-monto**.
- **Cotización aprobada** — `cotizaciones_aprobadas`, `cotizacion_aprobar()`, `cotizaciones.aprobar` (por origen): la elegida de un vehículo, una sola por
  vehículo (la clave primaria es el vehículo). Nace aprobada la primera activa; si la aprobada se invalida o va a la papelera pasa a la más antigua que sigue
  activa. No es la **Final** (marcar una no aprueba ni al revés). Se ve como la insignia «Aprobada» y, en `/vehiculos`, como el **Costo estimado**.
- **Cotización privada** — `cotizaciones.privada`, `cotizacion_privada_cambiar()`, `cotizaciones.privadas.ver` (por origen; `entities/privada.ts`): la que ven sólo
  quien la creó y quien tiene `cotizaciones.privadas.ver` de su origen; para el resto no existe. La marca la pone y la quita sólo quien la creó (el
  interruptor «Privada» al guardar, o «Hacer privada» / «Hacer pública» en su «⋯»); aprobarla o marcarla final la hace pública. Se ve como la insignia
  «Privada» con candado. No: «oculta», «borrador», «personal».
- **Costo estimado** — `ROTULO_DEL_COSTO_ESTIMADO`, `costoEstimadoDe()` (`vehiculos/entities/cotizacion-aprobada-de-la-fila.ts`), `cotizaciones_aprobadas_de_vehiculos()`:
  la cotización aprobada de un vehículo en `/vehiculos` (columna de la tabla y fila de la tarjeta de la lista): su primer resultado con su moneda y el modo de tipo
  de cambio de la cotización («US$27.999 · Unificado»), en un botón que abre «Compartir la cotización» de la aprobada sin salir de la lista. No son los campos de apibara «Costo estimado desde / hasta / mediano (USD)».
- **Fila de tarjetas** — `pantallas/listado-fichas.ts` (`TarjetasDelLead`) y `pantallas/aprobada-fichas.ts` (`TarjetasDelVehiculo`), `features/fichas/`: el bloque de cotizaciones de la ficha del lead y de la del
  vehículo. Una fila que se desliza (snap, flechas ‹ › en escritorio, pista de desborde) con las últimas 10 cotizaciones que quien mira ve, cada una como **tarjeta de la lista**, y
  al final la tarjeta «Ver más» al listado filtrado. En el vehículo la aprobada va primera y cada tarjeta suma «Aprobar esta» y la casilla de «Comparar». No es «De este vehículo» (las otras
  del vehículo de una cotización) ni la **vista Tarjetas** de `/cotizaciones` (una cuadrícula, con cursor).
- **De este vehículo** — `cotizaciones_de_este_vehiculo()`, `features/aprobada/components/de-este-vehiculo/`: el bloque de una cotización (su
  página y su resumen en `/cotizaciones`) con las otras del mismo vehículo, la aprobada primero y «Aprobar esta» en cada una; la que se mira va marcada
  **«Esta»**. No es el historial del vehículo (el panel de la hoja) ni las tarjetas de la ficha del vehículo (**fila de tarjetas**: las últimas 10, con «Ver más»).
- **Comparar cotizaciones** — `/cotizaciones/comparar?ids=`, `entities/aprobada/comparar.ts` (`compararCotizaciones()`), `pantallas/aprobada-comparar.ts`
  (`TablaDeComparar`): 2 o 3 cotizaciones del mismo vehículo lado a lado, **lo guardado** de cada una (su versión, sus valores y su total, sin recálculo),
  una columna por cotización y una fila por nodo alineada por su id, con «Aprobar esta» al pie. Lo **distinto** se mide **contra la primera** columna (↑, ↓
  o ≠). Se llega por las casillas de «De este vehículo» y por las del **modal del grupo** de un vehículo en `/cotizaciones`. No es la «Celda» de la hoja ni
  la «tarjeta de la cotización»: en la interfaz cada columna es «la cotización #N» y sus filas son de nodos.
- **Tarjeta de la lista** — `<TarjetaDeLista>` (`@/shared/ui/lista`): cada ítem de la vista «Tarjetas» de un listado. La de `/cotizaciones` es
  `TarjetaEnLaLista` (`features/listado/components/tarjeta-en-la-lista.tsx`): la **imagen de la tarjeta** arriba (en miniatura) con el «⋯» encima, el
  título, «N.º n» con sus insignias, el total con su modo, el cliente, el autor, la vigencia, el conteo de su grupo y «Compartir». No es la **tarjeta de la
  cotización** (la vista previa tipo Excel que esa imagen muestra).
- **Grupo de un vehículo** — `EntradaDelListado` de `tipo: 'grupo'`, `cotizaciones_listado_por_vehiculo()`: en `/cotizaciones` agrupada («Agrupar por
  vehículo», `?agrupar=`, `cotizaciones.agrupar`), las cotizaciones de un vehículo que quien mira ve y coinciden con la búsqueda y los filtros, en una tarjeta o
  fila con «N cotizaciones de este vehículo» que abre el **modal del grupo**. Una cotización sin vehículo va **suelta** (`tipo: 'suelta'`). No es el
  **Grupo (de la hoja)**, el **Grupo (de la bandeja del día)** ni el **Grupo (de transporte)**.
- **Modal del grupo** — `ModalDelGrupo` (`?panel=cotizaciones-del-vehiculo&vehiculo=<id>`): el modal «Cotizaciones de <vehículo>» que abre «N cotizaciones de este vehículo»; lista las
  cotizaciones del vehículo que coinciden con la búsqueda y los filtros (la aprobada primero), de a 10 con «Ver más» hasta 100, con «Comparar» en su pie. No es el
  **resumen** (`?cotizacion=`) que abre una de sus líneas ni «De este vehículo» (el bloque de la ficha del vehículo).
- **Cabeza del grupo** — `cabeza` de un grupo de un vehículo: la cotización que lo representa en su tarjeta o fila: su **aprobada** si quien mira la ve y
  coincide; si no, la más reciente que coincide. La lista ordena y pagina los grupos por su cotización más reciente (`ordenEn`, `ordenId`), no por la cabeza.
- **Miniatura de la imagen** — `?ancho=480` de `GET /cotizaciones/<id>/imagen` (`ANCHOS_DE_LA_IMAGEN`, `webpDeLaTarjeta()`): la imagen de la tarjeta
  achicada a 480 px que piden las listas, con su propia ETag; el visor pide la grande.
- **Primer resultado** — `entities/primer-resultado.ts`, `cotizaciones_aprobadas.monto` y `moneda`: lo que la hoja dibuja primero en la tarjeta del total
  (`totales.usd`, en USD). La aprobada lo lleva congelado para que la lista de vehículos lo lea sin unir cotizaciones.
- **Papelera de cotizaciones** — `cotizaciones_papelera_*`, `cotizaciones.papelera.purgar`, `/cotizaciones/papelera`: borrado reversible por
  lote, con versión; mandar una pide verla y poder guardarla (una final, `cotizaciones.final.gestionar`). Las que se fueron con su vehículo
  están en la papelera de vehículos. La purga automática también la vacía.
- **Última cotización (de un vehículo)** — `vehiculos.cotizado_en`, `_vehiculo_cotizado()`: ordena «Últ. cotización» del panel del vehículo.
  Cotizar no edita el vehículo.
- **Historial de cotizaciones (de un vehículo)** — `<HistorialDelVehiculo>` (`cotizaciones/features/historial`): las visibles por
  `vehiculo_id`, de la más nueva, de a 20; en el panel del vehículo, un botón que lo abre en un modal (`?ver=historial`). La ficha del lead no lo usa: dibuja su **fila de tarjetas**. **Cotizado (n)**: `contarCotizacionesDelVehiculo()`.
- **Panel del vehículo** — `?panel=vehiculo` de `/cotizaciones/nuevo`, `<BarraDelVehiculo>` / `PanelDelVehiculo`
  (`vehiculos/features/panel-para-cotizar`): elige el vehículo por «Últ. cotización» o «Cierre subasta» (`?lista=ultima|cierre`) o buscando
  nombre, VIN o lote (`?buscar=`); «+» y «Traer» abren el alta del inventario en el panel (`?alta=mano|subasta`).
- **Panel del cliente** — `?panel=cliente` de `/cotizaciones/nuevo`, `<BarraDelCliente>` / `PanelDelCliente` (`leads/features/panel-para-cotizar`):
  elige el lead entre «míos» por reciente, por clase (`?clase=`) o buscando nombre o `#n` (`?buscar=`); su «+» abre el alta del shell con
  `?elegir=<clave>` (`claveParaElegir()`) y la hoja elige al creado.
- **Fórmula** — `formulas` (`definicion`, `params`): grafo de nodos versionado por fórmula del origen; ver `docs/COTIZADOR.md`.
- **Fórmula del origen** — `formulas_del_origen` (`nombre`, `activa`, `archivada_en`): una fórmula con nombre de un origen, con sus versiones
  (`formulas.formula_del_origen_id`: su borrador, su publicada y sus archivadas) y su **Plantilla de tarjeta**. Un origen tiene varias; se crea en
  blanco o como copia de una del mismo origen o de otro (`formula_del_origen_crear()`), y se renombra, archiva, elimina y activa por RPC
  (`formula_del_origen_renombrar|archivar|eliminar|activar`). No: «variante», «plantilla» (la plantilla es la de la tarjeta).
- **Fórmula activa** — `formulas_del_origen.activa` (`formulas_del_origen_activa_unica`): la fórmula del origen con que se cotiza, a lo sumo una por
  origen y siempre con versión publicada; se cotiza con su publicada (`_publicada_de_la_activa()`). Activar otra publica sus borradores y apaga la anterior.
- **Fórmula de trabajo** — `_fdo_de_trabajo()` / `leerFormulaDeTrabajo()`: la que usa una RPC que no recibe `p_formula_del_origen` y la que abren
  Planilla, Hoja y Tarjeta sin `?formula=`: la activa o, sin ella, la más nueva sin archivar; el primer guardado de un origen sin ninguna la crea. El
  editor de una fórmula lee y escribe la de su URL.
- **Activar (una fórmula del origen)** — `formula_del_origen_activar()`, «Activar…» del «⋯» (`?panel=activar-formula&formula=<id>`): volverla la que se
  cotiza en su origen. Publica con una nota sus borradores (de la planilla y de la tarjeta), exige que la tarjeta calce con la versión que se va a
  cotizar y apaga la activa anterior. Cada pieza va con su esperada (PT409 si cambió). No: «publicar la fórmula» (eso es una versión), «usar».
- **Avisos de la copia** — `AvisoDeLaCopia` (`entities/avisos-de-la-copia.ts`), `avisos` de `formula_del_origen_crear()`: lo que copiar una fórmula de
  otro origen cambió o no pudo resolver —una tabla creada con las filas de la copia, una tabla del destino usada en su lugar, un dato del vehículo
  que el origen no tiene—. La planilla de la copia abre con «Información de la fórmula», que los muestra en su sección hasta «Ocultar» (`sessionStorage`,
  `useAvisosDeLaCopia()`), y los datos que faltan quedan marcados en su fila (`useCamposDeLaFormula()`).
- **Información de la fórmula** — `?panel=info-formula` (`PANEL_DE_LA_INFORMACION`), `<BotonDeLaInformacion>`, `<InformacionDeLaFormula>`,
  `marcaDeLaInformacion()` (`cotizaciones/entities/informacion-de-la-formula.ts`): el modal de la Planilla con la información de la versión —la publicada, el
  borrador (con «Descartar el borrador…») y los avisos de la copia—, que abre el botón ⓘ junto al estado de la barra de la fórmula. El botón lleva una
  marca si algo bloquea: sin publicada, el borrador atrasado o avisos de la copia pendientes. No: «detalles», «info de la versión».
- **Nodo** — `definicion.nodos[]`: una línea de la fórmula: input, constante, tipo de cambio, campo, bandera, tabla, tramo, cálculo.
- **Constante** — nodo `constante` + `params`: valor por defecto versionado que el ⚙ de la XCell cambia.
- **Versión del flujo** — `flujos.actualizado_en` como texto ISO: la lee el editor del flujo y la devuelve cada escritura para detectar
  cambio ajeno (`PT409`); `useVersionDelFlujo()` la entrega a las acciones.
- **Inspector de fase** — lo de una fase en el panel del flujo (`?fase=<id>`, `ContenidoDeLaFase`): arriba sus avisos y el «⋯» con sus acciones (mover y
  jubilar o eliminar) y debajo tres **pestañas de la fase**: «Reglas» (abre primero: «Requisitos para entrar», «Salidas y quién mueve» y «Reglas que la
  afectan»), «Identidad» y «Ajustes».
- **Pestañas de la fase** — `PESTANAS_DE_FASE` (`entities/fases/bloques-de-fase.ts`), `?fase=<id>&pestana=reglas|identidad|ajustes`: «Reglas», «Identidad»
  (nombre, descripción, color, icono) y «Ajustes» («En el flujo», «Alerta por demora», «Transporte y aduana», «Web y portal»). Identidad y Ajustes son un solo
  formulario y un solo «Guardar». No: «Datos», «tabs».
- **Panel del flujo** — `PanelDelFlujo`: el `<Drawer>` al costado del editor del flujo (pestaña Fases de un origen, Flujo de repuestos) (no modal desde 1024 px) con una fase (`?fase=<id>`) o lo
  del flujo entero, «Reglas del flujo» o «Tipos de documento» (`?seccion=reglas|documentos`); gana `?seccion=`. No: «sidebar», «inspector» para
  lo del flujo.
- **Diagrama del flujo** — `DiagramaDelFlujo` (`disponerDiagrama()`): las fases como cajas en su orden y las salidas como flechas (ramas arriba,
  vueltas atrás abajo); apoyo visual del editor del flujo, la lista es la versión navegable. No: «grafo», «tablero».
- **Versión de la fórmula** — `formulas.version`: número de una publicada o archivada, por fórmula del origen (el borrador no tiene).
- **Borrador de la fórmula** — `formulas.estado = 'borrador'`: a lo sumo uno por fórmula del origen, sin número; lo publicado no cambia hasta publicarlo.
  «Descartar…» (`<Confirmar>`) no se deshace. No es la «Pregunta al descartar» ni el «Borrador» de un formulario (`useBorrador()`).
- **Versión de origen** — `formulas.version_origen_id`: en un borrador, la publicada sobre la que se empezó (si ya no lo es, publicar da
  PT409); en una publicada o archivada, la que reemplazó.
- **Revertir la fórmula** — `formula_revertir()`: publica la N+1 como copia (con su diseño) de una archivada; no es el ↺ de la XCell.
- **Bucket** — `definicion.buckets` (nombre → nodo `tipo_cambio`), `grupos[].bucket`: papel del dinero (pagado afuera, en aduana) y el tipo de
  cambio que lo convierte.
- **Snapshot** — `cotizaciones.valores`, `fuentes`, `tipos_cambio`: todo lo que el cálculo usó.
- **XCell** — `src/shared/ui/xcell`: celda numérica editable del cotizador: valor, default, revertir, ayuda, ⚙, sugerido, teclado. Con el aspecto
  de V1: un campo de alto fijo (56 px como mínimo) con rótulo · valor(es) · acciones (candado · ⚙ · ? · ↺); tocar cualquier parte la edita, el rótulo
  flota y la nota va dentro; `XCELL_COMPACTA` la vuelve densa (la hoja de ítems).
- **Modo Live** — `useLive()` / `<Monto>`: oculta cifras y símbolos de moneda en toda la app.
- **Tabla de referencia** — `tablas_referencia`, `_filas`: alimentan nodos tabla/tramo (impuestos, tramos, tarifas, depreciación).
- **Publicar una tabla de referencia** — `tabla_referencia_publicar()`: reemplaza sus filas, sube `tablas_referencia.version` y publica la
  N+1 de cada fórmula que la usa con la copia congelada.
- **Columna de una tabla de referencia** — un elemento de `tablas_referencia.columnas`: clave (no cambia), etiqueta (su nombre) y tipo número, año
  o texto (no cambia).
- **Crear una tabla de referencia** — `tabla_referencia_crear()`: nombre (de él sale la clave, que no cambia), para un origen o compartida, y sus
  columnas; nace en la versión 1 sin filas. «Nueva tabla» en el drawer de las tablas de un origen («Tablas» en la barra de la fórmula) o la misma «Nueva tabla» eligiendo «Compartida con todos los orígenes».
- **Cambiar las columnas** — `tabla_referencia_columnas()`: renombrar, ordenar, sumar y quitar columnas de una tabla; sube su versión sin
  publicar la N+1 de ninguna fórmula y borra de las filas la clave quitada.
- **Tabla desactivada** — `tablas_referencia.activa = false` (`tabla_referencia_desactivar()`): sale de las listas y de BUSCARV; no se deshace
  desde la app y su clave queda tomada.
- **Tabla o columna en uso** — `_tabla_referencia_usos()`: la nombra la publicada o el borrador de una fórmula del origen sin archivar, en un
  origen que recibe la tabla. Una tabla en uso no se desactiva y una columna en uso no se quita.
- **Propio / compartido (catálogo)** — un puerto, una naviera, una categoría de gasto (`origen_id`) o un tipo de documento (`flujo_id`) es
  propio de un origen (del flujo de repuestos, un tipo) o compartido con todos (nulo). Un origen **usa** sus propios y los compartidos que no tapa;
  la base exige que lo que se guarda sea de lo que usa el origen de la unidad («es de otro origen»). Un compartido pide
  `logistica.catalogos.gestionar` en cada origen que lo usa; un propio, en su origen (un tipo propio, también quien configura su flujo).
- **Tapar** — un propio **activo** tapa en su origen al compartido de su misma **clave** (`_catalogo_clave()` / `claveDeCatalogo()`: sin
  mayúsculas, tildes ni espacios de más; un puerto, de nombre y país). Nada se reescribe: lo guardado sigue apuntando al compartido, rotulado
  «(tapado)». Igual en las tablas de referencia (abajo).
- **Tabla compartida** — tabla de referencia con `origen_id` nulo: la usan los orígenes sin una propia de esa clave; la propia la **tapa** (va
  `tapada` en la lista de ese origen). Se ve en el grupo «Compartidas» del drawer de las tablas de cada origen que la recibe (las propias, en «De <origen>») y se edita ahí, con el aviso
  de a quién le cambia; publicarla pide `cotizaciones.configurar` en cada origen que la usa.
- **Tarjeta de la cotización** — `<TarjetaDeCotizacion>`, `geometriaDeLaTarjeta()`: la vista previa tipo Excel de una cotización, lo que ve el
  cliente: la misma en la vista previa, el PDF, la imagen y «Copiar texto». No es la **tarjeta de la lista** (cada ítem de la vista Tarjetas de un
  listado) ni la **Tarjeta del total** de la hoja.
- **Plantilla de tarjeta** — `plantillas_tarjeta`: cómo se ve la tarjeta de la cotización, de una fórmula del origen, versionada aparte y validada por `validar_plantilla()`.
  Dos formas: la **forma 1** (grupos con color, etiquetas y leyendas por nodo, total, nota, logo, columnas), que se convierte a la cuadrícula al
  leerla (`convertirPlantilla()`, `_plantilla_convertir()`) y no se migra; y la **forma 2** o **cuadrícula** (`"forma": 2`: columnas, filas y
  celdas libres), `PlantillaEnCuadricula` en `entities/cuadricula-de-la-tarjeta.ts`.
- **Celda de la tarjeta** — `CeldaDeLaTarjeta`, `definicion.celdas[]` de la forma 2: un rectángulo de la cuadrícula con su posición (`fila`,
  `columna`), su combinación (`abarca_columnas`, `abarca_filas`), su contenido (texto, dato, logo, foto del asesor, vacío, una **lista de respaldo** o unas
  **condiciones de la tarjeta**) y su estilo. La de logo dibuja
  sólo el logo de la empresa, a la medida de la celda; su nombre es el dato «Nombre de la empresa» (`empresa_nombre`). No es la **Celda (de la hoja)**.
- **Asesor (de la tarjeta)** — `AsesorDeLaTarjeta` (`ContextoDeLaCotizacion.asesor`: nombre, teléfono, cargo y foto), `leerAsesorQueMira()`, variables
  `asesor_*`: quien mira o comparte la tarjeta, su imagen, su PDF o su texto, nunca quien creó la cotización (ese es el **autor**, «Creado por»). Con «Ver como», la
  persona real. Sus datos salen de su perfil: `whatsapp_web`, `cargo_web` y `avatar_ruta`.
- **Autor (de una cotización)** — `cotizaciones.creado_por`, `leerAutorDeLaCotizacion()`: quien la creó; «Creado por» del panel de compartir, de la lista y
  del historial. No es el asesor de la tarjeta.
- **Foto del asesor** — `{tipo: 'foto_del_asesor'}` de una celda de la tarjeta, `<FotoDelAsesorDeLaCelda>`, `circuloDeLasIniciales()`: la foto de perfil
  del **asesor de la tarjeta** (quien la mira o la comparte), entera (`contain`) en la celda y alineada como ella; sin foto, o si no carga, sus iniciales
  en un círculo. En el editor, un contenido más («Foto del asesor»), como el logo.
- **Fila de la tarjeta** — `FilaDeLaTarjeta`, `definicion.filas[]` de la forma 2: una fila con su alto y su «Ocultar si…». No es la **Fila (de la
  fórmula)**.
- **Ocultar si…** — `ocultar_si` de una fila de la tarjeta (`nunca`, `no_aplica`, `no_aplica_o_cero`, `condiciones`): la fila no se dibuja si su nodo no
  aplica en esa cotización (otra opción de la variante, un interruptor apagado) o vale 0, o, con «Según condiciones», si se cumplen todas las de su `si` (de 1
  a 3, unidas con Y; sin «si no»); las celdas combinadas que la cruzan se acortan. El lienzo de
  Configuración dice cuáles y por qué con la referencia elegida: «Ocultas con esta referencia (N)».
- **Dato de la tarjeta** — `{tipo: 'dato', …}` de una celda: una variable de la cotización (`VARIABLES_DE_LA_TARJETA`: `empresa_nombre`, «Nombre de
  la empresa»; `fecha_larga`, `numero`, `asesor_nombre`, `asesor_telefono` «WhatsApp del asesor», `asesor_cargo` «Cargo del asesor»…) o un nodo de la fórmula con qué mostrar (`MOSTRAR`: `monto`, `etiqueta`, `descripcion`, `porcentaje`, `tc_nombre`, `tc_valor`,
  `plazo`). También va adentro de un **texto con datos**. En el editor, «Dato» dice «Cuál dato»: «Uno», «El primero con valor» (una **lista de respaldo**) o
  «Según condiciones» (las **condiciones de la tarjeta**).
- **Texto con datos** — `{tipo: 'texto', partes}` de una celda de la tarjeta: un texto que mezcla texto literal y datos de la tarjeta insertados («Comisión giro
  4,2 %», con el porcentaje de cada cotización); de 1 a 20 partes, al menos un dato y hasta 300 caracteres de texto. Un dato sin valor no escribe nada. En el
  editor es «Contenido: Texto» con «Insertar dato», y cada dato insertado se ve como una **pastilla** (`TextoConDatos`, `entities/texto-con-datos.ts`).
- **Pastilla** — un dato insertado en un texto con datos, como lo dibuja el campo del editor de la tarjeta: un solo carácter que dice el nombre del dato
  («% Transferencia a USA», «Nombre del cliente»), que se borra entero y se toca para cambiarlo. No es el «Botón de variable» del editor de texto con variables.
- **Lista de respaldo** — `{tipo: 'respaldo', datos}` de una celda de la tarjeta, «El primero con valor» en el editor: de 2 a 5 datos de la tarjeta en orden;
  la tarjeta muestra el primero que tiene valor y, si ninguno, la celda vacía (`resolverElContenido()`). No es el título de respaldo de la cotización
  («Cotización n.º N»).
- **Condiciones de la tarjeta** — `{tipo: 'condiciones', ramas, si_no}` de una celda de la tarjeta, «Según condiciones» en el editor: de 1 a 4 ramas («si se
  cumplen estas condiciones, mostrar esto») y el «si no» (hasta 5 contando él); se muestra lo de la primera rama cuyas condiciones se cumplen todas o, si ninguna, lo del «si no».
  Cada rama muestra un texto, un dato o nada. Una fila también se oculta «Según condiciones» (**Ocultar si…**).
- **Condición (de la tarjeta)** — `CondicionDeLaTarjeta`: lo que pregunta una rama de las **condiciones de la tarjeta** o una fila que se oculta «Según
  condiciones», como frase («Remate es mayor que 1.000»): si un dato tiene valor (`vacio`, `no_vacio`), si un nodo vale 0 (`cero`, `no_cero`), se compara con
  un número (`mayor`, `menor`, `igual`), es una opción de la variante (`opcion`) o un interruptor está encendido (`encendido`, `apagado`). Hasta 3 por rama,
  unidas con Y. Un nodo que no está en la versión deja la condición sin respuesta y la rama se salta. No es la **Condición (de la fórmula)** ni la `condicion` de
  un nodo (el **interruptor**).
- **Lienzo** — `LienzoDeLaPlantilla` (área `tarjeta`) con la capa del editor (`CapaDeEdicion`, `role="grid"`): la tarjeta de la cotización a escala
  que se edita en la pestaña Tarjeta de la página del origen, como un Excel (cabeceras de columna, asas de fila, selección, atajos). La dibuja el
  mismo modelo de dibujo que el PDF. No es el lienzo del diagrama del flujo.
- **Rango (de la tarjeta)** — `Seleccion` de tipo `celdas` (`entities/plantilla/edicion/seleccion.ts`): las celdas de la tarjeta elegidas juntas en el lienzo (Shift+clic,
  arrastrar, Shift+flechas); se agranda hasta contener entera cada combinación que corta. Lo que se combina, se vacía, se copia o recibe un formato. No es el **Rango (de un campo)**.
- **Referencia de la tarjeta** — `ReferenciaDeLaTarjeta` (`entities/referencia-de-la-tarjeta.ts`): con qué cifras se dibuja el lienzo: la cotización más
  reciente del origen que quien configura ve (lo guardado, como el PDF) o las cifras de ejemplo (`?referencia=ejemplo`). Decide qué filas se ocultan:
  «Ocultas con esta referencia (N)».
- **Geometría de la tarjeta** — `Geometria`, `geometriaDeLaTarjeta()`: el único modelo de dibujo de la tarjeta de la cotización: el ancho, el alto
  y, por celda visible, su rectángulo en px, su contenido ya resuelto y su estilo, más las filas ocultas. Lo pintan con posiciones absolutas el HTML,
  el PDF (`DocumentoDeLaTarjeta`) y la imagen (`pngDeLaTarjeta()`).
- **Lectura de la tarjeta** — `cotizacion_tarjeta()`: lo que dibujan la tarjeta y el PDF de una versión: la cuadrícula (convertida si la plantilla
  publicada es de la forma 1) validada contra esa versión y sólo lo del nivel «todos» que nombra. No es la **Tarjeta del total**.
- **Tarjeta por omisión** — `{estado: 'sin_plantilla'}` de `cotizacion_tarjeta()` o un recálculo sin estados: la plantilla no le sirve a esa versión
  y la tarjeta muestra sólo el total (fecha, número, asesor, vehículo, logo; sin filas, que podrían ser de un nivel restringido).
- **Vista previa** — `?panel=vista-previa`, `<VistaPreviaDeLaHoja>`: modal con la tarjeta de la cotización (`<TarjetaDeCotizacion>`,
  `geometriaDeLaTarjeta()`) como la vería el cliente, escalada como una imagen; en una guardada, lo guardado.
- **Retoque de la tarjeta** — `cotizaciones.tarjeta_retoques`, `RetoquesDeLaTarjeta`, `cotizacion_retocar_tarjeta()`, `aplicarRetoques()`: el texto
  de una celda de texto cambiado o una fila oculta en la tarjeta de **una** cotización guardada, sin tocar la plantilla del origen; vale en la vista
  previa, el PDF, «Copiar texto», compartir y la imagen de la tarjeta, y cotizar encima se lo lleva. Nunca una cifra, un color ni el logo. Un retoque de una celda o
  fila que la plantilla de hoy ya no tiene **no aplica**: se ignora al dibujar y se quita al guardar.
- **Retocar (modo)** — «Retocar» en el pie de la vista previa de una guardada (quien la puede guardar): el modal pasa a «Retocar la tarjeta», donde
  tocar un texto lo edita y el ojo de cada fila la oculta o la muestra; «Listo» guarda todo junto, «Cancelar» lo descarta y «Volver a la plantilla»
  quita los retoques.
- **Imagen de la tarjeta** — `GET /cotizaciones/<id>/imagen`, `armarLaImagen()`, `rutaDeLaImagen()`, `<ImagenDeLaTarjeta>`: la tarjeta de lo guardado de una cotización en WebP,
  armada al pedirla **para quien la pide** (lo que esa persona ve y ella como asesor) y nunca guardada; la caché del navegador la reusa con su ETag, que sale
  de la **huella de la imagen** (`cotizacion_imagen_huella()`: de qué está hecha para quien pide). En la lista, el resumen y la ficha del vehículo; «Compartir»
  la manda. No es la **Portada** de un vehículo ni la **Vista previa** (el modal con la tarjeta en HTML).
- **PDF de la cotización** — `GET /cotizaciones/<id>/pdf`, `pdfDeUnaGuardada()`: la tarjeta de lo guardado en A4; lo descarga quien la ve
  («Descargar PDF», junto a «Copiar texto» y en «Compartir la cotización»). No es el **Compartir** de un lead.
- **Compartir la cotización** — `PanelDeCompartir`, `DatosParaCompartir`, `textoParaCompartir()`, rutas `GET /cotizaciones/<id>/compartir` y
  `…/compartir/fotos`, `?panel=compartir` (en el detalle) y `?panel=compartir&para=<id>` (fuera de él), pestaña en `?compartir=texto`: el panel «Compartir
  cotización» para mandarle la cotización a un cliente. La pestaña **«Imagen»** ofrece **«Cotización»** (la imagen de la tarjeta) o **«Fotos»** (las del
  vehículo, para marcar); la pestaña **«Texto»**, un **formato** («Simple», «WhatsApp», «Facebook», «TikTok») y una **zona** («Hora de <la ciudad de la
  empresa>» o «Hora del patio»); el texto firma con el asesor (quien comparte: «Asesor: nombre, cargo» y «WhatsApp: …»). Botones: «Compartir» (el menú del sistema del celular), «Copiar imagen», «Descargar imagen», «Copiar texto» y «Descargar PDF».
  Sólo lleva lo del nivel «todos» (lo que dibuja la tarjeta de la cotización). No es el **Compartir** de un lead ni **Compartir los tipos de cambio**.
- **Revisión** — `cotizaciones_revisiones`: diff de cada edición.
- **Reporte** — `cotizaciones_reportes` / `cotizacion_reportar()`, `cotizacion_reporte_retirar()`: marca de problema, uno por persona, con
  motivo; no cambia estado ni versión. «Reportada» = activa con reportes (el valor `reportada` del enum no se usa).
- **Moderar** — `cotizacion_moderar()` (`cotizaciones.moderar`): «Invalidar» (`invalida`, conserva los reportes), «Descartar los reportes»
  (`activa`) o «Reactivar» una inválida (`activa`, borra sus reportes); pide verla y la versión, y en una final `cotizaciones.final.gestionar`
  del origen. Quien modera también borra comentarios y quita adjuntos ajenos.
- **Comentario / Respuesta** — `cotizaciones_comentarios` (`padre_id`) / `cotizacion_comentarios()`, `cotizacion_comentar()`: lo escribe quien
  ve la cotización; un nivel (la respuesta a una respuesta cuelga de su raíz). Raíz borrada con respuestas: «Comentario eliminado.»; respuesta
  o raíz sola se quitan.
- **Adjunto** — `cotizaciones_adjuntos` / `cotizacion_adjuntar()`, `cotizacion_adjunto_quitar()`: archivo del bucket `cotizaciones`; lo sube
  quien puede guardarla (`cotizacion_puede_adjuntar()`), hasta 20.
- **Comprobante** — `comprobantes`, `comprobantes_contadores`: comprobante de venta interno de una final activa, numeración sin huecos; congela
  en `datos` sólo lo del nivel «todos»; se anula, no se borra.
- **Comprobante vigente** — sin anular (`anulado_en is null`): a lo sumo uno por cotización (`comprobantes_un_vigente_por_cotizacion`); para
  emitir otro se anula el vigente; con uno vigente no se marca otra final del vehículo.
- **Tipo de cambio oficial / paralelo** — `tipos_cambio.clave` (`oficial`, `paralelo`): TCO y TCP; cada fila o grupo elige el suyo.
- **Modo de tipo de cambio** — `diseno.cabecera.modos[]` / `cotizaciones.modo_tc`: nombre (Aduana, Paralelo, Unificado…) y qué tipo de cambio
  llena cada bucket. La hoja abre con el marcado (`Entradas.modoTc`); con uno solo visible no se elige ni se nombra.
- **Modo por defecto** — `diseno.cabecera.modo_por_defecto` / `modoInicial()`: el modo con que abre una cotización nueva del origen (sin él, el
  primero); va con «Ver total» por defecto (`ver_total_bs_por_defecto`). Lo cambian el ⚙ de la cabecera y el diseño de Configuración.
- **Modos visibles** — `diseno.cabecera.modos_visibles` / `modosDelEncabezado()`: los modos que se dibujan en el encabezado de la hoja (sin la
  lista, todos). El modo por defecto siempre está entre ellos, y el que una cotización tiene elegido se dibuja aunque no lo esté.
- **Pasos de la hoja** — `pasosDeLaHoja()` / `<PasosDeLaHoja>`: la fila «Privada · Vista previa» de arriba de la hoja. «Privada» (el interruptor de la
  **cotización privada**) sólo en la hoja nueva y para quien puede marcarla; una guardada lleva sólo «Vista previa»; sin ninguno, la fila no se dibuja.
  El vehículo y el cliente se eligen en sus barras.
- **Ranura de la cabecera** — `<RanuraDeLaCabecera>`, `<ProveedorDeLaRanuraDeLaCabecera>`, `useRanuraDeLaCabecera()`: el lugar en la fila de las barras del
  vehículo y del cliente (`data-cabecera-de-la-hoja`) donde la cabecera de la hoja (los modos, «Ver total en moneda local» y su ⚙) se dibuja por un portal;
  hasta hidratar muestra la **cabecera quieta** (`<CabeceraQuieta>`: las mismas piezas, inertes). Sin proveedor (el lienzo del editor), la cabecera va en su
  lugar dentro de la hoja. No es el lugar de «Guardar» en la cabecera de una guardada (`useRanuraDeGuardar()`).
- **Grupo (de la hoja)** — `definicion.grupos[]` / `nodo.grupo`: filas con bucket, plazo de pago y color, con subtotal en USD y Bs. No es un nodo
  ni un grupo de campos.
- **Plazo de pago** — atributo del grupo: cuándo se paga, como texto («2 días», «4 meses (Aprox.)»).
- **Total en dólares** — `definicion.total_en`; en el motor `totales.usd` (y `totales.suma_usd`): total en Bs ÷ tipo de cambio de `total_en`.
- **Faltante** — `Resultado.faltantes`, `CODIGOS_DE_FALTANTE` (`entities/motor-contexto.ts`): por qué un valor quedó sin número.
- **Entrada del motor** — `Entrada`, `esquemaEntrada` (`entities/motor-entrada.ts`): lo que el motor recibe además de la fórmula: inputs,
  banderas, tipos de cambio, campos del vehículo, tablas.
- **Entradas de la persona** — `p_entradas` de `cotizacion_evaluar()`: `inputs`, `banderas`, `overrides` y `variante`.
- **Valor sugerido / modificado** — `cotizaciones.fuentes` (`sugerido` / `override`), `sobrescribible`: sugerido lo propone tabla, tramo o
  cálculo; modificado lo sobrescribió el asesor. No: `lookup`.
- **Par porcentaje-monto** — `calculo porcentaje_de` `sobrescribible` y su `pct`: celda editable por monto o %; manda el monto si se sobrescribió.
  También el de una celda de la hoja cuyo `pct` es una constante o un input que sólo él nombra (`paresDeLaHoja()`).
- **Pisar un cálculo** — escribir un valor encima de una celda calculada al cotizar (`tabla`, `tramo` o `calculo` que no es el total, si la hoja
  lo dibuja en una celda: `pisables`, `esPisable()`); queda fijo aunque cambien los datos y su celda queda «Editado a mano». Lo que daba es
  `calculados` («Calculado: $480»). No: «sobrescribir» (es la marca `sobrescribible` de la fórmula).
- **Editado a mano** — la marca de una celda con un cálculo pisado: el lápiz (`role="img"`), `handEdited` de la `XCell`, `ladoPisado()`; va con
  «Calculado: …» y ↺ «Volver al calculado». Sólo en la hoja y bajo su total («Editado a mano: Transferencia a USA $500, calculado $480»); la
  tarjeta, el PDF y la imagen no la llevan. No: «modificado» (el anillo de todo override, también el de una constante).
- **Variante en par** — «Se cotiza en par», `en_par` del nodo `opcion` de exactamente dos opciones (`par_sin_dos_opciones`); `ParDeHoja`, `nodosEnPar()` /
  `_nodos_en_par()`: la hoja no dibuja sus chips y lo que cambia según la opción va en dos celdas («Transporte · 20 pies» | «Transporte · 40 pies»); guardar crea
  dos **cotizaciones hermanas**. No es el **Par porcentaje-monto**.
- **Fórmula como texto** — `compilarExpresion()` (`entities/compilador.ts`): `=(remate+fees)*4%`, `=SUMA(aduana)`; se compila a nodos.
- **Función (de la fórmula)** — `FUNCIONES` (`entities/compilador-funciones.ts`), `FUNCIONES_DE_LA_AYUDA` (`entities/formula/ayuda-de-funciones.ts`): las diez
  que entiende la fórmula como texto: SUMA, SI, Y, O, MAX, MIN, BUSCARV, REDONDEAR, PORCENTAJE_DE y DEPRECIAR; con su firma, una frase y un ejemplo
  en el autocompletar y en el panel «¿Cómo se escribe?» de la planilla.
- **Condición (de la fórmula)** — lo que decide un SI, un Y o un O: una bandera o un `calculo` `comparar` (`remate>1000`), `es_opcion`
  (`variante="b"`), `y` u `o`; vale 1 o 0 (`OPS_DE_CONDICION`, `NodoDeComparacion` en `entities/nodos.ts`). Un SI con condición es el nodo
  `elegir`, con la condición en su `prueba`. No es la `condicion` de un nodo (el **interruptor** que lo apaga) ni el `si` de una bandera.
- **BUSCARV** — la función de la fórmula como texto que busca en una tabla de referencia del origen (`compilador-buscarv.ts`): exacta (por la
  primera columna de la tabla, compila a un nodo `tabla`) o por tramo (`VERDADERO`: `desde` ≤ valor ≤ `hasta`, compila a un nodo `tramo`). La
  tabla y la columna se revisan contra el **catálogo de tablas** del origen (`CatalogoDeTablas`, `leerCatalogoDeTablas()`). No: «lookup».
- **Nodo auxiliar** — `<fila>__<n>` en `compilarExpresion()`: cada operación anidada o número de una fórmula como texto, numerado en
  post-orden; cuáles lo son, `auxiliaresDe()` (`compilador-auxiliares.ts`). La constante auxiliar no pide celda en el diseño.
- **Fila (de la fórmula)** — `Fila`, `filasDe()` (`entities/formula/filas.ts`): un nodo que no es auxiliar de otro, con sus auxiliares y su
  `texto`; una fila numerada de la planilla.
- **Planilla de la fórmula** — `PlanillaDeLaFormula` (`features/formula/components/planilla/`), `hojaDeLaPlanilla()`: la pestaña «Planilla» del editor de
  una fórmula del origen, que se edita como una hoja de cálculo (`role="grid"`): las filas en el orden en que se calculan, numeradas de 1 a n, con A ·
  concepto, B · %, C · valor (lo que guarda la fórmula) y **Ejemplo (columna)**. Se escribe en la celda o en la **Barra de fórmula**, con **Referencias
  (de la planilla)**; las filas se insertan, duplican, mueven y eliminan desde su «⋯», el clic derecho, Alt+↑/↓ o arrastrando su número. «Totales» y la
  tarjeta en vivo abren al costado (`?costado=totales|tarjeta`). Es el único editor de la fórmula.
- **Banda (de la planilla)** — `TramoDeLaHoja` (`entities/formula/hoja-de-la-planilla.ts`): un tramo de filas seguidas con el mismo grupo, con su cabecera
  (etiqueta, plazo y tipo de cambio) y el color del grupo; un grupo partido en dos tramos son dos bandas. Se crea, renombra, colorea y quita desde su «⋯»
  o el de la planilla (`bandas.ts`). Las filas sin grupo no llevan cabecera.
- **De dónde sale** — `deDondeSale()` (`entities/formula/de-donde-sale.ts`): lo que calcula una fila, en palabras y con las etiquetas de lo que nombra
  («(Remate + Fees) × 4 %», «monto fijo»). Se lee en la línea bajo la **Barra de fórmula** («De dónde sale: …», la de la fila elegida) y, en lo que la
  fórmula no guarda como número ni como texto (lo que escribe el asesor, un dato del vehículo, un tipo de cambio, una tabla…), en su C.
- **Decimales (de una celda)** — `decimales` del nodo (0 a 4; `entities/decimales-de-celda.ts`, `decimalesDe()`), «Decimales…» del «⋯» de la fila de la
  planilla (`?panel=decimales&fila=<id>`): con cuántos decimales se muestra el valor de esa celda en la hoja, la tarjeta de la cotización (y su PDF, su
  imagen y su texto con datos), comparar, las revisiones y la columna Ejemplo. Sin la clave, **Automático**: lo de siempre en cada superficie. Sólo la
  vista: se redondea mitad lejos del cero como `redondear()` y se muestra con N fijos (`cifra-fija.ts`); lo guardado y lo que se edita siguen completos.
  En un porcentaje, decimales de puntos. No la lleva una celda que se ve como texto. No: «precisión», «formato numérico», «redondeo» (`redondear` es una
  operación que cambia el valor).
- **Ejemplo (columna)** — la última columna de la planilla (`contenidoDeLaFila()`, `entities/formula/contenido-de-c.ts`; clave interna `D`:
  `data-celda="D5"`, se nombra «Ejemplo 5»): lo que da la fila con la **Unidad de ejemplo**. Nada en un valor fijo (su número ya está en C: la misma cifra
  no se dibuja dos veces), el valor de la unidad en las filas que se llenan al cotizar (se escribe ahí, nunca en su C) y la cifra en las demás. No se usa en
  una fórmula: «D5: Ejemplo no se usa en una fórmula: es la unidad de ejemplo. En una fórmula va C5.». No: «columna D», «valor de prueba».
- **Nuevo color al vuelo** — `NuevoColorAlVuelo` (área `diseno`, por el hueco `NuevoColor`: `entities/nuevo-color.ts`): «+ Nuevo color» bajo el selector de
  color del panel de una banda (`?color=nuevo`); crea el color en el catálogo con `tono_crear()` y lo deja elegido en la banda, sin releer.
- **Unidad de ejemplo** — `UnidadDeEjemplo` (`entities/formula/unidad-de-ejemplo.ts`): lo que se escribe en la **Ejemplo (columna)** de las filas del
  asesor, los datos del vehículo, los interruptores y la variante para ver el efecto de cada cambio en Ejemplo, «Totales» y la tarjeta en vivo. Arranca en ceros como las «Cifras
  de prueba», vuelve a ceros desde el «⋯» de la planilla y no se guarda.
- **Barra de fórmula** — `BarraDeFormula` (`components/planilla/barra/`), fija arriba de la cuadrícula: el nombre de la celda activa («C5», «Ejemplo 5»),
  `fx ▾` (inserta una función, `insertarFuncion()`), su texto (el mismo que se edita en la celda, uno solo a la vez; vacío, «Escribe = y toca las celdas:
  =C5+C7»), con cada referencia pintada de su color, la leyenda, las sugerencias y el error con su tramo; a la derecha «Totales», «Tarjeta» y «?» (los
  tipos de celda). Debajo, una línea: «De dónde sale: …» de la fila elegida. No es la **Barra de la fórmula** (la de la página: estado, guardar, publicar).
- **Firma en el cursor** — `firmaEnElCursor()` (`entities/formula/firma-en-el-cursor.ts`), `RenglonDeLaEdicion`: mientras se escribe dentro de una función en C, su
  forma en el renglón bajo la barra de fórmula con el valor que se escribe en negrita («SI(condición; **si se cumple**; si no)»); gana la de más adentro. Sin
  función y con el cursor esperando un operando, «Toca una celda para usarla.». No: «tooltip», «ayuda de argumentos».
- **Resultado al lado** — `resultadoAlLado()` (`entities/formula/resultado-al-lado.ts`), `ResultadoAlLado`: mientras se escribe una C que empieza con «=», la cifra
  que daría con la unidad de ejemplo, en la caja entre el texto y «Aplicar», con los decimales de la celda. Se calcula 150 ms después de la última tecla y sólo con
  un texto que compila; sin cifra, la caja queda vacía. No: «vista previa» (la columna Ejemplo de toda la planilla), «preview».
- **Referencia (de la planilla)** — `C5`, `B9` (`entities/formula/referencias-a1.ts`): cómo un cálculo de la planilla nombra otra fila, como en
  Excel: `C<n>` es el valor de la fila n y `B<n>` su %. Se guarda el id del nodo (`nodo.texto` con ids) y se muestra como A1 (`aA1()`); lo tipeado
  pasa a ids antes de compilar (`deA1()`). Insertar, mover o borrar filas cambia lo que se muestra, nunca lo guardado. No distingue mayúsculas; los
  `$` se aceptan y se ignoran.
- **Rango (de la planilla)** — `C5:C9`: las filas seguidas de la columna C, sólo dentro de `SUMA`, `MAX` o `MIN`. Se guarda como la lista de ids
  (`SUMA(a; b; c)`) y una función con 3 filas o más muestra cada corrida de filas seguidas como rango. No es el **Rango (de la tarjeta)**.
- **Celda de la planilla** — una casilla de la cuadrícula de la planilla (`role="gridcell"`): la columna (A concepto, B %, C valor, Ejemplo) de una fila
  numerada. Se nombra con su **Referencia (de la planilla)**. No es la **Celda (de la hoja)** (la `XCell` del diseño) ni la **Celda de la tarjeta**.
- **Tipo de celda** — `TipoDeCelda`, `cambiarTipo()` (`entities/formula/tipo-de-celda.ts`): qué es una fila, con su nombre en la UI: «Valor fijo»
  (`constante`), «Cálculo» (`calculo`), «Lo escribe el asesor» (`input`), «Dato del vehículo» (`campo_vehiculo`), «Tipo de cambio» (`tipo_cambio`),
  «Interruptor Sí/No» (`bandera`), «De una tabla» (`tabla`; un `tramo` se ve así y no se ofrece) y «Variante» (`opcion`, una por fórmula). Un número
  escrito en C es «Valor fijo» y lo que empieza con `=`, «Cálculo»; los demás se eligen en el menú. Cambiarlo conserva id, etiqueta, descripción, la
  salida y la banda (si la fila sigue sumando) y se rechaza con el motivo si la fórmula deja de valer.
- **Cifras de prueba** — `calcularLaVistaPrevia()`, con lo que arranca la unidad de ejemplo: `evaluar()` con datos en 0, opciones apagadas, variante por
  defecto, tipos de cambio de hoy y tablas vivas; no se guarda.
- **Texto vigente** — `textoVigente()` (`entities/formula/texto-vigente.ts`): el texto de una fila con el valor del ⚙ de una constante escrito
  en su lugar (`al_dia`, `reescrito`) o «el texto ya no manda» (`no_manda`).
- **Tramo (de un error de texto)** — `Tramo`, `ErrorDeCompilacion` (`entities/motivos-del-compilador.ts`): dónde está el error (`desde`,
  `largo`; `linea`, `columna`).
- **Vigencia** — `ajustes_empresa.vigencia_dias` (7 por defecto, de 1 a 365): días que vale una cotización desde el día de su `creado_en`
  (ver «Ajustes de cotización»). Se configura en Orígenes › «Para todos los orígenes» › Vigencia (`/configuracion/origenes?panel=vigencia`).
- **Vencida** — derivada: `creado_en` + vigencia < hoy, por día en la zona de la empresa (`vence_el`, `vencida` de
  `cotizacion_hoja_guardada()`). No es un estado guardado.
- **Cotizar encima (N+1)** — `cotizacion_encima()`, `cotizacion_padre_id`, `version`: la versión nueva de una cotización (otra cotización,
  preventa, con la publicada y las tarifas de hoy y lo tipeado de la anterior); la anterior no cambia; una viva por anterior.
- **Imagen del ítem** — `repuestos_items_imagenes` / `?panel=imagenes&item=<id>`: imagen de un repuesto (hasta 8, WebP ≤ 1600 px,
  `<item>/<sha-256>.webp` en el bucket `repuestos`); no se llama «foto» (las fotos son del vehículo).
- **Ítems (de un proyecto)** — la pestaña Ítems de `/repuestos/[id]` (`HojaDeItems`, `features/items/`): una tarjeta por ítem, agrupadas por paso, con su buscador, sus filtros y «Agregar ítem»;
  hasta 200 ítems. Editable con `repuestos.editar`. No: «hoja de ítems» ni «tabla de ítems».
- **Fila del ítem** — `FilaDelItem` (`features/items/`): el ítem como una sola fila de hoja de cálculo (Ítem, Cantidad, Precio al cliente, País de origen, Vía de transporte, Moneda, Tracking, Notas),
  editable celda a celda; está en el drawer del ítem (`?item=`) y en el de «Agregar ítem» (`?panel=nuevo-item`). No: «fila de la tabla».
- **Filtros de los ítems** — `FiltroDeItems` (`entities/items/filtro.ts`, `useFiltroDeItems`): el buscador (tipo de pieza, descripción, tracking y notas) y las fichas Fase, Tipo de pieza, Condición, País de origen,
  Vía de transporte y «Sin precio» de la pestaña Ítems; se aplican en el navegador sobre lo leído y viven en la URL. Con filtros, «N de M ítems».
- **Cliente (de un proyecto)** — `repuestos_proyectos.lead_id` (en los proyectos viejos, `cliente_nombre`), `ClienteDeLaCabecera`: el lead a quien se
  venden los repuestos de un proyecto; opcional (un proyecto para un vehículo propio no lo lleva). En «Nuevo proyecto» es «Cliente (lead)», y el de un
  vehículo nace con el lead vinculado al vehículo. No: «comprador», «contacto».
- **Hoja de una guardada** — `cotizacion_hoja_guardada()`: abre una guardada con SU versión, lo que quien mira puede guardar, la vigencia y la
  cadena (anterior y versión nueva).
- **Desactualizada** — `cotizacion_crear(… p_abierta …)` (PT409 `desactualizada`): la fórmula o un tipo de cambio cambió tras abrir la hoja:
  «Usar la versión N+1» o «Guardar con la N». No es «vencida».
- **Guardar sin vehículo** — `cotizaciones.crear.sin_vehiculo` (por origen, sin alcance): guardar una preventa sin elegir su vehículo. Sin ella en ese
  origen el vehículo es obligatorio; una final lo pide siempre. También rige al cotizar encima de una anterior sin vehículo.
- **Guardar sin lead** — `cotizaciones.crear.sin_lead` (por origen, sin alcance): guardar una preventa sin elegir su lead (en la hoja, «Cliente»). Sin ella
  en ese origen el lead es obligatorio; una final lo pide siempre. También rige al cotizar encima de una anterior sin lead.
- **Obligatorios al cotizar** — `ObligatoriosAlCotizar` (`cotizaciones`): `{ lead, vehiculo }`, lo que la hoja exige elegir según las dos claves de arriba
  para quien cotiza en ese origen; la página lo calcula con los permisos de la sesión (con «Ver como», los del rol elegido). La base decide con los reales.
  Sin vehículo, además, el título de la cotización (`loQueFalta()` da `'titulo'` después del lead y del vehículo, para cualquier rol).
- **Título de la cotización** — `cotizaciones.titulo` / `titulo_manual`, `tituloDeLaCotizacion()`, `<ProveedorDelTitulo>`, el campo «Título de la cotización» del
  panel del vehículo: el nombre propio de una cotización, hasta 120 caracteres. **Automático** (`titulo_manual = false`): el título del vehículo, que la base rehace
  en cada guardado; **manual**: el que alguien escribió (cambiar de vehículo lo respeta; vaciarlo lo vuelve automático). Sin vehículo es obligatorio. Lo que se
  muestra si falta: el del vehículo y, sin vehículo, «Cotización n.º N». En la tarjeta de la cotización es la variable `titulo` (sin el de respaldo). No es el
  título del vehículo (`vehiculos.titulo`) ni el de la opción de la variante (`titulo_opcion`).
- **Ajustes de cotización** — `AjustesDeCotizacion` (`empresa`): la vigencia, de `ajustes_empresa`; los cambia
  `empresa_guardar_ajustes_de_cotizacion()` con `cotizaciones.configurar` en todos los orígenes y la versión de la fila (Configuración ›
  Orígenes › «Para todos los orígenes» › Vigencia).
- **Intento (de una cotización)** — `id` uuid del cliente: `cotizacion_crear` (`p_id`), `cotizacion_guardar` (`p_intento`): repetirlo devuelve
  lo mismo (`repetido: true`); con otros datos, `intento_reusado`.
- **Hoja abierta (versión y hora)** — `abierta` de `cotizacion_hoja()`; `p_abierta` de `cotizacion_crear` y `cotizacion_evaluar`: versión,
  hora y huella de las tarifas que la base firma al abrir; vence a las 24 h (`abierta_invalida`).
- **Abrir la hoja** — `cotizacion_hoja(origen)` / `leerHojaParaCotizar()`: única lectura al cotizar: diseño recortado al nivel de quien mira,
  candados con motivo, versión y hora.
- **Recalcular (la hoja)** — `useRecalculo()` / `cotizacion_evaluar(…, p_origen, p_modo_tc, p_abierta)`: 150 ms tras la última confirmación,
  UNA llamada, aplicando la respuesta más nueva.
- **Candado (de una celda)** — `bloqueoDeLado()` / `textoDelCandado()` / `textoDelEstado()`: por qué una celda visible no se edita (se
  calcula, del vehículo, falta un nivel, interruptor apagado, otra variante).
- **Entradas (de la hoja)** — `Entradas` / `entradasDelPedido()`: lo tipeado que se manda a recalcular: `inputs`, `banderas`, `overrides`,
  variante.
- **Reconstruir lo guardado** — `_cotizacion_entradas_de()`, `_cotizacion_conservar()`: volver de `valores` y `fuentes` a lo tipeado, para
  completar lo que quien guarda no ve.
- **Huella de las tarifas (de la hoja abierta)** — `_cotizacion_huella_tarifas()`: `md5` de los tipos de cambio que nombra la versión con su
  valor al abrir la hoja; va firmada en `abierta` y `cotizacion_crear` la compara con la que reconstruye del historial.
- **Huella (de un guardado)** — `cotizaciones_revisiones.huella`: `md5` de lo que mandó quien guarda; compara el mismo intento con otros
  datos. No se lee.
- **Cargar a mano** — «+» del panel del vehículo: abre el alta del inventario en el panel; «Crear y elegir» crea el vehículo con
  `vehiculo_crear()` al confirmar (no al guardar la cotización) y la hoja lo elige. `p_vehiculo_nuevo` de `cotizacion_crear` queda sin uso
  desde la pantalla.
- **Moneda base de la cotización** — `total_base` / `ajustes_empresa.moneda_base`: sólo `USD` y `BOB`.
- **Serie de comprobantes** — `comprobantes_ajustes.serie` (la vigente, una por empresa, «A» por defecto; la cambia
  `comprobantes_serie_cambiar`) y `comprobantes_contadores` (último número de cada serie usada): numeración sin huecos.
- **Diseño de la hoja** — `formulas.diseno` / `entities/diseno.ts`, `validarDiseno()`, `validar_diseno()`: cómo se ve la hoja de un origen
  (secciones, celdas, atajos, variantes, interruptores, modos, tarjeta) y el aspecto de cada pieza en la rejilla de la hoja.
- **Hoja (pestaña)** — `/configuracion/origenes/<id>/hoja` (`?formula=<id>`), clave `hoja` de `PARTES_DEL_ORIGEN`: el nombre en la UI de la
  pestaña de la página del origen donde se edita el diseño de la hoja de una fórmula («Cómo se ve y se llena la cotización.»). El término técnico es «Diseño de la hoja»
  (`features/diseno/`); la «Hoja» de cotizar es la pantalla donde se cotiza.
- **Inspector de la hoja** — `InspectorDeLaHoja` (`cotizaciones/features/diseno/components/inspector/`), `?pieza=`: el panel a la derecha del lienzo del
  editor de la hoja con lo que se edita de la pieza elegida (una celda, unos atajos, una variante, un interruptor, un subtotal, una sección, la cabecera o la
  tarjeta del total): rótulo y formato, columnas, niveles, ayuda y aspecto. Sin pieza elegida muestra «Sin lugar en la hoja (N)», las filas que la fórmula
  muestra y la hoja todavía no ubica. La pieza va en la URL (`textoDeLaPieza()`, `entities/diseno/pieza-de-la-hoja.ts`); Esc o «×» lo cierran. No es el
  **Inspector de fase**. No: «panel de propiedades», «formulario de la pieza».
- **Pieza (de la hoja)** — `PiezaDeLaHoja` (`entities/diseno/pieza-de-la-hoja.ts`, `?pieza=`) y `ClaveDePieza` (`entities/diseno.ts`): lo que se elige en el lienzo del editor de la
  hoja: una sección (`seccion-<id>`), un ítem del diseño (una celda, unos atajos, una variante, un interruptor o un subtotal, por su nodo; la tarjeta del total,
  `tarjeta-del-total`) o la cabecera (`cabecera-de-la-hoja`). Se elige, se mueve, se suma y se quita en el lienzo, y se edita en el inspector.
- **Barra de la fórmula** — `BarraDeLaFormulaDelOrigen`, `<ConLaBarraDeLaFormula>`, `<AccionesEnLaBarra>` (`cotizaciones/features/barra-de-la-formula/`): la
  barra de arriba de las pestañas Planilla, Hoja y Tarjeta de la página del origen: el selector «Fórmula: X (activa) ▾» (la elegida va en `?formula=`), el estado de
  lo que se edita, «Versiones» (el drawer de las publicadas, `?panel=versiones`), «Tablas» (el drawer de las tablas, `?panel=tablas`) y los botones del editor (Guardar, Publicar), que cada editor manda a la ranura con `<AccionesEnLaBarra>`. En la Hoja,
  «Publicar…» es el de la Planilla (`PublicarEnLaHoja`), que espera mientras haya cambios sin guardar. Fuera de la
  página del origen (la puesta en marcha) los botones quedan en su lugar. No: «barra de edición», «toolbar».
- **Estado de la edición** — `EstadoDeLaEdicion` (`cotizaciones/entities/estado-de-la-edicion.ts`), `useEstadoEnLaBarra()`: lo que dice la barra de la fórmula de lo que
  se edita: «Cambios sin guardar», «Borrador» o «Publicada vN» (lo no guardado manda).
- **Aspecto** — claves planas y opcionales del diseño de la hoja / `entities/aspecto-de-la-hoja.ts`, `features/hoja/components/clases-de-la-rejilla.ts`:
  cómo se ve una pieza, de escalas cerradas (nunca px, CSS ni hex). Ítem: ancho, alto, letra y énfasis; sección: ancho, alto, relleno,
  separación, densidad, letra, énfasis y color (clave `tono`); cabecera: color, relleno, letra y énfasis. Sin la clave, lo de siempre; el editor quita la clave
  en vez de escribir el valor por defecto. El PDF y la tarjeta no lo siguen.
- **Rejilla de la hoja** — `entities/rejilla-de-la-hoja.ts` (`corteDe()`, `columnasDeLaCelda()`): las 12 columnas de cada sección (sus ítems) y
  las 12 de las secciones. Una pieza de N columnas toma su ancho cuando le tocan 16 rem o más; si no, la fila entera. Una sección sin ancho es
  «Automática» (la mitad desde 64 rem del contenedor de las secciones).
- **Alto (filas)** — `alto` de un ítem o de una sección (1 a 4; sin él, «Automático»): cuántas filas de la rejilla ocupa, desde el mismo corte
  que sus columnas. Con 12 columnas no cambia nada.
- **Relleno** — `relleno` de una sección o de la cabecera (`chico` | `medio` | `grande`; `medio` por defecto): el espacio interior.
- **Separación** — `separacion` de una sección (`chica` | `media` | `grande`; `media` por defecto): el espacio entre sus celdas.
- **Densidad (de una sección)** — `densidad` de una sección (`compacta` | `comoda`; `comoda` por defecto): el relleno de sus celdas
  (`--xcell-relleno`, `--xcell-separacion`). No es la **Densidad** de la persona; el blanco táctil no cambia.
- **Letra** — `letra` de una pieza (`chica` | `normal` | `grande`): el tamaño de su texto (pisa `--text-sm`); el título de una sección sube con
  «grande» y no baja con «chica».
- **Énfasis** — `enfasis` de una pieza (`normal` | `fuerte`): el peso de sus valores y chips; las etiquetas conservan el suyo.
- **Dato del vehículo (de una celda)** — `dato_del_vehiculo` de una celda de `cotizacion_hoja()` / `datoDelVehiculo` (`entities/hoja.ts`),
  `_hoja_datos_del_vehiculo()`: qué columna de la tabla de una celda casa con qué campo del vehículo (`tipo` ← `tipo_vehiculo`); se elige
  entre las filas de `cotizacion_tabla` en el panel del vehículo (`datosParaElegirDe()`, `guardarDatoDelVehiculo`).
- **Nivel de acceso** — `cotizaciones_niveles` / permisos `cotizaciones.nivel.<clave>.ver|editar` (`permisos.nivel_clave`) /
  `nivel_crear|renombrar|retirar|restaurar|eliminar()`: quién ve y edita una celda o sección. En la matriz de Roles se rotulan «Niveles de acceso» (bloque «Cotizaciones»);
  «Todos» es el renglón fijo, sin celdas.
- **Quién crea y quién ve** — `entities/cuadro-de-cotizaciones.ts` de `equipo` (`celdaDelCuadro()`, `cambiosDelCuadro()`),
  el resumen plegable del bloque «Cotizaciones» de la matriz de Roles (`/configuracion/roles?bloque=cotizaciones`): el cuadro rol × lugar («Todos los orígenes» o un origen) con «Crea» (`cotizaciones.crear`) y «Ve»,
  una escalera de cuatro escalones (`Ve`): «No ve», «Sólo las suyas» (`cotizaciones.ver` con «lo propio»), «Todas menos las privadas» (con «todo») y
  «Todas, también las privadas» (además `cotizaciones.privadas.ver`). Escribe en la matriz de Roles; no es otro permiso. No: «visibilidad», «alcance».
- **Retirar un nivel** — `nivel_retirar()` / `cotizaciones_niveles.retirado_en`: deja de ofrecerse.
- **Restaurar un nivel** — `nivel_restaurar()`: deshace un retiro; no cambia clave, permisos ni concesiones.
- **Motivo de uso (de un nivel)** — `_nivel_motivo_de_uso()` / `motivo_de_uso` de `niveles_con_uso()`: por qué un nivel no se elimina.
- **Nodos visibles** — `_nodos_visibles(formula_id)`: nodos de una versión que quien llama ve (y si edita) según `formulas.visibilidad`.
- **Variante** — nodo `opcion` y `solo_en`; `estados` y `se_dibuja` del motor: opciones que cambian filas y título de la tarjeta (Moto, Auto…).
- **Override descartado** — `overrides_descartados` del motor (`MOTIVOS_DE_DESCARTE`): valor del usuario no aplicado (nodo inexistente, fuera
  de variante, apagado, no sobrescribible).
- **Interruptor (de la hoja)** — ítem `interruptor` del diseño sobre un nodo `bandera`: «habilita» una fila o «muestra» algo (la garantía).
- **Atajos** — ítem `atajos` del diseño: chips que eligen una fila de una tabla de referencia y dejan su valor como sugerido.
- **Color (del catálogo)** — `tonos` (nombre técnico heredado) / `tono_*()`, `definicion.grupos[].tono`, `tono` de una sección o de la cabecera
  del diseño (`_tonos_del_diseno()`): color de la empresa por nombre y #hex (`tonos.hex`), que un grupo, una sección o la cabecera nombran por su
  clave, nunca por hex. La hoja usa sus versiones clara y oscura (fondo, borde y tinta) derivadas del hex con AA garantizado (`_color_derivar`,
  `derivarColores()`); la tarjeta de la cotización, el hex tal cual por la clave que nombra una celda o `auto` (blanco, con el texto de más
  contraste). El de un grupo gana
  en su celda; el de una sección pinta su borde y sus celdas, franjas y chips, no su fondo ni sus textos sueltos. En la interfaz nunca «tono».
- **Planilla EE. UU.** — `origenes.clave = 'planilla_usa'`: origen de ejemplo del Excel (subasta; cuatro cotizaciones en una fórmula con variante).
- **Tipo de cambio unificado y aduana** — `tipos_cambio` (claves `unificado`, `aduana`): el unificado convierte lo pagado afuera.
- **Transporte (tabla por ruta)** — `transporte_usa_bolivia`, `transporte_usa_chile` (`tablas_referencia`): tarifa por tipo de vehículo.
- **Semilla del cotizador** — `supabase/semillas/cotizador-*.sql` / `_preparar_publicacion()`: fórmulas v1 de los tres orígenes de ejemplo,
  publicadas por el camino normal.
- **Avanzado** — `presentacion: 'avanzado'` de una sección: celdas que se editan en un modal aparte (los componentes del CIF y de la póliza).
- **Sección (de la hoja)** — `diseno.secciones[]`: bloque de ítems con título, presentación (`principal` o `avanzado`), nivel opcional y su
  aspecto (ancho y alto en la rejilla de las secciones, relleno, separación, densidad, letra, énfasis y color). Su orden es el de la hoja.
- **Celda (de la hoja)** — ítem `celda` del diseño: la `XCell` de un nodo: ancho (de 1 a 12 columnas; `completo`, `mitad` y `tercio` de los
  diseños guardados son 12, 6 y 4), alto, letra, énfasis, ayuda y niveles. Se mueve dentro de su sección o a otra (hereda el nivel de la nueva: el
  inspector lo avisa).
- **Ayuda (de una celda)** — `ayuda` de una `celda` (`AyudaDeDiseno`): una lista de 1 a 8 **bloques de la ayuda** que abre «Ayuda de X» en un
  panel de sólo lectura (`?ayuda=bloques&nodo=<id>`; `?ayuda=texto` y `?ayuda=tabla` abren lo mismo); cada tabla se lee con la hoja abierta. Una
  ayuda guardada como `{texto, enlaces?}` o `{tabla}` también se acepta y se lee como bloques (`ayudaEnBloques()`, espejo de
  `_diseno_bloques_de_la_ayuda()`): un texto (más sus enlaces) o una tabla con todas sus columnas que no llena nada.
- **Bloque de la ayuda** — `BloqueDeAyuda` (`entities/diseno.ts`): cada parte de la ayuda de una celda, en orden. `titulo` (hasta 80
  caracteres), `texto` (hasta 1.000, con saltos de línea y `**negrita**`), `enlaces` (de 1 a 5, `EnlaceDeAyuda`: título de hasta 60 caracteres
  y URL `https://`, que se abren en otra pestaña) o `tabla` (hasta 3 por ayuda): una tabla de referencia del origen o compartida, por su
  clave; las `columnas` que muestra (de 1 a 20; sin ellas, todas las que quien mira lee), cada una con la celda que **llena** al tocar uno de
  sus valores (un nodo con celda en el diseño que acepta un valor: `ayuda_llena_no_acepta_valor`), y `resaltar`, la fila que casa con el
  vehículo. Publicar a mano revisa la tabla y sus columnas contra el catálogo del origen (`ayuda_tabla_inexistente`,
  `ayuda_columna_inexistente`).
- **Secundario (de una celda)** — `secundario` de una `celda`: el % (o monto) junto al valor en un `porcentaje_de`; obligatorio si el monto se
  sobrescribe. Va chico y detrás; con `como: 'monto'` el % va grande y primero (`secondaryProminent` de la XCell).
- **Subtotal (de la hoja)** — ítem `subtotal` del diseño: un nodo de cálculo dibujado como franja (el «CIF» de «avanzado»).
- **Tarjeta del total** — `diseno.tarjeta_total` (nodo total y secundarios) y la pieza `{ tipo: 'total' }` del diseño (`TotalDeHoja`): la tarjeta de
  superficie invertida con el total, la etiqueta en mayúsculas (`clases-del-total.ts`). La pieza dice en qué sección principal y lugar se dibuja, con el
  aspecto de todo ítem; va una sola, en una sección principal que ven todos (`total_repetido`, `total_en_avanzado`, `total_con_nivel`). Con la pieza, se
  dibuja a todo el ancho de su sección; sin ella (o en par, con los dos totales), sola arriba de «Avanzado». Sus avisos van debajo y fuera de la tarjeta, en
  la región del total (`<RegionDelTotal>`, `data-total-de-la-hoja`).
- **Contexto del diseño** — `ContextoDeDiseno` / argumentos de `validar_diseno()`: niveles existentes y retirados y claves de los colores; «todos»
  siempre existe.
- **Visibilidad (de un nodo)** — `formulas.visibilidad` / `_compilar_visibilidad()`: `{nodo: {ver, editar}}` por nivel, compilado al publicar.
- **Flujo** — `flujos`: la configuración de fases de un origen (o del de repuestos).
- **Fase** — `fases`: estado del ciclo; inicial, final, jubilada, logística.
- **Fase jubilada** — `fases.activa = false`: sigue en el historial y en las unidades que ya la tienen, pero deja de ser destino. Con uso se
  jubila; sin uso se elimina (`fase_eliminar`, `fase_impacto`).
- **Reactivar una fase** — `fase_reactivar`: vuelve a ser destino; valida las reglas del flujo sobre la fila y no toca el resto.
- **Fase inicial** — `fases.es_inicial` / `_vehiculo_fase_de_entrada()`: por donde un vehículo entra al flujo.
- **Copiar las fases** — `flujo_copiar_fases` / «Empezar con las fases de…» (`EmpezarElFlujo`, `?panel=copiar-fases`): un flujo de origen sin ninguna
  fase empieza como copia del de otro origen (fases activas, salidas con sus roles, roles por fase, requisitos y reglas); los tipos de documento
  «Sólo de este flujo» se crean en el destino. Lo que no se copia tal cual se dice. Su par es **Empezar en blanco** («Nueva fase»).
- **Transición** — `fases_transiciones`: paso permitido entre dos fases, con acción y nota obligatoria.
- **Salida de una fase** — en la interfaz, una transición vista desde la fase de la que parte («Salidas y quién mueve»); la que llega es una
  **entrada**. En tipos, tablas y RPC es `transicion`.
- **Requisito** — `fases_requisitos` (documento | dato | espera): qué pide una fase para entrar; bloqueante o informativo.
- **Espera** — requisito `espera`: un vehículo espera a sus repuestos / un repuesto a su vehículo.
- **Regla del flujo** — `flujos_reglas`: capacidad encendida/apagada (vitrina, portal, aduana, esperas…).
- **Oferta de transporte** — `flujos_transporte_oferta` / `flujo_oferta_guardar`: puertos de origen y destino y navieras que ofrecen los
  selectores de un flujo con la regla «Transporte»; vacía = todo lo que usa el origen (sus propios y los compartidos que no tapa); filtra, nunca
  invalida lo guardado.
- **Jubilar** — `fases.activa = false` / `fase_eliminar`: sacar una fase de los destinos sin romper el historial.
- **Fuera de regla** — `flujo_fuera_de_regla()`: unidad en una fase cuyos requisitos bloqueantes ya no cumple; sólo quien configura el flujo
  la lee, con tope.
- **Revisar** — `revisar_flujo()`: avisos de coherencia del flujo (sin salida, inalcanzable, esperas cruzadas…), de nivel error, aviso o
  información (`AvisoDeRevision`); la franja sobre el flujo los resume.
- **Cadena** — `/logistica`: la gráfica por fase de un origen (`logistica_cadena_resumen`: cuántos vehículos tiene cada fase y cuántos están demorados o trabados, con tope) y,
  al hacer clic en una fase, la lista de esa fase (`/logistica/fase/[fase]`). No: «tablero», «columna».
- **Bandeja del día** — `/logistica` (`logistica_bandeja_grupo`): lo que le toca hoy a quien mira, por grupos y con la acción de cada fila a un toque. No: «bandeja de Inicio»
  (ésa es `logistica_bandeja`, tres listas cortas).
- **Grupo (de la bandeja del día)** — uno de siete: Demorados, Trabados, Documentos por aprobar, Documentos por vencer, Llegadas esperadas, Salen hoy y Subastas sin resolver. Cada uno
  tiene su página (`/logistica/bandeja/[grupo]`), por cursor.
- **Lista de la fase** — `/logistica/fase/[fase]`: los vehículos de una fase (o «Sin fase»), de a 50 por cursor, con filtros en la URL y la selección del lote (hasta 200).
- **Llegada esperada** — un transporte de vehículo sin arribo cargado cuya ETA (la de su embarque, o la propia si va suelto) es de hoy o anterior y cuyo vehículo sigue en una fase que no es final; de la más reciente a la más vieja.
- **Mover** — `cambiar_fase()` / `previsualizar_cambio_fase()`: cambiar de fase, con vista previa de qué falta.
- **Acción del requisito** — `AccionesDelRequisito` / `resolverAccionesDeQueFalta()`, `leerQueFalta`: lo que destraba un requisito que falta en
  «Qué falta» (una principal y hasta dos más en su «⋯»): hacerlo ahí mismo («Subir», «Revisar», «Completar», «Registrar»), ir a donde se hace o
  «Pedirlo». La resuelve el servidor con los permisos de quien mira; el navegador sólo la filtra (`accionesADibujar()`).
- **Pedirlo** — `pedirLoQueFalta` / `?pedir=requisito&falta=<id>`: darle una tarea de agenda, vinculada al vehículo y sin fecha, a quien tiene el
  permiso que falta en el origen de la unidad y la ve (`agenda_quienes_reciben` con `p_permiso`). Sin `agenda.tareas.asignar`, o en un ítem:
  «Pídeselo a quien administra los roles.».
- **Alerta por demora** — `fases.demora_dias` / `alertas_demora()`: aviso cuando una unidad lleva más días de lo esperado en una fase. Job
  `alertas-demora` cada hora; se reabre pasado `fases.alerta_cada_horas` (nulo = 72 h) y mover la cierra.
- **Trabado** — `logistica_bandeja().trabados`, el grupo «Trabados» y el número de la gráfica de la cadena: unidad demorada a la que le falta un requisito bloqueante de su fase siguiente (la
  activa de menor orden con transición desde la suya); en la gráfica se miran las primeras 50 demoradas de cada fase y en el grupo hasta 200 por llamada. No: «bloqueado», «atascado».
- **Documento por vencer** — aviso `documento_por_vencer` / `documentos_vencimientos()`: un documento aprobado entró en su ventana
  (`vence_el - tipos_documento.aviso_dias`); una vez por persona y documento.
- **Documento** — `documentos`, `tipos_documento`: archivo del ciclo con estado pendiente/subido/aprobado/rechazado y vencimiento.
- **Visible en el portal** — `documentos.visible_portal`: lo ve la persona compradora en el portal. Sólo lo enciende quien aprueba documentos y
  si el tipo lo admite (`tipos_documento.visible_portal_permitido`); apagarlo siempre se puede. No: «público», «compartido».
- **Tipo de documento** — `tipos_documento` / `tipo_documento_crear()`: qué documento pide el ciclo (Título, BL…); **propio** del flujo de un
  origen (o del de repuestos) o **compartido** con todos (`flujo_id` nulo); el propio **tapa** al compartido de su misma clave en ese flujo. Formatos y
  vencimiento (`ninguno`, `solicitar`, `renovar`, con `aviso_dias`). En uso se desactiva. No: «clase de documento», «de la empresa».
- **Transporte** — `transportes` (se lee por la vista `transportes_con_embarque`): lo de UNA unidad: su contenedor o su embarque (uno u otro, nunca los dos) y lo
  propio (notas; naviera, puertos y fechas sólo si no va en un embarque). Se escribe por `transporte_guardar` o, en lote, `transporte_asignar|quitar`.
- **Puerto** — `puertos`: origen o destino de un transporte; nombre, país y código opcionales, `orden`, `activo`. **Propio** de un origen
  (`origen_id`) o **compartido** con todos (nulo); el propio tapa al compartido de su misma clave de nombre y país. Los compartidos se editan en
  Logística › Configuración › Puertos; se desactiva, no se elimina. No: «terminal», «destino».
- **Naviera** — `navieras`: la empresa que lleva el contenedor; nombre y `activo`. Propia de un origen o compartida, como el puerto (tapa por
  nombre). Las compartidas, en Logística › Configuración › Navieras; se desactiva; cada flujo ofrece las suyas (`flujos_transporte_oferta`). No:
  «línea marítima», «carrier».
- **Embarque** — `embarques` / `embarque_crear|guardar()`: el booking en un origen, dueño de la naviera, los puertos, el zarpe (estimado y el de
  siempre), la ETA y el arribo; sus vehículos van sueltos en él o en sus contenedores, y lo suyo cambia para todos. El booking es único por origen
  (sin espacios ni mayúsculas de más); su estado se calcula. No: «carga», «viaje», «booking» a secas.
- **Contenedor** — `contenedores` / `contenedor_crear|guardar()`: número (único por origen), tipo y sello, en un embarque o todavía sin él (entonces
  sus vehículos llevan sus fechas propias). Entrar a un embarque, cambiar de embarque o salir de él cambia los datos de todos sus vehículos.
- **Estado del embarque** — `embarque_estado()` / `contenedor_estado()`, espejo en `entities/transporte/estado.ts`: «Entregado» si tiene vehículos
  y todos están en una fase final (manda); si no, «Llegó» con arribo, «En tránsito» si zarpó hasta hoy (el día de la empresa) y si no «Armándose».
  Un contenedor sin embarque está «Sin embarque». Se calcula, nunca se escribe.
- **Tipo de contenedor** — `tipos_contenedor`: «20′ estándar», «40′ High Cube»…, un catálogo de la empresa (clave, nombre, orden, activo); el contenedor lo nombra por su clave.
- **De repuestos (embarque o contenedor)** — `origen_id` nulo: el de los ítems de repuesto, que no tienen origen; lo ve y lo escribe quien tiene
  `repuestos.ver` / `repuestos.editar`.
- **Grupo (de transporte)** — los embarques (o contenedores) con un mismo booking (o número) en todos los orígenes: la clave de `?booking=` /
  `?contenedor=` de `/logistica/embarques`. `transporte_grupos()` los pagina y `transporte_grupo()` lista sus unidades (las visibles, hasta 200).
  No: «lote», «carga», ni un grupo de campos.
- **Declaración aduanera** — `declaraciones_aduana`, `declaraciones_vehiculos`: DUI: número, canal de aforo, vencimiento de tributos; N:M.
- **Gasto** — `gastos`, `categorias_gasto`: costo real imputado a una unidad, en su moneda y en base.
- **Categoría de gasto** — `categorias_gasto` / `categoria_gasto_crear()`: a qué va un gasto (flete, tributos…), con `proposito` opcional,
  `orden` y `activo`. Propia de un origen o compartida, como el puerto (tapa por nombre); las compartidas, en Logística › Configuración ›
  Categorías de gasto. Sin gastos se elimina; con gastos se desactiva. No: «rubro», «concepto».
- **Pago** — `pagos`: pago del cliente; confirmar es un acto sellado.
- **Desviación / Margen** — `margen_vehiculo()`: cotizado − real / venta − real (null sin venta); `por_categoria` reparte el real por
  categoría de gasto.
- **Margen del proyecto** — `repuestos_proyecto_margen()`: por moneda, Σ precios de los ítems − Σ compras; nulo si falta un precio.
- **Nota** — `notas`: bloc de notas de una unidad; la del cambio de fase apunta a su historial.
- **Proyecto de repuestos** — `repuestos_proyectos`: un proyecto por vehículo (o externo).
- **Proyecto externo** — `repuestos_proyectos.vehiculo_id is null`: el proyecto sin vehículo del inventario, con la etiqueta y el VIN escritos a mano
  (`vehiculo_etiqueta`, `vin`). En el listado se escribe «Externo · …» y en la cabecera de `/repuestos/[id]` «Proyecto externo · sin vehículo» (`ProyectoExterno`).
- **Ítem de repuesto** — `repuestos_items`: el repuesto que recorre el flujo de repuestos.
- **Grupo por paso** — `GrupoPorPaso` (`agruparPorPaso`, `entities/items/grupos-por-paso.ts`): los ítems de una misma fase bajo su encabezado («Comprar · 3»)
  en la pestaña Ítems de `/repuestos/[id]`, en el orden de los pasos y «Sin fase» al final. No es «Grupo (de la hoja)» del cotizador ni «Grupo (de transporte)».
- **Paso (de un proyecto)** — `PasoDelProyecto` (`entities/flujo/pasos.ts`): cada parada del camino de la venta sobre la hoja de `/repuestos/[id]`:
  una fase activa del flujo de repuestos (su nombre, en su orden) o un hito, con su progreso en texto («3 de 5», «37+ de 200+»); juntos son la **barra de progreso**
  del proyecto, bajo la cabecera. No: «etapa» (es del embudo).
- **Hito (de un paso)** — `HitoDelPaso` (`CLAVES_DE_HITO`): lo que no es fase y el flujo pide como requisito de dato: «Precio al cliente»
  (`repuesto.precio`) y «Pago del cliente» (`proyecto.pago_cliente`). Va justo antes de la primera fase activa que lo pide; si ninguna lo
  pide, no aparece. Es un botón que lleva a su pestaña (Cotizaciones o Pagos); Compras no tiene hito.
- **Pestañas del proyecto** — Ítems · Cotizaciones · Pagos · Compras de `/repuestos/[id]` (`?pestana=items|cotizaciones|pagos|compras`; `PANELES_DEL_PASO`, `TITULO_DEL_PANEL`):
  fijas bajo la barra de progreso; Ítems es la hoja y las otras tres piden su permiso (sin él no están). No es «pestaña del resumen» (cotizaciones) ni «zona de pestañas» (unidad).
- **Siguiente (de un ítem)** — `SiguienteDelItem` (`siguienteDelItem`): lo que toca hacer para que el ítem avance y el botón que lo hace (en su tarjeta): mover
  a su próxima fase (la acción de la transición), o «Nueva cotización» / «Registrar pago» si el destino pide ese hito como bloqueante y falta.
  Sin permiso, sólo «Sigue: «X»».
- **Stock** — `repuestos_items.stock_cantidad`, `_stock_movimientos`: sobrantes disponibles; se mueve sólo por `repuesto_stock_mover` y
  `repuesto_stock_reasignar`; nunca negativo.
- **Movimiento de stock** — `repuestos_stock_movimientos`: entrada o salida del stock de un ítem con motivo (`sobrante`, `vendido`,
  `devuelto`, `ajuste`, `reasignado`) y nota opcional; sólo lo escriben esas dos RPC. No: «ajuste de inventario», «transacción».
- **Sobrante** — lo que de un ítem entra a stock (motivo `sobrante`, «Pasar a stock»): como mucho su cantidad menos lo que ya entró.
- **Vender suelto** — sacar del stock lo vendido fuera de un proyecto (motivo `vendido`); no registra precio: el cobro es un pago del proyecto.
- **Devolver al proveedor** — sacar del stock lo que se devuelve (motivo `devuelto`, botón «Devolver»).
- **Reasignar** — pasar unidades del stock de un ítem a otro proyecto abierto (motivo `reasignado`): nace un ítem nuevo allá, en la fase de
  entrada.
- **Compra** — `repuestos_compras`: costo de un repuesto (permiso aparte).
- **Catálogo de repuestos** — `repuestos_catalogos.catalogo` (`CATALOGOS_DE_REPUESTOS`): tipo de pieza, condición, vía de transporte o país
  de origen. Cada fila es un **valor** (`ValorDeCatalogo`); en uso se desactiva. La clave `modo_transporte` se muestra «Vía de transporte».
- **Cotizador de repuestos** — `repuestos_cotizador_config`, `_tramos_logistica`, `_cajas`, `repuestos_cotizaciones`: fórmula propia
  importado/local con tramos y cajas.
  - **Tramo de logística** — `repuestos_tramos_logistica` (`TramoDeLogistica`): monto por moneda para `costo_min ≤ costo < costo_max` (nulo:
    en adelante); dos activos de una moneda no se cruzan.
  - **Logística sugerida** — `logistica_sugerida`: el monto del tramo del costo; sin tramo no hay (nunca 0); la escrita la reemplaza.
  - **Caja** — `repuestos_cajas`: embalaje fijo por moneda, elegido por línea («Sin caja» = 0).
  - **Snapshot de configuración** — `repuestos_cotizaciones.config_snapshot` (`SnapshotDelCotizador`): configuración, tramos y cajas de la
    moneda congelados al crear; todo total sale de él.
- **Evento** — `eventos`, `eventos_destinatarios`: cita con visibilidad privada/pública/seleccionados.
- **Destinatario** — `eventos_destinatarios`: persona que ve un evento «seleccionados» (1 a 50); en pantalla «Destinatarios» y «¿Con quién?».
  Sólo lo ve quien creó el evento.
- **Tarea** — `tareas` / `reasignar_tarea`: pendiente con responsable y vencimiento.
- **Hoja del día** — `hojaDelDia()`, `JORNADA`, `<HojaDelDia>` (`agenda/entities/hoja-del-dia.ts`): la vista de por defecto de `/agenda`, el día como una hoja
  de libreta: las horas de la jornada (08:00 a 20:00) siempre a la vista con lo que pasa en cada una, «Antes de las 08:00» y «Desde las 20:00» para lo de afuera, y
  la hora actual marcada «Ahora» si el día es hoy; en la zona de la empresa. No: «vista de día», «agenda diaria».
- **Pendientes (de la agenda)** — `agenda_pendientes()`, `agenda_tareas_sin_fecha()`, `PendienteDeAgenda`, `<ColumnaDePendientes>`: lo que está por hacer de
  quien mira, al costado de la hoja del día (debajo en el celular): «Vencidas» (mis tareas pendientes vencidas), «Recordatorios» (los míos vencidos o de hoy) y
  «Sin fecha» (mis tareas pendientes sin vencimiento), cada uno con «Completar» en un toque. Siempre de quien mira, también con «De todos». No: «to-do», «por hacer».
- **Tareas sin fecha** — `agenda_tareas_sin_fecha()`: mis tareas pendientes sin vencimiento: el grupo «Sin fecha» de los pendientes de la agenda.
- **Conversación / Mensaje** — `conversaciones`, `mensajes`: directa, grupo o canal global; mensajes de texto o fichas.
- **Cita (de un mensaje)** — `mensajes.responde_a_id` / `CitaDeMensaje`: el mensaje al que responde otro; «Respondiendo a…» y, en la burbuja,
  autor y primeras palabras del original.
- **Mención** — `mensajes_menciones`: `#` a vehículo, lead, cotización o persona; no otorga acceso.
- **No leídos** — `chat_conversaciones().no_leidos`, `chat_no_leidos()`: mensajes ajenos posteriores a tu última lectura
  (`conversaciones_miembros.ultimo_leido_en`), contados entre las 100 entradas más nuevas (las propias ocupan lugar y no suman); 100 se
  muestra «99+». El total no suma las silenciadas.
- **Notificación** — `notificaciones` / `notificar()`: aviso en la campana; `requiere_accion` para lo que pide clic.
- **Campana** — `notificaciones/features/campana`, `<Campana>`: botón de la barra superior con las no leídas y el popover de las que piden
  acción; se suscribe diferida y otra vez al volver la red.
- **Widget del chat** — `chat/features/widget`, `<WidgetChat>`: botón flotante con los no leídos que abre el chat fuera de `/chat` (en el
  celular, enlace a `/chat`); docs y pruebas le dicen «la burbuja», que no es la **burbuja de un mensaje**.
- **Recargar la página** — `<RecargarLaPagina>` de `shared/ui`: botón de la barra superior, a la izquierda del buscador; recarga completa del navegador.
- **Copiar el enlace de esta página** — `<CopiarElEnlaceDeLaPagina>` de `shared/ui`: botón flotante secundario, a la izquierda del botón del chat (`<Flotantes>` del marco);
  copia la URL actual o, si el portapapeles falla, la deja seleccionada en un modal.
- **Push** — `suscripciones_push`: suscripción web push del navegador.
- **Actividad** — `actividad` / `registrar_actividad()`: auditoría inmutable, 14 días.
- **Actividad reciente** — `ActividadReciente` (`actividad/pantallas/actividad-reciente.ts`): los últimos 5 cambios de un registro como frases, cada uno
  enlazado a su detalle en `/actividad`, con «Ver toda la actividad». No: «línea de tiempo», «historial» (ése es el de negocio, que no caduca).
- **Turno web** — `solicitudes_contacto_web` / `web.solicitar_asesor`: cada «Contactar asesor» en la web pública.
- **Rueda / Cola web** — `cola_web_asesores` / `estado_cola_web`: quién recibe turnos. Elegible = `habilitado` y permiso
  `web.cola.participar` (`puede_estar_en_la_rueda()`). Matriz: «Recibir turnos de la web».
- **Contacté** — `web_confirmar_contacto`: el asesor confirma que atendió el turno (y lo vincula a un lead).
- **Pegajoso** — `ajustes_web.dias_pegajoso`: un visitante vuelve al mismo asesor dentro del plazo.
- **Disponible** — `cola_web_asesores.disponible` / «Disponible para recibir turnos» de Mi perfil: acepta turnos ahora. La ruleta sólo elige
  a quien lo tiene; el pegajoso no lo mira. No: «activo», «en línea».
- **Respaldo** — `ajustes_web.whatsapp_respaldo`: número que recibe cuando nadie está disponible.
- **Sin asignar** — `solicitudes_contacto_web.estado = 'sin_asignar'` / `cola_web_solicitudes`: turno que no encontró asesor (el visitante
  fue al respaldo); se ve arriba de Configuración › Cola web.
- **Ficha pública** — «Tu ficha en la web»: `perfiles.whatsapp_web`, `handle`, `cargo_web`, `bio_web`, `especialidades`, `publico_web`. Sin
  WhatsApp no hay turnos; con `publico_web` y `handle` la web la muestra. No: «perfil público», «tarjeta».
- **Guía / FAQ / Testimonio** — `web_guias`, `web_faqs`, `web_testimonios`: contenido de la web pública; nace despublicado.
- **Categoría de FAQ** — `web_categorias_faqs` / `CategoriaDeFaq`, `web_faqs.categoria_id`: agrupa las preguntas frecuentes en la web (que
  sigue recibiendo el nombre en `web.faqs.categoria`). Se elige de un catálogo (`<ComboDeCatalogo>`) con nombre único sin importar mayúsculas,
  tildes ni espacios, como el grupo de campos, y se gestiona en el drawer «Categorías» (`?panel=categorias`): quitar una con preguntas pide a
  dónde moverlas. Las categorías de guías (`web_categorias_guias`) tienen el mismo nombre único. No: «etiqueta», ni la categoría de un origen.
- **Programada** — guía con `web_guias.publicada_en` futura: aún no se ve (`estadoDeGuia()`: «Borrador», «Programada» o «Publicada»).
- **Consentimiento (de un testimonio)** — `web_testimonio_consentir` / `web_testimonio_retirar`: quién lo registró, cuándo, por qué canal, y si
  se muestran ciudad, vehículo y foto. Cambiar nombre, texto o foto lo anula.
- **Superficie pública** — esquema `web`: vistas y RPC que consume el repo de la web.
- **Bandeja** — `/` / `<Bandeja>`: pantalla de inicio; lo que hay que hacer ahora.
- **Bloque de la bandeja** — `BLOQUES_BANDEJA` / `bloquesVisibles()`: lista de pendientes del Inicio, según los permisos.
- **Ver todos / Ver todas (de un bloque de la bandeja)** — `BloqueBandeja.verTodos`, `<VerTodasDelBloque>`: el enlace bajo la lista de un bloque, que lleva a la lista completa ya filtrada. Sólo
  se dibuja cuando el bloque llegó a su tope (`hayMas`) y quien mira puede abrir el destino; el género es el de lo que lista el bloque («Ver todas» las personas, tareas,
  alertas y esperas; «Ver todos» lo demás). No: «Ver más» (ése agrega filas a la misma lista).
- **Sin seguimiento (filtro)** — `FILTRO_SIN_SEGUIMIENTO` / `?sin_seguimiento=si` del listado de leads: los leads sin ningún seguimiento y creados hace más de 24 horas, la misma
  definición del bloque «Leads sin seguimiento» de Inicio (`creadoAntesDe()`). «No» es lo contrario: con algún seguimiento o creados hace menos. No: «sin actividad», «abandonados».
- **Sin rol (filtro)** — `?estado=sin_rol` de `/configuracion/equipo`, `equipo_lista(p_estado => 'sin_rol')`: las personas activas, no bloqueadas y sin ninguna fila en
  `usuarios_roles`; lo que cuenta el bloque «Personas sin rol» de Inicio. No es un estado de la persona (`estadoDePersona()`): no cambia lo que dice su insignia.
- **Panel de turnos** — `?panel=turnos` en Inicio (`PanelDeTurnos`): todos mis turnos de la web sin confirmar (asignados y vencidos), de a 20 con «Ver más» hasta 200; es el «Ver todos» del bloque
  «Turnos de la web sin confirmar». Cada turno lleva «Contacté» y «Vincular a lead».
- **Bloque** — `<Bloque>`: sección a la vista de un formulario o un panel, con su título (`h3`); nunca se pliega.
- **Bloque (de una ficha)** — `<BloqueDeFicha>`, `#<ancla>` (`src/shared/ui/ficha-en-bloques`): una parte de una ficha en dos columnas, siempre a la
  vista (no se pliega), con su ancla, su título `h2` (con su única acción a la derecha: `<TituloDeBloqueConAccion>`) y su error propio. No es `<Bloque>`,
  la sección de un formulario o un panel.
- **Índice (de una ficha)** — `<IndiceDeBloques>`: la barra arriba de la columna principal de una ficha en dos columnas (quieta mientras los bloques se desplazan por dentro; pegajosa en el celular), con un enlace de ancla
  por bloque y `aria-current="location"` en el que está a la vista. No navega: salta dentro de la misma página. No: «pestañas», «menú».
- **Atajo** — `ATAJOS` / `useAtajo()`: tecla global (`Esc`, `N`, `Ctrl/Cmd+K`, `Ctrl/Cmd+B`…); responde el panel de más arriba.
- **Filtro** — `EsquemaDeFiltros`, `DefFiltro` / `<FilterShell>`: lo que acota un listado; cada uno declara los suyos y viven en la URL. Van en el botón
  «Filtros»; lo que cambia cómo se ve la lista (vista, alcance, ítems por página), en «Vista y opciones».
- **Vista y opciones** — `<VistaYOpciones>`, `GrupoDeVistaYOpciones` (`src/shared/ui/vista-y-opciones`): el botón de la barra de un listado que agrupa
  vista, alcance, ítems por página, vistas guardadas, exportar y papelera; dice lo activo («Lista · Míos · 25 por página»). Popover desde 768 px,
  hoja inferior por debajo, sin URL.
- **Chip** — `chipsDe()` / `<ChipsDeFiltros>`: un filtro activo a la vista, que se quita solo.
- **Cursor** — `lib/paginacion.ts` / `?cursor=`: dónde quedó la página de un listado (keyset `creado_en, id`).
- **Tope de lo cargado** — `TOPE_DE_LO_CARGADO` / `enElTope()` (`lib/paginacion.ts`): máximo que carga una lista con «Ver más» (500).
- **Ir a una fecha** — `<IrAUnaFecha>` / `irAUnaFecha()`, `cursorDeUnaFecha()`, `hastaDeUnDia()`: mirar una línea de tiempo desde un día
  sembrando el cursor de «Ver más»; no va a la URL.
- **Conflicto** — `PT409` / `<AvisoDeConflicto>`: otra persona guardó antes; quién y cuándo, con «Ver cómo quedó» y «Recargar».
- **Borrador** — `useBorrador()`, `useBorradorDeEstado()`: lo escrito y no guardado de un formulario, en la pestaña; se repone al volver.
- **Tablero** — `/tablero`: métricas y gráficas por rol con widgets.
- **Vista guardada** — `vistas_guardadas` / `VistaGuardada`, `<VistasGuardadas>` (una sección de «Vista y opciones»): filtros de un listado con nombre, por persona; aplicarla es navegar. La
  tienen leads, vehículos y cotizaciones (`RUTA_DE_PANTALLA`); con la búsqueda, guarda también `?q=`.
- **Buscador del listado de cotizaciones** — `?q=` / `cotizaciones_buscar()`, `MINIMO_DE_BUSQUEDA_DE_COTIZACIONES`, `TOPE_DE_COINCIDENCIAS`: número, título, cliente,
  vehículo (título, VIN o lote) y autor; distinto del buscador global (`buscador_cotizaciones()`).
- **Menú de la fila (cotizaciones)** — `accionesDeCotizacion()`, `MenuDeUnaFila`, `<MenuDeLaFila>`: el «⋯» de una cotización del listado, con la lista única de
  acciones (`compartir`, `aprobar`, `final`, `favorita`, `reportar`, `invalidar`, `descartar`, `reactivar`, `papelera`; las demás de la lista, sólo en el
  «⋯» de la guardada) y lo que cada rol ve.
- **Importación** — `importaciones`: carga CSV con vista previa por fila.
- **Importación total** — `importacion_crear()`, `importaciones` con `archivo_ruta`: la de `/datos`, que `importar-csv` procesa por lotes a
  nombre de quien importa y para un destino (`asignar_a`).
- **Archivo normalizado** — `PLANTILLAS`, `escribirArchivo`, `filaDelLote` (`datos/entities/plantillas.ts`): el CSV de una importación total,
  con `rechazo_motivo`, `rechazo_campo` y las claves de la entidad; `importar-csv` lo valida y lo borra al terminar.
- **Fila de la importación** — `importaciones_filas`: fila que no entró (ya existe o error), con campo y motivo, para «Descargar las rechazadas».
- **Exportar leads** — `leads.exportar`, `POST /leads/exportar`: CSV de los leads de la cartera del listado con sus filtros; hasta 5.000 y 5
  por hora.
- **Importar leads** — `/leads/importar`, `leads_importar_lote()`: asistente de CSV: empareja, valida con las reglas del alta e importa por lotes.
- **Archivo de errores** — `leads-rechazados.csv`: las filas que no entraron con su motivo y las mismas columnas, para corregir y resubir.
- **Deshacer la importación** — `leads_importacion_deshacer()`, `<DeshacerImportacion>`: 24 h; manda a la papelera lo importado que sigue
  intacto. Una importación total: sólo terminada o fallida, ≤ 2.000 leads y, si tuvo destino, con `datos.importar.todo`.
- **Intacto (lead importado)** — `_lead_motivo_para_deshacer()`: sólo en la cartera de quien importó (con destino, del destino), sin editar y
  sin nada colgado; las marcas no cuentan.
- **Tus importaciones recientes** — `leads_importaciones_recientes()`, `<ImportacionesRecientes>`: las propias de 24 h, con «Deshacer», en
  `/leads/importar`. No lista las totales de `/datos`.
- **Subasta (de un vehículo)** — `SubastaDeVehiculo`, `leerSubasta()`: cuándo es, en qué está, cuánto va y cuándo se
  consultó.
- **Cierre (de una subasta)** — `vehiculos.cierre_subasta_en` (generada): `coalesce(subasta_fin_en, subasta_en)` de una subasta abierta o en
  vivo; nula si no está viva. Ordena «Cierre subasta» del panel del vehículo, desde ahora menos 24 h.
- **Estado de subasta** — `vehiculos.estado_subasta` / `EstadoDeSubasta`: `abierta`, `en vivo`, `terminada` o `vendida`; lo deriva la base.
  No es la situación: «vendida» no dice que la ganamos.
- **Situación (de un vehículo)** — `vehiculos.situacion` / `Situacion`, `<BadgeDeSituacion>`: la que la app muestra en todos lados, calculada
  por la base (`_vehiculo_situacion()`): «En subasta» (`en_subasta`: subasta viva en el tramo de subasta), «Sin resolver» (`sin_resolver`:
  cerrada en el tramo y sin resultado), «No ganada» (`no_ganada`: se marcó así y sigue en el tramo; no cuenta) o su fase (`fase`). El tramo
  (`_vehiculo_en_tramo()`) es estar en una fase de subasta o no tener fase en un origen que tiene una.
- **Subasta (filtro)** — `?subasta=` / `FILTRO_SUBASTA` (`entities/filtros-de-subasta.ts`), condiciones `cierre_entre` y `situacion_en`: «Subasta» en el panel de filtros
  del inventario, sólo en un origen de subasta, una opción a la vez: «Cualquiera» (`cualquiera`, por defecto: no filtra), «Cierra hoy» (`hoy`), «Cierra en 48 h» (`48h`),
  «Cierra esta semana» (`semana`, hasta el lunes siguiente), «Todas las vivas» (`vivas`), «Sin resolver» (`sin_resolver`) y «No ganadas» (`no_ganadas`). Las tres
  ventanas (`ventanaDelCierre()`) cuentan desde ahora en la zona de la empresa y sólo traen vivas. Pedir «No ganadas» es la única forma de verlas en el inventario.
- **Fase (filtro)** — `?fase=` / `FILTRO_FASE`, condición `columna_en` sobre `fase_id`: «Fase» en el panel de filtros del inventario, varias a la vez: las fases del
  origen y «Sin fase» (`ninguna`). Filtra la columna: la fase de la subasta trae todo lo que está en ella, viva, sin resolver o no.
- **Cierre más próximo (orden)** — `?orden=cierre` / `FILTRO_ORDEN`, `OrdenDelInventario` (`reciente` | `cierre`): el orden «Cierre más próximo» del inventario de un
  origen de subasta, el de siempre cuando «Subasta» tiene valor. Va por tramos (`TRAMOS_DEL_CIERRE`): las vivas por su cierre, las vivas sin fecha y el resto por
  alta; el cursor lleva su tramo (`<tramo>~<cursor>`, `entities/cursor-del-cierre.ts`).
- **Atajo «Sin resolver»** — `<AtajoSinResolver>` / `sinResolverDe()`: botón arriba del inventario de un origen de subasta con las pendientes (hasta `TOPE_DE_SIN_RESOLVER`, «99+»); pone o quita «Subasta: Sin resolver».
- **Fase de subasta** — `fases.es_subasta` / «Es la subasta» (pestaña Ajustes de la fase): la fase que representa la subasta en el flujo de un origen
  de subasta; puede haber varias. Sin ninguna, «Revisar» avisa `sin_fase_de_subasta` y nada figura «Sin resolver».
- **Resultado de la subasta** — `vehiculos.subasta_resultado` (`ganada` | `no_ganada`), con `subasta_resuelta_por` y `subasta_resuelta_en`:
  lo escriben sólo las RPC de resolver; nunca se infiere de apibara; si la subasta vuelve a estar viva, se limpia.
- **La ganamos** — `vehiculo_subasta_ganada()` / `ganarLaSubasta`, `?ganada=si` en «Qué falta»: mover a una fase que no es la subasta y
  anotarla ganada, todo o nada.
- **No la ganamos** — `vehiculo_subasta_no_ganada()` / `marcarNoGanada`: la marca no ganada (con «Deshacer»); deja de contar en logística,
  Inicio y el inventario por defecto.
- **Cierre de subastas** — job `situacion-al-cerrar` / `vehiculos_situacion_al_cerrar()`: cada 10 min pasa las «En subasta» cuyo cierre ya
  pasó a «Sin resolver» (hasta 500 por corrida).
- **Puja actual** — `atributos.<campo de pricing.current_bid_usd>` / `columnaDePrecio()`, `precioDeLaFila()`: lo que va de la subasta, en
  USD. En un origen de subasta con ese campo, la columna «Precio» del inventario se llama así; nunca es el precio del vehículo.
- **Puja final** — la puja actual de una subasta `terminada` o `vendida`: la celda lleva «final» y la tarjeta dice «Puja final».
- **Compra directa** — `atributos.<campo de pricing.buy_now_usd>` / `columnaDeCompraDirecta()`, `compraDirectaDeLaFila()` (`vehiculos/entities/compra-directa-de-la-fila.ts`):
  el precio «Buy it now» de una subasta, en USD: el valor de «Compra inmediata (USD)» de apibara, buscado por su ruta de apibara y no por la clave del campo.
  Columna de la tabla y fila de la tarjeta de la lista de `/vehiculos`, sólo en un origen de subasta. No es el origen «Compra dealer USA».
- **Respuesta guardada** — `vehiculos.apibara_raw` / `leerSubasta().raw`: lo que apibara devolvió, entero; sólo el servidor la lee.
- **Consulta de apibara** — `apibara_consultas` / `apibara_consulta_guardar()`, `FichaDeApibara.consulta`: cada respuesta de la edge function,
  a nombre de quien consultó.
- **Importado por apibara** — `vehiculos.importado_apibara`: nació de una consulta a apibara; no cambia; decide a quién alcanza la limpieza
  automática.
- **Catálogo de apibara** — `_apibara_catalogo()` / `CATALOGO_APIBARA`: cada dato normalizado de la API (ruta, etiqueta, tipo, sección).
- **Ruta de apibara** — `origenes_campos.clave_apibara`: dónde está un dato en la respuesta (`vehicle_specs.engine.raw`); una por origen.
- **Datos nuevos de apibara** — `DatoNuevoDeApibara` / `origen_apibara_rutas_sin_campo()`: datos que la API trajo y aún no son campo.
- **Refrescar** — `refrescarSubasta` / `vehiculo_subasta_refrescar()`: volver a preguntar a apibara; siempre actualiza fecha, estado y respuesta.
- **Actualizar los datos** — `actualizar` de `accionesDeVehiculo()` / `<ActualizarLosDatos>`, `useActualizarLosDatos()` (`?panel=actualizar-datos`): la acción
  del «⋯» del vehículo que vuelve a consultar la subasta en apibara con el mismo motor que «Refrescar» (pide confirmar: gasta cuota) y trae las fotos de esa
  respuesta que faltan. Sólo en un origen de subasta con apibara encendida.
- **Editar imágenes** — `imagenes` de `accionesDeVehiculo()` / `<PanelDeImagenes>` (`?panel=imagenes`): la acción del «⋯» del vehículo que abre en un drawer
  sus fotos (`<SeccionDeFotos>`: subir, ordenar, portada, quitar y traer las que faltan de la subasta); la ficha sólo las muestra, en el carrusel de su cabecera.
- **Línea pegada** — `Linea` / `lineasDePegado()`: renglón pegado para alta desde apibara (enlace Copart/IAAI, VIN o lote); hasta 20.
- **Fotos de la subasta** — `fotosDeSubasta()` / `<BotonTraerFotos>`: las primeras 24 imágenes de la respuesta (la primera, portada).
- **Cuota de apibara** — `UsoDeApibara` / `<UsoDeApibara>`: consultas hechas y restantes en el período; agotada (429), la API calla hasta que
  vence.
- **Limpieza automática** — `limpieza_automatica_correr()`, `ajustes_empresa.limpieza_automatica`: cada madrugada manda a la papelera, en un
  lote, los importados de subasta terminada hace más de los días de gracia y sin ancla.
- **Ancla** — `_limpieza_ancla()`: lo que retiene de la limpieza: «Conservar», vínculo con lead, una subasta sin resolver o ganada, fase
  posterior a la inicial, documentos, gastos o pagos, estar publicado, una cotización final activa.
- **Conservar** — `vehiculos_conservados` / `vehiculo_conservar()`, `<BotonConservar>`: marca que saca un vehículo de la limpieza.
- **Días de gracia** — `ajustes_empresa.limpieza_dias_gracia`: días desde que terminó la subasta hasta que se limpia: 7 por defecto, de 1 a 90.
- **Se limpiará pronto** — `FILTRO_LIMPIEZA`, `limpieza_el()`, `VENTANA_DE_AVISO_DIAS`: filtro e insignia «Se limpia el dd/mm» de lo que se
  limpia en 3 días.
- **Aviso de limpieza** — `limpieza_avisar()`, `limpieza_avisos`, notificación `limpieza_pronto`: aviso al creador de un importado al entrar
  en «Se limpiará pronto»; una vez por vehículo.
- **Lote de limpieza** — `lotes_papelera.es_limpieza`: lote nocturno sin autor; lo restauran quienes pueden vaciar la papelera.
- **Corrida de limpieza** — `limpieza_corridas` / `limpieza_ultima()`: lo que dejó una noche: movidos, retenidos por ancla y en espera.
- **Conteo acotado** — `ConteoAcotado` (`src/shared/lib/conteo.ts`), `conteoAcotado()`: número sin total exacto: «más de N» o «N+».
- **Diferido** — `diferido()` (`src/shared/ui/diferido.tsx`), `diferidos.tsx` de cada caso de uso: código de modal, panel o pestaña pedido al
  usarse. No: `next/dynamic` suelto.
- **Shell** — `shell.ts` y `shell.client.ts` de un módulo, `src/app/(app)/layout.tsx`: marco de toda pantalla.
- **Pantalla (entrada)** — `pantallas/<pantalla>.ts` de un módulo: entrada por la que `src/app` trae los componentes de una pantalla.
- **Carril** — un worktree con su propia pila de Supabase (`scripts/worktree/preparar.sh`, `docs/FLUJO.md`).
- **Cola de integración** — la merge queue de GitHub (`merge_group` en `ci.yml`, `scripts/flujo/cola-de-integracion.sh`,
  `scripts/orquestador/integracion.sh`): prueba cada PR en verde combinado con `main` y los de delante, y lo integra. Nunca «cola» a
  secas: la cola es la del orquestador (los issues `cola`).
- **App del orquestador** — la GitHub App `imandresalpiri-orquestador` (`APP_ID` en `scripts/orquestador/config.env`,
  `scripts/orquestador/token-app.sh`, `app.sh`): con ella el orquestador y sus sesiones escriben en GitHub. Su login es
  `imandresalpiri-orquestador[bot]` (`APP_LOGIN`): así se reconoce el issue que abre. No: «bot» a secas.
- **E2E afectados** — `node scripts/e2e-afectados.mjs [--correr]`: los e2e que una rama puede romper aunque no sean de su módulo (los
  dirigidos, los que nombran un texto visible que cambió o que un texto nuevo vuelve ambiguo, y los de las pantallas de un compartido), con
  tope de 40; se corren en local antes de publicar. Entran siempre, sin tope: los de las pantallas tocadas que nombran un texto que la rama
  quita o pasa al «⋯», y los de presupuesto (JS en frío, nodos) de cada pantalla tocada. No son los **dirigidos** del CI (`scripts/e2e-dirigidos.mjs`), que son un subconjunto.
- **Área (de un módulo)** — una parte de un módulo: sus carpetas `features/<área>/`, `entities/<área>/`, `infra/<área>/`, sus entradas
  `areas/<área>/` y `pantallas/<área>.ts`. No importa otra área (`cotizaciones`).
- **Núcleo (de un módulo)** — lo que comparten las áreas de un módulo (en `cotizaciones`: la hoja, guardar, el motor…); no importa ningún área.
- **Hueco (de una pantalla del núcleo)** — `HuecosDeLaHoja`, `HuecosDeLaGuardada`, `HuecosDelListado` (`features/hoja/components/huecos.ts`):
  lo que un área llena en una pantalla del núcleo sin que el núcleo la importe; la página de `src/app` lo une por
  `pantallas/<área>-<pantalla>.ts`; vacío es un objeto sin componentes y no dibuja nada.
- **Menú de Configuración** — `MenuDeConfiguracion`, `gruposVisibles()`, `paraElNavegador()` (`configuracion/_navegacion/`): el menú agrupado a la
  izquierda de cada sección de Configuración; donde no cabe, el **selector de sección** (`SelectorDeSeccion`). No va en el inicio.
- **Grupo de Configuración** — `GRUPOS`, `GrupoDeConfiguracion` (`configuracion/secciones.ts`): Empresa y equipo · Ventas · Web;
  junta las secciones en el inicio, el menú y el selector. No: «área».
- **Sub-sección (de Configuración)** — `SubseccionDeConfiguracion`: una sub-ruta de una sección, registrada en `SECCIONES` con su título, su
  frase (`descripcion`, la que dibuja la página bajo su `h1` con `EncabezadoDeConfiguracion`) y sus permisos; el menú la dibuja debajo de su
  sección. La **índice** vive en la ruta de su sección y se marca sólo en esa ruta. Con `motivoSinPermiso`, quien no tiene sus permisos la ve
  apagada (no es enlace) con el motivo, en el menú y en el selector; sin él, no la ve.
- **Hoja de contacto** — `scripts/hoja-de-contacto.mjs`, `<carpeta>/hojas/`: capturas de e2e montadas en una imagen.
- **Captura quieta** — `capturar()` / `capturarEn()` (`e2e/soporte/`): captura tomada sin animación ni transición con fin en curso.
- **Pregunta al descartar** — `useCierreConCambios()`, `<ConfirmarDescarte>`, `useCambiosSinGuardar()` (`preguntaAlCerrar`): «Tienes cambios
  sin guardar.» con «Seguir editando» / «Descartar».
- **Barra de cambios sin guardar** — `<BarraDeCambiosSinGuardar>`, `useSalidaConCambios()` (`src/shared/ui/`): la barra pegada abajo de un
  formulario de página («Tienes cambios sin guardar» · «Descartar» · «Guardar») que aparece al cambiar algo; salir de la pantalla con cambios
  pregunta (enlaces, avisos, selector de sección, recargar y cerrar; no el «atrás» del navegador). No: el pie de un `<Drawer>` (`<PieDelPanel>`).
- **Recorte (de una cotización)** — `_cotizacion_recorte()`, `_cotizacion_contexto()` / `cotizacion_leer()`, `cotizacion_evaluar()`,
  `cotizacion_revisiones()`, `cotizacion_tabla()`: lo que viaja según el nivel de quien lee.
- **Inventario de lo oculto** — `pg_temp.cv_registro()` en `supabase/tests/cotizaciones-visibilidad.sql`: funciones que pueden devolver
  `valores`, `fuentes`, `totales` o `formulas.*`, con su clase y sonda.
- **Ver total Bs** — `diseno.cabecera.ver_total_bs` (la versión lo ofrece) / `cotizaciones.ver_total_bs` (lo eligió quien cotizó),
  `_cotizacion_ver_total_bs()`, `p_ver_total_bs`: sumar el total en Bs bajo el total de la hoja, en la tarjeta y en el PDF; sólo si la versión lo ofrece, nace en
  falso. En pantalla «Ver total en moneda local», sólo con `cabecera.moneda_bs` (sin ella se guarda en falso).
- **Moneda del total en Bs** — `cabecera.moneda_bs` de `cotizacion_hoja()` / `HojaLista.cabecera.monedaBs`: el `moneda_a` del tipo de cambio
  activo de `definicion.total_en`; nula sin `total_en` o sin ese tipo de cambio activo, aunque `totales.bs` tenga valor (el Bs sale del tipo de
  cambio de cada bucket). Con ella se escribe `totales.bs`.
- **Unidad** — `Unidad` (`logistica/entities/nucleo/unidad.ts`): el vehículo o repuesto sobre el que se opera en logística (`tipo`);
  documentos, gastos, pagos, notas y transporte cuelgan por `vehiculo_id` o `repuesto_id`, uno y sólo uno (`refDeUnidad`).
- **Panel de la unidad** — la cabecera y los huecos de cada área en el orden de `ORDEN_DE_HUECOS` (lo que más se hace primero). En su página `/logistica/vehiculo/<id>` (`<PaginaDeLaUnidad>`) se reparte en **zonas** en escritorio y en bloques con una barra «Mover» en el celular (con `?hueco=documentos` abre esa pestaña o ese bloque); en un drawer, una sección a la vista por hueco en el `?vehiculo=` de `/logistica/gastos` (`<PanelDeLaUnidad>`) ; el ítem de repuesto lleva su propio «Panel del ítem» en dos columnas, que compone `repuestos`. Un vehículo se abre siempre en su página.
- **Panel del ítem** — `?item=<id>` de `/repuestos/[id]` o de la Cadena: el ítem **en dos columnas**. A la izquierda, sus **grupos** en el orden en que se usan (Qué es, Estado, Cantidades y precios, Origen y envío, Proveedor,
  Notas del ítem); a la derecha, sus **tarjetas** (Vehículo y cliente, Compras, Imágenes, Stock, Documentos, Historial, Notas). Un solo nivel de secciones, sin acordeones. No: «hoja del ítem» (la fila de Excel sólo vive en «Agregar ítem»).
- **Grupo (del ítem)** — cada sección de la columna izquierda del panel del ítem (`GRUPOS_DEL_ITEM`): se lee como texto y se edita en su **modal** (`?editar=<grupo>`, con las mismas celdas de la hoja). «Estado» y «Proveedor» no se editan ahí.
  No: «sección» (la de logística: el hueco) ni «tarjeta» (la de la derecha).
- **Tarjeta (del ítem)** — cada sección de la columna derecha del panel del ítem (`TARJETAS_DEL_ITEM`): alto fijo, tocable, con su «⋯»; abre su modal, su panel o su drawer (`?seccion=<hueco>` para los de logística). No: «bloque».
- **Zona (de la unidad)** — dónde se dibuja un hueco en la página de la unidad en escritorio (`ZONA_DEL_HUECO`, junto a `ORDEN_DE_HUECOS`): **principal** («Qué falta» con mover, siempre a la vista), **pestañas** (Documentos, Transporte, Repuestos, Aduana y **Dinero**, que junta gastos, pagos y margen) y **lateral** (Notas e Historial). No: «zona horaria» (la de quien mira).
- **Despliegue en seco** — `pnpm despliegue:en-seco` / `scripts/despliegue/en-seco.sh`, `revisar-base.mjs`: ensayo local de un despliegue
  (base, pruebas, advisors, jobs, buckets, Vault, funciones, variables, build) sin tocar la nube; termina en «listo» o con lo que falta y las
  líneas «Para la persona» (`docs/DESPLIEGUE.md`). No: «deploy de prueba».
- **Tarjeta de ajustes** — `<TarjetaDeAjustes>`, `<TarjetasDeAjustes>` (`@/shared/ui/tarjetas-de-ajustes`): cada bloque de una página de ajustes de
  Configuración, con su título, los valores guardados a la vista (texto, muestras, el logo; no campos), y, arriba a la derecha, sólo su «⋯» con la lista única de sus acciones («Editar…» primero);
  se edita en un modal (`?panel=<tarjeta>`) y tocarla abre la primera acción (`<TarjetaEditable>`, `<TarjetaTocable>`: un botón con nombre «Editar <título>», hermano del «⋯»). Nunca lleva un botón de acción suelto. No es la «tarjeta de la lista» ni la «tarjeta de la cotización».
- **Para todos los orígenes** — el bloque de Configuración › Orígenes, arriba de la lista de orígenes, con las tarjetas de ajustes de lo que vale para todas las cotizaciones de la empresa: **Colores** y **Vigencia**. No es «Tablas compartidas» (el grupo «Compartidas» del drawer de las tablas de un origen).
- **Editor de texto con variables** — `<EditorConVariables>` (`@/shared/ui/editor-con-variables`): para un texto configurable con variables; una `<textarea>` con las
  variables resaltadas, un **botón de variable** por cada una que ese texto acepta (inserta `{clave}` en el cursor o sobre lo seleccionado), el contador, el aviso de
  las que no acepta y la vista previa con datos de ejemplo. «Botón de variable» no es la «Ficha» (la del lead o la del vehículo). Lo usa el Mensaje del portal.
- **Variable de un texto** — `{clave}` dentro de un texto configurable (`partesDelTexto()`, `@/shared/lib/texto-con-variables`): toda `{…}` cuenta, y la que el texto no acepta se
  rechaza. No es el «Dato de la tarjeta» (una celda de la tarjeta de la cotización) ni el «Texto con datos» (sus partes, sin llaves).
- **Estado de un documento legal** — `estadoDeLegal()` (`web`): `publicada` (hay un texto guardado: es el que muestra el sitio) · `sin-publicar` (nunca se escribió);
  es el badge de la tarjeta de cada documento de «Legales». Guardar publica: no hay «Borrador» ni «Programada» (son de las guías). No: «versión», «borrador».
- **Estado de la integración** — `estadoDeIntegracion()` (`empresa`): `activa` · `apagada` · `falta_la_clave`; es el badge de la tarjeta de cada integración.

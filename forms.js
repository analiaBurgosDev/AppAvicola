// ============================================================================
// MÓDULO: FORMULARIOS Y GESTIÓN DE DATOS EN SUPABASE
// ============================================================================

async function cargarTodosLosDatos() {
  await cargarVentas();
  await cargarCompras();
  await cargarClientes();
  await cargarStock();
  await cargarAlimentacion();
  await cargarGalpones();
  await cargarLotesAves();
  await cargarProduccion();
  await cargarMortalidad();
  await calcularResumenesMensuales();
}

async function cargarOpcionesDesplegables() {
  try {
    const { data: clientes } = await clienteSupabase.from("clientes").select("id, nombre_completo");
    poblarSelect(".select-clientes", clientes, "id", "nombre_completo");

    const { data: galpones } = await clienteSupabase.from("galpones").select("id, nombre");
    poblarSelect(".select-galpon", galpones, "id", "nombre");

    const { data: lotes } = await clienteSupabase.from("lotes_de_aves").select("id, raza");
    poblarSelect(".select-lotes", lotes, "id", "raza", (item) => `Lote #${item.id} - ${item.raza}`);

    const { data: insumos } = await clienteSupabase.from("insumos").select("id, nombre_insumo");
    poblarSelect(".select-insumos", insumos, "id", "nombre_insumo");
  } catch (err) {
    console.error("Error al precargar desplegables:", err);
  }
}

function poblarSelect(selector, datos, valorProp, textoProp, formatoPersonalizado = null) {
  const elementos = document.querySelectorAll(selector);
  elementos.forEach((select) => {
    select.innerHTML = '<option value="">Seleccione una opción...</option>';
    if (datos && datos.length > 0) {
      datos.forEach((item) => {
        const option = document.createElement("option");
        option.value = item[valorProp];
        option.textContent = formatoPersonalizado ? formatoPersonalizado(item) : (item[textoProp] || `Opción ${item[valorProp]}`);
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">Sin opciones disponibles</option>';
    }
  });
}

function inicializarFormularios() {
  const formVentas = document.querySelector("#formulario-accion-ventas form");
  if (formVentas) {
    formVentas.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nuevaVenta = {
        cliente: Number(document.getElementById("venta-cliente").value),
        insumo: Number(document.getElementById("venta-insumo").value),
        fecha: document.getElementById("venta-fecha").value,
        monto_total: Number(document.getElementById("venta-monto").value),
        estado_pago: document.getElementById("venta-estado").value,
        cantidad: Number(document.getElementById("venta-maples").value)
      };
      await guardarEnSupabase("ventas", nuevaVenta, formVentas);
    });
  }

  const formClientes = document.querySelector("#formulario-accion-clientes form");
  if (formClientes) {
    formClientes.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nuevoCliente = {
        nombre_completo: document.getElementById("cliente-nombre").value,
        numero_telefono: document.getElementById("cliente-telefono").value,
        mail: document.getElementById("cliente-email").value,
        tipo_cliente: document.getElementById("cliente-tipo").value,
        ubicacion: document.getElementById("cliente-ubicacion").value
      };
      await guardarEnSupabase("clientes", nuevoCliente, formClientes, true);
    });
  }

  const formLotes = document.querySelector("#formulario-accion-lotes-aves form");
  if (formLotes) {
    formLotes.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cantidadInicial = Number(document.getElementById("lote-cantidad").value);
      const nuevoLote = {
        galpon: Number(document.getElementById("lote-galpon").value),
        raza: document.getElementById("lote-raza").value,
        cantidad_inicial: cantidadInicial,
        cantidad_actual: cantidadInicial,
        fecha_ingreso: document.getElementById("lote-fecha").value,
        edad_ingreso: Number(document.getElementById("lote-edad").value),
        estado: document.getElementById("lote-estado").value
      };
      await guardarEnSupabase("lotes_de_aves", nuevoLote, formLotes, true);
    });
  }

  const formMortalidad = document.querySelector("#formulario-accion-mortalidad form");
  if (formMortalidad) {
    formMortalidad.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nuevaMortalidad = {
        lote: Number(document.getElementById("mortalidad-lote").value),
        fecha: document.getElementById("mortalidad-fecha").value,
        cantidad: Number(document.getElementById("mortalidad-cantidad").value),
        motivo: document.getElementById("mortalidad-motivo").value
      };
      await guardarEnSupabase("mortalidad", nuevaMortalidad, formMortalidad);
    });
  }

  const formProduccion = document.querySelector("#formulario-accion-produccion form");
  if (formProduccion) {
    formProduccion.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nuevaProduccion = {
        lote: Number(document.getElementById("prod-lote").value),
        fecha: document.getElementById("prod-fecha").value,
        huevos_descartados: Number(document.getElementById("prod-descarte").value),
        huevos_totales_comerciales: Number(document.getElementById("prod-comercial").value),
        observaciones: document.getElementById("prod-obs").value,
        maples_usados: Number(document.getElementById("prod-maples").value)
      };
      await guardarEnSupabase("produccion", nuevaProduccion, formProduccion);
    });
  }

  const formAlimentacion = document.querySelector("#formulario-accion-alimentacion form");
  if (formAlimentacion) {
    formAlimentacion.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nuevaAlimentacion = {
        lote: Number(document.getElementById("alim-lote").value),
        fecha: document.getElementById("alim-fecha").value,
        turno: document.getElementById("alim-turno").value,
        kilos_consumidos: Number(document.getElementById("alim-kilos").value),
        insumos: Number(document.getElementById("alim-insumo").value)
      };
      await guardarEnSupabase("alimentacion", nuevaAlimentacion, formAlimentacion);
    });
  }

  const formCompras = document.querySelector("#formulario-accion-gastos-compras form");
  if (formCompras) {
    formCompras.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nuevaCompra = {
        fecha: document.getElementById("gasto-fecha").value,
        insumo: Number(document.getElementById("gasto-insumo").value),
        cantidad: Number(document.getElementById("gasto-cantidad").value),
        precio_unitario: Number(document.getElementById("gasto-precio").value),
        monto_total: Number(document.getElementById("gasto-total").value)
      };
      await guardarEnSupabase("compras", nuevaCompra, formCompras);
    });
  }

  const formStock = document.querySelector("#formulario-accion-stock form");
  if (formStock) {
    formStock.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nuevoInsumo = {
        nombre_insumo: document.getElementById("stock-nombre").value,
        tipo_insumo: document.getElementById("stock-tipo").value,
        categoria: document.getElementById("stock-categoria").value,
        unidad_medida: document.getElementById("stock-unidad").value,
        stock_actual: Number(document.getElementById("stock-cantidad").value)
      };
      await guardarEnSupabase("insumos", nuevoInsumo, formStock, true);
    });
  }

  const formGalpones = document.querySelector("#formulario-accion-galpones form");
  if (formGalpones) {
    formGalpones.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nuevoGalpon = {
        nombre: document.getElementById("galpon-nombre").value,
        estado: document.getElementById("galpon-estado").value,
        capacidad_maxima: Number(document.getElementById("galpon-capacidad-max").value),
        capacidad_actual: Number(document.getElementById("galpon-capacidad-actual").value)
      };
      await guardarEnSupabase("galpones", nuevoGalpon, formGalpones, true);
    });
  }
}

async function guardarEnSupabase(nombreTabla, objetoDatos, elementoFormulario, recargarDesplegables = false) {
  try {
    const { error } = await clienteSupabase
      .from(nombreTabla)
      .insert([objetoDatos]);

    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }

    alert("¡Registro guardado exitosamente!");
    elementoFormulario.reset();

    const hoy = new Date().toISOString().split("T")[0];
    document.querySelectorAll(".input-fecha-hoy").forEach((campo) => {
      campo.value = hoy;
    });

    if (recargarDesplegables) {
      await cargarOpcionesDesplegables();
    }

    if (nombreTabla === "ventas") await cargarVentas();
    else if (nombreTabla === "produccion") await cargarProduccion();
    else if (nombreTabla === "mortalidad") {
      await cargarMortalidad();
      await cargarLotesAves();
    }
    else if (nombreTabla === "compras") await cargarCompras();
    else if (nombreTabla === "clientes") await cargarClientes();
    else if (nombreTabla === "alimentacion") await cargarAlimentacion();
    else if (nombreTabla === "insumos") await cargarStock();
    else if (nombreTabla === "galpones") await cargarGalpones();
    else if (nombreTabla === "lotes_de_aves") await cargarLotesAves();

    await calcularResumenesMensuales();

  } catch (err) {
    alert("Ocurrió un error inesperado al conectar con Supabase.");
  }
}
// ============================================================================
// MÓDULO: GESTIÓN DE TABLAS OPERATIVAS (VENTAS, COMPRAS, CLIENTES, ETC.)
// ============================================================================

async function calcularResumenesMensuales() {
  await calcularBalanceEconomico();

  try {
    const { data: alim } = await clienteSupabase.from("alimentacion").select("kilos_consumidos");
    const totalKilos = (alim || []).reduce((acc, r) => acc + Number(r.kilos_consumidos || 0), 0);
    const elemKilos = document.getElementById("resumen-kilos-mes");
    if (elemKilos) elemKilos.textContent = `${totalKilos.toFixed(1)} kg`;
  } catch (err) {
    console.error("Error cargando resumen alimentación:", err);
  }

  try {
    const { data: prod } = await clienteSupabase.from("produccion").select("huevos_totales_comerciales, huevos_descartados");
    let comerciales = 0;
    let descartados = 0;

    (prod || []).forEach(r => {
      comerciales += Number(r.huevos_totales_comerciales || 0);
      descartados += Number(r.huevos_descartados || 0);
    });

    const totales = comerciales + descartados;
    const elemTot = document.getElementById("resumen-huevos-totales");
    const elemDesc = document.getElementById("resumen-huevos-descarte");
    const elemCom = document.getElementById("resumen-huevos-comerciales");
    const elemPorc = document.getElementById("resumen-porcentaje-postura");

    if (elemTot) elemTot.textContent = totales.toLocaleString();
    if (elemDesc) elemDesc.textContent = descartados.toLocaleString();
    if (elemCom) elemCom.textContent = comerciales.toLocaleString();

    if (elemPorc) {
      const porcentaje = totales > 0 ? ((comerciales / totales) * 100).toFixed(1) : 0;
      elemPorc.textContent = `${porcentaje}%`;
    }
  } catch (err) {
    console.error("Error cargando resumen producción:", err);
  }
}

async function calcularBalanceEconomico() {
  const elemIngresos = document.getElementById("resumen-ingresos");
  const elemGastos = document.getElementById("resumen-gastos");
  const elemBalance = document.getElementById("resumen-balance");
  if (!elemIngresos || !elemGastos || !elemBalance) return;

  try {
    const { data: ventas } = await clienteSupabase.from("ventas").select("monto_total");
    const totalIngresos = (ventas || []).reduce((acc, v) => acc + Number(v.monto_total || 0), 0);

    const { data: compras } = await clienteSupabase.from("compras").select("monto_total");
    const totalGastos = (compras || []).reduce((acc, c) => acc + Number(c.monto_total || 0), 0);

    const balance = totalIngresos - totalGastos;
    elemIngresos.textContent = `$${totalIngresos.toLocaleString()}`;
    elemGastos.textContent = `$${totalGastos.toLocaleString()}`;
    elemBalance.textContent = `$${balance.toLocaleString()}`;
  } catch (err) {
    console.error("Error calculando balance:", err);
  }
}

// --- VENTAS ---
let cacheVentasGlobal = [];

async function cargarVentas() {
  const tbody = document.getElementById("tabla-cuerpo-ventas");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">Cargando registros de ventas...</td></tr>`;

  try {
    const { data: ventas, error } = await clienteSupabase
      .from("ventas")
      .select(`id, fecha, monto_total, estado_pago, cantidad, clientes ( nombre_completo )`)
      .order("id", { ascending: false });

    if (error) throw error;
    cacheVentasGlobal = ventas || [];
    renderizarTablaVentas(cacheVentasGlobal);
    configurarFiltroVentas();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar ventas: ${err.message}</td></tr>`;
  }
}

function renderizarTablaVentas(datos) {
  const tbody = document.getElementById("tabla-cuerpo-ventas");
  if (!tbody) return;

  if (!datos || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">No hay ventas registradas aún.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  datos.forEach((venta) => {
    const nombreCliente = venta.clientes ? venta.clientes.nombre_completo : "Cliente no asignado";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${venta.fecha || 'N/A'}</td>
      <td><strong>${nombreCliente}</strong></td>
      <td>${venta.cantidad || 0}</td>
      <td>$${venta.monto_total || 0}</td>
      <td><span class="badge">${venta.estado_pago || 'Pendiente'}</span></td>
      <td>
        <div class="acciones">
          ${esPropietario() ? `<button class="btn-eliminar" onclick="eliminarVenta(${venta.id})">Eliminar</button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function configurarFiltroVentas() {
  const inputFiltro = document.getElementById("filtro-mes-ventas");
  const btnLimpiar = document.getElementById("btn-limpiar-filtro-ventas");

  if (inputFiltro && !inputFiltro.hasAttribute("data-listener")) {
    inputFiltro.setAttribute("data-listener", "true");
    inputFiltro.addEventListener("change", (e) => {
      const mesSeleccionado = e.target.value;
      if (!mesSeleccionado) {
        renderizarTablaVentas(cacheVentasGlobal);
        return;
      }
      const filtrados = cacheVentasGlobal.filter(item => item.fecha && item.fecha.startsWith(mesSeleccionado));
      renderizarTablaVentas(filtrados);
    });
  }

  if (btnLimpiar && !btnLimpiar.hasAttribute("data-listener")) {
    btnLimpiar.setAttribute("data-listener", "true");
    btnLimpiar.addEventListener("click", () => {
      if (inputFiltro) inputFiltro.value = "";
      renderizarTablaVentas(cacheVentasGlobal);
    });
  }
}

async function eliminarVenta(idVenta) {
  if (!confirm("¿Estás seguro de eliminar esta venta?")) return;
  try {
    const { error } = await clienteSupabase.from("ventas").delete().eq("id", idVenta);
    if (error) throw error;
    alert("Venta eliminada.");
    await cargarVentas();
    await calcularResumenesMensuales();
  } catch (err) {
    alert("Error al eliminar: " + err.message);
  }
}

// --- COMPRAS / GASTOS ---
async function cargarCompras() {
  const tbody = document.getElementById("tabla-cuerpo-compras");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="texto-centrado-mutado">Cargando registros de compras...</td></tr>`;

  try {
    const { data: compras, error } = await clienteSupabase
      .from("compras")
      .select(`id, fecha, cantidad, monto_total, insumos ( nombre_insumo )`)
      .order("id", { ascending: false });

    if (error) throw error;
    if (!compras || compras.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="texto-centrado-mutado">No hay gastos o compras registrados aún.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    compras.forEach((compra) => {
      const nombreInsumo = compra.insumos ? (Array.isArray(compra.insumos) ? compra.insumos[0]?.nombre_insumo : compra.insumos.nombre_insumo) : "Insumo no especificado";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${compra.fecha || 'N/A'}</td>
        <td><strong>${nombreInsumo}</strong></td>
        <td>${compra.cantidad || 0}</td>
        <td>$${compra.monto_total || 0}</td>
        <td>
          <div class="acciones">
            ${esPropietario() ? `<button class="btn-eliminar" onclick="eliminarCompra(${compra.id})">Eliminar</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color: red;">Error al cargar compras: ${err.message}</td></tr>`;
  }
}

async function eliminarCompra(idCompra) {
  if (!confirm("¿Estás seguro de eliminar esta compra?")) return;
  try {
    const { error } = await clienteSupabase.from("compras").delete().eq("id", idCompra);
    if (error) throw error;
    alert("Compra eliminada.");
    await cargarCompras();
    await calcularResumenesMensuales();
  } catch (err) {
    alert("Error al borrar compra: " + err.message);
  }
}

// --- CLIENTES ---
async function cargarClientes() {
  const tbody = document.getElementById("tabla-cuerpo-clientes");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">Cargando lista de clientes...</td></tr>`;

  try {
    const { data: clientes, error } = await clienteSupabase.from("clientes").select("*").order("id", { ascending: false });

    if (error) throw error;
    if (!clientes || clientes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">No hay clientes registrados aún.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    clientes.forEach((cliente) => {
      const strTelefono = cliente.numero_telefono ? String(cliente.numero_telefono) : '';
      const telefonoLimpio = strTelefono ? strTelefono.replace(/\D/g, '') : '';
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><strong>${cliente.nombre_completo || 'Sin Nombre'}</strong></td>
        <td>
          ${cliente.numero_telefono || 'No registrado'}
          ${telefonoLimpio ? `<a href="https://wa.me/${telefonoLimpio}" target="_blank" style="margin-left: 6px; font-size: 0.8rem; text-decoration: none; color: #25D366; font-weight: 600;">WhatsApp</a>` : ''}
        </td>
        <td>${cliente.mail || cliente.email || 'Sin correo'}</td>
        <td><span class="badge">${cliente.tipo_cliente || 'General'}</span></td>
        <td>${cliente.ubicacion || 'No especificada'}</td>
        <td>
          <div class="acciones">
            <button class="btn-editar" onclick="editarCliente(${cliente.id}, '${cliente.nombre_completo || ''}', '${cliente.numero_telefono || ''}', '${cliente.mail || cliente.email || ''}', '${cliente.ubicacion || ''}')">Editar</button>
            ${esPropietario() ? `<button class="btn-eliminar" onclick="eliminarCliente(${cliente.id})">Eliminar</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: red;">Error al cargar clientes: ${err.message}</td></tr>`;
  }
}

async function editarCliente(id, nombreActual, telActual, mailActual, ubiActual) {
  const nuevoNombre = prompt("Nombre completo:", nombreActual);
  if (nuevoNombre === null) return;
  const nuevoTel = prompt("Teléfono:", telActual);
  if (nuevoTel === null) return;
  const nuevoMail = prompt("Email:", mailActual);
  if (nuevoMail === null) return;
  const nuevaUbicacion = prompt("Ubicación:", ubiActual);
  if (nuevaUbicacion === null) return;

  try {
    const { error } = await clienteSupabase.from("clientes").update({
      nombre_completo: nuevoNombre,
      numero_telefono: nuevoTel,
      mail: nuevoMail,
      ubicacion: nuevaUbicacion
    }).eq("id", id);

    if (error) throw error;
    alert("Cliente actualizado correctamente.");
    await cargarClientes();
    await cargarOpcionesDesplegables();
  } catch (err) {
    alert("Error al editar cliente: " + err.message);
  }
}

async function eliminarCliente(idCliente) {
  if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) return;
  try {
    const { error } = await clienteSupabase.from("clientes").delete().eq("id", idCliente);
    if (error) throw error;
    alert("Cliente eliminado.");
    await cargarClientes();
    await cargarOpcionesDesplegables();
  } catch (err) {
    alert("Error borrando cliente: " + err.message);
  }
}

// --- ALIMENTACIÓN ---
let cacheAlimentacionGlobal = [];

async function cargarAlimentacion() {
  const tbody = document.getElementById("tabla-cuerpo-alimentacion");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">Cargando registros de alimentación...</td></tr>`;

  try {
    const { data: alimentacion, error } = await clienteSupabase
      .from("alimentacion")
      .select(`id, fecha, lote, turno, kilos_consumidos, insumos`)
      .order("fecha", { ascending: false });

    if (error) throw error;
    cacheAlimentacionGlobal = alimentacion || [];
    renderizarTablaAlimentacion(cacheAlimentacionGlobal);
    configurarFiltroAlimentacion();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar registros de alimentación.</td></tr>`;
  }
}

function renderizarTablaAlimentacion(datos) {
  const tbody = document.getElementById("tabla-cuerpo-alimentacion");
  if (!tbody) return;

  if (!datos || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">No hay registros de alimentación ingresados.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  datos.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.fecha || 'N/A'}</td>
      <td><strong>Lote #${item.lote || 'N/A'}</strong></td>
      <td>${item.turno || 'N/A'}</td>
      <td>${item.kilos_consumidos || 0} kg</td>
      <td>ID Insumo: ${item.insumos || 'N/A'}</td>
      <td>
        <div class="acciones">
          <button class="btn-editar" onclick="editarAlimentacion(${item.id}, ${item.kilos_consumidos || 0})">Editar</button>
          ${esPropietario() ? `<button class="btn-eliminar" onclick="eliminarAlimentacion(${item.id})">Eliminar</button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function configurarFiltroAlimentacion() {
  const inputFiltro = document.getElementById("filtro-mes-alimentacion");
  const btnLimpiar = document.getElementById("btn-limpiar-filtro-alim");

  if (inputFiltro && !inputFiltro.hasAttribute("data-listener")) {
    inputFiltro.setAttribute("data-listener", "true");
    inputFiltro.addEventListener("change", (e) => {
      const mesSeleccionado = e.target.value;
      if (!mesSeleccionado) {
        renderizarTablaAlimentacion(cacheAlimentacionGlobal);
        return;
      }
      const filtrados = cacheAlimentacionGlobal.filter(item => item.fecha && item.fecha.startsWith(mesSeleccionado));
      renderizarTablaAlimentacion(filtrados);
    });
  }

  if (btnLimpiar && !btnLimpiar.hasAttribute("data-listener")) {
    btnLimpiar.setAttribute("data-listener", "true");
    btnLimpiar.addEventListener("click", () => {
      if (inputFiltro) inputFiltro.value = "";
      renderizarTablaAlimentacion(cacheAlimentacionGlobal);
    });
  }
}

async function editarAlimentacion(id, kilosActuales) {
  const nuevosKilos = prompt("Kilos consumidos:", kilosActuales);
  if (nuevosKilos === null) return;

  try {
    const { error } = await clienteSupabase.from("alimentacion").update({
      kilos_consumidos: Number(nuevosKilos)
    }).eq("id", id);

    if (error) throw error;
    alert("Registro actualizado.");
    await cargarAlimentacion();
    await calcularResumenesMensuales();
  } catch (err) {
    alert("Error al actualizar: " + err.message);
  }
}

async function eliminarAlimentacion(idAlimentacion) {
  if (!confirm("¿Estás seguro de eliminar este registro?")) return;
  try {
    const { error } = await clienteSupabase.from("alimentacion").delete().eq("id", idAlimentacion);
    if (error) throw error;
    alert("Registro eliminado.");
    await cargarAlimentacion();
    await calcularResumenesMensuales();
  } catch (err) {
    alert("Error al borrar: " + err.message);
  }
}

// --- STOCK / INSUMOS ---
async function cargarStock() {
  const tbody = document.getElementById("tabla-cuerpo-stock");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="texto-centrado-mutado">Cargando lista de insumos...</td></tr>`;

  try {
    const { data: stock, error } = await clienteSupabase.from("insumos").select("*").order("id", { ascending: false });

    if (error) throw error;
    if (!stock || stock.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="texto-centrado-mutado">No hay insumos en el inventario aún.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    stock.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${item.nombre_insumo || 'Sin nombre'}</strong></td>
        <td><span class="badge">${item.tipo_insumo || 'General'}</span></td>
        <td>${item.categoria || 'Sin asignar'}</td>
        <td>${item.stock_actual || 0} ${item.unidad_medida || ''}</td>
        <td>
          <div class="acciones">
            <button class="btn-editar" onclick="editarInsumo(${item.id}, '${item.nombre_insumo || ''}', ${item.stock_actual || 0})">Editar</button>
            ${esPropietario() ? `<button class="btn-eliminar" onclick="eliminarInsumo(${item.id})">Eliminar</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error al cargar inventario: ${err.message}</td></tr>`;
  }
}

async function editarInsumo(id, nombreActual, stockActual) {
  const nuevoNombre = prompt("Nombre del insumo:", nombreActual);
  if (nuevoNombre === null) return;
  const nuevoStock = prompt("Stock actual:", stockActual);
  if (nuevoStock === null) return;

  try {
    const { error } = await clienteSupabase.from("insumos").update({
      nombre_insumo: nuevoNombre,
      stock_actual: Number(nuevoStock)
    }).eq("id", id);

    if (error) throw error;
    alert("Insumo actualizado.");
    await cargarStock();
    await cargarOpcionesDesplegables();
  } catch (err) {
    alert("Error al actualizar insumo: " + err.message);
  }
}

async function eliminarInsumo(idInsumo) {
  if (!confirm("¿Estás seguro de eliminar este insumo?")) return;
  try {
    const { error } = await clienteSupabase.from("insumos").delete().eq("id", idInsumo);
    if (error) throw error;
    alert("Insumo eliminado.");
    await cargarStock();
    await cargarOpcionesDesplegables();
  } catch (err) {
    alert("Error al borrar insumo: " + err.message);
  }
}

// --- GALPONES ---
async function cargarGalpones() {
  const tbody = document.getElementById("tabla-cuerpo-galpones");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="texto-centrado-mutado">Cargando galpones...</td></tr>`;

  try {
    const { data: galpones, error: errG } = await clienteSupabase.from("galpones").select("*").order("id");
    if (errG) throw errG;

    if (!galpones || galpones.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="texto-centrado-mutado">No hay galpones registrados aún.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    galpones.forEach((g) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${g.nombre || 'Galpón #' + g.id}</strong></td>
        <td><span class="badge">${g.estado || 'Activo'}</span></td>
        <td>${g.capacidad_maxima || 0} aves</td>
        <td>${g.capacidad_actual || 0} aves</td>
        <td>
          <div class="acciones">
            <button class="btn-editar" onclick="editarGalpon(${g.id}, '${g.nombre || ''}', '${g.estado || 'activo'}', ${g.capacidad_maxima || 0})">Editar</button>
            ${esPropietario() ? `<button class="btn-eliminar" onclick="eliminarGalpon(${g.id})">Eliminar</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style='color:red;'>Error al consultar los galpones.</td></tr>`;
  }
}

async function editarGalpon(id, nombreActual, estadoActual, capMaxActual) {
  const nuevoNombre = prompt("Nombre del Galpón:", nombreActual);
  if (nuevoNombre === null) return;
  const nuevoEstado = prompt("Estado (activo, mantenimiento, inactivo):", estadoActual);
  if (nuevoEstado === null) return;
  const nuevaCap = prompt("Capacidad máxima:", capMaxActual);
  if (nuevaCap === null) return;

  try {
    const { error } = await clienteSupabase.from("galpones").update({
      nombre: nuevoNombre,
      estado: nuevoEstado,
      capacidad_maxima: Number(nuevaCap)
    }).eq("id", id);

    if (error) throw error;
    alert("Galpón actualizado.");
    await cargarGalpones();
    await cargarOpcionesDesplegables();
  } catch (err) {
    alert("Error al actualizar galpón: " + err.message);
  }
}

async function eliminarGalpon(idGalpon) {
  if (!confirm("¿Estás seguro de que deseas eliminar este galpón?")) return;
  try {
    const { error } = await clienteSupabase.from("galpones").delete().eq("id", idGalpon);
    if (error) throw error;
    alert("Galpón eliminado.");
    await cargarGalpones();
    await cargarOpcionesDesplegables();
  } catch (err) {
    alert("Error borrando galpón: " + err.message);
  }
}

// --- LOTES DE AVES ---
async function cargarLotesAves() {
  const tbody = document.getElementById("tabla-cuerpo-lotes");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">Cargando lotes de aves...</td></tr>`;

  try {
    const { data: lotes, error: errL } = await clienteSupabase
      .from("lotes_de_aves")
      .select(`*, galpones ( nombre )`)
      .order("id", { ascending: false });

    if (errL) throw errL;
    if (!lotes || lotes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">No hay lotes registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    lotes.forEach((lote) => {
      const nombreGalpon = lote.galpones ? lote.galpones.nombre : `Galpón ID: ${lote.galpon}`;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>Lote #${lote.id} - ${lote.raza || 'Sin raza'}</strong></td>
        <td>${nombreGalpon}</td>
        <td>${lote.cantidad_inicial || 0} aves</td>
        <td>${lote.fecha_ingreso || 'Sin fecha'}</td>
        <td><span class="badge">${lote.estado || 'Activo'}</span></td>
        <td>
          <div class="acciones">
            <button class="btn-editar" onclick="editarLote(${lote.id}, '${lote.raza || ''}', '${lote.estado || 'en postura'}')">Editar</button>
            ${esPropietario() ? `<button class="btn-eliminar" onclick="eliminarLote(${lote.id})">Eliminar</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style='color:red;'>Error al consultar lotes.</td></tr>`;
  }
}

async function editarLote(id, razaActual, estadoActual) {
  const nuevaRaza = prompt("Raza de ave:", razaActual);
  if (nuevaRaza === null) return;
  const nuevoEstado = prompt("Estado (previas a postura, en postura, sin postura):", estadoActual);
  if (nuevoEstado === null) return;

  try {
    const { error } = await clienteSupabase.from("lotes_de_aves").update({
      raza: nuevaRaza,
      estado: nuevoEstado
    }).eq("id", id);

    if (error) throw error;
    alert("Lote actualizado.");
    await cargarLotesAves();
    await cargarOpcionesDesplegables();
  } catch (err) {
    alert("Error al actualizar lote: " + err.message);
  }
}

async function eliminarLote(idLote) {
  if (!confirm("¿Estás seguro de borrar este lote?")) return;
  try {
    const { error } = await clienteSupabase.from("lotes_de_aves").delete().eq("id", idLote);
    if (error) throw error;
    alert("Lote eliminado.");
    await cargarLotesAves();
    await cargarOpcionesDesplegables();
  } catch (err) {
    alert("Error al eliminar lote: " + err.message);
  }
}

// --- PRODUCCIÓN ---
let cacheProduccionGlobal = [];

async function cargarProduccion() {
  const tbody = document.getElementById("tabla-cuerpo-produccion");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="texto-centrado-mutado">Cargando registros de producción...</td></tr>`;

  try {
    const { data: produccion, error } = await clienteSupabase
      .from("produccion")
      .select(`id, fecha, huevos_descartados, huevos_totales_comerciales, observaciones, maples_usados, lote, lotes_de_aves ( raza )`)
      .order("fecha", { ascending: false });

    if (error) throw error;
    cacheProduccionGlobal = produccion || [];
    renderizarTablaProduccion(cacheProduccionGlobal);
    configurarFiltroProduccion();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar registros de producción.</td></tr>`;
  }
}

function renderizarTablaProduccion(datos) {
  const tbody = document.getElementById("tabla-cuerpo-produccion");
  if (!tbody) return;

  if (!datos || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="texto-centrado-mutado">No hay registros de producción ingresados.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  datos.forEach((item) => {
    const infoLote = item.lotes_de_aves ? `Lote #${item.lote} (${item.lotes_de_aves.raza || 'Sin raza'})` : `Lote #${item.lote}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.fecha || 'N/A'}</td>
      <td><strong>${infoLote}</strong></td>
      <td>${item.huevos_totales_comerciales || 0}</td>
      <td>${item.huevos_descartados || 0}</td>
      <td>${item.maples_usados || 0}</td>
      <td>${item.observaciones || 'Sin observaciones'}</td>
      <td>
        <div class="acciones">
          <button class="btn-editar" onclick="editarProduccion(${item.id}, ${item.huevos_totales_comerciales || 0}, ${item.huevos_descartados || 0})">Editar</button>
          ${esPropietario() ? `<button class="btn-eliminar" onclick="eliminarProduccion(${item.id})">Eliminar</button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function configurarFiltroProduccion() {
  const inputFiltro = document.getElementById("filtro-mes-produccion");
  const btnLimpiar = document.getElementById("btn-limpiar-filtro");

  if (inputFiltro && !inputFiltro.hasAttribute("data-listener")) {
    inputFiltro.setAttribute("data-listener", "true");
    inputFiltro.addEventListener("change", (e) => {
      const mesSeleccionado = e.target.value;
      if (!mesSeleccionado) {
        renderizarTablaProduccion(cacheProduccionGlobal);
        return;
      }
      const filtrados = cacheProduccionGlobal.filter(item => item.fecha && item.fecha.startsWith(mesSeleccionado));
      renderizarTablaProduccion(filtrados);
    });
  }

  if (btnLimpiar && !btnLimpiar.hasAttribute("data-listener")) {
    btnLimpiar.setAttribute("data-listener", "true");
    btnLimpiar.addEventListener("click", () => {
      if (inputFiltro) inputFiltro.value = "";
      renderizarTablaProduccion(cacheProduccionGlobal);
    });
  }
}

async function editarProduccion(id, comercialesActual, descartadosActual) {
  const nuevosComerciales = prompt("Huevos comerciales:", comercialesActual);
  if (nuevosComerciales === null) return;
  const nuevosDescartados = prompt("Huevos descartados:", descartadosActual);
  if (nuevosDescartados === null) return;

  try {
    const { error } = await clienteSupabase.from("produccion").update({
      huevos_totales_comerciales: Number(nuevosComerciales),
      huevos_descartados: Number(nuevosDescartados)
    }).eq("id", id);

    if (error) throw error;
    alert("Producción actualizada.");
    await cargarProduccion();
    await calcularResumenesMensuales();
  } catch (err) {
    alert("Error al editar producción: " + err.message);
  }
}

async function eliminarProduccion(idProduccion) {
  if (!confirm("¿Estás seguro de eliminar este registro?")) return;
  try {
    const { error } = await clienteSupabase.from("produccion").delete().eq("id", idProduccion);
    if (error) throw error;
    alert("Registro eliminado.");
    await cargarProduccion();
    await calcularResumenesMensuales();
  } catch (err) {
    alert("Error al eliminar: " + err.message);
  }
} 

// --- MORTALIDAD ---
let cacheMortalidadGlobal = [];

async function cargarMortalidad() {
  const tbody = document.getElementById("tabla-cuerpo-mortalidad");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">Cargando registros de mortalidad...</td></tr>`;

  try {
    const { data: mortalidad, error } = await clienteSupabase
      .from("mortalidad")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) throw error;
    cacheMortalidadGlobal = mortalidad || [];
    renderizarTablaMortalidad(cacheMortalidadGlobal);
    configurarFiltroMortalidad();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar registros de mortalidad: ${err.message}</td></tr>`;
  }
}

function renderizarTablaMortalidad(datos) {
  const tbody = document.getElementById("tabla-cuerpo-mortalidad");
  if (!tbody) return;

  if (!datos || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="texto-centrado-mutado">No hay registros de mortalidad ingresados.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  datos.forEach((item) => {
    const causaOMotivo = item.causa || item.motivo || 'No especificado';
    const obs = item.observaciones || item.observacion || 'Sin observaciones';
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.fecha || 'N/A'}</td>
      <td><strong>Lote #${item.lote || 'N/A'}</strong></td>
      <td>${item.cantidad || 0}</td>
      <td>${causaOMotivo}</td>
      <td>${obs}</td>
      <td>
        <div class="acciones">
          <button class="btn-editar" onclick="editarMortalidad(${item.id}, ${item.cantidad || 0}, '${causaOMotivo}')">Editar</button>
          ${esPropietario() ? `<button class="btn-eliminar" onclick="eliminarMortalidad(${item.id})">Eliminar</button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function configurarFiltroMortalidad() {
  const inputFiltro = document.getElementById("filtro-mes-mortalidad");
  const btnLimpiar = document.getElementById("btn-limpiar-filtro-mortalidad");

  if (inputFiltro && !inputFiltro.hasAttribute("data-listener")) {
    inputFiltro.setAttribute("data-listener", "true");
    inputFiltro.addEventListener("change", (e) => {
      const mesSeleccionado = e.target.value;
      if (!mesSeleccionado) {
        renderizarTablaMortalidad(cacheMortalidadGlobal);
        return;
      }
      const filtrados = cacheMortalidadGlobal.filter(item => item.fecha && item.fecha.startsWith(mesSeleccionado));
      renderizarTablaMortalidad(filtrados);
    });
  }

  if (btnLimpiar && !btnLimpiar.hasAttribute("data-listener")) {
    btnLimpiar.setAttribute("data-listener", "true");
    btnLimpiar.addEventListener("click", () => {
      if (inputFiltro) inputFiltro.value = "";
      renderizarTablaMortalidad(cacheMortalidadGlobal);
    });
  }
}

async function editarMortalidad(id, cantidadActual, causaActual) {
  const nuevaCantidad = prompt("Cantidad de aves perdidas:", cantidadActual);
  if (nuevaCantidad === null) return;
  const nuevaCausa = prompt("Causa o motivo:", causaActual);
  if (nuevaCausa === null) return;

  try {
    const { error } = await clienteSupabase.from("mortalidad").update({
      cantidad: Number(nuevaCantidad),
      motivo: nuevaCausa
    }).eq("id", id);

    if (error) throw error;
    alert("Registro actualizado.");
    await cargarMortalidad();
  } catch (err) {
    alert("Error al editar: " + err.message);
  }
}

async function eliminarMortalidad(idMortalidad) {
  if (!confirm("¿Estás seguro de eliminar este registro?")) return;
  try {
    const { error } = await clienteSupabase.from("mortalidad").delete().eq("id", idMortalidad);
    if (error) throw error;
    alert("Registro eliminado.");
    await cargarMortalidad();
  } catch (err) {
    alert("Error al eliminar: " + err.message);
  }
}
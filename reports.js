// ============================================================================
// MÓDULO: PANEL GERENCIAL DE CONTROL Y REPORTES (SUPER ADMIN)
// ============================================================================

function inicializarReportesGerenciales() {
  const inputFiltro = document.getElementById("filtro-mes-reportes");
  const btnLimpiar = document.getElementById("btn-limpiar-filtro-reportes");

  const mesActual = new Date().toISOString().slice(0, 7);
  if (inputFiltro && !inputFiltro.value) {
    inputFiltro.value = mesActual;
  }

  if (inputFiltro && !inputFiltro.hasAttribute("data-listener")) {
    inputFiltro.setAttribute("data-listener", "true");
    inputFiltro.addEventListener("change", (e) => {
      generarReporteConsolidado(e.target.value);
    });
  }

  if (btnLimpiar && !btnLimpiar.hasAttribute("data-listener")) {
    btnLimpiar.setAttribute("data-listener", "true");
    btnLimpiar.addEventListener("click", () => {
      if (inputFiltro) inputFiltro.value = mesActual;
      generarReporteConsolidado(mesActual);
    });
  }

  generarReporteConsolidado(inputFiltro ? inputFiltro.value : mesActual);
}

async function generarReporteConsolidado(mesSeleccionado) {
  const elemPeriodo = document.getElementById("reporte-periodo-texto");
  const elemFechaEmision = document.getElementById("reporte-fecha-emision");
  if (elemPeriodo) elemPeriodo.textContent = mesSeleccionado || "Historico General";
  if (elemFechaEmision) elemFechaEmision.textContent = new Date().toLocaleDateString('es-AR');

  try {
    const { data: ventas } = await clienteSupabase.from("ventas").select("monto_total, cantidad, fecha, clientes(nombre_completo)");
    const { data: compras } = await clienteSupabase.from("compras").select("monto_total, fecha");
    const { data: produccion } = await clienteSupabase.from("produccion").select("huevos_totales_comerciales, huevos_descartados, fecha");
    const { data: alimentacion } = await clienteSupabase.from("alimentacion").select("kilos_consumidos, fecha");
    const { data: mortalidad } = await clienteSupabase.from("mortalidad").select("cantidad, motivo, fecha");
    const { data: lotes } = await clienteSupabase.from("lotes_de_aves").select("cantidad_actual, cantidad_inicial, estado");
    const { data: galpones } = await clienteSupabase.from("galpones").select("capacidad_maxima, capacidad_actual");

    const ventasMes = (ventas || []).filter(v => !mesSeleccionado || (v.fecha && v.fecha.startsWith(mesSeleccionado)));
    const comprasMes = (compras || []).filter(c => !mesSeleccionado || (c.fecha && c.fecha.startsWith(mesSeleccionado)));
    const prodMes = (produccion || []).filter(p => !mesSeleccionado || (p.fecha && p.fecha.startsWith(mesSeleccionado)));
    const alimMes = (alimentacion || []).filter(a => !mesSeleccionado || (a.fecha && a.fecha.startsWith(mesSeleccionado)));
    const mortMes = (mortalidad || []).filter(m => !mesSeleccionado || (m.fecha && m.fecha.startsWith(mesSeleccionado)));

    const totalIngresos = ventasMes.reduce((acc, v) => acc + Number(v.monto_total || 0), 0);
    const totalGastos = comprasMes.reduce((acc, c) => acc + Number(c.monto_total || 0), 0);
    const balanceNeto = totalIngresos - totalGastos;
    const ticketPromedio = ventasMes.length > 0 ? (totalIngresos / ventasMes.length).toFixed(0) : 0;

    document.getElementById("rep-ingresos").textContent = `$${totalIngresos.toLocaleString('es-AR')}`;
    document.getElementById("rep-gastos").textContent = `$${totalGastos.toLocaleString('es-AR')}`;
    const elemNeto = document.getElementById("rep-balance-neto");
    elemNeto.textContent = `$${balanceNeto.toLocaleString('es-AR')}`;
    elemNeto.style.color = balanceNeto >= 0 ? "var(--color-secundario)" : "var(--color-peligro)";
    document.getElementById("rep-ticket-promedio").textContent = `$${Number(ticketPromedio).toLocaleString('es-AR')}`;

    let comerciales = 0;
    let descarte = 0;
    prodMes.forEach(p => {
      comerciales += Number(p.huevos_totales_comerciales || 0);
      descarte += Number(p.huevos_descartados || 0);
    });
    const totalHuevos = comerciales + descarte;
    const porcPostura = totalHuevos > 0 ? ((comerciales / totalHuevos) * 100).toFixed(1) : 0;
    const costoPorHuevo = comerciales > 0 ? (totalGastos / comerciales).toFixed(2) : 0;

    document.getElementById("rep-porcentaje-postura").textContent = `${porcPostura}%`;
    document.getElementById("rep-huevos-totales").textContent = totalHuevos.toLocaleString('es-AR');
    document.getElementById("rep-huevos-comerciales").textContent = comerciales.toLocaleString('es-AR');
    document.getElementById("rep-huevos-descarte").textContent = descarte.toLocaleString('es-AR');
    document.getElementById("rep-costo-por-huevo").textContent = `$${costoPorHuevo}`;

    const totalKilos = alimMes.reduce((acc, a) => acc + Number(a.kilos_consumidos || 0), 0);
    const totalAvesActivas = (lotes || []).reduce((acc, l) => acc + Number(l.cantidad_actual || l.cantidad_inicial || 0), 0);
    const diasEnMes = 30;
    const consumoPromedioGr = (totalAvesActivas > 0 && totalKilos > 0) ? ((totalKilos * 1000) / (totalAvesActivas * diasEnMes)).toFixed(1) : 0;

    document.getElementById("rep-kilos-consumidos").textContent = `${totalKilos.toFixed(1)} kg`;
    document.getElementById("rep-consumo-promedio-ave").textContent = `${consumoPromedioGr} g/día`;

    const totalBajas = mortMes.reduce((acc, m) => acc + Number(m.cantidad || 0), 0);
    const tasaMortalidad = totalAvesActivas > 0 ? ((totalBajas / totalAvesActivas) * 100).toFixed(1) : 0;
    
    const conteoCausas = {};
    mortMes.forEach(m => {
      const motivo = m.motivo || "No especificada";
      conteoCausas[motivo] = (conteoCausas[motivo] || 0) + Number(m.cantidad || 1);
    });
    const causaPrincipal = Object.keys(conteoCausas).sort((a,b) => conteoCausas[b] - conteoCausas[a])[0] || "Ninguna";

    document.getElementById("rep-bajas-totales").textContent = `${totalBajas} aves`;
    document.getElementById("rep-tasa-mortalidad").textContent = `${tasaMortalidad}%`;
    document.getElementById("rep-causa-principal").textContent = causaPrincipal;

    let capMaxTotal = 0;
    (galpones || []).forEach(g => {
      capMaxTotal += Number(g.capacidad_maxima || 0);
    });
    const porcOcupacion = capMaxTotal > 0 ? ((totalAvesActivas / capMaxTotal) * 100).toFixed(1) : 0;

    document.getElementById("rep-aves-totales").textContent = totalAvesActivas.toLocaleString('es-AR');
    document.getElementById("rep-ocupacion-galpones").textContent = `${porcOcupacion}%`;
    document.getElementById("rep-lotes-activos").textContent = (lotes || []).length;

    const clientesMap = {};
    ventasMes.forEach(v => {
      const nombre = v.clientes ? v.clientes.nombre_completo : "Cliente General";
      clientesMap[nombre] = (clientesMap[nombre] || 0) + Number(v.monto_total || 0);
    });

    const topClientesArr = Object.entries(clientesMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const contenedorTop = document.getElementById("rep-top-clientes");
    
    if (topClientesArr.length > 0) {
      contenedorTop.innerHTML = topClientesArr.map(([nombre, monto], idx) => `
        <p><strong>${idx + 1}. ${nombre}:</strong> $${monto.toLocaleString('es-AR')}</p>
      `).join("");
    } else {
      contenedorTop.innerHTML = `<p class="texto-centrado-mutado">Sin ventas en este período.</p>`;
    }

  } catch (err) {
    console.error("Error al generar reporte consolidado:", err);
  }
}
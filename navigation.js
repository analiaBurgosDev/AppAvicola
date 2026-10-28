// ============================================================================
// MÓDULO: NAVEGACIÓN SPA E INICIALIZACIÓN
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const hoy = new Date().toISOString().split("T")[0];
  document.querySelectorAll(".input-fecha-hoy").forEach((campo) => {
    campo.value = hoy;
  });

  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.addEventListener("submit", manejarLogin);
  }

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", manejarLogout);
  }

  window.addEventListener("hashchange", gestionarNavegacionSPA);

  clienteSupabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      rolUsuarioActual = null;
      verificarSesionYRol();
    }
  });

  const sesionValida = await verificarSesionYRol();

  if (sesionValida) {
    await cargarOpcionesDesplegables();
    inicializarFormularios();
    inicializarLoadersNavegacion();
    inicializarReportesGerenciales();
    await cargarTodosLosDatos();
    gestionarNavegacionSPA();
  }
});

function gestionarNavegacionSPA() {
  if (!rolUsuarioActual) return;

  const hash = window.location.hash || "#inicio";
  const destino = document.querySelector(hash);

  document.querySelectorAll(".pantalla-app").forEach((pantalla) => {
    pantalla.classList.remove("activa");
  });

  if (destino && destino.classList.contains("pantalla-app")) {
    const rolesPermitidos = destino.getAttribute("data-rol") 
      ? destino.getAttribute("data-rol").split(",").map(r => r.trim())
      : null;

    if (!rolesPermitidos || rolesPermitidos.includes(rolUsuarioActual)) {
      destino.classList.add("activa");

      if (hash === "#panel-superadmin-reportes") {
        const inputFiltro = document.getElementById("filtro-mes-reportes");
        const mesActual = inputFiltro ? inputFiltro.value : new Date().toISOString().slice(0, 7);
        generarReporteConsolidado(mesActual);
      }

    } else {
      alert("No posees permisos para acceder a esta sección.");
      window.location.hash = "#inicio";
      const inicio = document.getElementById("inicio");
      if (inicio) inicio.classList.add("activa");
    }
  } else {
    const inicio = document.getElementById("inicio");
    if (inicio) inicio.classList.add("activa");
  }

  window.scrollTo(0, 0);
}

function inicializarLoadersNavegacion() {
  const botonesNavegacion = document.querySelectorAll(".btn-entrar, .btn-volver");
  botonesNavegacion.forEach((boton) => {
    boton.addEventListener("click", () => {
      // Navegación fluida SPA
    });
  });
}
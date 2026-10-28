// ============================================================================
// MÓDULO: AUTENTICACIÓN Y SESIÓN
// ============================================================================

let rolUsuarioActual = null;

async function manejarLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorBox = document.getElementById("login-error");

  if (errorBox) errorBox.classList.add("d-none");

  const { data, error } = await clienteSupabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    if (errorBox) {
      errorBox.textContent = "Error de inicio de sesión: " + error.message;
      errorBox.classList.remove("d-none");
    } else {
      alert("Error: " + error.message);
    }
    return;
  }

  window.location.hash = "#inicio";
  const sesionValida = await verificarSesionYRol();
  if (sesionValida) {
    await cargarOpcionesDesplegables();
    await cargarTodosLosDatos();
    gestionarNavegacionSPA();
  }
}

async function manejarLogout() {
  await clienteSupabase.auth.signOut();
  rolUsuarioActual = null;
  window.location.hash = "";
  verificarSesionYRol();
}

async function verificarSesionYRol() {
  const { data: { user } } = await clienteSupabase.auth.getUser();

  const pantallaAuth = document.getElementById("pantalla-auth");
  const headerUsuario = document.getElementById("header-usuario");
  const userDisplay = document.getElementById("user-email-display");
  const rolBadge = document.getElementById("user-rol-badge");

  if (user) {
    if (pantallaAuth) pantallaAuth.classList.add("d-none");
    if (headerUsuario) headerUsuario.classList.remove("d-none");

    let rolEncontrado = "produccion";
    try {
      const { data: perfil, error } = await clienteSupabase
        .from("perfiles")
        .select("rol, nombre")
        .eq("id_user", user.id)
        .maybeSingle();

      if (perfil && perfil.rol) {
        rolEncontrado = perfil.rol.toLowerCase().trim();
      } else {
        const emailLower = user.email.toLowerCase().trim();
        if (emailLower.includes("admingeneral") || emailLower.includes("super")) {
          rolEncontrado = "superadmin";
        } else if (emailLower.includes("administracion")) {
          rolEncontrado = "admin";
        } else if (emailLower.includes("finanzas")) {
          rolEncontrado = "finanzas";
        } else {
          rolEncontrado = "produccion";
        }
      }
    } catch (err) {
      console.error("Excepción al verificar rol:", err);
    }

    rolUsuarioActual = rolEncontrado;

    if (userDisplay) userDisplay.textContent = user.email;
    if (rolBadge) rolBadge.textContent = rolUsuarioActual.toUpperCase();

    aplicarPermisosInterface(rolUsuarioActual);
    return true;
  } else {
    if (pantallaAuth) pantallaAuth.classList.remove("d-none");
    if (headerUsuario) headerUsuario.classList.add("d-none");

    document.querySelectorAll(".pantalla-app").forEach((pantalla) => {
      pantalla.classList.remove("activa");
    });

    if (window.location.hash) {
      history.replaceState(null, null, ' ');
    }
    return false;
  }
}

function aplicarPermisosInterface(rol) {
  const elementosConRol = document.querySelectorAll("[data-rol]");
  elementosConRol.forEach((elem) => {
    const rolesPermitidos = elem.getAttribute("data-rol").split(",").map(r => r.trim());
    if (rolesPermitidos.includes(rol)) {
      elem.classList.remove("d-none");
    } else {
      elem.classList.add("d-none");
    }
  });
}

function esPropietario() {
  return rolUsuarioActual === "superadmin";
}
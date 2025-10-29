$(document).ready(function() {
    
    // 1. Limpia los campos y errores cada vez que el modal se abre.
    $('#loginModal').on('shown.bs.modal', function() {
        $('#loginError').addClass('d-none');
        $('#inputUsuario').val('');
        $('#inputContrasena').val('');
        $('#inputUsuario').focus(); 
    });

    // 2. Manejar la verificación de las credenciales al hacer clic en el botón "Ingresar"
    $('#submitLogin').on('click', function(e) {
        e.preventDefault(); 

        // DATOS DE VERIFICACIÓN (Verifica que coincidan exactamente: mayúsculas/minúsculas)
        const USUARIO_CORRECTO = 'admin';
        const CONTRASENA_CORRECTA = 'Chino2025';
        
        // RUTA DE DESTINO: Esta es la línea más crítica ahora.
        // Asume que la carpeta 'dataatletas' está en el mismo nivel que 'index.html'.
        const RUTA_DESTINO = 'index.html'; 

        // Obtener los valores ingresados por el usuario
        const usuario = $('#inputUsuario').val();
        const contrasena = $('#inputContrasena').val();
        const $errorAlert = $('#loginError');

        // *************** LÓGICA DE VALIDACIÓN ***************
        if (usuario === USUARIO_CORRECTO && contrasena === CONTRASENA_CORRECTA) {
            // Credenciales Correctas: 
            $errorAlert.addClass('d-none');
            
            // Oculta el modal (necesario antes de redirigir)
            var modalInstance = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (modalInstance) {
                modalInstance.hide();
            }
            
            // REDIRECCIÓN FINAL
            window.location.href = RUTA_DESTINO; 
            
        } else {
            // Credenciales Incorrectas: 
            $('#inputContrasena').val('');
            $errorAlert.removeClass('d-none');
        }
    });
});
$(document).ready(function() {
    
    // 1. Limpia los campos y errores cada vez que el modal se abre.
    $('#loginModal').on('shown.bs.modal', function() {
        $('#loginError').addClass('d-none'); // Oculta el error
        $('#inputUsuario').val('');
        $('#inputContrasena').val('');
        $('#inputUsuario').focus(); 
    });

    // 2. Manejar la verificación de las credenciales al hacer clic en el botón "Ingresar" del modal.
    $('#submitLogin').on('click', function(e) {
        e.preventDefault(); 

        // DATOS DE VERIFICACIÓN
        const USUARIO_CORRECTO = 'admin';
        const CONTRASENA_CORRECTA = 'Chino2025';
        const RUTA_DESTINO = 'dataatletas/frm_atletas.html'; 

        const usuario = $('#inputUsuario').val();
        const contrasena = $('#inputContrasena').val();
        const $errorAlert = $('#loginError'); // Referencia al DIV de error

        // *************** LÓGICA DE VALIDACIÓN ***************
        if (usuario === USUARIO_CORRECTO && contrasena === CONTRASENA_CORRECTA) {
            
            // ÉXITO: Oculta el mensaje y redirige
            $errorAlert.addClass('d-none');
            
            var modalInstance = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (modalInstance) {
                modalInstance.hide();
            }
            window.location.href = RUTA_DESTINO; 
            
        } else {
            
            // FALLO: Muestra el mensaje de error
            $('#inputContrasena').val(''); // Limpia solo la contraseña
            $errorAlert.removeClass('d-none'); // Muestra el mensaje de error
        }
    });
});

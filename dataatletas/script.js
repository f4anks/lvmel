/**
 * ==========================================================
 * I. LÓGICA DE INICIALIZACIÓN Y LLENADO DEL SELECT CLUB/EQUIPO
 * ==========================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Llenar el campo de selección de Club/Equipo
    const clubSelect = document.getElementById('club');
    
    // Solo si el elemento 'club' existe, procedemos a llenarlo
    if (clubSelect) { 
        // Lista de clubes proporcionada
        const clubes = [
            "Bertha Carrero", "Olimpikus", "El Sisal", "Everest", 
            "Villa Cantevista", "MG", "Santa Isabel", "Luis Hurtado", 
            "Codigo Monarca", "Famaguaros", "Big Star", "Sporta", 
            "Antonio Espinoza", "Los Olivos", "Ruiz Pineda", "Sanz", 
            "Ohana"
        ];

        // Ordenar los clubes alfabéticamente (soporta caracteres acentuados)
        clubes.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

        // Crear y añadir las opciones al campo select
        clubes.forEach(club => {
            const option = document.createElement('option');
            option.value = club;
            option.textContent = club;
            clubSelect.appendChild(option);
        });
    }


    // 2. Inicializar la escucha del formulario y carga de datos
    const athleteForm = document.getElementById('athleteForm');
    if (athleteForm) {
        athleteForm.addEventListener('submit', handleFormSubmit);
    }

    loadRegisteredAthletes(); // Cargar y mostrar los atletas al iniciar
});


/**
 * ==========================================================
 * II. FUNCIONES PRINCIPALES DE MANEJO DE DATOS (EJEMPLO)
 * ==========================================================
 * Estas funciones asumen el uso de LocalStorage o una API. 
 */

// Función auxiliar para mostrar mensajes de estado
function displayStatusMessage(message, isSuccess = true) {
    const statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) return;

    statusMessage.textContent = message;
    
    // Asigna el color Vinotinto (error) o Rojo Brillante (éxito)
    statusMessage.style.backgroundColor = isSuccess ? '#5C001C' : '#CC0033'; 
    statusMessage.style.opacity = 1;

    setTimeout(() => {
        statusMessage.style.opacity = 0;
    }, 3000);
}


// 1. Manejar el envío del formulario
function handleFormSubmit(event) {
    event.preventDefault(); 

    // Obtener los datos del formulario
    const formData = new FormData(event.target);
    const athleteData = Object.fromEntries(formData.entries());

    // Validar Cédula (ejemplo de validación simple)
    if (!athleteData.cedula || athleteData.cedula.length < 5) {
        displayStatusMessage('Error: La Cédula de Identidad no es válida.', false);
        return;
    }
    
    // Convertir a mayúsculas para consistencia
    athleteData.nombre = athleteData.nombre.toUpperCase();
    athleteData.apellido = athleteData.apellido.toUpperCase();
    athleteData.club = athleteData.club.toUpperCase();
    athleteData.division = athleteData.division.toUpperCase();

    // Guardar los datos
    const success = saveAthlete(athleteData);

    if (success) {
        displayStatusMessage('Atleta registrado exitosamente.');
        event.target.reset(); // Limpiar formulario
        loadRegisteredAthletes(); // Recargar la lista
    } else {
        displayStatusMessage('Error: El atleta con esa Cédula ya está registrado.', false);
    }
}


// 2. Guardar un atleta (usando LocalStorage para el ejemplo)
function saveAthlete(newAthlete) {
    let athletes = loadFromLocalStorage();
    
    // Verificar duplicidad por Cédula
    const exists = athletes.some(athlete => athlete.cedula === newAthlete.cedula);
    if (exists) {
        return false; 
    }

    athletes.push(newAthlete);
    saveToLocalStorage(athletes);
    return true;
}


// 3. Cargar datos de atletas (usando LocalStorage para el ejemplo)
function loadRegisteredAthletes() {
    const athletes = loadFromLocalStorage();
    renderAthleteTable(athletes);
}


// 4. Mostrar la tabla de atletas
function renderAthleteTable(athletes) {
    const container = document.getElementById('registeredData');
    if (!container) return;

    if (athletes.length === 0) {
        container.innerHTML = '<p class="no-data-message">Aún no hay atletas registrados.</p>';
        return;
    }

    let html = `
        <div class="table-responsive-wrapper">
            <table class="athlete-data-table">
                <thead>
                    <tr>
                        <th data-sort="cedula">Cédula</th>
                        <th data-sort="nombre">Nombre</th>
                        <th data-sort="apellido">Apellido</th>
                        <th data-sort="club">Club/Equipo</th>
                        <th data-sort="division">División</th>
                        <th data-sort="fechaNac">F. Nac.</th>
                        <th data-sort="talla">Talla (m)</th>
                        <th data-sort="peso">Peso (kg)</th>
                        <th>Teléfono</th>
                    </tr>
                </thead>
                <tbody>
    `;

    athletes.forEach(athlete => {
        html += `
            <tr>
                <td>${athlete.cedula}</td>
                <td>${athlete.nombre}</td>
                <td>${athlete.apellido}</td>
                <td>${athlete.club}</td>
                <td>${athlete.division}</td>
                <td>${athlete.fechaNac}</td>
                <td>${athlete.talla || '-'}</td>
                <td>${athlete.peso || '-'}</td>
                <td>${athlete.telefono || '-'}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}


/**
 * ==========================================================
 * III. FUNCIONES DE MANEJO DE LocalStorage
 * ==========================================================
 */

// Cargar atletas desde LocalStorage
function loadFromLocalStorage() {
    const data = localStorage.getItem('lvm_atletas');
    try {
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Error parsing LocalStorage data:", e);
        return [];
    }
}

// Guardar atletas a LocalStorage
function saveToLocalStorage(athletes) {
    try {
        localStorage.setItem('lvm_atletas', JSON.stringify(athletes));
    } catch (e) {
        console.error("Error saving to LocalStorage:", e);
    }
}

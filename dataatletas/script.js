// ==========================================================
// IMPORTACIONES (ASUMIR QUE ESTÁN EN TU AMBIENTE MODULAR)
// ==========================================================
// import { db } from './firebase-config.js'; 
// import { collection, addDoc, getDocs } from 'firebase/firestore'; 

// IMPORTANTE: Si no estás usando módulos o no tienes definida 'db' aquí, 
// reemplaza las llamadas a Firebase con tus funciones/rutas correctas.


/**
 * ==========================================================
 * I. LÓGICA DE INICIALIZACIÓN Y LLENADO DEL SELECT CLUB/EQUIPO
 * ==========================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Llenar el campo de selección de Club/Equipo
    const clubSelect = document.getElementById('club');
    
    if (clubSelect) { 
        // Lista de clubes proporcionada (ordenada alfabéticamente)
        const clubes = [
            "Antonio Espinoza", "Bertha Carrero", "Big Star", "Codigo Monarca", 
            "El Sisal", "Everest", "Famaguaros", "Los Olivos", "Luis Hurtado", 
            "MG", "Ohana", "Olimpikus", "Ruiz Pineda", "Santa Isabel", 
            "Sanz", "Sporta", "Villa Cantevista"
        ];
        
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

    // 3. Cargar y mostrar los atletas desde Firebase al iniciar
    loadRegisteredAthletes(); 
});


/**
 * ==========================================================
 * II. FUNCIONES PRINCIPALES DE MANEJO DE DATOS CON FIREBASE
 * ==========================================================
 */

// Función auxiliar para mostrar mensajes de estado
function displayStatusMessage(message, isSuccess = true) {
    const statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) return;

    statusMessage.textContent = message;
    
    // Colores de tu tema Vinotinto/Rojo Brillante
    statusMessage.style.backgroundColor = isSuccess ? '#5C001C' : '#CC0033'; 
    statusMessage.style.opacity = 1;

    setTimeout(() => {
        statusMessage.style.opacity = 0;
    }, 3000);
}


// 1. Manejar el envío del formulario
async function handleFormSubmit(event) {
    event.preventDefault(); 

    const formData = new FormData(event.target);
    const athleteData = Object.fromEntries(formData.entries());
    
    // Conversión a mayúsculas para consistencia en el almacenamiento
    athleteData.nombre = athleteData.nombre.toUpperCase();
    athleteData.apellido = athleteData.apellido.toUpperCase();
    athleteData.club = athleteData.club.toUpperCase();
    athleteData.division = athleteData.division.toUpperCase();

    // Guardar los datos en Firebase
    const success = await saveAthlete(athleteData);

    if (success) {
        displayStatusMessage('Atleta registrado exitosamente.');
        event.target.reset(); // Limpiar formulario
        loadRegisteredAthletes(); // Recargar la lista
    } else {
        // El error ya es manejado dentro de saveAthlete (ej. error de conexión)
        displayStatusMessage('Error al registrar el atleta. Revisa la consola.', false);
    }
}


// 2. Guardar un atleta en la colección 'atletas' de Firebase
async function saveAthlete(newAthlete) {
    // Nota: La validación de duplicidad por Cédula debe hacerse en un ambiente 
    // real (servidor) o mediante una consulta adicional aquí si es crítica.
    try {
        // Reemplaza 'db' con tu instancia de Firestore
        // y 'addDoc' con tu método de guardado.
        const docRef = await addDoc(collection(db, "atletas"), newAthlete);
        console.log("Documento escrito con ID: ", docRef.id);
        return true;
    } catch (e) {
        console.error("Error al añadir el documento: ", e);
        return false;
    }
}


// 3. Cargar datos de atletas desde la colección 'atletas' de Firebase
async function loadRegisteredAthletes() {
    const container = document.getElementById('registeredData');
    if (!container) return;

    container.innerHTML = '<p class="loading-message">Cargando datos de atletas...</p>';

    try {
        // Reemplaza 'db' y los métodos de Firebase con tus rutas correctas
        const atletasCol = collection(db, "atletas"); 
        const atletaSnapshot = await getDocs(atletasCol);
        
        let athletes = [];
        atletaSnapshot.forEach((doc) => {
            athletes.push({ id: doc.id, ...doc.data() });
        });

        renderAthleteTable(athletes); 

    } catch (error) {
        console.error("Error al cargar atletas desde Firebase:", error);
        container.innerHTML = '<p class="no-data-message" style="color: var(--color-red);">Error al conectar o leer la base de datos.</p>';
        displayStatusMessage('Error al cargar datos. Revisa la conexión.', false);
    }
}


// 4. Mostrar la tabla de atletas (sin cambios)
function renderAthleteTable(athletes) {
    const container = document.getElementById('registeredData');
    if (!container) return;

    if (athletes.length === 0) {
        container.innerHTML = '<p class="no-data-message">Aún no hay atletas registrados en la base de datos.</p>';
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
                <td>${athlete.cedula || '-'}</td>
                <td>${athlete.nombre || '-'}</td>
                <td>${athlete.apellido || '-'}</td>
                <td>${athlete.club || '-'}</td>
                <td>${athlete.division || '-'}</td>
                <td>${athlete.fechaNac || '-'}</td>
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

// Nota: Las funciones de LocalStorage (loadFromLocalStorage, saveToLocalStorage) 
// han sido eliminadas ya que estás usando Firebase.

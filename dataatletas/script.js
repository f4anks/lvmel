// CONFIGURACIÓN DE FIREBASE (REQUIERE QUE TUS CLAVES ESTÉN AQUÍ)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Reemplaza con tus credenciales de configuración de Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const atletasCollection = collection(db, "atletas");

// Estado de ordenamiento global
let currentSortColumn = 'cedula';
let currentSortDirection = 'asc';

// -------------------------------------------------------------------------
// UTILIDADES
// -------------------------------------------------------------------------

/**
 * Muestra un mensaje de estado temporal en la esquina superior derecha.
 * @param {string} message - El mensaje a mostrar.
 * @param {boolean} isError - Si es un mensaje de error (true) o éxito/info (false).
 */
function displayStatusMessage(message, isError) {
    const statusMessageElement = document.getElementById('statusMessage');
    statusMessageElement.textContent = message;
    statusMessageElement.style.backgroundColor = isError ? '#DC143C' : '#800020'; // Rojo Brillante o Vinotinto
    statusMessageElement.style.opacity = '1';

    setTimeout(() => {
        statusMessageElement.style.opacity = '0';
    }, 4000); // El mensaje desaparece después de 4 segundos
}

/**
 * Calcula la edad a partir de una fecha de nacimiento (YYYY-MM-DD).
 * @param {string} dateString - Fecha de nacimiento.
 * @returns {number} Edad en años.
 */
function calculateAge(dateString) {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// -------------------------------------------------------------------------
// REGISTRO DE ATLETAS
// -------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Escuchar el envío del formulario de registro
    const athleteForm = document.getElementById('athleteForm');
    if (athleteForm) {
        athleteForm.addEventListener('submit', handleAthleteFormSubmit);
    }
    
    // Iniciar el listener de la tabla de datos
    setupRealtimeDataListener();
});

/**
 * Maneja el evento de envío del formulario de registro de atletas.
 * @param {Event} event - El evento de envío del formulario.
 */
async function handleAthleteFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const athleteData = {
        cedula: form.cedula.value.trim(),
        club: form.club.value,
        nombre: form.nombre.value.trim(),
        apellido: form.apellido.value.trim(),
        fechaNac: form.fechaNac.value,
        division: form.division.value,
        talla: parseFloat(form.talla.value) || null,
        peso: parseFloat(form.peso.value) || null,
        correo: form.correo.value.trim() || null,
        telefono: form.telefono.value.trim() || null,
        timestamp: new Date() // Marca de tiempo del registro
    };

    try {
        // Chequeo de duplicidad simple usando la cédula como ID del documento
        const docRef = doc(db, "atletas", athleteData.cedula);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            displayStatusMessage(`Error: El atleta con Cédula ${athleteData.cedula} ya está registrado.`, true);
            return;
        }

        // Registrar atleta, permitiendo que Firestore genere un ID automático
        await addDoc(atletasCollection, athleteData);

        displayStatusMessage("Atleta registrado con éxito.", false);
        form.reset(); // Limpiar el formulario
        document.getElementById('club').value = ""; // Resetear select manualmente
        document.getElementById('division').value = "";
    } catch (e) {
        console.error("Error al añadir documento: ", e);
        displayStatusMessage(`Error al registrar: ${e.message}`, true);
    }
}

// -------------------------------------------------------------------------
// CARGA Y RENDERIZADO DE DATOS EN TIEMPO REAL
// -------------------------------------------------------------------------

/**
 * Configura el listener de datos en tiempo real de Firestore.
 */
function setupRealtimeDataListener() {
    // Consulta con ordenación por la columna y dirección actual
    const q = query(atletasCollection, orderBy(currentSortColumn, currentSortDirection));

    onSnapshot(q, (snapshot) => {
        const athletes = [];
        snapshot.forEach((doc) => {
            athletes.push({ id: doc.id, ...doc.data() });
        });
        // Renderizar los datos en la tabla
        renderAthleteTable(athletes);
    }, (error) => {
        console.error("Error al escuchar cambios en Firestore: ", error);
        document.getElementById('registeredData').innerHTML = '<p class="no-data-message">Error al cargar datos. Verifica la conexión a Firebase.</p>';
    });
}

/**
 * Renderiza la tabla de atletas.
 * @param {Array<Object>} athletes - Lista de objetos de atletas.
 */
function renderAthleteTable(athletes) {
    const container = document.getElementById('registeredData');
    if (athletes.length === 0) {
        container.innerHTML = '<p class="no-data-message">No hay atletas registrados aún.</p>';
        return;
    }

    // Encabezados de la tabla y su clave de ordenamiento
    const headers = [
        { name: 'Cédula', key: 'cedula' },
        { name: 'Nombre Completo', key: 'nombre' },
        { name: 'Edad', key: 'fechaNac' }, // Se ordenará por fechaNac para precisión
        { name: 'Club', key: 'club' },
        { name: 'División', key: 'division' },
        { name: 'Talla (m)', key: 'talla' },
        { name: 'Peso (kg)', key: 'peso' },
        { name: 'Registro', key: 'timestamp' }
    ];

    let tableHTML = `
        <div class="table-responsive-wrapper">
            <table class="athlete-data-table">
                <thead>
                    <tr>
                        ${headers.map(header => `
                            <th data-key="${header.key}" 
                                class="${currentSortColumn === header.key ? 'sorted-' + currentSortDirection : ''}">
                                ${header.name}
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    // Cuerpo de la tabla
    athletes.forEach(athlete => {
        const fullName = `${athlete.nombre || ''} ${athlete.apellido || ''}`;
        const age = athlete.fechaNac ? calculateAge(athlete.fechaNac) : 'N/A';
        const tallaDisplay = athlete.talla ? athlete.talla.toFixed(2) : 'N/A';
        const pesoDisplay = athlete.peso ? athlete.peso.toFixed(2) : 'N/A';
        
        // Formatear el timestamp
        const timestampDate = athlete.timestamp && athlete.timestamp.toDate ? 
                              athlete.timestamp.toDate().toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric' }) : 
                              'N/A';

        tableHTML += `
            <tr>
                <td>${athlete.cedula || 'N/A'}</td>
                <td>${fullName.trim() || 'N/A'}</td>
                <td>${age}</td>
                <td>${athlete.club || 'N/A'}</td>
                <td>${athlete.division || 'N/A'}</td>
                <td>${tallaDisplay}</td>
                <td>${pesoDisplay}</td>
                <td>${timestampDate}</td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
        <p class="table-note-message">Clic en el encabezado de la columna para ordenar.</p>
    `;

    container.innerHTML = tableHTML;

    // Agregar event listeners para el ordenamiento
    document.querySelectorAll('.athlete-data-table th').forEach(header => {
        header.addEventListener('click', handleSortChange);
    });
}

/**
 * Maneja el cambio de ordenamiento de la tabla.
 * @param {Event} event - El evento de clic en el encabezado.
 */
function handleSortChange(event) {
    const newSortColumn = event.target.dataset.key;

    if (!newSortColumn) return;

    if (newSortColumn === currentSortColumn) {
        // Cambiar dirección
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Nueva columna, ordenar por ascendente
        currentSortColumn = newSortColumn;
        currentSortDirection = 'asc';
    }

    // Reestablecer el listener de tiempo real con el nuevo orden
    setupRealtimeDataListener();
}

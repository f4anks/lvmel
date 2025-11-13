// Importa las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, getDocs, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Tu configuración de Firebase (DEBES REEMPLAZAR ESTO CON TUS CREDENCIALES)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const athletesCol = collection(db, "atletas");

// Referencias a los elementos del DOM
const athleteForm = document.getElementById('athleteForm');
const registeredDataContainer = document.getElementById('registeredData');
const statusMessage = document.getElementById('statusMessage');
const searchCedulaInput = document.getElementById('searchCedula');
const searchButton = document.getElementById('searchButton');
const searchResultArea = document.getElementById('searchResult');

// Variables para el ordenamiento de la tabla
let sortColumn = 'cedula';
let sortDirection = 'asc'; // 'asc' o 'desc'

// Función para mostrar mensajes de estado
function displayStatusMessage(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.style.opacity = '1';
    
    // Define el color basado en el tipo
    if (type === 'error') {
        statusMessage.style.backgroundColor = '#DC143C'; // Rojo Brillante
    } else {
        statusMessage.style.backgroundColor = '#800020'; // Vinotinto
    }

    setTimeout(() => {
        statusMessage.style.opacity = '0';
    }, 3000);
}

// --------------------------------------------------------------------------
// 1. LÓGICA DE REGISTRO
// --------------------------------------------------------------------------

athleteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        cedula: athleteForm.cedula.value,
        club: athleteForm.club.value,
        nombre: athleteForm.nombre.value,
        apellido: athleteForm.apellido.value,
        fechaNac: athleteForm.fechaNac.value,
        division: athleteForm.division.value,
        talla: parseFloat(athleteForm.talla.value) || null,
        peso: parseFloat(athleteForm.peso.value) || null,
        correo: athleteForm.correo.value,
        telefono: athleteForm.telefono.value,
        timestamp: Date.now() 
    };

    try {
        await addDoc(athletesCol, data);
        displayStatusMessage("Atleta registrado con éxito!");
        athleteForm.reset(); 
    } catch (e) {
        console.error("Error al añadir documento: ", e);
        displayStatusMessage("Error al registrar atleta.", 'error');
    }
});

// --------------------------------------------------------------------------
// 2. LÓGICA DE RECUPERACIÓN y ORDENAMIENTO (REAL-TIME)
// --------------------------------------------------------------------------

// Genera el HTML de la tabla a partir de los datos
function renderTable(athletes) {
    if (athletes.length === 0) {
        registeredDataContainer.innerHTML = '<p class="no-data-message">No hay atletas registrados aún.</p>';
        return;
    }

    let html = `
        <div class="table-responsive-wrapper">
            <table class="athlete-data-table">
                <thead>
                    <tr>
                        <th data-column="cedula" class="${sortColumn === 'cedula' ? 'sorted-' + sortDirection : ''}">Cédula</th>
                        <th data-column="nombre" class="${sortColumn === 'nombre' ? 'sorted-' + sortDirection : ''}">Nombre</th>
                        <th data-column="apellido" class="${sortColumn === 'apellido' ? 'sorted-' + sortDirection : ''}">Apellido</th>
                        <th data-column="club" class="${sortColumn === 'club' ? 'sorted-' + sortDirection : ''}">Club</th>
                        <th data-column="division" class="${sortColumn === 'division' ? 'sorted-' + sortDirection : ''}">División</th>
                        <th data-column="fechaNac" class="${sortColumn === 'fechaNac' ? 'sorted-' + sortDirection : ''}">Fec. Nac.</th>
                        <th data-column="talla" class="${sortColumn === 'talla' ? 'sorted-' + sortDirection : ''}">Talla (m)</th>
                        <th data-column="peso" class="${sortColumn === 'peso' ? 'sorted-' + sortDirection : ''}">Peso (kg)</th>
                    </tr>
                </thead>
                <tbody>
    `;

    athletes.forEach(athlete => {
        // Formateo simple de fecha (si el campo de entrada es 'date', ya tiene formato YYYY-MM-DD)
        const formattedDate = athlete.fechaNac || 'N/A';
        const formattedTalla = athlete.talla ? athlete.talla.toFixed(2) : 'N/A';
        const formattedPeso = athlete.peso ? athlete.peso.toFixed(2) : 'N/A';

        html += `
            <tr>
                <td>${athlete.cedula}</td>
                <td>${athlete.nombre}</td>
                <td>${athlete.apellido}</td>
                <td>${athlete.club}</td>
                <td>${athlete.division}</td>
                <td>${formattedDate}</td>
                <td>${formattedTalla}</td>
                <td>${formattedPeso}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <p class="table-note-message">Total de Atletas: ${athletes.length}</p>
    `;

    registeredDataContainer.innerHTML = html;

    // Añadir listeners para ordenamiento después de que la tabla es renderizada
    document.querySelectorAll('.athlete-data-table th[data-column]').forEach(header => {
        header.addEventListener('click', () => {
            handleSort(header.dataset.column);
        });
    });
}

// Manejador del ordenamiento
function handleSort(column) {
    // Si es la misma columna, invierte la dirección
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Si es una nueva columna, por defecto ordena ascendente
        sortColumn = column;
        sortDirection = 'asc';
    }
    // Re-suscribe el listener con el nuevo orden
    subscribeToData();
}

// Suscripción en tiempo real a la colección de atletas
function subscribeToData() {
    // Si la columna de ordenamiento es un string (como cédula, club), usa 'asc'/'desc'
    // Si es un número (como talla, peso), también usamos 'asc'/'desc'

    const q = query(athletesCol, orderBy(sortColumn, sortDirection));

    onSnapshot(q, (snapshot) => {
        const athletes = [];
        snapshot.forEach((doc) => {
            athletes.push(doc.data());
        });
        renderTable(athletes);
    }, (error) => {
        console.error("Error al suscribirse a los datos: ", error);
        registeredDataContainer.innerHTML = '<p class="error-message">Error al cargar los datos en tiempo real.</p>';
    });
}

// Inicia la suscripción al cargar la página
subscribeToData();

// --------------------------------------------------------------------------
// 3. LÓGICA DE BÚSQUEDA
// --------------------------------------------------------------------------

searchButton.addEventListener('click', () => {
    const cedula = searchCedulaInput.value.trim();
    if (cedula) {
        searchAthleteByCedula(cedula);
    } else {
        searchResultArea.innerHTML = '<p class="search-message empty-search">Por favor, introduce una cédula.</p>';
    }
});

async function searchAthleteByCedula(cedula) {
    searchResultArea.innerHTML = '<p class="search-message">Buscando...</p>';

    try {
        // Creamos una consulta para encontrar un documento donde el campo 'cedula' coincida
        const q = query(athletesCol, where("cedula", "==", cedula));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            searchResultArea.innerHTML = '<p class="search-message not-found-athlete">Atleta no encontrado. Verifica la cédula.</p>';
            return;
        }

        // Debería haber un solo resultado ya que la cédula es única
        querySnapshot.forEach((doc) => {
            const athlete = doc.data();
            renderSearchResult(athlete);
        });

    } catch (e) {
        console.error("Error al buscar el atleta: ", e);
        searchResultArea.innerHTML = '<p class="search-message not-found-athlete">Ocurrió un error en la búsqueda.</p>';
    }
}

function renderSearchResult(athlete) {
    const formattedTalla = athlete.talla ? athlete.talla.toFixed(2) : 'N/A';
    const formattedPeso = athlete.peso ? athlete.peso.toFixed(2) : 'N/A';

    searchResultArea.innerHTML = `
        <div class="athlete-card">
            <p><strong>Cédula:</strong> ${athlete.cedula}</p>
            <p><strong>Nombre:</strong> ${athlete.nombre} ${athlete.apellido}</p>
            <p><strong>Club:</strong> ${athlete.club} - <strong>División:</strong> ${athlete.division}</p>
            <p><strong>Nacimiento:</strong> ${athlete.fechaNac}</p>
            <p><strong>Medidas:</strong> ${formattedTalla}m / ${formattedPeso}kg</p>
        </div>
    `;
}

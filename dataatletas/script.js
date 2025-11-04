/*
 * LVMEL Athlete Registration Script
 * Handles form submission, data storage, table rendering, and sorting.
 */

// Local storage key for athlete data
const ATHLETE_DATA_KEY = 'lvmvel_athlete_data';

// --- Utility Functions ---

/**
 * Calculates the current age based on the birth date.
 * @param {string} birthDateString - Date in YYYY-MM-DD format.
 * @returns {number} The calculated age.
 */
function calculateAge(birthDateString) {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year yet
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

/**
 * Displays a temporary status message (success/error).
 * @param {string} message - The message text.
 * @param {boolean} isSuccess - True for success (green), false for error (red).
 */
function displayStatusMessage(message, isSuccess) {
    const statusMessageElement = document.getElementById('statusMessage');
    
    statusMessageElement.textContent = message;
    statusMessageElement.style.backgroundColor = isSuccess ? '#28a745' : '#dc3545'; // Green or Red
    statusMessageElement.style.opacity = '1';

    // Hide after 3 seconds
    setTimeout(() => {
        statusMessageElement.style.opacity = '0';
    }, 3000);
}

/**
 * Loads athlete data from local storage.
 * @returns {Array} List of athlete objects.
 */
function loadData() {
    try {
        const data = localStorage.getItem(ATHLETE_DATA_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Error al cargar los datos:", e);
        displayStatusMessage("Error al cargar datos.", false);
        return [];
    }
}

/**
 * Saves athlete data to local storage.
 * @param {Array} data - List of athlete objects.
 */
function saveData(data) {
    try {
        localStorage.setItem(ATHLETE_DATA_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Error al guardar los datos:", e);
        displayStatusMessage("Error al guardar datos.", false);
    }
}

// --- Table Rendering and Sorting ---

let sortColumn = null;
let sortDirection = 'asc';

/**
 * Renders the athlete data table.
 * @param {Array} athletes - List of athlete objects to display.
 */
function renderTable(athletes) {
    const container = document.getElementById('registeredData');
    
    if (athletes.length === 0) {
        container.innerHTML = '<p class="no-data-message">No hay atletas registrados aún.</p>';
        return;
    }

    // Sort the data before rendering
    if (sortColumn) {
        athletes.sort((a, b) => {
            let aValue = a[sortColumn];
            let bValue = b[sortColumn];

            // Convert to number for numeric columns
            if (sortColumn === 'edad' || sortColumn === 'talla' || sortColumn === 'peso') {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            } else {
                aValue = String(aValue).toLowerCase();
                bValue = String(bValue).toLowerCase();
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    let tableHTML = `
        <div class="table-responsive-wrapper">
            <table class="athlete-data-table">
                <thead>
                    <tr>
                        <th data-column="cedula">Cédula</th>
                        <th data-column="nombre">Nombre</th>
                        <th data-column="apellido">Apellido</th>
                        <th data-column="club">Club</th>
                        <th data-column="edad">Edad</th>
                        <th data-column="division">División</th>
                        <th data-column="talla">Talla (m)</th>
                        <th data-column="peso">Peso (kg)</th>
                        <th data-column="correo">Correo</th>
                        <th data-column="telefono">Teléfono</th>
                    </tr>
                </thead>
                <tbody>
    `;

    athletes.forEach(athlete => {
        tableHTML += `
            <tr>
                <td>${athlete.cedula}</td>
                <td>${athlete.nombre}</td>
                <td>${athlete.apellido}</td>
                <td>${athlete.club}</td>
                <td>${athlete.edad}</td>
                <td>${athlete.division}</td>
                <td>${athlete.talla || 'N/A'}</td>
                <td>${athlete.peso || 'N/A'}</td>
                <td>${athlete.correo || 'N/A'}</td>
                <td>${athlete.telefono || 'N/A'}</td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
        <p class="table-note-message">
            * Haz clic en el encabezado de una columna para ordenar la tabla.
        </p>
    `;

    container.innerHTML = tableHTML;

    // Attach sort listeners
    document.querySelectorAll('.athlete-data-table th').forEach(header => {
        // Set current sort indicator
        if (header.dataset.column === sortColumn) {
            header.classList.add(`sorted-${sortDirection}`);
        }
        
        header.addEventListener('click', () => {
            const newSortColumn = header.dataset.column;

            if (sortColumn === newSortColumn) {
                // Toggle direction
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                // New column, default to ascending
                sortColumn = newSortColumn;
                sortDirection = 'asc';
            }

            // Reload and re-render the data
            const allAthletes = loadData();
            renderTable(allAthletes);
        });
    });
}

// --- Form Submission Handler ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check if the status message div exists, if not, create it
    if (!document.getElementById('statusMessage')) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'statusMessage';
        document.body.appendChild(statusDiv);
    }
    
    // 2. Initial table render
    const initialData = loadData();
    renderTable(initialData);

    // 3. Form submission logic
    const form = document.getElementById('athleteForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        const formData = new FormData(form);
        const athlete = {};
        formData.forEach((value, key) => {
            athlete[key] = value.trim();
        });

        // Add calculated fields
        athlete.edad = calculateAge(athlete.fechaNac);

        const athletes = loadData();
        
        // Check for duplicate CEDULA
        const isDuplicate = athletes.some(a => a.cedula === athlete.cedula);

        if (isDuplicate) {
            displayStatusMessage(`Error: El atleta con Cédula ${athlete.cedula} ya está registrado.`, false);
            return;
        }

        // Add new athlete
        athletes.push(athlete);
        saveData(athletes);

        displayStatusMessage("Atleta registrado exitosamente.", true);
        
        // Clear the form fields
        form.reset();

        // Re-render the table with the new data
        renderTable(athletes);
    });
});

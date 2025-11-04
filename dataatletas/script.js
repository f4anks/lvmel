// LVMEL Athlete Registration Script
// Handles form submission, data storage, table rendering, and sorting.

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
 * Displays a temporary status message (success/error) in the top-right corner.
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
 * Displays a message inside the form section (for search results).
 * @param {string} message - The message text.
 * @param {boolean} isSuccess - True for success (green), false for error (red).
 */
function displayFormMessage(message, isSuccess) {
    const msgEl = document.getElementById('formStatusMessage');
    msgEl.textContent = message;
    msgEl.classList.remove('error', 'success');
    msgEl.classList.add(isSuccess ? 'success' : 'error');
    msgEl.style.opacity = '1';

    setTimeout(() => {
        msgEl.style.opacity = '0';
    }, 4000);
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

// --- Search Logic ---

/**
 * Fills the main registration form with athlete data.
 * @param {object} athlete - The athlete data object.
 */
function fillForm(athlete) {
    const form = document.getElementById('athleteForm');
    if (!form) return;

    form.cedula.value = athlete.cedula || '';
    form.club.value = athlete.club || '';
    form.nombre.value = athlete.nombre || '';
    form.apellido.value = athlete.apellido || '';
    form.fechaNac.value = athlete.fechaNac || '';
    form.division.value = athlete.division || '';
    form.talla.value = athlete.talla || '';
    form.peso.value = athlete.peso || '';
    form.correo.value = athlete.correo || '';
    form.telefono.value = athlete.telefono || '';
    
    // Opcional: enfocar la cédula de nuevo
    form.cedula.focus(); 
}

/**
 * Handles the search submission by Cédula.
 * @param {Event} event - The form submission event.
 */
function handleSearch(event) {
    event.preventDefault();
    const searchCedulaInput = document.getElementById('searchCedula');
    const cedulaToSearch = searchCedulaInput.value.trim();

    if (!cedulaToSearch) {
        displayFormMessage("Por favor, ingrese una cédula.", false);
        return;
    }

    const athletes = loadData();
    const foundAthlete = athletes.find(a => a.cedula === cedulaToSearch);

    if (foundAthlete) {
        // 1. Mostrar mensaje de éxito
        displayFormMessage(`¡Atleta con Cédula ${cedulaToSearch} encontrado!`, true);
        
        // 2. Llenar el formulario principal
        fillForm(foundAthlete);
        
        // 3. Opcional: cambiar el texto del botón a "Actualizar"
        document.querySelector('.submit-button').textContent = "Actualizar Atleta";
        
    } else {
        // 1. Mostrar mensaje de error
        displayFormMessage(`¡Este Atleta no está Registrado!`, false);
        
        // 2. Limpiar formulario principal
        document.getElementById('athleteForm').reset();
        
        // 3. Asegurar que el campo cédula del formulario principal tenga el valor buscado
        document.getElementById('cedula').value = cedulaToSearch;
        
        // 4. Asegurar el texto del botón
        document.querySelector('.submit-button').textContent = "Registrar Atleta";
    }
}


// --- Table Rendering and Sorting (SIN MODIFICAR) ---

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


// --- Form Submission Handler (MODIFICADO para permitir actualización) ---

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

    // 3. Attach search listener (NUEVO)
    const searchForm = document.getElementById('athleteSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }

    // 4. Form submission logic (MODIFICADA para Actualizar/Registrar)
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

        let athletes = loadData();
        
        // Check for existing CEDULA
        const existingIndex = athletes.findIndex(a => a.cedula === athlete.cedula);

        if (existingIndex !== -1) {
            // Caso: ACTUALIZAR (El atleta ya existe)
            athletes[existingIndex] = athlete; // Reemplazar con los datos actualizados
            displayStatusMessage(`Atleta con Cédula ${athlete.cedula} actualizado exitosamente.`, true);
        } else {
            // Caso: REGISTRAR (El atleta no existe)
            athletes.push(athlete);
            displayStatusMessage("Atleta registrado exitosamente.", true);
        }

        saveData(athletes);

        // Clear the form fields and reset button
        form.reset();
        document.querySelector('.submit-button').textContent = "Registrar Atleta";
        document.getElementById('searchCedula').value = '';
        displayFormMessage("Formulario listo para nuevo registro.", true);

        // Re-render the table with the new data
        renderTable(athletes);
    });
});

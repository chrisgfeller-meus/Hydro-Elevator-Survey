// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    const app = new ElevatorSurveyApp();
    app.init();
});

class ElevatorSurveyApp {
    constructor() {
        this.currentSection = 'project';
        this.surveyData = this.loadFromLocalStorage() || {};
        this.photos = [];
        this.floors = [];
    }

    init() {
        this.setupNavigation();
        this.setupFormHandlers();
        this.setupPhotoCapture();
        this.setupExportHandlers();
        this.setupElevations();
        this.loadSavedSurveys();
        this.restoreFormData();
    }

    setupNavigation() {
        const menuBtn = document.getElementById('menuBtn');
        const sideMenu = document.getElementById('sideMenu');
        const closeMenu = document.getElementById('closeMenu');
        const menuLinks = document.querySelectorAll('.side-menu a');

        menuBtn.addEventListener('click', () => {
            sideMenu.classList.add('active');
        });

        closeMenu.addEventListener('click', () => {
            sideMenu.classList.remove('active');
        });

        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
                sideMenu.classList.remove('active');
            });
        });
    }

    showSection(sectionId) {
        const sections = document.querySelectorAll('.survey-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }
    }

    setupFormHandlers() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveFormData();
            });
            
            // Auto-save on input for text fields
            if (input.type === 'text' || input.tagName === 'TEXTAREA') {
                let timeout;
                input.addEventListener('input', () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        this.saveFormData();
                    }, 1000);
                });
            }
        });
    }

    saveFormData() {
        const formData = {};
        const inputs = document.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.id) {
                formData[input.id] = input.value;
            }
        });
        
        this.surveyData = {
            ...this.surveyData,
            formData: formData,
            floors: this.floors,
            lastUpdated: new Date().toISOString()
        };
        
        this.saveToLocalStorage();
    }

    restoreFormData() {
        if (this.surveyData.formData) {
            Object.keys(this.surveyData.formData).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    element.value = this.surveyData.formData[key];
                }
            });
        }
        
        if (this.surveyData.floors) {
            this.floors = this.surveyData.floors;
            this.renderFloors();
        }
    }

    setupPhotoCapture() {
        const photoBtn = document.getElementById('photoBtn');
        const photoInput = document.getElementById('photoInput');
        
        photoBtn.addEventListener('click', () => {
            photoInput.click();
        });
        
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processPhoto(file);
            }
        });
    }

    processPhoto(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = {
                data: e.target.result,
                timestamp: new Date().toISOString(),
                section: this.currentSection,
                name: file.name
            };
            
            this.photos.push(photoData);
            this.surveyData.photos = this.photos;
            this.saveToLocalStorage();
            
            alert(`Photo saved for ${this.currentSection} section`);
        };
        reader.readAsDataURL(file);
    }

    setupElevations() {
        const addFloorBtn = document.getElementById('addFloor');
        const floorsContainer = document.getElementById('floorsContainer');
        
        addFloorBtn.addEventListener('click', () => {
            this.addFloor();
        });
    }

    addFloor() {
        const floorNumber = this.floors.length + 1;
        const floor = {
            id: Date.now(),
            number: floorNumber,
            label: '',
            height: '',
            frontOpenings: false,
            rearOpenings: false
        };
        
        this.floors.push(floor);
        this.renderFloors();
        this.saveFormData();
    }

    renderFloors() {
        const container = document.getElementById('floorsContainer');
        container.innerHTML = '';
        
        this.floors.forEach((floor, index) => {
            const floorDiv = document.createElement('div');
            floorDiv.className = 'floor-item';
            floorDiv.innerHTML = `
                <div class="floor-header">
                    <h4>Floor ${floor.number}</h4>
                    <button class="remove-floor" data-index="${index}">Remove</button>
                </div>
                <div class="form-group">
                    <label>Floor Label</label>
                    <input type="text" value="${floor.label || ''}" 
                           data-floor="${index}" data-field="label">
                </div>
                <div class="form-group">
                    <label>Floor Height</label>
                    <input type="text" value="${floor.height || ''}" 
                           data-floor="${index}" data-field="height">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" ${floor.frontOpenings ? 'checked' : ''} 
                               data-floor="${index}" data-field="frontOpenings">
                        Front Opening
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" ${floor.rearOpenings ? 'checked' : ''} 
                               data-floor="${index}" data-field="rearOpenings">
                        Rear Opening
                    </label>
                </div>
            `;
            container.appendChild(floorDiv);
        });
        
        // Add event listeners for floor inputs
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', (e) => {
                const floorIndex = parseInt(e.target.dataset.floor);
                const field = e.target.dataset.field;
                
                if (e.target.type === 'checkbox') {
                    this.floors[floorIndex][field] = e.target.checked;
                } else {
                    this.floors[floorIndex][field] = e.target.value;
                }
                
                this.saveFormData();
            });
        });
        
        // Add remove handlers
        container.querySelectorAll('.remove-floor').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.floors.splice(index, 1);
                this.renderFloors();
                this.saveFormData();
            });
        });
    }

    setupExportHandlers() {
        document.getElementById('saveLocal').addEventListener('click', () => {
            this.saveProject();
        });
        
        document.getElementById('exportJSON').addEventListener('click', () => {
            this.exportAsJSON();
        });
        
        document.getElementById('exportCSV').addEventListener('click', () => {
            this.exportAsCSV();
        });
        
        document.getElementById('emailReport').addEventListener('click', () => {
            this.emailReport();
        });
    }

    saveProject() {
        const projectName = document.getElementById('building').value || 'Untitled Project';
        const timestamp = new Date().toISOString();
        const projectId = `survey_${Date.now()}`;
        
        const savedProjects = JSON.parse(localStorage.getItem('savedProjects') || '{}');
        savedProjects[projectId] = {
            name: projectName,
            timestamp: timestamp,
            data: this.surveyData
        };
        
        localStorage.setItem('savedProjects', JSON.stringify(savedProjects));
        this.loadSavedSurveys();
        alert(`Project "${projectName}" saved successfully!`);
    }

    loadSavedSurveys() {
        const savedProjects = JSON.parse(localStorage.getItem('savedProjects') || '{}');
        const surveysList = document.getElementById('surveysList');
        surveysList.innerHTML = '';
        
        Object.keys(savedProjects).forEach(projectId => {
            const project = savedProjects[projectId];
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${project.name} - ${new Date(project.timestamp).toLocaleDateString()}</span>
                <div>
                    <button onclick="app.loadProject('${projectId}')">Load</button>
                    <button onclick="app.deleteProject('${projectId}')">Delete</button>
                </div>
            `;
            surveysList.appendChild(li);
        });
    }

    loadProject(projectId) {
        const savedProjects = JSON.parse(localStorage.getItem('savedProjects') || '{}');
        const project = savedProjects[projectId];
        
        if (project) {
            this.surveyData = project.data;
            this.floors = project.data.floors || [];
            this.photos = project.data.photos || [];
            this.restoreFormData();
            alert(`Project "${project.name}" loaded!`);
        }
    }

    deleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project?')) {
            const savedProjects = JSON.parse(localStorage.getItem('savedProjects') || '{}');
            delete savedProjects[projectId];
            localStorage.setItem('savedProjects', JSON.stringify(savedProjects));
            this.loadSavedSurveys();
        }
    }

    exportAsJSON() {
        const dataStr = JSON.stringify(this.surveyData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `elevator_survey_${Date.now()}.json`;
        link.click();
    }

    exportAsCSV() {
        let csv = 'Field,Value\n';
        
        if (this.surveyData.formData) {
            Object.keys(this.surveyData.formData).forEach(key => {
                csv += `"${key}","${this.surveyData.formData[key]}"\n`;
            });
        }
        
        const dataBlob = new Blob([csv], {type: 'text/csv'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `elevator_survey_${Date.now()}.csv`;
        link.click();
    }

    emailReport() {
        const subject = encodeURIComponent('Elevator Modernization Survey Report');
        const body = encodeURIComponent(this.generateEmailBody());
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }

    generateEmailBody() {
        let body = 'ELEVATOR MODERNIZATION SURVEY REPORT\n';
        body += '=====================================\n\n';
        
        if (this.surveyData.formData) {
            body += 'PROJECT INFORMATION\n';
            body += `Building: ${this.surveyData.formData.building || 'N/A'}\n`;
            body += `Address: ${this.surveyData.formData.address || 'N/A'}\n`;
            body += `State Number: ${this.surveyData.formData.stateNumber || 'N/A'}\n`;
            body += `Number of Cars: ${this.surveyData.formData.cars || 'N/A'}\n`;
            body += `Type: ${this.surveyData.formData.elevatorType || 'N/A'}\n`;
            body += `Stops: ${this.surveyData.formData.stops || 'N/A'}\n`;
            body += `Speed: ${this.surveyData.formData.fpm || 'N/A'} FPM\n`;
            body += `Capacity: ${this.surveyData.formData.capacity || 'N/A'} lbs\n`;
            body += '\n';
            
            // Add more sections as needed
        }
        
        body += `\nReport generated on: ${new Date().toLocaleString()}`;
        
        return body;
    }

    saveToLocalStorage() {
        localStorage.setItem('currentSurvey', JSON.stringify(this.surveyData));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('currentSurvey');
        return saved ? JSON.parse(saved) : null;
    }
}

// Make app globally accessible
window.app = new ElevatorSurveyApp();
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
        this.registerServiceWorker();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => console.log('SW registered'))
                    .catch(err => console.log('SW registration failed'));
            });
        }
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

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!sideMenu.contains(e.target) && !menuBtn.contains(e.target)) {
                sideMenu.classList.remove('active');
            }
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
            window.scrollTo(0, 0);
        }
    }

    setupFormHandlers() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveFormData();
                this.showToast('Data saved');
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
            if (input.id && !input.dataset.floor) {
                formData[input.id] = input.value;
            }
        });
        
        this.surveyData = {
            ...this.surveyData,
            formData: formData,
            floors: this.floors,
            photos: this.photos,
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

        if (this.surveyData.photos) {
            this.photos = this.surveyData.photos;
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
            
            this.showToast(`Photo saved for ${this.currentSection} section`);
        };
        reader.readAsDataURL(file);
    }

    setupElevations() {
        const addFloorBtn = document.getElementById('addFloor');
        
        if (addFloorBtn) {
            addFloorBtn.addEventListener('click', () => {
                this.addFloor();
            });
        }
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
        if (!container) return;
        
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
                if (confirm('Remove this floor?')) {
                    this.floors.splice(index, 1);
                    this.renderFloors();
                    this.saveFormData();
                }
            });
        });
    }

    setupExportHandlers() {
        const saveLocalBtn = document.getElementById('saveLocal');
        const exportJSONBtn = document.getElementById('exportJSON');
        const exportCSVBtn = document.getElementById('exportCSV');
        const emailReportBtn = document.getElementById('emailReport');

        if (saveLocalBtn) {
            saveLocalBtn.addEventListener('click', () => {
                this.saveProject();
            });
        }
        
        if (exportJSONBtn) {
            exportJSONBtn.addEventListener('click', () => {
                this.exportAsJSON();
            });
        }
        
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => {
                this.exportAsCSV();
            });
        }
        
        if (emailReportBtn) {
            emailReportBtn.addEventListener('click', () => {
                this.emailReport();
            });
        }
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
        this.showToast(`Project "${projectName}" saved successfully!`);
    }

    loadSavedSurveys() {
        const savedProjects = JSON.parse(localStorage.getItem('savedProjects') || '{}');
        const surveysList = document.getElementById('surveysList');
        
        if (!surveysList) return;
        
        surveysList.innerHTML = '';
        
        Object.keys(savedProjects).forEach(projectId => {
            const project = savedProjects[projectId];
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${project.name} - ${new Date(project.timestamp).toLocaleDateString()}</span>
                <div>
                    <button onclick="window.app.loadProject('${projectId}')">Load</button>
                    <button onclick="window.app.deleteProject('${projectId}')">Delete</button>
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
            this.showToast(`Project "${project.name}" loaded!`);
        }
    }

    deleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project?')) {
            const savedProjects = JSON.parse(localStorage.getItem('savedProjects') || '{}');
            delete savedProjects[projectId];
            localStorage.setItem('savedProjects', JSON.stringify(savedProjects));
            this.loadSavedSurveys();
            this.showToast('Project deleted');
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
        URL.revokeObjectURL(url);
        this.showToast('JSON file downloaded');
    }

    exportAsCSV() {
        let csv = 'Field,Value\n';
        
        if (this.surveyData.formData) {
            Object.keys(this.surveyData.formData).forEach(key => {
                const value = this.surveyData.formData[key].replace(/"/g, '""');
                csv += `"${key}","${value}"\n`;
            });
        }
        
        // Add floors data
        if (this.floors.length > 0) {
            csv += '\nFloors Data\n';
            csv += 'Floor Number,Label,Height,Front Opening,Rear Opening\n';
            this.floors.forEach(floor => {
                csv += `"${floor.number}","${floor.label}","${floor.height}","${floor.frontOpenings}","${floor.rearOpenings}"\n`;
            });
        }
        
        const dataBlob = new Blob([csv], {type: 'text/csv'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `elevator_survey_${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.showToast('CSV file downloaded');
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
            const fd = this.surveyData.formData;
            
            body += 'PROJECT INFORMATION\n';
            body += '-------------------\n';
            body += `Building: ${fd.building || 'N/A'}\n`;
            body += `Address: ${fd.address || 'N/A'}\n`;
            body += `State Number: ${fd.stateNumber || 'N/A'}\n`;
            body += `Number of Cars: ${fd.cars || 'N/A'}\n`;
            body += `Type: ${fd.elevatorType || 'N/A'}\n`;
            body += `Stops: ${fd.stops || 'N/A'}\n`;
            body += `Speed: ${fd.fpm || 'N/A'} FPM\n`;
            body += `Capacity: ${fd.capacity || 'N/A'} lbs\n`;
            body += `Piston Type: ${fd.pistonType || 'N/A'}\n\n`;
            
            body += 'MACHINE ROOM\n';
            body += '------------\n';
            body += `Motor Brand: ${fd.motorBrand || 'N/A'}\n`;
            body += `Voltage: ${fd.motorVoltage || 'N/A'}\n`;
            body += `HP: ${fd.motorHP || 'N/A'}\n`;
            body += `Controller Type: ${fd.controllerType || 'N/A'}\n\n`;
        }
        
        if (this.floors.length > 0) {
            body += 'FLOOR SCHEDULE\n';
            body += '--------------\n';
            this.floors.forEach(floor => {
                body += `Floor ${floor.number}: ${floor.label || 'N/A'} - Height: ${floor.height || 'N/A'}`;
                body += ` - Front: ${floor.frontOpenings ? 'Yes' : 'No'}`;
                body += ` - Rear: ${floor.rearOpenings ? 'Yes' : 'No'}\n`;
            });
        }
        
        body += `\n\nReport generated on: ${new Date().toLocaleString()}`;
        
        return body;
    }

    showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) {
            existing.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('currentSurvey', JSON.stringify(this.surveyData));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            this.showToast('Storage full - please export your data');
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('currentSurvey');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return null;
        }
    }
}

// Make app globally accessible
window.app = new ElevatorSurveyApp();
// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    const app = new ElevatorSurveyApp();
    app.init();
});

class ElevatorSurveyApp {
    constructor() {
        this.currentSection = 'project';
        this.surveyData = this.loadFromLocalStorage() || {};
        this.photos = {};  // Changed to object to store photos by field ID
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
        this.addPhotoButtonsToFields();
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

    addPhotoButtonsToFields() {
        // Add photo buttons to all form groups
        const formGroups = document.querySelectorAll('.form-group');
        formGroups.forEach((group, index) => {
            const input = group.querySelector('input, select, textarea');
            if (input && input.id) {
                const photoContainer = document.createElement('div');
                photoContainer.className = 'photo-field-container';
                photoContainer.innerHTML = `
                    <button type="button" class="photo-field-btn" data-field="${input.id}">
                        📷 Add Photo
                    </button>
                    <input type="file" class="photo-field-input" id="photo-${input.id}" 
                           accept="image/*" capture="environment" style="display: none;" multiple>
                    <div class="photo-thumbnails" id="thumbnails-${input.id}"></div>
                `;
                group.appendChild(photoContainer);

                // Add event listeners
                const photoBtn = photoContainer.querySelector('.photo-field-btn');
                const photoInput = photoContainer.querySelector('.photo-field-input');
                
                photoBtn.addEventListener('click', () => {
                    photoInput.click();
                });

                photoInput.addEventListener('change', (e) => {
                    this.handleFieldPhoto(e, input.id);
                });
            }
        });
    }

    handleFieldPhoto(event, fieldId) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        if (!this.photos[fieldId]) {
            this.photos[fieldId] = [];
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoData = {
                    id: Date.now() + Math.random(),
                    data: e.target.result,
                    timestamp: new Date().toISOString(),
                    fieldId: fieldId,
                    fileName: file.name,
                    size: file.size
                };
                
                this.photos[fieldId].push(photoData);
                this.updatePhotoThumbnails(fieldId);
                this.saveFormData();
                this.showToast(`Photo added to ${fieldId}`);
            };
            reader.readAsDataURL(file);
        });
    }

    updatePhotoThumbnails(fieldId) {
        const container = document.getElementById(`thumbnails-${fieldId}`);
        if (!container) return;

        const photos = this.photos[fieldId] || [];
        container.innerHTML = '';

        photos.forEach((photo, index) => {
            const thumbDiv = document.createElement('div');
            thumbDiv.className = 'photo-thumbnail';
            thumbDiv.innerHTML = `
                <img src="${photo.data}" alt="Photo ${index + 1}">
                <button class="remove-photo" data-field="${fieldId}" data-index="${index}">×</button>
                <span class="photo-label">Photo ${index + 1}</span>
            `;
            container.appendChild(thumbDiv);

            // Add remove handler
            const removeBtn = thumbDiv.querySelector('.remove-photo');
            removeBtn.addEventListener('click', () => {
                this.removePhoto(fieldId, index);
            });

            // Add click to view larger
            const img = thumbDiv.querySelector('img');
            img.addEventListener('click', () => {
                this.viewPhoto(photo);
            });
        });
    }

    removePhoto(fieldId, index) {
        if (this.photos[fieldId]) {
            this.photos[fieldId].splice(index, 1);
            if (this.photos[fieldId].length === 0) {
                delete this.photos[fieldId];
            }
            this.updatePhotoThumbnails(fieldId);
            this.saveFormData();
            this.showToast('Photo removed');
        }
    }

    viewPhoto(photo) {
        const modal = document.createElement('div');
        modal.className = 'photo-modal';
        modal.innerHTML = `
            <div class="photo-modal-content">
                <span class="close-modal">×</span>
                <img src="${photo.data}" alt="Full size photo">
                <p>Taken: ${new Date(photo.timestamp).toLocaleString()}</p>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
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
            window.scrollTo(0, 0);
        }
    }

    setupFormHandlers() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (!input.classList.contains('photo-field-input')) {
                input.addEventListener('change', () => {
                    this.saveFormData();
                    this.showToast('Data saved');
                });
                
                if (input.type === 'text' || input.tagName === 'TEXTAREA') {
                    let timeout;
                    input.addEventListener('input', () => {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => {
                            this.saveFormData();
                        }, 1000);
                    });
                }
            }
        });
    }

    saveFormData() {
        const formData = {};
        const inputs = document.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.id && !input.dataset.floor && !input.classList.contains('photo-field-input')) {
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
            // Restore photo thumbnails
            Object.keys(this.photos).forEach(fieldId => {
                this.updatePhotoThumbnails(fieldId);
            });
        }
    }

    setupPhotoCapture() {
        const photoBtn = document.getElementById('photoBtn');
        const photoInput = document.getElementById('photoInput');
        
        if (photoBtn && photoInput) {
            photoBtn.addEventListener('click', () => {
                photoInput.click();
            });
            
            photoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.processGeneralPhoto(file);
                }
            });
        }
    }

    processGeneralPhoto(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = {
                id: Date.now(),
                data: e.target.result,
                timestamp: new Date().toISOString(),
                section: this.currentSection,
                fileName: file.name,
                type: 'general'
            };
            
            if (!this.photos.general) {
                this.photos.general = [];
            }
            this.photos.general.push(photoData);
            this.saveFormData();
            this.showToast(`General photo saved for ${this.currentSection}`);
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
        const exportHTMLBtn = document.getElementById('exportHTML');

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

        if (exportHTMLBtn) {
            exportHTMLBtn.addEventListener('click', () => {
                this.exportAsHTML();
            });
        }
    }

    exportAsHTML() {
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Elevator Survey Report - ${this.surveyData.formData?.building || 'Unknown'}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #667eea; }
                h2 { color: #764ba2; margin-top: 30px; }
                .field { margin: 10px 0; }
                .label { font-weight: bold; }
                .value { margin-left: 10px; }
                .photo-section { margin: 20px 0; padding: 10px; background: #f0f0f0; }
                .photo { max-width: 500px; margin: 10px 0; }
                img { max-width: 100%; height: auto; border: 1px solid #ddd; }
                .timestamp { color: #666; font-size: 0.9em; }
                @media print { .photo { max-width: 300px; } }
            </style>
        </head>
        <body>
            <h1>Elevator Modernization Survey Report</h1>
            <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
        `;

        // Add form data with photos
        if (this.surveyData.formData) {
            const sections = {
                'Project Information': ['stateNumber', 'building', 'address', 'cars', 'elevatorType', 'stops', 'fpm', 'capacity'],
                'Machine Room': ['motorBrand', 'motorVoltage', 'motorHP', 'controllerType', 'tankSize'],
                'Car Equipment': ['carWeight', 'doorBrand', 'openingType', 'cabInteriors'],
                'Hoistway': ['openingWidth', 'openingHeight', 'railSize', 'hallButtons'],
                'Pit Equipment': ['bufferCar', 'pitLadder', 'stopSwitch', 'pistonSize']
            };

            Object.keys(sections).forEach(sectionName => {
                html += `<h2>${sectionName}</h2>`;
                sections[sectionName].forEach(fieldId => {
                    const value = this.surveyData.formData[fieldId];
                    if (value) {
                        html += `<div class="field">`;
                        html += `<span class="label">${this.formatFieldName(fieldId)}:</span>`;
                        html += `<span class="value">${value}</span>`;
                        html += `</div>`;
                        
                        // Add photos for this field if they exist
                        if (this.photos[fieldId] && this.photos[fieldId].length > 0) {
                            html += `<div class="photo-section">`;
                            html += `<strong>Photos for ${this.formatFieldName(fieldId)}:</strong><br>`;
                            this.photos[fieldId].forEach((photo, index) => {
                                html += `<div class="photo">`;
                                html += `<p>Photo ${index + 1} (${new Date(photo.timestamp).toLocaleString()})</p>`;
                                html += `<img src="${photo.data}" alt="Photo ${index + 1}">`;
                                html += `</div>`;
                            });
                            html += `</div>`;
                        }
                    }
                });
            });
        }

        // Add floors
        if (this.floors.length > 0) {
            html += `<h2>Floor Schedule</h2>`;
            this.floors.forEach(floor => {
                html += `<div class="field">`;
                html += `Floor ${floor.number}: ${floor.label || 'N/A'} - Height: ${floor.height || 'N/A'}`;
                html += ` - Front: ${floor.frontOpenings ? 'Yes' : 'No'}`;
                html += ` - Rear: ${floor.rearOpenings ? 'Yes' : 'No'}`;
                html += `</div>`;
            });
        }

        html += `</body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `elevator_survey_${Date.now()}.html`;
        link.click();
        URL.revokeObjectURL(url);
        this.showToast('HTML report with photos downloaded');
    }

    formatFieldName(fieldId) {
        // Convert camelCase to readable format
        return fieldId.replace(/([A-Z])/g, ' $1')
                     .replace(/^./, str => str.toUpperCase())
                     .replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    saveProject() {
        const projectName = document.getElementById('building')?.value || 'Untitled Project';
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
            this.photos = project.data.photos || {};
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
        this.showToast('JSON file with photos downloaded');
    }

    exportAsCSV() {
        let csv = 'Field,Value,Has Photos\n';
        
        if (this.surveyData.formData) {
            Object.keys(this.surveyData.formData).forEach(key => {
                const value = this.surveyData.formData[key].replace(/"/g, '""');
                const hasPhotos = this.photos[key] && this.photos[key].length > 0 ? 'Yes' : 'No';
                csv += `"${key}","${value}","${hasPhotos}"\n`;
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
            body += `State Number: ${fd.stateNumber || 'N/A'}\n\n`;
            
            // Note which fields have photos
            body += 'FIELDS WITH PHOTOS:\n';
            body += '-------------------\n';
            Object.keys(this.photos).forEach(fieldId => {
                if (this.photos[fieldId] && this.photos[fieldId].length > 0) {
                    body += `- ${this.formatFieldName(fieldId)}: ${this.photos[fieldId].length} photo(s)\n`;
                }
            });
        }
        
        body += `\n\nNote: For complete report with photos, use the Export HTML option.\n`;
        body += `Report generated on: ${new Date().toLocaleString()}`;
        
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
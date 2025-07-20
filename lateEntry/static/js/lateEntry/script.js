function getCSRFToken() {
    return document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
}

class StudentScanner {
    constructor() {
        this.students = [];
        this.isScanning = false;
        this.lastScannedCode = '';
        this.lastScanTime = 0;
        this.stream = null;
        this.isSamsungDevice = this.detectSamsungDevice();

        this.initElements();
        this.loadData();
        // this.students.push(student);
        this.saveData();
        this.updateUI();
        this.bindEvents();
    }

    detectSamsungDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('samsung') || userAgent.includes('sm-');
    }

    initElements() {
        this.video = document.getElementById('video');
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.studentList = document.getElementById('student-list');
        this.studentCount = document.getElementById('student-count');
        this.statusMessage = document.getElementById('status-message');
        this.studentRollInput = document.getElementById('student-roll');
        this.studentNameInput = document.getElementById('student-name');
        this.addManualBtn = document.getElementById('add-manual');
        // this.exportBtn = document.getElementById('export-btn');
        this.clearBtn = document.getElementById('clear-btn');
        // console.log('Dropdown button element:', this.sortDropdownBtn);
        this.recordBtn = document.getElementById('record-btn');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startScanner());
        this.stopBtn.addEventListener('click', () => this.stopScanner());
        this.addManualBtn.addEventListener('click', () => this.addManualStudent());
        // this.exportBtn.addEventListener('click', () => this.exportData());
        this.clearBtn.addEventListener('click', () => this.clearData());
        this.recordBtn.addEventListener('click', () => this.recordAllLateEntries());
    }

    showStatus(message, type = 'info') {
        this.statusMessage.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
        setTimeout(() => {
            this.statusMessage.innerHTML = '';
        }, 3000);
    }

    /**
     * Asynchronously retrieves the appropriate camera constraints for video input,
     * with special handling for Samsung devices to ensure better compatibility.
     *  A Promise resolving to a set of media constraints
     * for the user's camera, tailored for Samsung and non-Samsung devices.
     */
    async getCameraConstraints() {
        if (this.isSamsungDevice) {
            // Samsung-specific constraints to avoid camera compatibility issues
            return {
                video: {
                    facingMode: { exact: 'environment' },
                    width: { ideal: 640, min: 320, max: 1280 },
                    height: { ideal: 480, min: 240, max: 720 },
                    frameRate: { ideal: 15, max: 30 }
                },
                audio: false
            };
        } else {
            // Default constraints for most other devices
            return {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    zoom: { ideal: 3.0 }
                },
                audio: false
            };
        }
    }

    /**
     * Initializes and starts the barcode scanner using the device camera.
     * 
     * - Requests camera access using optimized constraints based on device type (e.g., Samsung).
     * - Falls back to basic constraints if initial access fails.
     * - Launches the scanner UI, enters fullscreen, displays laser line.
     * - Configures and starts QuaggaJS for barcode detection.
     * - Handles barcode detection with debounce logic to avoid duplicates.
     * 
     * Resolves when scanner is successfully started or exits on error.
     */
    async startScanner() {
        try {
            this.showStatus('Starting camera...', 'info');

            // Get camera constraints based on device
            const constraints = await this.getCameraConstraints();

            try {
                // Try primary constraints
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                console.log('Primary constraints failed, trying fallback...');

                // Fallback camera constraints
                const fallbackConstraints = {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                };

                this.stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            }

            // Assign camera stream to video element
            this.video.srcObject = this.stream;

            // Wait for video metadata to load and request fullscreen
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();

                    const scannerContainer = document.querySelector('.scanner-container');
                    if (scannerContainer.requestFullscreen) {
                        scannerContainer.requestFullscreen();
                    } else if (scannerContainer.webkitRequestFullscreen) {
                        scannerContainer.webkitRequestFullscreen(); // Safari
                    } else if (scannerContainer.msRequestFullscreen) {
                        scannerContainer.msRequestFullscreen(); // IE11
                    }

                    resolve();
                };
            });

            // Display laser line (UI element)
            const laserLine = document.querySelector('.laser-line');
            if (laserLine) laserLine.style.display = 'block';

            const isSamsungDevice = /Samsung/.test(navigator.userAgent);

            const quaggaConfig = {
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.querySelector("#video") || document.querySelector(".scanner-container"),
                    constraints: {
                        width: isSamsungDevice ? 640 : 800,
                        height: isSamsungDevice ? 480 : 600,
                        facingMode: "environment"
                    }
                },
                decoder: {
                    readers: [
                        "code_128_reader",
                        "ean_reader",
                        "ean_8_reader",
                        "code_39_reader",
                        "upc_reader"
                    ]
                },
                locate: true,
                locator: {
                    halfSample: isSamsungDevice,
                    patchSize: isSamsungDevice ? "large" : "medium"
                },
                numOfWorkers: isSamsungDevice ? 1 : 2,
                frequency: isSamsungDevice ? 5 : 10,
                debug: true
            };

            // Initialize QuaggaJS
            Quagga.init(quaggaConfig, (err) => {
                if (err) {
                    console.error('QuaggaJS init error:', err);
                    this.showStatus('Error starting scanner: ' + err.message, 'error');
                    this.cleanupCamera();
                    return;
                }

                Quagga.start();
                this.isScanning = true;
                this.startBtn.disabled = true;
                this.stopBtn.disabled = false;
                this.showStatus('Scanner started successfully!', 'success');
            });

            // Handle barcode detection with debounce
            Quagga.onDetected((data) => {
                const code = data.codeResult.code;
                const now = Date.now();
                const debounceTime = this.isSamsungDevice ? 3000 : 2000;

                if (code === this.lastScannedCode && (now - this.lastScanTime) < debounceTime) {
                    return;
                }

                this.lastScannedCode = code;
                this.lastScanTime = now;
                this.processScannedCode(code);
            });

        } catch (error) {
            console.error('Camera access error:', error);
            this.showStatus('Camera access denied or not available. Please check permissions.', 'error');
            this.cleanupCamera();
        }
    }

    cleanupCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
            this.stream = null;
        }
        if (this.video.srcObject) {
            this.video.srcObject = null;
        }
    }

    stopScanner() {
        if (this.isScanning) {
            Quagga.stop();
            this.cleanupCamera();

            this.isScanning = false;
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;

            // Hide laser line
            const laserLine = document.querySelector('.laser-line');
            if (laserLine) laserLine.style.display = 'none';

            this.showStatus('Scanner stopped', 'info');
        }
    }

    processScannedCode(code) {
        console.log("Scanned barcode:", code);
        this.showStatus(`Scanning: ${code}`, 'info');

        // Add visual feedback for Samsung devices
        if (this.isSamsungDevice) {
            navigator.vibrate && navigator.vibrate(100);
        }

        fetch(`/api/student/${code}/`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    this.showStatus("❌ Student not found in database!", 'error');
                    return;
                }

                const student = data.student;
                const existing = this.students.find(s => s.roll_no === student.roll_no);
                if (existing) {
                    this.showStatus(`Student ${student.name} already recorded!`, 'info');
                    return;
                }

                this.addStudent(student.roll_no, student.name);
                this.showStatus(`✅ Added: ${student.name} (${student.roll_no})`, 'success');
            })
            .catch(err => {
                console.error("Fetch error:", err);
                this.showStatus("⚠️ Error fetching student data!", 'error');
            });
    }

    addStudent(roll_no, name) {
        const student = {
            roll_no: roll_no,
            name: name,
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString()
        };

        this.students.push(student);
        this.saveData();
        this.updateUI();
    }


    async addManualStudent() {
        const roll_no = this.studentRollInput.value.trim();
        if (!roll_no) {
            this.showStatus('Please enter Roll No', 'error');
            return;
        }

        //Check with backend if student exists
        const response = await fetch(`/api/check-student/?roll_no=${encodeURIComponent(roll_no)}`);
        const data = await response.json();


        if (!data.exists) {
            this.showStatus('Student does not exist in database!', 'error');
            return;
        }
        //Check if already in local list
        const existing = this.students.find(s => s.roll_no === roll_no);
        if (existing) {
            this.showStatus('Student with this Roll No already exists locally!', 'error');
            return;
        }
        //Proceed to add
        this.addStudent(roll_no, data.name);
        this.studentRollInput.value = '';
        this.showStatus(`✅ Added: ${data.name}`, 'success');
    }

    removeStudent(index) {
        if (confirm('Are you sure you want to remove this student?')) {
            this.students.splice(index, 1);
            this.saveData();
            this.updateUI();
            this.showStatus('Student removed', 'info');
        }
    }

    async recordAllLateEntries() {
        console.log("Recording all late entries btn works");
        if (!this.students || this.students.length === 0) {
            this.showStatus("No students to record!", "error");
            return;
        }
        const response = await fetch("/api/record-late-entries/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(), // ⬅️ CSRF token is required by Django
            },
            body: JSON.stringify({
                roll_nos: this.students.map(s => s.roll_no)
            })
        });

        const result = await response.json();
        console.log("Record result:", result);

        if (result.success) {
            this.showStatus("✅ Data recorded successfully!", "success");
        } else {
            this.showStatus("⚠️ Some error occurred!", "error");
        }


        this.students = [];
        this.saveData();
        this.updateUI();
        this.showStatus('All data cleared', 'info');
    };




    updateUI() {
        this.studentCount.textContent = this.students.length;

        if (this.students.length === 0) {
            this.studentList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <p>No students recorded yet</p>
                    <p>Start scanning or add students manually</p>
                </div>
            `;
            // this.exportBtn.disabled = true;
            this.clearBtn.disabled = true;
        } else {
            this.studentList.innerHTML = this.students.map((student, index) => `
                <div class="student-item">
                    <div class="student-info">
                        <div class="student-name">${student.name}</div>
                        <div class="student-roll">Roll No: ${student.roll_no}</div>
                        <div class="student-time">${student.time}</div>
                    </div>
                    <button class="delete-btn" onclick="scanner.removeStudent(${index})">🗑</button>
                </div>
            `).join('');
            // this.exportBtn.disabled = false;
            this.clearBtn.disabled = false;
        }
    }

    // exportData() {
    //     const csvContent = "data:text/csv;charset=utf-8,"
    //     "Roll No,Name,Date,Time\n"
    //         + this.students.map(s => `${s.roll_no},"${s.name}",${s.timestamp.split('T')[0]},${s.time}`).join('\n');
    //     const encodedUri = encodeURI(csvContent);
    //     const link = document.createElement("a");
    //     link.setAttribute("href", encodedUri);
    //     link.setAttribute("download", `student_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    //     this.showStatus('Data exported successfully!', 'success');
    // }

    clearData() {
        if (confirm('Are you sure you want to clear all recorded students?')) {
            this.students = [];
            this.saveData();
            this.updateUI();
            this.showStatus('All data cleared', 'info');
        }
    }

    saveData() {
        window.studentData = {
            students: this.students,
            lastUpdated: new Date().toISOString()
        };
    }

    loadData() {
        if (window.studentData && window.studentData.students) {
            this.students = window.studentData.students;
        }
    }

}

let scanner;
document.addEventListener('DOMContentLoaded', function () {
    scanner = new StudentScanner();
});


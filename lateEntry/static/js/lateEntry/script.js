// Optimized StudentScanner.js for Samsung compatibility
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
        this.statusMessage = document.getElementById('status-message-main');
        this.statusMessageOverlay = document.getElementById('status-message-overlay');
        this.studentRollInput = document.getElementById('student-roll');
        this.studentNameInput = document.getElementById('student-name');
        this.addManualBtn = document.getElementById('add-manual');
        this.clearBtn = document.getElementById('clear-btn');
        this.recordBtn = document.getElementById('record-btn');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startScanner());
        this.stopBtn.addEventListener('click', () => this.stopScanner());
        this.addManualBtn.addEventListener('click', () => this.addManualStudent());
        this.clearBtn.addEventListener('click', () => this.clearData());
        this.recordBtn.addEventListener('click', () => this.recordAllLateEntries());
    }

    showStatus(message, type = 'info') {
        if (this.statusMessage) {
            this.statusMessage.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
            setTimeout(() => {
                this.statusMessage.innerHTML = '';
            }, 3000);
        }
    }

    showStatusOverlay(message, type = 'info') {
        if (this.statusMessageOverlay) {
            this.statusMessageOverlay.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
            this.statusMessageOverlay.style.display = 'block';
            this.statusMessageOverlay.style.zIndex = '10000';
            setTimeout(() => {
                this.statusMessageOverlay.innerHTML = '';
                this.statusMessageOverlay.style.display = 'none';
            }, 3000);
        }
    }

    async getCameraConstraints() {
        return {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 640, max: 800 },
                height: { ideal: 480, max: 600 },
                frameRate: { ideal: 15, max: 30 }
            },
            audio: false
        };
    }

    async startScanner() {
        if (this.isScanning) return;
        this.showStatusOverlay('Starting camera...', 'info');

        const container = document.querySelector(".scanner-overlay-fullscreen");
        container.style.display = "block";

        const constraints = await this.getCameraConstraints();

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.log('Primary constraints failed, trying fallback...');
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

        this.video.srcObject = this.stream;

        await new Promise((resolve) => {
            this.video.onloadedmetadata = async () => {
                await this.video.play();

                const scannerContainer = document.querySelector('.scanner-overlay-fullscreen');
                if (scannerContainer.requestFullscreen) {
                    scannerContainer.requestFullscreen();
                } else if (scannerContainer.webkitRequestFullscreen) {
                    scannerContainer.webkitRequestFullscreen();
                } else if (scannerContainer.msRequestFullscreen) {
                    scannerContainer.msRequestFullscreen();
                }

                resolve();
            };
        });

        const laserLine = document.querySelector('.laser-line');
        if (laserLine) laserLine.style.display = 'block';

        const quaggaConfig = {
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: this.video,
                constraints: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "environment"
                }
            },
            locator: {
                patchSize: "medium",
                halfSample: true,
                ...(this.isSamsungDevice ? {} : {
                    debug: {
                        showCanvas: true,
                        showPatches: true,
                        showFoundPatches: true,
                        showSkeleton: true,
                        showLabels: true,
                        showPatchLabels: true,
                        showRemainingPatchLabels: true,
                        boxFromPatches: {
                            showTransformed: true,
                            showTransformedBox: true,
                            showBB: true
                        }
                    }
                })
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
            numOfWorkers: 2,
            frequency: 10
        };

        Quagga.init(quaggaConfig, (err) => {
            if (err) {
                console.error('QuaggaJS init error:', err);
                this.showStatusOverlay('Error starting scanner: ' + err.message, 'error');
                this.cleanupCamera();
                return;
            }

            Quagga.start();
            this.isScanning = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.showStatusOverlay('Scanner started successfully! Point camera at barcode', 'success');
        });

        Quagga.onDetected((data) => {
            const code = data.codeResult.code;
            const now = Date.now();
            const debounceTime = this.isSamsungDevice ? 3500 : 2000;

            if (code === this.lastScannedCode && (now - this.lastScanTime) < debounceTime) {
                return;
            }

            this.lastScannedCode = code;
            this.lastScanTime = now;
            this.processScannedCode(code);
        });
    }

    cleanupCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
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

            const container = document.querySelector(".scanner-overlay-fullscreen");
            if (container) container.style.display = "none";

            if (document.fullscreenElement) {
                document.exitFullscreen();
            }

            const laserLine = document.querySelector('.laser-line');
            if (laserLine) laserLine.style.display = 'none';

            this.showStatus('Scanner stopped', 'info');
        }
    }

    processScannedCode(code) {
        this.showStatusOverlay(`Processing: ${code}`, 'info');
        if (this.isSamsungDevice) navigator.vibrate?.(100);

        fetch(`/api/student/${code}/`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) return this.showStatusOverlay("❌ Student not found in database!", 'error');

                const existing = this.students.find(s => s.roll_no === data.student.roll_no);
                if (existing) return this.showStatusOverlay(`Student ${data.student.name} already recorded!`, 'info');

                this.addStudent(data.student.roll_no, data.student.name);
                this.showStatusOverlay(`✅ Added: ${data.student.name} (${data.student.roll_no})`, 'success');
            })
            .catch(err => {
                console.error("Fetch error:", err);
                this.showStatusOverlay("⚠️ Error fetching student data!", 'error');
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
        if (!roll_no) return this.showStatus('Please enter Roll No', 'error');

        const response = await fetch(`/api/check-student/?roll_no=${encodeURIComponent(roll_no)}`);
        const data = await response.json();

        if (!data.exists) return this.showStatus('Student does not exist in database!', 'error');

        const existing = this.students.find(s => s.roll_no === roll_no);
        if (existing) return this.showStatus('Student with this Roll No already exists locally!', 'error');

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
        if (!this.students.length) return this.showStatus("No students to record!", "error");

        const response = await fetch("/api/record-late-entries/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify({
                roll_nos: this.students.map(s => s.roll_no)
            })
        });

        const result = await response.json();
        if (result.success) {
            this.showStatus("✅ Data recorded successfully!", "success");
        } else {
            this.showStatus("⚠️ Some error occurred!", "error");
        }

        this.students = [];
        this.saveData();
        this.updateUI();
    }

    updateUI() {
        this.studentCount.textContent = this.students.length;
        if (!this.students.length) {
            this.studentList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <p>No students recorded yet</p>
                    <p>Start scanning or add students manually</p>
                </div>`;
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
                </div>`).join('');
            this.clearBtn.disabled = false;
        }
    }

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

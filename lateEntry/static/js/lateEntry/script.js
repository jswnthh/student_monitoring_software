class StudentScanner {
    constructor() {
        this.students = [];
        this.isScanning = false;
        this.lastScannedCode = '';
        this.lastScanTime = 0;

        this.initElements();
        this.bindEvents();
        this.loadData();
        this.updateUI();
    }

    initElements() {
        this.video = document.getElementById('video');
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.studentList = document.getElementById('student-list');
        this.studentCount = document.getElementById('student-count');
        this.statusMessage = document.getElementById('status-message');
        this.studentIdInput = document.getElementById('student-id');
        this.studentNameInput = document.getElementById('student-name');
        this.addManualBtn = document.getElementById('add-manual');
        this.exportBtn = document.getElementById('export-btn');
        this.clearBtn = document.getElementById('clear-btn');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startScanner());
        this.stopBtn.addEventListener('click', () => this.stopScanner());
        this.addManualBtn.addEventListener('click', () => this.addManualStudent());
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.clearBtn.addEventListener('click', () => this.clearData());
        this.studentNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addManualStudent();
        });
    }

    showStatus(message, type = 'info') {
        this.statusMessage.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
        setTimeout(() => {
            this.statusMessage.innerHTML = '';
        }, 3000);
    }

    async startScanner() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video.srcObject = stream;
            this.video.play();
            // In startScanner()
            document.querySelector('.laser-line').style.display = 'block';


            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: this.video,
                    constraints: {
                        width: 640,
                        height: 480,
                        facingMode: "environment"
                    }
                },
                decoder: {
                    readers: [
                        "code_128_reader", "ean_reader", "ean_8_reader",
                        "code_39_reader", "code_39_vin_reader", "codabar_reader",
                        "upc_reader", "upc_e_reader", "i2of5_reader"
                    ]
                },
                locate: true
            }, (err) => {
                if (err) {
                    console.error('QuaggaJS init error:', err);
                    this.showStatus('Error starting scanner: ' + err.message, 'error');
                    return;
                }

                Quagga.start();
                this.isScanning = true;
                this.startBtn.disabled = true;
                this.stopBtn.disabled = false;
                this.showStatus('Scanner started successfully!', 'success');
            });

            Quagga.onDetected((data) => {
                const code = data.codeResult.code;
                const now = Date.now();
                if (code === this.lastScannedCode && (now - this.lastScanTime) < 2000) return;
                this.lastScannedCode = code;
                this.lastScanTime = now;
                this.processScannedCode(code);
            });

        } catch (error) {
            console.error('Camera access error:', error);
            this.showStatus('Camera access denied or not available', 'error');
        }
    }

    stopScanner() {
        if (this.isScanning) {
            Quagga.stop();
            if (this.video.srcObject) {
                this.video.srcObject.getTracks().forEach(track => track.stop());
                this.video.srcObject = null;
            }
            this.isScanning = false;
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            // In stopScanner()
            document.querySelector('.laser-line').style.display = 'none';
            this.showStatus('Scanner stopped', 'info');
        }
    }

    processScannedCode(code) {
        console.log("Scanned barcode:", code);
        this.showStatus(`Scanning: ${code}`, 'info');
        fetch(`/api/student/${code}/`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    this.showStatus("❌ Student not found in database!", 'error');
                    return;
                }

                const student = data.student;
                const existing = this.students.find(s => s.id === student.id);
                if (existing) {
                    this.showStatus(`Student ${student.name} already recorded!`, 'info');
                    return;
                }

                this.addStudent(student.id, student.name);
                this.showStatus(`✅ Added: ${student.name} (${student.roll_no})`, 'success');
            })
            .catch(err => {
                console.error("Fetch error:", err);
                this.showStatus("⚠️ Error fetching student data!", 'error');
            });
    }

    addStudent(id, name) {
        const student = {
            id: id,
            name: name,
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString()
        };

        this.students.push(student);
        this.saveData();
        this.updateUI();
    }

    addManualStudent() {
        const id = this.studentIdInput.value.trim();
        const name = this.studentNameInput.value.trim();
        if (!id || !name) {
            this.showStatus('Please enter both ID and name', 'error');
            return;
        }
        const existing = this.students.find(s => s.id === id);
        if (existing) {
            this.showStatus('Student with this ID already exists!', 'error');
            return;
        }
        this.addStudent(id, name);
        this.studentIdInput.value = '';
        this.studentNameInput.value = '';
        this.showStatus(`✅ Added: ${name}`, 'success');
    }

    removeStudent(index) {
        if (confirm('Are you sure you want to remove this student?')) {
            this.students.splice(index, 1);
            this.saveData();
            this.updateUI();
            this.showStatus('Student removed', 'info');
        }
    }

    updateUI() {
        this.studentCount.textContent = this.students.length;

        if (this.students.length === 0) {
            this.studentList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="..."/>
                    </svg>
                    <p>No students recorded yet</p>
                    <p>Start scanning or add students manually</p>
                </div>
            `;
            this.exportBtn.disabled = true;
            this.clearBtn.disabled = true;
        } else {
            this.studentList.innerHTML = this.students.map((student, index) => `
                <div class="student-item">
                    <div class="student-info">
                        <div class="student-name">${student.name}</div>
                        <div class="student-id">ID: ${student.id}</div>
                        <div class="student-time">${student.time}</div>
                    </div>
                    <button class="delete-btn" onclick="scanner.removeStudent(${index})">🗑</button>
                </div>
            `).join('');
            this.exportBtn.disabled = false;
            this.clearBtn.disabled = false;
        }
    }

    exportData() {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Student ID,Name,Date,Time\n"
            + this.students.map(s => `${s.id},"${s.name}",${s.timestamp.split('T')[0]},${s.time}`).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `student_attendance_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showStatus('Data exported successfully!', 'success');
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
document.addEventListener('DOMContentLoaded', () => {
    scanner = new StudentScanner();
});



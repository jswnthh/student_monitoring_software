class Dashboard {
    constructor() {
        this.init();
        this.bindEvents();
        this.updateUI();
    }

    init() {
        this.sortDropdownBtn = document.getElementById('sort-dropdown-btn');
        this.dropdownContent = document.getElementById('dropdownContent');
        this.sortCriteria = 'recent'; // default sort
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
    }

    bindEvents() {
        if (this.sortDropdownBtn && this.dropdownContent) {
            this.sortDropdownBtn.addEventListener('click', () => this.toggleDropdown());

            this.dropdownContent.querySelectorAll('.sort-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    this.sortCriteria = e.target.dataset.sort;
                    this.toggleDropdown();
                    this.updateUI();
                });
            });
        } else {
            console.warn('Dropdown elements not found');
        }

        document.getElementById('recorded-student-list')?.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('arrow')) {
                this.toggleDetails(e.target);
            }
        });
    }

    toggleDropdown() {
        const isVisible = this.dropdownContent.classList.toggle('show');
        if (isVisible) {
            document.addEventListener('click', this.handleOutsideClick);
        } else {
            document.removeEventListener('click', this.handleOutsideClick);
        }
    }

    handleOutsideClick(event) {
        if (
            !this.sortDropdownBtn.contains(event.target) &&
            !this.dropdownContent.contains(event.target)
        ) {
            this.dropdownContent.classList.remove('show');
            document.removeEventListener('click', this.handleOutsideClick);
        }
    }

    updateUI() {
        console.log("Updating UI...");
        fetch('/api/recorded-students/')
            .then(response => response.json())
            .then(data => {
                const studentList = document.getElementById('recorded-student-list');
                studentList.innerHTML = '';

                if (data.students && data.students.length > 0) {
                    let sorted = [...data.students];
                    switch (this.sortCriteria) {
                        case 'late_entries':
                            sorted.sort((a, b) => b.late_entries - a.late_entries);
                            break;
                        case 'recent':
                        default:
                            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                            break;
                    }

                    sorted.forEach(student => {
                        const card = document.createElement('div');
                        card.className = 'student-card';
                        card.innerHTML = `
                            <div class="card-flex">
                                <div class="info-block">
                                    <h3>${student.name}</h3>
                                    <p class="student-roll">Roll No: ${student.roll_no}</p>
                                </div>
                                <div class="late-count">${student.late_entries}</div>
                                <button class="arrow">&#x25BC;</button>
                            </div>
                            <div class="detail-grid" style="display: none;"></div>
                        `;
                        studentList.appendChild(card);
                    });
                } else {
                    studentList.innerHTML = '<p>No students recorded.</p>';
                }
            })
            .catch(error => console.error('Error fetching student data:', error));
    }

    toggleDetails(button) {
        const card = button.closest('.student-card');
        const detailGrid = card.querySelector('.detail-grid');
        const rollNo = card.querySelector('.info-block .student-roll').textContent.replace('Roll No: ', '');

        const isWeekChange = button.classList.contains('week-change');

        if (button.dataset.expanded === 'true' && !isWeekChange) {
            detailGrid.style.display = 'none';
            button.dataset.expanded = 'false';
            button.innerHTML = '&#x25BC;';
            return;
        }

        button.dataset.expanded = 'true';
        button.innerHTML = '&#x25B2;';

        if (!button.dataset.week) button.dataset.week = 0;
        const weekIndex = parseInt(button.dataset.week);

        fetch(`/api/student-history/?roll_no=${rollNo}&week=${weekIndex}`)
            .then(response => response.json())
            .then(data => {
                detailGrid.innerHTML = '';

                data.history.forEach(item => {
                    const cell = document.createElement('div');
                    cell.className = 'grid-item';
                    cell.innerHTML = `<strong>${item.date}</strong><br>${item.count} times`;
                    detailGrid.appendChild(cell);
                });

                const nav = document.createElement('div');
                nav.className = 'week-nav';
                nav.innerHTML = `
                    <button class="week-prev">&#8592;</button>
                    <span class="week-label">${this.weekLabel(weekIndex)}</span>
                    <button class="week-next">&#8594;</button>
                `;
                detailGrid.appendChild(nav);

                nav.querySelector('.week-prev').addEventListener('click', () => {
                    button.dataset.week = weekIndex + 1;
                    button.classList.add('week-change');
                    this.toggleDetails(button);
                    button.classList.remove('week-change');
                });

                nav.querySelector('.week-next').addEventListener('click', () => {
                    if (weekIndex > 0) {
                        button.dataset.week = weekIndex - 1;
                        button.classList.add('week-change');
                        this.toggleDetails(button);
                        button.classList.remove('week-change');
                    }
                });

                detailGrid.style.display = 'grid';
            })
            .catch(err => {
                detailGrid.innerHTML = `<div class="grid-item">Error loading data</div>`;
                console.error('Fetch error:', err);
            });
    }

    weekLabel(index) {
        if (index === 0) return 'This Week';
        if (index === 1) return 'Last Week';
        return `${index} Weeks Ago`;
    }
}

let dashboardInstance;
document.addEventListener('DOMContentLoaded', () => {
    dashboardInstance = new Dashboard();
});

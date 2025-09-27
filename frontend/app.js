// Frontend JS for fitness tracker
const API_URL = 'http://localhost:3000/api/workouts';

function $(selector) {
    return document.querySelector(selector);
}

function renderWorkouts(workouts) {
    const list = $('.workout-list');
    list.innerHTML = '';
    const today = new Date().toISOString().slice(0, 10);
    const todays = workouts.filter(w => w.date === today);
    const others = workouts.filter(w => w.date !== today);

    if (todays.length > 0) {
        const header = document.createElement('li');
        header.className = 'workout-item';
        header.style.background = '#b7e4c7';
        header.style.fontWeight = 'bold';
        header.textContent = "Today's Tasks";
        list.appendChild(header);
        todays.forEach(w => {
            const li = document.createElement('li');
            li.className = 'workout-item';
            li.innerHTML = `
                <span><b>${w.type}</b> - ${w.duration} min, ${w.calories} cal (${w.date})</span>
                <span>
                    <button class="complete-btn" onclick="toggleCompleted(${w.id})">${w.completed ? '✅' : '☐'}</button>
                    <button class="delete-btn" onclick="deleteWorkout(${w.id})">Delete</button>
                </span>
            `;
            list.appendChild(li);
        });
    }
    if (others.length > 0) {
        const header = document.createElement('li');
        header.className = 'workout-item';
        header.style.background = '#f8ffae';
        header.style.fontWeight = 'bold';
        header.textContent = "Other Tasks";
        list.appendChild(header);
        others.forEach(w => {
            const li = document.createElement('li');
            li.className = 'workout-item';
            li.innerHTML = `
                <span><b>${w.type}</b> - ${w.duration} min, ${w.calories} cal (${w.date})</span>
                <span>
                    <button class="complete-btn" onclick="toggleCompleted(${w.id})">${w.completed ? '✅' : '☐'}</button>
                    <button class="delete-btn" onclick="deleteWorkout(${w.id})">Delete</button>
                </span>
            `;
            list.appendChild(li);
        });
    }

    // History section
    const historyList = document.querySelector('.history-list');
    if (historyList) {
        historyList.innerHTML = '';
        if (workouts.length === 0) {
            const empty = document.createElement('li');
            empty.textContent = 'No workout history yet.';
            historyList.appendChild(empty);
        } else {
            workouts.forEach(w => {
                const li = document.createElement('li');
                li.className = 'workout-item';
                li.innerHTML = `<span><b>${w.type}</b> - ${w.duration} min, ${w.calories} cal (${w.date})</span>`;
                historyList.appendChild(li);
            });
        }
    }

    // Reports: fill table
    const tbody = document.getElementById('report-body');
    if (tbody) {
        tbody.innerHTML = '';
        workouts.forEach(w => {
            const tr = document.createElement('tr');
            const durationNum = Number(w.duration) || 0;
            const caloriesNum = Number(w.calories) || 0;
            const calPerMin = durationNum > 0 ? (caloriesNum / durationNum) : 0;
            const day = w.date ? new Date(w.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }) : '';
            tr.innerHTML = `
                <td>${w.id ?? ''}</td>
                <td>${w.type}</td>
                <td>${durationNum}</td>
                <td>${caloriesNum}</td>
                <td>${calPerMin.toFixed(2)}</td>
                <td>${w.date}</td>
                <td>${day}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Reports: update charts
    updateProgressChart(workouts);
    updateCompletionChart(workouts);
}

function fetchWorkouts() {
    fetch(API_URL)
        .then(res => res.json())
        .then(renderWorkouts);
}

function addWorkout(e) {
    e.preventDefault();
    const type = $('#type').value;
    const duration = $('#duration').value;
    const calories = $('#calories').value;
    const date = $('#date').value;
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, duration, calories, date })
    })
    .then(res => res.json())
    .then(() => {
        fetchWorkouts();
        $('#workout-form').reset();
    });
}

function deleteWorkout(id) {
    fetch(`${API_URL}/${id}`, { method: 'DELETE' })
        .then(() => fetchWorkouts());
}

function toggleCompleted(id) {
    fetch(`${API_URL}/${id}/toggle`, { method: 'PATCH' })
        .then(() => fetchWorkouts());
}

document.addEventListener('DOMContentLoaded', () => {
    $('#workout-form').addEventListener('submit', addWorkout);
    fetchWorkouts();
});

// Chart.js Pie Chart
let progressChartInstance = null;
function updateProgressChart(workouts) {
    const canvas = document.getElementById('progressChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const totalsByType = workouts.reduce((acc, w) => {
        const key = w.type || 'Other';
        if (!acc[key]) acc[key] = { duration: 0, calories: 0 };
        acc[key].duration += Number(w.duration) || 0;
        acc[key].calories += Number(w.calories) || 0;
        return acc;
    }, {});

    const labels = Object.keys(totalsByType);
    const data = labels.map(l => totalsByType[l].calories);

    const colors = [
        '#43cea2','#185a9d','#f09819','#ff5858','#56ab2f','#a8e063',
        '#b7e4c7','#f8ffae','#e0f7fa','#c5cae9'
    ];

    const ctx = canvas.getContext('2d');
    if (progressChartInstance) {
        progressChartInstance.data.labels = labels;
        progressChartInstance.data.datasets[0].data = data;
        progressChartInstance.update();
        return;
    }

    progressChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: labels.map((_, i) => colors[i % colors.length]),
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Calories by Workout Type' }
            }
        }
    });
}

// Completion pie: Completed vs Pending counts
let completionChartInstance = null;
function updateCompletionChart(workouts) {
    const canvas = document.getElementById('completionChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const completed = workouts.filter(w => Number(w.completed) === 1).length;
    const pending = workouts.length - completed;

    const data = {
        labels: ['Completed','Pending'],
        datasets: [{
            data: [completed, pending],
            backgroundColor: ['#56ab2f', '#f09819']
        }]
    };

    const ctx = canvas.getContext('2d');
    if (completionChartInstance) {
        completionChartInstance.data = data;
        completionChartInstance.update();
        return;
    }
    completionChartInstance = new Chart(ctx, {
        type: 'pie',
        data,
        options: {
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Task Completion' }
            }
        }
    });
}

async function loadTasks() {
    const dateInput = document.getElementById('task-date');
    const date = dateInput.value || new Date().toISOString().split('T')[0]; // today if no date selected

    try {
        const response = await fetch(`/todo/view?date=${date}`, {
    credentials: 'include' // important for session cookies
    });

        const tasks = await response.json();

        const tbody = document.querySelector('#task-view tbody');
        tbody.innerHTML = '';

        if (tasks.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="3" style="text-align:center;">No tasks for this date</td>`;
            tbody.appendChild(row);
            return;
        }
        tasks.forEach(task => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${task.task}</td>
                <td><button onclick="updateTask(${task.id}, '${task.task}')">Update</button></td>
                <td><button onclick="deleteTask(${task.id})">Delete</button></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading tasks', error);
    }
}

async function deleteTask(id) {
    if (!confirm('Do you want to delete this task?')) return;

    try {
        await fetch(`/todo/delete/${id}`, { method: 'DELETE', credentials: 'include' });
        loadTasks(); // Reload tasks after deletion
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

async function updateTask(id, oldTask) {
    const newTask = prompt('Edit task:', oldTask);
    if (!newTask || newTask.trim() === '') return;

    try {
        await fetch(`/todo/update/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: newTask }),
            credentials: 'include'
        });
        loadTasks(); // Reload tasks after update
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

// Load today's tasks by default
window.addEventListener('DOMContentLoaded', () => {
    // Set date input to today by default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('task-date').value = today;
    loadTasks();
});

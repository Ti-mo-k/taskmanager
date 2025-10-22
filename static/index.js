document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('list');

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('task-date').value = today;

    list.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formdata = new FormData(list);

        const task = formdata.get('task').trim();
        const date = formdata.get('date');

        if (!task) {
            alert('Please enter a task.');
            return;
        }

        try {
            const response = await fetch('/todo/add', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json" // important for JSON response
                },
                body: JSON.stringify({ task, date })
            });

            const data = await response.json(); // parse JSON

            if (response.ok) {
                alert(data.message || 'Task added successfully');
                list.reset();
                document.getElementById('task-date').value = today;
            } else {
                alert(data.error || 'Failed to add task');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Server error');
        }
    });
});

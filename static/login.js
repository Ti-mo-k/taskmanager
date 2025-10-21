document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');

        if (!email || !password) {
            alert('Please fill in both fields.');
            return;
        }

        try {
            const response = await fetch('/todo/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                // Redirect user to the main todo page after successful login
                window.location.href = '/list';
            } else if (response.status === 401) {
                alert('Invalid email or password.');
            } else {
                alert('Login failed. Please try again.');
            }

        } catch (error) {
            console.error('Error during login:', error);
            alert('An error occurred. Please try again later.');
        }
    });
});

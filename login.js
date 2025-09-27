document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Login successful!');
            // Store username in localStorage
            localStorage.setItem('fitnessUsername', username);
            window.location.href = '../index.html';
        } else {
            alert(data.error || 'Login failed');
        }
    })
    .catch(() => alert('Server error'));
});

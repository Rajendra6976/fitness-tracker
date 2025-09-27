// Common logout functionality for all pages
function logoutUser() {
  // Call the backend logout API first
  fetch('/api/logout', { 
    method: 'POST',
    credentials: 'include' // Include session cookies
  })
  .then(response => {
    if (response.ok) {
      // Clear local storage
      localStorage.removeItem('fitnessUsername');
      // Redirect to logout page
      window.location.href = '/logout.html';
    } else {
      console.error('Logout failed');
      // Still redirect even if API call fails
      localStorage.removeItem('fitnessUsername');
      window.location.href = '/logout.html';
    }
  })
  .catch(error => {
    console.error('Logout error:', error);
    // Still redirect even if API call fails
    localStorage.removeItem('fitnessUsername');
    window.location.href = '/logout.html';
  });
}

// Make logoutUser available globally
window.logoutUser = logoutUser;

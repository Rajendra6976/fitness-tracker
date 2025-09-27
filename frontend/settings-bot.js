// Simple chatbot for settings page
(function() {
  const settingsMap = {
    'reminder': '#exercise-reminder-bar',
    'google calendar': '.chart-section',
    'logout': 'button[onclick="logoutUser()"]',
    'profile': '.chart-section',
    'preferences': '.chart-section',
    'about': '/about.html',
    'help': '/help.html',
    'home': '/home.html',
    'progress': '/progress.html',
    'reports': '/reports.html',
    'gym guide': '/gym-guide.html',
  };
  function openSetting(query) {
    query = query.toLowerCase();
    for (const key in settingsMap) {
      if (query.includes(key)) {
        const val = settingsMap[key];
        if (val.startsWith && val.startsWith('/')) {
          window.location.href = val;
          return;
        }
        const el = document.querySelector(val);
        if (el) {
          el.scrollIntoView({behavior:'smooth', block:'center'});
          el.style.boxShadow = '0 0 0 4px #43cea2, 0 2px 8px rgba(30,60,114,0.10)';
          setTimeout(()=>{el.style.boxShadow='';}, 2000);
        }
        return;
      }
    }
    alert('Sorry, I could not find that setting.');
  }
  window.openSetting = openSetting;
})();

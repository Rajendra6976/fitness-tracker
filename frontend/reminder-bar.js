// reminder-bar.js
// This script dynamically loads the exercise reminder from localStorage and displays it in the reminder bar on each page.
(function() {
  function updateReminderBar() {
    var bar = document.getElementById('exercise-reminder-bar');
    if (!bar) return;
    var reminder = localStorage.getItem('exerciseReminder') || 'Aim to exercise at least 30 minutes every day for your health!';
    bar.textContent = 'Reminder: ' + reminder;
  }
  document.addEventListener('DOMContentLoaded', updateReminderBar);
  window.addEventListener('storage', updateReminderBar); // update if changed in another tab
})();

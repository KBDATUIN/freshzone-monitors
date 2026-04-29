// Push toggle drag handler — draggable + click-to-toggle
// Loads after togglePushNotifications() exists
// No conflicts with existing onclick/JS

(function() {
  'use strict';

  const switchBtn = document.getElementById('push-btn');
  const knob = switchBtn ? switchBtn.querySelector('.push-toggle

(function () {
  'use strict';

  var CFG = window.FLUJO_CONFIG || {};
  var WA = CFG.whatsapp || '18492597719';
  var params = new URLSearchParams(location.search);
  // Origen del visitante: ?src= manda; si no, se detecta el navegador interno
  // de la app (Instagram, Facebook, TikTok) o la página de donde vino.
  function detectSource() {
    var explicit = params.get('src') || params.get('utm_source');
    if (explicit) return explicit;
    var ua = navigator.userAgent || '';
    if (/Instagram/i.test(ua)) return 'instagram';
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
    if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'tiktok';
    var ref = document.referrer || '';
    if (/instagram\./i.test(ref)) return 'instagram';
    if (/facebook\.|fb\./i.test(ref)) return 'facebook';
    if (/tiktok\./i.test(ref)) return 'tiktok';
    if (/youtube\.|youtu\.be/i.test(ref)) return 'youtube';
    if (/linkedin\./i.test(ref)) return 'linkedin';
    return 'link-bio';
  }
  var SOURCE = detectSource().slice(0, 40);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function waLink(text) { return 'https://wa.me/' + WA + (text ? '?text=' + encodeURIComponent(text) : ''); }

  // ---------------- Servicios ----------------
  var SERVICES = [
    { title: 'Chatbots para WhatsApp e Instagram', desc: 'Responden al instante, dan precios, toman pedidos y agendan citas a cualquier hora.', option: 'Chatbot de WhatsApp o Instagram' },
    { title: 'Agentes de IA', desc: 'Asistentes que usan tu información y tus herramientas para resolver tareas completas.', option: 'Agente de IA' },
    { title: 'Automatización con n8n', desc: 'Conectamos tus apps para eliminar el trabajo repetitivo: correos, reportes, seguimientos.', option: 'Automatización con n8n' },
    { title: 'CRM a medida', desc: 'Tus clientes, citas, ventas y tareas en un solo lugar, conectado a tus chatbots.', option: 'CRM a medida' },
    { title: 'Páginas web', desc: 'Sitios modernos y rápidos, pensados para convertir visitas en clientes.', option: 'Página web' },
    { title: 'Flujobot', desc: 'Nuestra plataforma para tener tu propio chatbot con CRM, agenda y reportes.', option: 'Flujobot' },
  ];
  var TRAINING = 'Formación 1 a 1';

  var servicesBox = $('#services');
  // Servicios en acordeón: solo el nombre; al tocarlo se abre la descripción.
  SERVICES.forEach(function (s, i) {
    var panelId = 'service-panel-' + i;
    var card = el('article', { class: 'service' });
    var head = el('button', {
      type: 'button', class: 'service-head', 'aria-expanded': 'false', 'aria-controls': panelId,
      onclick: function () {
        var open = card.classList.contains('open');
        $all('.service.open').forEach(function (c) {
          c.classList.remove('open');
          c.querySelector('.service-head').setAttribute('aria-expanded', 'false');
        });
        if (!open) { card.classList.add('open'); head.setAttribute('aria-expanded', 'true'); }
      },
    }, [
      el('span', { class: 'service-num', 'aria-hidden': 'true', text: String(i + 1).padStart(2, '0') }),
      el('h3', { text: s.title }),
      el('span', { class: 'chev', 'aria-hidden': 'true' }),
    ]);
    var panel = el('div', { class: 'service-panel', id: panelId, role: 'region' }, [
      el('div', { class: 'service-panel-inner' }, [
        el('p', { text: s.desc }),
        el('button', { type: 'button', class: 'service-cta', text: 'Me interesa →', 'aria-label': 'Me interesa: ' + s.title, onclick: function () { pickService('consulta', s.option); } }),
      ]),
    ]);
    card.appendChild(head);
    card.appendChild(panel);
    servicesBox.appendChild(card);
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    $all('.service').forEach(function (n) { io.observe(n); });
  } else {
    $all('.service').forEach(function (n) { n.classList.add('in'); });
  }

  // ---------------- Agenda ----------------
  var state = { type: 'consulta', dayIndex: 0, slotIso: null, taken: [], days: [], loading: true };
  var serviceSelect = $('#service');
  var daysBox = $('#days');
  var slotsBox = $('#slots');
  var slotsHint = $('#slots-hint');
  var submitBtn = $('#submit-btn');
  var formError = $('#form-error');

  function fillServiceOptions(selected) {
    serviceSelect.innerHTML = '';
    var opts = state.type === 'formacion' ? [TRAINING] : SERVICES.map(function (s) { return s.option; }).concat(['Otro / no estoy seguro']);
    opts.forEach(function (o) { serviceSelect.appendChild(el('option', { value: o, text: o })); });
    if (selected && opts.indexOf(selected) >= 0) serviceSelect.value = selected;
  }

  function setType(type) {
    state.type = type;
    $all('.segmented button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.type === type)); });
    fillServiceOptions();
  }
  $all('.segmented button').forEach(function (b) { b.addEventListener('click', function () { setType(b.dataset.type); }); });

  function pickService(type, option) {
    setType(type);
    fillServiceOptions(option);
    $('#agenda').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#training-btn').addEventListener('click', function () { pickService('formacion', TRAINING); });

  // Fechas en hora de Santo Domingo (UTC-4 fijo).
  var OFFSET_MS = (CFG.utcOffsetMinutes || -240) * 60000;
  function drNow() { return new Date(Date.now() + OFFSET_MS); } // usar getUTC* para leer hora local DR
  function pad(n) { return String(n).padStart(2, '0'); }
  function hm(str) { var p = str.split(':'); return +p[0] * 60 + +p[1]; }
  var DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var DOW_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function buildDays() {
    var days = [];
    var d = drNow();
    var cursor = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    var guard = 0;
    while (days.length < (CFG.businessDaysAhead || 10) && guard < 40) {
      var c = new Date(cursor);
      var dow = c.getUTCDay();
      if (dow >= 1 && dow <= 5) {
        days.push({
          y: c.getUTCFullYear(), m: c.getUTCMonth(), d: c.getUTCDate(), dow: dow,
          key: c.getUTCFullYear() + '-' + pad(c.getUTCMonth() + 1) + '-' + pad(c.getUTCDate()),
        });
      }
      cursor += 86400000;
      guard++;
    }
    return days;
  }

  function slotsFor(day) {
    var out = [];
    var start = hm(CFG.workStart || '12:00');
    var end = hm(CFG.workEnd || '18:00');
    var step = CFG.slotMinutes || 30;
    var minStart = Date.now() + (CFG.minNoticeHours || 2) * 3600000;
    for (var t = start; t + step <= end; t += step) {
      var iso = day.key + 'T' + pad(Math.floor(t / 60)) + ':' + pad(t % 60) + ':00' + (CFG.utcOffset || '-04:00');
      var ms = Date.parse(iso);
      var h = Math.floor(t / 60);
      var label = ((h + 11) % 12 + 1) + ':' + pad(t % 60) + (h < 12 ? ' AM' : ' PM');
      var taken = ms < minStart || state.taken.some(function (r) {
        var a = Date.parse(r.start);
        return ms < a + (r.duration_min || 30) * 60000 && a < ms + step * 60000;
      });
      out.push({ iso: iso, label: label, taken: taken, past: ms < minStart });
    }
    return out;
  }

  function renderDays() {
    daysBox.innerHTML = '';
    state.days.forEach(function (day, i) {
      var free = slotsFor(day).some(function (s) { return !s.taken; });
      var btn = el('button', {
        type: 'button', role: 'radio', class: 'day',
        'aria-checked': String(i === state.dayIndex),
        'aria-label': DOW_LONG[day.dow] + ' ' + day.d + ' de ' + MONTHS[day.m] + (free ? '' : ', sin horas disponibles'),
        onclick: function () { state.dayIndex = i; state.slotIso = null; renderDays(); renderSlots(); updateSubmit(); },
      }, [el('small', { text: DOW[day.dow] }), el('b', { text: String(day.d) })]);
      if (!free) btn.disabled = true;
      daysBox.appendChild(btn);
    });
  }

  function renderSlots() {
    slotsBox.innerHTML = '';
    if (state.loading) {
      for (var k = 0; k < 6; k++) slotsBox.appendChild(el('div', { class: 'skeleton', 'aria-hidden': 'true' }));
      return;
    }
    var day = state.days[state.dayIndex];
    var slots = slotsFor(day);
    var anyFree = false;
    slots.forEach(function (s) {
      if (s.past) return;
      if (!s.taken) anyFree = true;
      var b = el('button', {
        type: 'button', role: 'radio', class: 'slot', text: s.label,
        'aria-checked': String(state.slotIso === s.iso),
        'aria-label': s.taken ? s.label + ', ocupada' : s.label,
        onclick: function () { state.slotIso = s.iso; renderSlots(); updateSubmit(); },
      });
      if (s.taken) b.disabled = true;
      slotsBox.appendChild(b);
    });
    slotsHint.hidden = anyFree;
    if (!anyFree) slotsHint.textContent = 'No quedan horas este día. Elige otro día o escríbenos por WhatsApp.';
  }

  function slotSummary(iso) {
    var ms = Date.parse(iso);
    var d = new Date(ms + OFFSET_MS);
    var h = d.getUTCHours();
    return DOW_LONG[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + MONTHS[d.getUTCMonth()] + ' a las ' + ((h + 11) % 12 + 1) + ':' + pad(d.getUTCMinutes()) + (h < 12 ? ' AM' : ' PM');
  }

  function updateSubmit() {
    if (!state.slotIso) { submitBtn.disabled = true; submitBtn.textContent = 'Elige una hora para continuar'; return; }
    submitBtn.disabled = false;
    var lbl = slotsFor(state.days[state.dayIndex]).filter(function (s) { return s.iso === state.slotIso; })[0];
    submitBtn.textContent = 'Confirmar cita · ' + (lbl ? lbl.label : '');
  }

  function loadAvailability() {
    state.loading = true;
    renderSlots();
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    return fetch(CFG.availabilityUrl, { signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (data) { state.taken = Array.isArray(data.taken) ? data.taken : []; })
      .catch(function () { state.taken = []; })
      .then(function () {
        clearTimeout(timer);
        state.loading = false;
        // Saltar al primer día con horas libres.
        var first = state.days.findIndex(function (d) { return slotsFor(d).some(function (s) { return !s.taken; }); });
        if (first >= 0 && !slotsFor(state.days[state.dayIndex]).some(function (s) { return !s.taken; })) state.dayIndex = first;
        if (state.slotIso && !slotsFor(state.days[state.dayIndex]).some(function (s) { return s.iso === state.slotIso && !s.taken; })) state.slotIso = null;
        renderDays();
        renderSlots();
        updateSubmit();
      });
  }

  function showError(msg) { formError.textContent = msg; formError.hidden = false; }

  $('#booking').addEventListener('submit', function (ev) {
    ev.preventDefault();
    formError.hidden = true;
    var name = $('#name').value.trim();
    var phone = $('#whatsapp').value.trim();
    var digits = phone.replace(/\D/g, '');
    $('#name').setAttribute('aria-invalid', String(!name));
    $('#whatsapp').setAttribute('aria-invalid', String(digits.length < 10));
    if (!state.slotIso) return showError('Elige un día y una hora.');
    if (!name) { $('#name').focus(); return showError('Escribe tu nombre.'); }
    if (digits.length < 10) { $('#whatsapp').focus(); return showError('Escribe un número de WhatsApp válido, con código de área.'); }
    if (!$('#consent').checked) return showError('Marca la casilla para que podamos confirmarte la cita por WhatsApp.');

    var id = uuid();
    var payload = {
      event: 'appointment_booked',
      event_id: id,
      occurred_at: new Date().toISOString(),
      source: SOURCE,
      website: (document.querySelector('input[name="website"]') || {}).value || '',
      lead: {
        name: name,
        whatsapp: phone,
        business: $('#business').value.trim(),
        interest: serviceSelect.value,
        message: $('#message').value.trim(),
      },
      appointment: {
        id: id,
        type: state.type,
        service: serviceSelect.value,
        start: state.slotIso,
        duration_min: CFG.slotMinutes || 30,
      },
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Agendando…';
    fetch(CFG.bookingWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; }); })
      .then(function (res) {
        if (res.status === 409) {
          showError('Esa hora se acaba de ocupar. Elige otra, por favor.');
          state.slotIso = null;
          return loadAvailability();
        }
        if (res.status >= 300 || res.body.ok === false) throw new Error(res.body.error || 'error');
        var when = slotSummary(payload.appointment.start);
        $('#success-text').textContent = name.split(' ')[0] + ', te esperamos el ' + when + ' (hora de Santo Domingo). Te escribiremos por WhatsApp para confirmarla.';
        $('#success-wa').href = waLink('Hola, soy ' + name + '. Acabo de agendar una cita para el ' + when + ' (' + serviceSelect.value + ').');
        $('#booking').hidden = true;
        $('#success').hidden = false;
        $('#success').scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function () {
        showError('No pudimos agendar en este momento. Inténtalo otra vez o escríbenos por WhatsApp.');
      })
      .then(function () { if (!$('#booking').hidden) updateSubmit(); });
  });

  $('#book-again').addEventListener('click', function () {
    $('#success').hidden = true;
    $('#booking').hidden = false;
    $('#booking').reset();
    state.slotIso = null;
    setType('consulta');
    loadAvailability();
  });

  state.days = buildDays();
  fillServiceOptions();
  renderDays();
  loadAvailability();

  // ---------------- Chat ----------------
  var chat = $('#chat');
  var backdrop = $('#chat-backdrop');
  var body = $('#chat-body');
  var lastFocus = null;
  var sessionId = uuid();
  var started = false;

  function addMsg(text, who) {
    var m = el('div', { class: 'msg ' + (who === 'me' ? 'msg-me' : 'msg-bot'), text: text });
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }
  function addChips(items) {
    var box = el('div', { class: 'chips' });
    items.forEach(function (it) {
      if (it.href) box.appendChild(el('a', { href: it.href, target: '_blank', rel: 'noopener', text: it.label }));
      else box.appendChild(el('button', { type: 'button', text: it.label, onclick: function () { box.remove(); it.action(); } }));
    });
    body.appendChild(box);
    body.scrollTop = body.scrollHeight;
  }
  function typing() {
    var t = el('div', { class: 'msg msg-bot msg-typing', 'aria-label': 'Escribiendo' }, [el('span'), el('span'), el('span')]);
    body.appendChild(t);
    body.scrollTop = body.scrollHeight;
    return t;
  }
  function goAgenda(type, option) {
    closeChat();
    pickService(type, option);
  }

  var GUIDED = {
    chatbot: {
      text: '¡Excelente! Creamos chatbots para WhatsApp e Instagram que responden al instante, dan precios, toman pedidos y agendan citas.\n\nLo mejor es una cita gratis de 30 minutos para ver tu negocio y darte una propuesta exacta.',
      chips: function () { return [
        { label: 'Agendar cita gratis', action: function () { goAgenda('consulta', 'Chatbot de WhatsApp o Instagram'); } },
        { label: 'Escribir por WhatsApp', href: waLink('Hola, me interesa un chatbot para mi negocio.') },
      ]; },
    },
    formacion: {
      text: 'La formación es 1 a 1 y en vivo: 5 clases de aproximadamente 1 h 30 min donde aprendes a crear chatbots, agentes de IA y automatizaciones con n8n.',
      chips: function () { return [
        { label: 'Agendar llamada de formación', action: function () { goAgenda('formacion', TRAINING); } },
        { label: 'Preguntar por WhatsApp', href: waLink('Hola, quiero información sobre la formación 1 a 1.') },
      ]; },
    },
    precio: {
      text: 'El precio depende de lo que necesite tu negocio. En la cita gratis lo vemos juntos y te damos el precio exacto, sin compromiso.',
      chips: function () { return [
        { label: 'Agendar cita gratis', action: function () { goAgenda('consulta'); } },
        { label: 'Escribir por WhatsApp', href: waLink('Hola, quiero saber precios de sus servicios.') },
      ]; },
    },
    otro: {
      text: 'Para darte una respuesta exacta, lo mejor es escribirnos por WhatsApp o agendar una cita gratis.',
      chips: function () { return [
        { label: 'Escribir por WhatsApp', href: waLink('Hola, vengo del link de Instagram.') },
        { label: 'Agendar cita gratis', action: function () { goAgenda('consulta'); } },
      ]; },
    },
  };

  function guidedReply(key) {
    var t = typing();
    setTimeout(function () {
      t.remove();
      addMsg(GUIDED[key].text, 'bot');
      addChips(GUIDED[key].chips());
    }, 600);
  }

  function classify(text) {
    var s = text.toLowerCase();
    if (/(precio|cuesta|costo|cu[aá]nto|cobran|tarifa)/.test(s)) return 'precio';
    if (/(curso|clase|formaci|aprender|enseñ|n8n)/.test(s)) return 'formacion';
    if (/(bot|chatbot|whatsapp|instagram|automat|agente|crm|web|p[aá]gina)/.test(s)) return 'chatbot';
    return 'otro';
  }

  var aiBusy = false;
  function askAI(text) {
    if (aiBusy) return Promise.resolve();
    aiBusy = true;
    var t = typing();
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
    return fetch(CFG.chatWebhook, {
      signal: ctrl ? ctrl.signal : undefined,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sendMessage', sessionId: sessionId, chatInput: text, source: SOURCE }),
    })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (data) {
        t.remove();
        var out = (Array.isArray(data) ? data[0] : data) || {};
        var reply = String(out.output || out.text || out.message || '');
        if (!reply.trim()) throw new Error('vacío');
        // Marcas que pone la IA para mostrar botones.
        var wantsAgenda = reply.indexOf('[[AGENDAR]]') >= 0;
        var wantsWa = reply.indexOf('[[WHATSAPP]]') >= 0;
        reply = reply.replace(/\[\[(AGENDAR|WHATSAPP)\]\]/g, '').trim();
        addMsg(reply, 'bot');
        var chips = [];
        if (wantsAgenda) chips.push({ label: 'Agendar cita gratis', action: function () { goAgenda('consulta'); } });
        if (wantsWa) chips.push({ label: 'Escribir por WhatsApp', href: waLink('Hola, vengo del chat de link.flujoxai.com.') });
        if (chips.length) addChips(chips);
      })
      .catch(function () {
        t.remove();
        guidedReply(classify(text));
      })
      .then(function () { aiBusy = false; clearTimeout(timer); });
  }

  function openChat() {
    lastFocus = document.activeElement;
    chat.hidden = false;
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    if (!started) {
      started = true;
      addMsg('¡Hola! Soy el asistente de FlujoxAI. Te ayudo con chatbots, agentes de IA, automatizaciones y nuestras formaciones.', 'bot');
      addMsg('¿Qué te gustaría hacer?', 'bot');
      function starter(text, key) {
        return function () { addMsg(text, 'me'); if (CFG.chatWebhook) askAI(text); else guidedReply(key); };
      }
      addChips([
        { label: 'Quiero un chatbot', action: starter('Quiero un chatbot para mi negocio', 'chatbot') },
        { label: 'Info de la formación', action: starter('Quiero información de la formación 1 a 1', 'formacion') },
        { label: '¿Cuánto cuesta?', action: starter('¿Cuánto cuesta?', 'precio') },
      ]);
    }
    setTimeout(function () { $('#chat-text').focus(); }, 50);
  }
  function closeChat() {
    chat.hidden = true;
    backdrop.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $all('[data-open-chat]').forEach(function (b) { b.addEventListener('click', openChat); });
  $('#chat-close').addEventListener('click', closeChat);
  backdrop.addEventListener('click', closeChat);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !chat.hidden) closeChat(); });

  $('#chat-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#chat-text');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg(text, 'me');
    if (CFG.chatWebhook) askAI(text);
    else guidedReply(classify(text));
  });
})();

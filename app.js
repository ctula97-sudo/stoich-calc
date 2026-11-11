(function () {
  'use strict';
  var calc = window.StoichCalc;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('calculator'), mode = $('mode'), referenceWrap = $('reference-wrap');
  var formula = $('formula'), element = $('element'), amount = $('amount'), unit = $('unit');
  var error = $('error'), result = $('result'), historyBox = $('history');
  var storageKey = 'stoich-history-v1';
  // 기준 원소 목록은 입력한 화학식에 실제로 들어있는 원소만 보여준다.
  function elementSymbols() { return Object.keys(calc.atomicWeights); }
  function updateElements() {
    var previous = element.value, list = [];
    try { list = Object.keys(calc.parseFormula(formula.value)); } catch (e) { list = []; }
    element.innerHTML = '';
    if (!list.length) {
      var placeholder = document.createElement('option');
      placeholder.value = ''; placeholder.textContent = formula.value.trim() ? '화학식을 확인해 주세요' : '화학식을 먼저 입력하세요';
      element.appendChild(placeholder);
      return;
    }
    list.forEach(function (symbol) {
      var option = document.createElement('option');
      option.value = symbol; option.textContent = symbol; element.appendChild(option);
    });
    if (list.indexOf(previous) !== -1) element.value = previous;
  }
  function format(value) {
    var abs = Math.abs(value);
    return abs && abs < 1 ? value.toPrecision(6) : value.toPrecision(4);
  }
  // 칭량용 질량 표기: 연구실 저울(0.0001 g 해상도, 그람 스케일)에 맞춰 소수 넷째 자리까지 g로 표시
  var BALANCE_DIGITS = 4;
  function formatMass(massG) {
    if (!isFinite(massG)) return '-';
    if (massG > 0 && massG < 0.00005) return '<0.0001 g';
    return massG.toFixed(BALANCE_DIGITS) + ' g';
  }
  function roundedMass(massG) { return Number(massG.toFixed(BALANCE_DIGITS)); }
  function readHistory() { try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (_) { return []; } }
  function saveHistory(item) {
    try { var list = readHistory().filter(function (x) { return x.formula !== item.formula || x.mode !== item.mode || x.amount !== item.amount || x.unit !== item.unit; }); list.unshift(item); localStorage.setItem(storageKey, JSON.stringify(list.slice(0, 10))); } catch (_) {}
  }
  function renderHistory() {
    var list = readHistory();
    historyBox.innerHTML = list.length ? list.map(function (item, i) {
      return '<button type="button" class="history-item" data-index="' + i + '">' + item.formula + ' · ' + (item.mode === 'reference' ? '기준 ' + item.element : '총 질량') + ' · ' + item.amount + item.unit + '</button>';
    }).join('') : '<p class="muted">아직 계산 기록이 없습니다.</p>';
  }
  function updateMode() {
    referenceWrap.hidden = mode.value !== 'reference';
    $('amount-label').textContent = mode.value === 'reference' ? '기준 원소 질량' : '목표 총 질량';
  }
  function render(data, anchor, raw) {
    var cards = data.rows.map(function (row) {
      var isRef = row.element === anchor;
      var belowBalance = row.massG > 0 && row.massG < 0.00005;
      var shownValue = isRef && raw !== undefined ? raw : row.massG.toFixed(BALANCE_DIGITS);
      return '<div class="card' + (isRef ? ' ref' : '') + '">' +
        '<div class="card-top"><b>' + row.element + (isRef ? ' <em>기준</em>' : '') + '</b>' +
        '<span class="mass-group"><input class="card-mass" type="text" inputmode="decimal" data-element="' + row.element +
        '" value="' + shownValue + '" aria-label="' + row.element + ' 질량(g)"><span class="unit">g</span></span></div>' +
        '<div class="card-sub">몰비 ' + format(row.ratio) + ' · 원자량 ' + row.atomicWeight +
        ' · ' + format(row.moleAmount) + ' mol · ' + format(row.massPercent) + '%' +
        (belowBalance ? ' · 저울 최소단위 미만 (계산값 ' + row.massG.toPrecision(2) + ' g)' : '') + '</div></div>';
    }).join('');
    var shownSum = data.rows.reduce(function (sum, r) { return sum + roundedMass(r.massG); }, 0);
    var shownTotal = roundedMass(data.totalMassG);
    var checkLine = '검산: ' + data.rows.map(function (r) { return formatMass(r.massG); }).join(' + ') +
      ' = <b>' + formatMass(shownSum) + '</b>' +
      (Math.abs(shownSum - shownTotal) >= 0.00005 ? ' (실제 합계 ' + formatMass(data.totalMassG) + ', 반올림 차이)' : '');
    result.innerHTML = '<div class="summary"><strong>몰 질량</strong><span>' + data.molarMass.toFixed(3) + ' g/mol</span><strong>화학식 단위 몰수</strong><span>' + format(data.formulaMoles) + ' mol</span></div>' +
      '<div class="cards">' + cards + '</div>' +
      '<p class="verify">' + checkLine + '</p>' +
      '<p class="note">질량을 직접 고치면 나머지 원소가 그 값에 맞춰 다시 계산됩니다. 표시는 0.0001 g 해상도 기준.</p>';
    result.hidden = false;
  }
  // 결과 카드에서 질량을 직접 수정 → 수정한 원소를 기준으로 전체 재계산
  result.addEventListener('input', function (event) {
    var field = event.target.closest ? event.target.closest('.card-mass') : null;
    if (!field) return;
    var raw = field.value.replace(/,/g, '.').trim();
    var value = Number(raw);
    if (!raw || !isFinite(value) || value <= 0) return;
    try {
      var data = calc.calculate(formula.value, { mode: 'reference', element: field.dataset.element, amount: value, unit: 'g' });
      render(data, field.dataset.element, raw);
      var again = result.querySelector('.card-mass[data-element="' + field.dataset.element + '"]');
      if (again) { again.focus(); again.setSelectionRange(raw.length, raw.length); }
    } catch (e) { /* 입력 중간 상태는 무시 */ }
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault(); error.textContent = ''; result.hidden = true;
    try {
      if (mode.value === 'reference' && !element.value) throw new Error('기준 원소를 선택해 주세요.');
      var data = calc.calculate(formula.value, { mode: mode.value, element: element.value, amount: amount.value, unit: unit.value });
      render(data, mode.value === 'reference' ? element.value : null);
      saveHistory({ formula: formula.value.trim(), mode: mode.value, element: element.value, amount: amount.value, unit: unit.value });
      renderHistory();
    } catch (e) { error.textContent = e.message; }
  });
  mode.addEventListener('change', updateMode);
  formula.addEventListener('input', updateElements);
  historyBox.addEventListener('click', function (event) {
    var button = event.target.closest('.history-item'); if (!button) return;
    var item = readHistory()[Number(button.dataset.index)]; if (!item) return;
    formula.value = item.formula; mode.value = item.mode; amount.value = item.amount; unit.value = item.unit;
    updateElements(); element.value = item.element || ''; updateMode(); form.requestSubmit();
  });
  updateMode(); updateElements(); renderHistory();
  // 댓글: 자체 API(익명). 정적 사이트라 서버는 이 NAS에서 돌고, Tailscale Funnel로 노출한다.
  var API_BASE = (location.protocol === 'file:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')
    ? 'http://127.0.0.1:8099/comments'
    : 'https://nas.tail3a46d0.ts.net/comments';
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var commentBox = $('comment'), commentName = $('comment-name'), commentStatus = $('comment-status');
  var commentList = $('comment-list'), sendButton = $('send-comment');
  function renderComments(list) {
    if (!list.length) {
      commentList.innerHTML = '<p class="muted">아직 남긴 의견이 없습니다. 첫 의견을 남겨 보세요.</p>';
      return;
    }
    commentList.innerHTML = list.map(function (item) {
      return '<article class="comment"><div class="comment-head"><b>' + escapeHtml(item.name) + '</b><time>' +
        escapeHtml(String(item.created_at).slice(0, 16)) + '</time></div><p>' + escapeHtml(item.body) + '</p></article>';
    }).join('');
  }
  function loadComments() {
    fetch(API_BASE + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (response) { return response.json(); })
      .then(function (data) { renderComments(data.comments || []); })
      .catch(function () {
        commentList.innerHTML = '<p class="muted">댓글 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
      });
  }
  if (sendButton) {
    sendButton.addEventListener('click', function () {
      var body = commentBox.value.trim();
      if (!body) { commentStatus.textContent = '남길 내용을 먼저 적어 주세요.'; return; }
      sendButton.disabled = true;
      commentStatus.textContent = '보내는 중…';
      fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: commentName.value, body: body })
      }).then(function (response) {
        return response.json().then(function (data) { return { ok: response.ok, data: data }; });
      }).then(function (result) {
        sendButton.disabled = false;
        if (!result.ok) { commentStatus.textContent = result.data.error || '남기지 못했습니다.'; return; }
        commentBox.value = '';
        commentStatus.textContent = '남겼습니다.';
        loadComments();
      }).catch(function () {
        sendButton.disabled = false;
        commentStatus.textContent = '댓글 서버에 연결하지 못했습니다.';
      });
    });
    loadComments();
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
}());

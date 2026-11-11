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
    try {
      if (mode.value.indexOf('mixture') === 0) {
        list = [];
      } else {
        list = Object.keys(calc.parseFormula(formula.value));
      }
    } catch (e) { list = []; }
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
    var clearButton = $('clear-history');
    if (clearButton) clearButton.hidden = !list.length;
    historyBox.innerHTML = list.length ? list.map(function (item, i) {
      var label = item.mode === 'reference' ? '기준 ' + item.element
        : item.mode === 'total' ? '총 질량'
          : item.mode === 'mixture-reference' ? '기준 화합물' : '총 질량';
      return '<div class="history-row"><button type="button" class="history-item" data-index="' + i + '">' + escapeHtml(item.formula) + ' · ' +
        label + ' · ' + item.amount + item.unit + '</button><button type="button" class="history-del" data-del="' + i + '" aria-label="이 기록 삭제">×</button></div>';
    }).join('') : '<p class="muted">아직 계산 기록이 없습니다.</p>';
  }
  function updateMode() {
    var current = mode.value;
    var mixing = current.indexOf('mixture') === 0;
    referenceWrap.hidden = current !== 'reference';
    var formulaWrap = $('formula-wrap');
    if (formulaWrap) formulaWrap.hidden = mixing;
    var rows = $('mixture-rows');
    if (rows) rows.hidden = !mixing;
    $('amount-label').textContent = current === 'reference' ? '기준 원소 질량'
      : (current === 'total' ? '목표 총 질량'
        : (current === 'mixture-reference' ? '기준 화합물 질량' : '총 질량'));
    var head = $('mix-ref-head');
    if (head) head.textContent = current === 'mixture-reference' ? '기준' : '';
    if (mixing) syncRows();
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
  var mixRowList = $('mix-row-list');
  var addMixRowButton = $('add-mix-row');
  function isMixMode() { return mode.value.indexOf('mixture') === 0; }
  function syncRows() {
    var showRef = mode.value === 'mixture-reference';
    Array.prototype.forEach.call(mixRowList.children, function (row) {
      var radio = row.querySelector('.mix-ref');
      if (radio) radio.hidden = !showRef;
    });
    if (showRef && !mixRowList.querySelector('.mix-ref:checked')) {
      var first = mixRowList.querySelector('.mix-ref');
      if (first) first.checked = true;
    }
  }
  function addMixRow(formulaText, ratio) {
    var row = document.createElement('div');
    row.className = 'mix-row';
    row.innerHTML = '<input class="mix-ref" type="radio" name="mix-ref" aria-label="기준 화합물로 지정">' +
      '<input class="mix-formula" type="text" placeholder="예: SnTe" autocomplete="off" aria-label="화합물">' +
      '<input class="mix-ratio" type="number" min="0" step="any" inputmode="decimal" value="1" aria-label="몰 수(비율)">' +
      '<button type="button" class="mix-del" aria-label="이 화합물 삭제">×</button>';
    if (formulaText) row.querySelector('.mix-formula').value = formulaText;
    if (ratio !== undefined && ratio !== null && ratio !== '') row.querySelector('.mix-ratio').value = String(ratio);
    row.querySelector('.mix-del').addEventListener('click', function () {
      if (mixRowList.children.length <= 1) {
        row.querySelector('.mix-formula').value = '';
        row.querySelector('.mix-ratio').value = '1';
        return;
      }
      row.remove();
      syncRows();
    });
    mixRowList.appendChild(row);
    syncRows();
    return row;
  }
  function readMixSelection() {
    var terms = [], referenceIndex = null;
    Array.prototype.forEach.call(mixRowList.children, function (row) {
      var formulaText = row.querySelector('.mix-formula').value.trim();
      if (!formulaText) return;
      var radio = row.querySelector('.mix-ref');
      if (radio && radio.checked) referenceIndex = terms.length;
      terms.push({ formula: formulaText, coefficient: row.querySelector('.mix-ratio').value });
    });
    return { terms: terms, referenceIndex: referenceIndex };
  }
  function fillMixRows(terms) {
    mixRowList.innerHTML = '';
    (terms && terms.length ? terms : [{ formula: '', coefficient: 1 }, { formula: '', coefficient: 1 }])
      .forEach(function (term) { addMixRow(term.formula, term.coefficient); });
  }
  if (mixRowList && addMixRowButton) {
    fillMixRows(null);
    addMixRowButton.addEventListener('click', function () {
      var row = addMixRow('', 1);
      row.querySelector('.mix-formula').focus();
    });
  }
  // 화합물 모드 결과: 화합물마다 질량 입력칸 + 원소별 총 칭량량
  var mixState = null;
  function elementCards(rows) {
    return rows.map(function (row) {
      return '<div class="card"><div class="card-top"><b>' + row.element + '</b>' +
        '<span class="mass-group"><span class="card-mass static">' + formatMass(row.massG) + '</span></span></div>' +
        '<div class="card-sub">' + format(row.moleAmount) + ' mol · ' + format(row.massPercent) + '% · 원자량 ' + row.atomicWeight + '</div></div>';
    }).join('');
  }
  function verifyLine(data) {
    var shownSum = data.rows.reduce(function (sum, r) { return sum + roundedMass(r.massG); }, 0);
    var termSum = data.terms.reduce(function (sum, t) { return sum + roundedMass(t.massG); }, 0);
    return '검산: 화합물 합 ' + formatMass(termSum) + ' · 원소 합 <b>' + formatMass(shownSum) + '</b>' +
      (Math.abs(shownSum - roundedMass(data.totalMassG)) >= 0.00005 ? ' (실제 ' + formatMass(data.totalMassG) + ', 반올림 차이)' : '');
  }
  function compositionTotal(data) {
    return data.terms.reduce(function (sum, term) { return sum + roundedMass(term.massG); }, 0);
  }
  function renderComposition(data) {
    mixState = data;
    var terms = data.terms.map(function (term, index) {
      return '<div class="card"><div class="card-top"><b>' + escapeHtml(term.formula) +
        (term.coefficient !== 1 ? ' <em>×' + String(Number(term.coefficient)) + '</em>' : '') + '</b>' +
        '<span class="mass-group"><input class="card-mass" type="text" inputmode="decimal" data-term="' + index +
        '" value="' + term.massG.toFixed(BALANCE_DIGITS) + '" aria-label="' + escapeHtml(term.formula) + ' 질량(g)"><span class="unit">g</span></span></div>' +
        '<div class="card-sub" data-termsub="' + index + '">몰 질량 ' + term.molarMass.toFixed(3) + ' g/mol · ' + format(term.moles) + ' mol</div></div>';
    }).join('');
    result.innerHTML = '<div class="summary"><strong>총 질량</strong><span id="mix-total">' + formatMass(compositionTotal(data)) + '</span>' +
      '<strong>화합물 수</strong><span>' + data.terms.length + '</span></div>' +
      '<h3 class="sub-head">화합물별 질량 (직접 고치면 나머지가 같은 몰비로 따라옵니다)</h3><div class="cards" id="mix-terms">' + terms + '</div>' +
      '<h3 class="sub-head">원소별 총 칭량량</h3><div class="cards" id="mix-elements">' + elementCards(data.rows) + '</div>' +
      '<p class="verify" id="mix-verify">' + verifyLine(data) + '</p>' +
      '<p class="note">몰 수는 화합물끼리의 비율입니다. 표시는 0.0001 g 해상도 기준.</p>';
    result.hidden = false;
  }
  function updateCompositionView(editedIndex, editedRaw) {
    var data = mixState;
    var total = compositionTotal(data);
    var totalBox = $('mix-total');
    if (totalBox) totalBox.textContent = formatMass(total);
    data.terms.forEach(function (term, index) {
      var input = result.querySelector('.card-mass[data-term="' + index + '"]');
      if (input && index !== editedIndex) input.value = term.massG.toFixed(BALANCE_DIGITS);
      var sub = result.querySelector('[data-termsub="' + index + '"]');
      if (sub) sub.textContent = '몰 질량 ' + term.molarMass.toFixed(3) + ' g/mol · ' + format(term.moles) + ' mol';
    });
    var elements = $('mix-elements');
    if (elements) elements.innerHTML = elementCards(data.rows);
    var verify = $('mix-verify');
    if (verify) verify.innerHTML = verifyLine(data);
  }
  // 결과 카드에서 질량을 직접 수정 → 수정한 원소를 기준으로 전체 재계산
  result.addEventListener('input', function (event) {
    var field = event.target.closest ? event.target.closest('input.card-mass') : null;
    if (!field) return;
    var raw = field.value.replace(/,/g, '.').trim();
    var value = Number(raw);
    if (!raw || !isFinite(value) || value <= 0) return;
    try {
      if (field.dataset.term !== undefined && mixState && mode.value.indexOf('mixture') === 0) {
        var index = Number(field.dataset.term);
        mixState = calc.rebalanceComposition(mixState.terms, index, value);
        updateCompositionView(index, raw);
        return;
      }
      var data = calc.calculate(formula.value, { mode: 'reference', element: field.dataset.element, amount: value, unit: 'g' });
      render(data, field.dataset.element, raw);
      var again = result.querySelector('.card-mass[data-element="' + field.dataset.element + '"]');
      if (again) { again.focus(); again.setSelectionRange(raw.length, raw.length); }
    } catch (e) { /* 입력 중간 상태는 무시 */ }
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault(); error.textContent = ''; result.hidden = true;
    try {
      if (mode.value.indexOf('mixture') === 0) {
        var selection = readMixSelection();
        if (!selection.terms.length) throw new Error('화합물을 하나 이상 입력해 주세요.');
        var options = { amount: amount.value, unit: unit.value };
        if (mode.value === 'mixture-reference') {
          if (selection.referenceIndex === null) throw new Error('기준 화합물을 선택해 주세요.');
          options.referenceIndex = selection.referenceIndex;
        }
        var mixed = calc.calculateFromTerms(selection.terms, options);
        renderComposition(mixed);
        saveHistory({
          formula: selection.terms.map(function (term) { return term.formula; }).join(' + '),
          terms: selection.terms, referenceIndex: selection.referenceIndex,
          mode: mode.value, amount: amount.value, unit: unit.value
        });
        renderHistory();
        return;
      }
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
    var delButton = event.target.closest('.history-del');
    if (delButton) {
      var rest = readHistory(); rest.splice(Number(delButton.dataset.del), 1);
      try { localStorage.setItem(storageKey, JSON.stringify(rest)); } catch (_) {}
      renderHistory();
      return;
    }
    var button = event.target.closest('.history-item'); if (!button) return;
    var item = readHistory()[Number(button.dataset.index)]; if (!item) return;
    formula.value = item.formula; mode.value = item.mode; amount.value = item.amount; unit.value = item.unit;
    if (item.mode && item.mode.indexOf('mixture') === 0) {
      fillMixRows(item.terms || null);
      if (item.referenceIndex !== null && item.referenceIndex !== undefined) {
        var radios = mixRowList.querySelectorAll('.mix-ref');
        if (radios[item.referenceIndex]) radios[item.referenceIndex].checked = true;
      }
    }
    updateElements(); element.value = item.element || ''; updateMode(); form.requestSubmit();
  });
  updateMode(); updateElements(); renderHistory();
  var clearButton = $('clear-history');
  if (clearButton) clearButton.addEventListener('click', function () {
    if (!readHistory().length) return;
    if (!confirm('최근 계산 기록을 모두 지울까요?')) return;
    try { localStorage.removeItem(storageKey); } catch (_) {}
    renderHistory();
  });
  // 댓글: 자체 API(익명). 서버 주소는 같은 사이트의 config.json 에서 읽는다
  // (터널 주소가 바뀌면 config.json 만 갱신하면 되고, 앱 재배포가 필요 없다).
  var API = { base: null };
  var LOCAL = location.protocol === 'file:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var commentBox = $('comment'), commentName = $('comment-name'), commentStatus = $('comment-status');
  var commentList = $('comment-list'), sendButton = $('send-comment');
  // 내가 쓴 글의 수정/삭제 열쇠는 이 기기 브라우저에만 저장한다 (로그인 없이 본인 글만 관리).
  var tokenKey = 'stoich-comment-tokens-v1';
  function readTokens() { try { return JSON.parse(localStorage.getItem(tokenKey) || '{}'); } catch (_) { return {}; } }
  function writeToken(id, token) {
    try { var map = readTokens(); map[id] = token; localStorage.setItem(tokenKey, JSON.stringify(map)); } catch (_) {}
  }
  function dropToken(id) {
    try { var map = readTokens(); delete map[id]; localStorage.setItem(tokenKey, JSON.stringify(map)); } catch (_) {}
  }
  function renderComments(list) {
    if (!list.length) {
      commentList.innerHTML = '<p class="muted">아직 남긴 의견이 없습니다. 첫 의견을 남겨 보세요.</p>';
      return;
    }
    var mine = readTokens();
    commentList.innerHTML = list.map(function (item) {
      var editable = !!mine[item.id];
      var actions = editable ? '<div class="comment-actions">' +
        '<button type="button" data-act="edit" data-id="' + item.id + '">수정</button>' +
        '<button type="button" data-act="del" data-id="' + item.id + '">삭제</button></div>' : '';
      var edited = item.updated_at ? ' <span class="edited">(수정됨)</span>' : '';
      return '<article class="comment" data-id="' + item.id + '"><div class="comment-head"><b>' + escapeHtml(item.name) + '</b><time>' +
        escapeHtml(String(item.created_at).slice(0, 16)) + edited + '</time></div>' +
        '<p>' + escapeHtml(item.body) + '</p>' + actions + '</article>';
    }).join('');
  }
  function loadComments() {
    if (!API.base) return;
    fetch(API.base + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (response) { return response.json(); })
      .then(function (data) { renderComments(data.comments || []); })
      .catch(function () {
        commentList.innerHTML = '<p class="muted">댓글 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
      });
  }
  function initComments() {
    if (LOCAL) { API.base = 'http://127.0.0.1:8099/comments'; loadComments(); return; }
    fetch('config.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (response) { return response.json(); })
      .then(function (config) {
        API.base = config && config.apiBase;
        if (!API.base) throw new Error('no apiBase');
        loadComments();
      })
      .catch(function () {
        commentList.innerHTML = '<p class="muted">댓글 서버 주소를 불러오지 못했습니다.</p>';
      });
  }
  commentList.addEventListener('click', function (event) {
    var button = event.target.closest ? event.target.closest('button[data-act]') : null;
    if (!button) return;
    var act = button.dataset.act, id = button.dataset.id;
    var article = button.closest('.comment');
    if (!article || !API.base) return;
    var token = readTokens()[id];
    if (!token) { commentStatus.textContent = '이 글을 쓴 기기에서만 수정·삭제할 수 있습니다.'; return; }
    var paragraph = article.querySelector('p');
    var actions = article.querySelector('.comment-actions');
    if (act === 'cancel') {
      var editor = article.querySelector('.comment-editor');
      if (editor) editor.remove();
      if (paragraph) paragraph.style.display = '';
      if (actions) actions.style.display = '';
      return;
    }
    if (act === 'edit') {
      if (!paragraph || article.querySelector('.comment-editor')) return;
      paragraph.style.display = 'none';
      if (actions) actions.style.display = 'none';
      var box = document.createElement('div');
      box.className = 'comment-editor';
      box.innerHTML = '<textarea class="comment-edit" maxlength="1000"></textarea>' +
        '<div class="comment-actions"><button type="button" data-act="save" data-id="' + id + '">저장</button>' +
        '<button type="button" data-act="cancel" data-id="' + id + '">취소</button></div>';
      box.querySelector('textarea').value = paragraph.textContent;
      paragraph.insertAdjacentElement('afterend', box);
      box.querySelector('textarea').focus();
      return;
    }
    if (act === 'save') {
      var text = article.querySelector('.comment-edit');
      var body = text ? text.value.trim() : '';
      if (!body) { commentStatus.textContent = '내용을 적어 주세요.'; return; }
      commentStatus.textContent = '저장 중…';
      fetch(API.base + '/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ body: body })
      }).then(function (response) {
        return response.json().then(function (data) { return { ok: response.ok, data: data }; });
      }).then(function (result) {
        if (!result.ok) { commentStatus.textContent = result.data.error || '수정하지 못했습니다.'; return; }
        commentStatus.textContent = '수정했습니다.';
        loadComments();
      }).catch(function () { commentStatus.textContent = '댓글 서버에 연결하지 못했습니다.'; });
      return;
    }
    if (act === 'del') {
      if (!confirm('이 의견을 삭제할까요?')) return;
      commentStatus.textContent = '삭제 중…';
      fetch(API.base + '/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } })
        .then(function (response) {
          return response.json().then(function (data) { return { ok: response.ok, data: data }; });
        }).then(function (result) {
          if (!result.ok) { commentStatus.textContent = result.data.error || '삭제하지 못했습니다.'; return; }
          dropToken(id);
          commentStatus.textContent = '삭제했습니다.';
          loadComments();
        }).catch(function () { commentStatus.textContent = '댓글 서버에 연결하지 못했습니다.'; });
    }
  });
  if (sendButton) {
    sendButton.addEventListener('click', function () {
      var body = commentBox.value.trim();
      if (!body) { commentStatus.textContent = '남길 내용을 먼저 적어 주세요.'; return; }
      if (!API.base) { commentStatus.textContent = '댓글 서버에 연결하지 못했습니다.'; return; }
      sendButton.disabled = true;
      commentStatus.textContent = '보내는 중…';
      fetch(API.base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: commentName.value, body: body })
      }).then(function (response) {
        return response.json().then(function (data) { return { ok: response.ok, data: data }; });
      }).then(function (result) {
        sendButton.disabled = false;
        if (!result.ok) { commentStatus.textContent = result.data.error || '남기지 못했습니다.'; return; }
        commentBox.value = '';
        if (result.data && result.data.id && result.data.token) writeToken(result.data.id, result.data.token);
        commentStatus.textContent = '남겼습니다. (이 기기에서 수정·삭제할 수 있습니다)';
        loadComments();
      }).catch(function () {
        sendButton.disabled = false;
        commentStatus.textContent = '댓글 서버에 연결하지 못했습니다.';
      });
    });
    initComments();
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
}());

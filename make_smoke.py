"""Build _smoke.html: template.html + interaction harness for headless verification."""
import pathlib

ROOT = pathlib.Path(__file__).parent
html = (ROOT / "template.html").read_text(encoding="utf-8")
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', "")

HARNESS = """
  <script>
    window.addEventListener('load', function () {
      var out = [];
      function dump() {
        var pre = document.createElement('pre');
        pre.id = '__smoke';
        pre.textContent = out.join('\\n');
        var old = document.getElementById('__smoke');
        if (old) old.remove();
        document.body.appendChild(pre);
      }
      function run(f, el, amt) {
        document.getElementById('formula').value = f;
        document.getElementById('formula').dispatchEvent(new Event('input', {bubbles: true}));
        var opts = Array.prototype.map.call(document.getElementById('element').options, function (o) { return o.value; }).join(',');
        if (el) document.getElementById('element').value = el;
        document.getElementById('amount').value = amt;
        document.getElementById('calculator').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
        out.push('CASE ' + f + ' options=[' + opts + '] err=[' + document.getElementById('error').textContent + ']');
        out.push((document.getElementById('result').innerText || '').replace(/\\\\s+/g, ' '));
      }
      run('ZnGa2Se4', 'Zn', '1');
      run('Cu2ZnSnS4', 'Cu', '0.5');
      run('SnTe', 'Sn', '1');
      var snField = document.querySelector('.card-mass[data-element="Sn"]');
      if (snField) {
        snField.value = '2';
        snField.dispatchEvent(new Event('input', {bubbles: true}));
        var vals = Array.prototype.map.call(document.querySelectorAll('.card-mass'), function (f) { return f.dataset.element + '=' + f.value; }).join(',');
        out.push('EDIT Sn=2 -> ' + vals + ' | ' + (document.querySelector('#result .verify') || {}).innerText);
      } else { out.push('EDIT FAILED: no Sn field'); }

      // 화합물 (총 질량) 모드
      var modeSel = document.getElementById('mode');
      modeSel.value = 'mixture-total';
      modeSel.dispatchEvent(new Event('change'));
      out.push('MIXTOTAL rows=' + document.querySelectorAll('.mix-row').length +
               ' formulaHidden=' + document.getElementById('formula-wrap').hidden +
               ' radioHidden=' + document.querySelector('.mix-ref').hidden +
               ' label=' + document.getElementById('amount-label').textContent);
      var rows = document.querySelectorAll('.mix-row');
      rows[0].querySelector('.mix-formula').value = 'SnTe';
      rows[0].querySelector('.mix-ratio').value = '1';
      rows[1].querySelector('.mix-formula').value = 'InSb';
      rows[1].querySelector('.mix-ratio').value = '0.9';
      document.getElementById('amount').value = '1';
      document.getElementById('unit').value = 'g';
      document.getElementById('calculator').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
      out.push('MIXTOTAL err=[' + document.getElementById('error').textContent + ']');
      out.push('MIXTOTAL formulaWidth=' + Math.round(document.querySelector('.mix-formula').offsetWidth) +
               ' ratioWidth=' + Math.round(document.querySelector('.mix-ratio').offsetWidth));
      out.push('MIXTOTAL ' + (document.getElementById('result').innerText || '').replace(/\\\\s+/g, ' '));

      // 화합물 (기준 화합물) 모드
      modeSel.value = 'mixture-reference';
      modeSel.dispatchEvent(new Event('change'));
      out.push('MIXREF radioHidden=' + document.querySelector('.mix-ref').hidden +
               ' head=' + document.getElementById('mix-ref-head').textContent +
               ' label=' + document.getElementById('amount-label').textContent);
      document.getElementById('amount').value = '1';
      document.getElementById('calculator').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
      out.push('MIXREF err=[' + document.getElementById('error').textContent + ']');
      out.push('MIXREF ' + (document.getElementById('result').innerText || '').replace(/\\\\s+/g, ' '));
      var radios = document.querySelectorAll('.mix-ref');
      radios[1].checked = true;
      document.getElementById('calculator').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
      out.push('MIXREF2 ' + (document.getElementById('result').innerText || '').replace(/\\\\s+/g, ' '));

      // 기준 화합물 모드에서 카드 질량 직접 수정 (총질량 모드는 수정 불가)
      var termInput = document.querySelector('.card-mass[data-term="0"]');
      if (termInput) {
        termInput.value = '2';
        termInput.dispatchEvent(new Event('input', {bubbles: true}));
        var termVals = Array.prototype.map.call(document.querySelectorAll('.card-mass[data-term]'), function (f) { return f.dataset.term + '=' + f.value; }).join(',');
        out.push('MIX-EDIT ' + termVals + ' | ' + (document.getElementById('mix-verify') || {}).innerText);
      } else { out.push('MIX-EDIT FAILED: no term field'); }
      var totalMode = document.getElementById('mode');
      totalMode.value = 'mixture-total';
      totalMode.dispatchEvent(new Event('change'));
      document.getElementById('calculator').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
      out.push('MIXTOTAL-EDITABLE fields=' + document.querySelectorAll('.card-mass[data-term]').length);
      document.getElementById('add-mix-row').click();
      var rows3 = document.querySelectorAll('.mix-row');
      rows3[2].querySelector('.mix-formula').value = 'Bi2Te3';
      rows3[2].querySelector('.mix-ratio').value = '0.05';
      document.getElementById('calculator').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
      out.push('MIX3 rows=' + document.querySelectorAll('.mix-row').length +
               ' err=[' + document.getElementById('error').textContent + ']');
      out.push('MIX3 ' + (document.getElementById('result').innerText || '').replace(/\\\\s+/g, ' '));

      // 최근 계산: 개별 삭제 · 전체 지우기 버튼 유무
      var before = document.querySelectorAll('.history-row').length;
      var delBtn = document.querySelector('.history-del');
      if (delBtn) delBtn.click();
      out.push('HISTORY rows ' + before + ' -> ' + document.querySelectorAll('.history-row').length +
               ' clearHidden=' + document.getElementById('clear-history').hidden);
      out.push('HISTORY text -> ' + document.getElementById('history').innerText.replace(/\\\\s+/g, ' '));

      window.confirm = function () { return true; };
      var send = document.getElementById('send-comment');
      if (send) {
        send.dispatchEvent(new Event('click'));
        out.push('COMMENT empty -> [' + document.getElementById('comment-status').textContent + ']');
        document.getElementById('comment-name').value = '테스터';
        document.getElementById('comment').value = '스모크 확인용 글';
        send.dispatchEvent(new Event('click'));
      } else { out.push('COMMENT FAILED: no send button'); }
      dump();

      setTimeout(function () {
        var list = document.getElementById('comment-list');
        out.push('COMMENT list -> [' + (list ? list.innerText.replace(/\\\\s+/g, ' ') : 'none') + ']');
        out.push('COMMENT status -> [' + document.getElementById('comment-status').textContent + ']');
        var editBtn = document.querySelector('#comment-list button[data-act="edit"]');
        out.push('COMMENT actions -> ' + (editBtn ? 'present' : 'none'));
        if (!editBtn) { dump(); return; }
        editBtn.click();
        var ta = document.querySelector('.comment-edit');
        out.push('COMMENT editor -> ' + (ta ? 'open' : 'missing'));
        if (ta) {
          ta.value = '수정된 의견입니다';
          document.querySelector('button[data-act="save"]').click();
        }
        setTimeout(function () {
          out.push('AFTER EDIT -> ' + document.getElementById('comment-list').innerText.replace(/\\\\s+/g, ' '));
          dump();
          var del = document.querySelector('#comment-list button[data-act="del"]');
          if (del) del.click();
          setTimeout(function () {
            out.push('AFTER DELETE -> ' + document.getElementById('comment-list').innerText.replace(/\\\\s+/g, ' '));
            out.push('STATUS -> [' + document.getElementById('comment-status').textContent + ']');
            dump();
          }, 1500);
        }, 1500);
      }, 1500);
    });
  </script>
"""

html = html.replace('<script src="calc.js"></script><script src="app.js"></script>',
                    '<script src="calc.js"></script><script src="app.js"></script>' + HARNESS)
(ROOT / "_smoke.html").write_text(html, encoding="utf-8")
print("wrote _smoke.html")
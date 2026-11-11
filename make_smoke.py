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

      // 화합물 모드: SnTe(InSb)0.9, 총 1 g
      document.getElementById('mode').value = 'mixture';
      document.getElementById('mode').dispatchEvent(new Event('change'));
      out.push('MIX ref hidden=' + document.getElementById('reference-wrap').hidden +
               ' label=' + document.getElementById('formula-label').textContent);
      document.getElementById('formula').value = 'SnTe(InSb)0.9';
      document.getElementById('amount').value = '1';
      document.getElementById('unit').value = 'g';
      document.getElementById('calculator').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
      out.push('MIX err=[' + document.getElementById('error').textContent + ']');
      out.push('MIX ' + (document.getElementById('result').innerText || '').replace(/\\\\s+/g, ' '));
      var termInput = document.querySelector('.card-mass[data-term="0"]');
      if (termInput) {
        termInput.value = '2';
        termInput.dispatchEvent(new Event('input', {bubbles: true}));
        var termVals = Array.prototype.map.call(document.querySelectorAll('.card-mass[data-term]'), function (f) { return f.dataset.term + '=' + f.value; }).join(',');
        out.push('MIX-EDIT ' + termVals + ' | ' + (document.getElementById('mix-verify') || {}).innerText);
      } else { out.push('MIX-EDIT FAILED: no term field'); }

      // 화합물 3종
      document.getElementById('formula').value = 'SnTe(InSb)0.9(Bi2Te3)0.05';
      document.getElementById('calculator').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
      out.push('MIX3 err=[' + document.getElementById('error').textContent + '] terms=' + document.querySelectorAll('.card-mass[data-term]').length);
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
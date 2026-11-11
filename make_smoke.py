"""Build _smoke.html: template.html + interaction harness for headless verification."""
import pathlib

ROOT = pathlib.Path(__file__).parent
html = (ROOT / "template.html").read_text(encoding="utf-8")
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', "")

HARNESS = """
  <script>
    window.addEventListener('load', function () {
      var out = [];
      function run(f, el, amt) {
        document.getElementById('formula').value = f;
        document.getElementById('formula').dispatchEvent(new Event('input', {bubbles: true}));
        var opts = Array.prototype.map.call(document.getElementById('element').options, function (o) { return o.value; }).join(',');
        if (el) document.getElementById('element').value = el;
        document.getElementById('amount').value = amt;
        document.getElementById('calculator').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
        out.push('CASE ' + f + ' options=[' + opts + '] err=[' + document.getElementById('error').textContent + ']');
        out.push((document.getElementById('result').innerText || '').replace(/\\s+/g, ' '));
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

      var send = document.getElementById('send-comment');
      if (send) {
        send.dispatchEvent(new Event('click'));
        out.push('COMMENT empty -> [' + document.getElementById('comment-status').textContent + ']');
        document.getElementById('comment-name').value = '테스터';
        document.getElementById('comment').value = '과잉 첨가 옵션 부탁드립니다';
        send.dispatchEvent(new Event('click'));
      } else { out.push('COMMENT FAILED: no send button'); }

      setTimeout(function () {
        var list = document.getElementById('comment-list');
        out.push('COMMENT list -> [' + (list ? list.innerText.replace(/\\s+/g, ' ') : 'none') + ']');
        out.push('COMMENT status -> [' + document.getElementById('comment-status').textContent + ']');
        var pre = document.createElement('pre');
        pre.id = '__smoke';
        pre.textContent = out.join('\\n');
        document.body.appendChild(pre);
      }, 1500);
    });
  </script>
"""

html = html.replace('<script src="calc.js"></script><script src="app.js"></script>',
                    '<script src="calc.js"></script><script src="app.js"></script>' + HARNESS)
(ROOT / "_smoke.html").write_text(html, encoding="utf-8")
print("wrote _smoke.html")
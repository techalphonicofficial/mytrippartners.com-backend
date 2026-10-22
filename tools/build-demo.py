# Builds a self-contained demo of the admin (no backend) into demo/ — used for the online preview.
import json, os, shutil, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(R, 'admin'); O = os.path.join(R, 'demo'); os.makedirs(os.path.join(O, 'img'), exist_ok=True)
html = open(os.path.join(A, 'index.html')).read()
css = open(os.path.join(A, 'app.css')).read(); js = open(os.path.join(A, 'app.js')).read()
cat = json.load(open(os.path.join(A, 'catalog.json')))
html = html.replace('<link rel="stylesheet" href="app.css">', '<style>\n' + css + '\n</style>')
shared = open(os.path.join(A, 'pseo-shared.js')).read()
html = html.replace('<script src="pseo-shared.js"></script>', '<script>\n' + shared.replace('</script', '<\\/script') + '\n</script>')
html = html.replace('<script src="app.js"></script>', '<script>window.TP_DEMO=true;window.TP_IMG="img/";window.TP_CATALOG=' + json.dumps(cat, separators=(',', ':')).replace('</', '<\\/') + ';</script>\n<script>\n' + js.replace('</script', '<\\/script') + '\n</script>')
open(os.path.join(O, 'index.html'), 'w').write(html)
shutil.copy(os.path.join(A, 'logo.png'), os.path.join(O, 'logo.png'))
site_img = os.path.join(R, '..', 'site', 'img')
for im in sorted({p['img'] for p in cat['packages']}):
    src = os.path.join(site_img, im + '.jpg')
    if os.path.exists(src): shutil.copy(src, os.path.join(O, 'img', im + '.jpg'))
print('demo built', len(os.listdir(os.path.join(O, 'img'))), 'images')

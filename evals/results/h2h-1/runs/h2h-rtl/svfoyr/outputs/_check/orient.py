import sys, glob, os
import subprocess
def load(f):
    d = subprocess.run(['magick', f, '-colorspace', 'gray', '-compress', 'none', 'pgm:-'], capture_output=True, text=True).stdout.split()
    w, h = int(d[1]), int(d[2]); v = list(map(int, d[4:]))
    return w, h, lambda x, y: v[y * w + x]
for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), 'o-*.png'))):
    w, h, g = load(f)
    ink = [[g(x, y) < 200 for y in range(h)] for x in range(w)]
    cols = [x for x in range(w) if any(ink[x])]
    # split into blobs by gaps
    blobs, cur = [], []
    for x in cols:
        if cur and x - cur[-1] > 2: blobs.append(cur); cur = []
        cur.append(x)
    if cur: blobs.append(cur)
    res = []
    for bl in blobs:
        ys = [y for x in bl for y in range(h) if ink[x][y]]
        top, bot = min(ys), max(ys); mid = (top + bot) / 2; span = bot - top
        midx = [x for x in bl for y in range(h) if ink[x][y] and abs(y - mid) < span * 0.15]
        endx = [x for x in bl for y in range(h) if ink[x][y] and abs(y - mid) > span * 0.35]
        a, e = sum(midx) / len(midx), sum(endx) / len(endx)
        res.append('>' if a > e else '<')
    print(os.path.basename(f)[2:-4].ljust(28), ' '.join(res))

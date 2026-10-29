import glob, os, subprocess
for f in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'a-*.png'))):
    d = subprocess.run(['magick', f, '-colorspace', 'gray', '-compress', 'none', 'pgm:-'], capture_output=True, text=True).stdout.split()
    w, h = int(d[1]), int(d[2]); v = list(map(int, d[4:]))
    pts = [(x, y) for y in range(h) for x in range(w) if v[y * w + x] < 128]
    xs = [x for x, _ in pts]; ys = [y for _, y in pts]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys); mid = (y0 + y1) / 2; span = y1 - y0
    wing = [x for x, y in pts if abs(y - mid) > span * 0.3]
    c = sum(wing) / len(wing)
    side = 'left' if (x0 + x1) / 2 < w / 2 else 'right'
    print(os.path.basename(f)[2:-4].ljust(36), ('<-' if c < (x0 + x1) / 2 else '->'), 'arrow sits at', side)

"""
Genera los íconos de Activo360 (manifest, notificaciones push y favicon)
a partir del logo real: scripts/iconos/logo-original.jpeg.

El original es pequeño (139×139, JPEG): ampliarlo tal cual a 512 px queda
borroso. Por eso se reconstruye la SILUETA del logo (máscara por
oscuridad respecto del fondo), se amplía suave, se vuelve nítida con una
curva de contraste y se pinta con un índigo sólido. Resultado: bordes
limpios en cualquier tamaño (las esquinas finas pueden quedar apenas
redondeadas).

Uso (desde la raíz del proyecto):  python3 scripts/iconos/generar-iconos.py
Requiere Pillow. Para usar otro logo, reemplaza logo-original.jpeg (mejor
un PNG grande y cambia ORIGEN abajo) y vuelve a correrlo.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

RAIZ = Path(__file__).resolve().parents[2]
ORIGEN = RAIZ / "scripts" / "iconos" / "logo-original.jpeg"
SALIDA = RAIZ / "frontend" / "public" / "icons"

BLANCO = (255, 255, 255, 255)
ESCALA = 8  # trabajo interno a 8× el tamaño final antes de reducir


def silueta():
    """Máscara L (0..255) del logo, recortada a su contorno, y su color."""
    gris = Image.open(ORIGEN).convert("L")
    rgb = Image.open(ORIGEN).convert("RGB")
    fondo = sorted(gris.getdata())[-len(gris.getdata()) // 4]  # tono del fondo (el más común, claro)
    tinta = sorted(gris.getdata())[len(gris.getdata()) // 40]  # tono del logo
    # 0 = fondo, 255 = logo; el ruido del JPEG cerca del fondo se descarta.
    mascara = gris.point(lambda v: 0 if v >= fondo - 12 else min(255, round(255 * (fondo - v) / (fondo - tinta))))
    caja = mascara.point(lambda v: 255 if v > 60 else 0).getbbox()
    # Color: promedio de los píxeles plenamente del logo.
    llenos = [p for p, a in zip(rgb.getdata(), mascara.getdata()) if a >= 250]
    color = tuple(round(sum(c[i] for c in llenos) / len(llenos)) for i in range(3))
    return mascara.crop(caja), color


def nitida(mascara, ancho, alto):
    """Amplía la máscara a (ancho, alto) con bordes limpios."""
    grande = mascara.resize((ancho, alto), Image.BICUBIC).filter(ImageFilter.GaussianBlur(ancho / 280))
    # Curva de contraste alrededor de la mitad: borde definido, sin escalones.
    return grande.point(lambda v: 0 if v < 100 else 255 if v > 156 else round((v - 100) * 255 / 56))


def componer(mascara, color, tam, ocupa, fondo):
    """Logo centrado ocupando `ocupa` del lado (0..1), sobre `fondo` (o transparente)."""
    g = tam * ESCALA
    w, h = mascara.size
    f = ocupa * g / max(w, h)
    lw, lh = round(w * f), round(h * f)
    m = nitida(mascara, lw, lh)
    lienzo = Image.new("RGBA", (g, g), fondo if fondo else color + (0,))
    tinta = Image.new("RGBA", (lw, lh), color + (255,))
    lienzo.paste(tinta, ((g - lw) // 2, (g - lh) // 2), m)
    return lienzo.resize((tam, tam), Image.LANCZOS)


def main():
    mascara, color = silueta()
    print(f"Logo: {ORIGEN.name} {Image.open(ORIGEN).size}, silueta {mascara.size}, color #{'%02x%02x%02x' % color}")
    SALIDA.mkdir(parents=True, exist_ok=True)
    # Ícono normal: fondo blanco y margen pequeño (el logo ocupa el 84 %).
    for tam in (192, 512):
        componer(mascara, color, tam, 0.84, BLANCO).convert("RGB").save(SALIDA / f"icon-{tam}.png", optimize=True)
        # Maskable: fondo blanco a sangre y el logo dentro de la zona segura (60 %).
        componer(mascara, color, tam, 0.60, BLANCO).convert("RGB").save(SALIDA / f"icon-maskable-{tam}.png", optimize=True)
    componer(mascara, color, 180, 0.84, BLANCO).convert("RGB").save(SALIDA / "apple-touch-icon.png", optimize=True)
    # Badge: silueta BLANCA sobre transparente (Android usa solo la transparencia).
    componer(mascara, (255, 255, 255), 96, 0.92, None).save(SALIDA / "badge-96.png", optimize=True)
    # Favicon (pestaña del navegador): fondo transparente, casi sin margen.
    for tam in (32, 48):
        componer(mascara, color, tam, 0.96, None).save(SALIDA / f"favicon-{tam}.png", optimize=True)
    print("Íconos generados en", SALIDA)


if __name__ == "__main__":
    main()

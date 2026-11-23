#!/usr/bin/env python3
"""Herdr Quest's pixel art: writes the overworld sprites as crisp SVGs.

Run from anywhere: python3 sprites.py  (writes next to this file).
Characters are ASCII art (16x16, one char per pixel, '.' transparent);
terrain and buildings are drawn by code. Every SVG uses crispEdges so a
16 px sprite drawn at 32 px stays sharp.
"""
import os

OUT = os.path.dirname(os.path.abspath(__file__))

PAL = {
    "k": "#10132e",  # outline
    "G": "#5f8a62", "g": "#4f7553", "l": "#729c74",  # grass (muted, so agents stand out)
    "T": "#3d5e42", "t": "#587d5b", "b": "#6b4a2e",  # tree (muted to sit with the grass)
    "W": "#2f6fd6", "w": "#8cc0ff", "v": "#2458b0",  # water
    "P": "#d9b77a", "p": "#c49a5a", "q": "#e8cc96",  # path
    "R": "#c8423a", "r": "#8f2a25", "H": "#f0e0b8", "h": "#c8b48a",
    "D": "#6b3d1c", "d": "#4a2a12", "Y": "#ffe58a",  # house
    "S": "#f5c89a", "A": "#6b3d1c", "C": "#2f5fd0", "c": "#1f3f9a",
    "B": "#5a3a1c", "O": "#ffd34e", "E": "#f4f4ff",  # people
    "X": "#9aa0b8", "x": "#6a7088",  # stone
    "N": "#b07a3a", "n": "#7a4a24",  # wood
    "F": "#ff7ab0", "f": "#ffe58a", "u": "#ffffff",  # flowers
    "L": "#b8875a", "m": "#94653d", "e": "#caa070",  # floor planks
    "V": "#5a3418", "Z": "#6e4220", "z": "#82522a",  # timber wall
}

ROBES = {
    "blue": ("#5a6ee8", "#3a48b0"),
    "red": ("#d84a4a", "#9a2a2a"),
    "green": ("#3fb860", "#2a7a40"),
    "purple": ("#a05ad8", "#6a3a9a"),
    "orange": ("#e8923a", "#a8601f"),
    "teal": ("#2ab0b8", "#1a7a80"),
}


def svg(grid, pal, size=16):
    """grid: list of strings. Merges horizontal runs into rects."""
    rects = []
    for y, row in enumerate(grid):
        assert len(row) == size, f"row {y} is {len(row)} wide: {row!r}"
        x = 0
        while x < size:
            ch = row[x]
            if ch == ".":
                x += 1
                continue
            run = 1
            while x + run < size and row[x + run] == ch:
                run += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{run}" height="1" fill="{pal[ch]}"/>')
            x += run
    assert len(grid) == size, f"{len(grid)} rows"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}" '
        f'shape-rendering="crispEdges">' + "".join(rects) + "</svg>\n"
    )


def write(name, grid, pal=PAL, size=16):
    with open(os.path.join(OUT, f"{name}.svg"), "w") as f:
        f.write(svg(grid, pal, size))


def mirror(grid):
    return [row[::-1] for row in grid]


def noise(x, y, seed):
    h = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return (h ^ (h >> 16)) % 100


# ---- hero

HERO_TOP_DOWN = [
    "................",
    ".....kkkkkk.....",
    "....kAAAAAAk....",
    "...kAAAAAAAAk...",
    "...kAASSSSAAk...",
    "...kASkSSkSAk...",
    "...kSSSSSSSSk...",
    "....kSSSSSSk....",
    "...kkCCCCCCkk...",
    "..kSkCCCCCCkSk..",
    "..kSkCCOOCCkSk..",
    "..kkkcOOOOckkk..",
    "....kCCCCCCk....",
]
HERO_TOP_UP = HERO_TOP_DOWN[:4] + [
    "...kAAAAAAAAk...",
    "...kAAAAAAAAk...",
    "...kAAAAAAAAk...",
    "....kAAAAAAk....",
    "...kkCCCCCCkk...",
    "..kSkCCCCCCkSk..",
    "..kSkCCCCCCkSk..",
    "..kkkcCCCCckkk..",
    "....kCCCCCCk....",
]
LEGS_A = [
    "....kcckkcck....",
    "....kBBk.kBBk...",
    "....kkk...kkk...",
]
# A walk cycle: stand, right leg lifted, stand, left leg lifted.
LEGS_B = [
    "....kcckkBBk....",
    "....kBBk.kkk....",
    "....kkk.........",
]
LEGS_C = [
    "....kBBkkcck....",
    "....kkk.kBBk....",
    ".........kkk....",
]
HERO_RIGHT_TOP = [
    "................",
    "......kkkkk.....",
    ".....kAAAAAk....",
    "....kAAAAAAAk...",
    "....kAAASSSSk...",
    "....kAASSSkSk...",
    "....kAASSSSSk...",
    ".....kSSSSSk....",
    "....kkCCCCCkk...",
    "....kCCCCSSk....",
    "....kCCCCSSk....",
    "....kcOOOOck....",
    "....kCCCCCCk....",
]
RIGHT_LEGS_A = [
    "....kcckcck.....",
    "....kBBkBBk.....",
    "....kkkkkkk.....",
]
RIGHT_LEGS_B = [
    "....kcck.kck....",
    "...kBBk..kBk....",
    "...kkk...kk.....",
]
RIGHT_LEGS_C = [
    "....kck.kcck....",
    "...kBk..kBBk....",
    "...kk...kkk.....",
]

# ---- NPC: a robed hero of the party (robe M/m)

NPC = [
    "......kkk.......",
    ".....kMMMk......",
    "....kMMMMMk.....",
    "...kMMMMMMMk....",
    "..kkkkkkkkkkk...",
    "...kSSSSSSSk....",
    "...kSkSSSkSk....",
    "...kSSSSSSSk....",
    "...kEESSSEEk....",
    "..kMkEEEEEkMk...",
    ".kMMkMEEEMkMMk..",
    ".kSkMMMMMMMkSk..",
    "..kkMMMOMMMkk...",
    "...kMMMMMMMk....",
    "...kmmmmmmmk....",
    "...kkkkkkkkk....",
]

TREE = [
    "......kkkk......",
    "....kkTTTTkk....",
    "...kTTtTTTTTk...",
    "..kTTtttTTTTTk..",
    ".kTTtttTTTTtTTk.",
    ".kTTTtTTTTtttTk.",
    ".kTTTTTTTTTttTk.",
    ".kTTtTTTTTTTTTk.",
    "..kTTTTTtTTTTk..",
    "...kkTTTTTTkk...",
    ".....kkbbkk.....",
    "......kbbk......",
    "......kbbk......",
    ".....kbbbbk.....",
    "....gkkkkkkg....",
    "................",
]

SIGN = [
    "................",
    "................",
    "..kkkkkkkkkkkk..",
    "..kNNNNNNNNNNk..",
    "..kNnnnNNnnnNk..",
    "..kNNNNNNNNNNk..",
    "..kNnnNNnnnnNk..",
    "..kNNNNNNNNNNk..",
    "..kkkkkkkkkkkk..",
    "......knnk......",
    "......knnk......",
    "......knnk......",
    "......knnk......",
    ".....gkkkkg.....",
    "................",
    "................",
]

WELL = [
    "..kkkkkkkkkkkk..",
    ".kRRRRRRRRRRRRk.",
    "kRRrRRRRRRRrRRRk"[:16],
    ".kkkkkkkkkkkkkk.",
    "...kn......nk...",
    "...kn......nk...",
    "...kn..kk..nk...",
    "...kn..kk..nk...",
    "..kkkkkkkkkkkk..",
    ".kXXxXXXXxXXXXk.",
    ".kXWWWwWWWWwWXk.",
    ".kXWwWWWWwWWWXk.",
    ".kxXXXxXXXXxXxk.",
    ".kXXXXXXxXXXXXk.",
    "..kkkkkkkkkkkk..",
    "...gggggggggg...",
]

CHEST = [
    "................",
    "................",
    "................",
    "..kkkkkkkkkkkk..",
    ".kNNNNNNNNNNNNk.",
    ".kNnnnnnnnnnnNk.",
    ".kNNNNNNNNNNNNk.",
    ".kOkkkkkkkkkkOk.",
    ".kNNNNNkkNNNNNk.",
    ".kNNNNkOOkNNNNk.",
    ".kNNNNkOOkNNNNk.",
    ".kNNNNNkkNNNNNk.",
    ".kOnnnnnnnnnnOk.",
    ".kkkkkkkkkkkkkk.",
    "..gggggggggggg..",
    "................",
]

BOARD = [
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kNNNNNNNNNNNNk.",
    ".kNuuuuNNuuuuNk.",
    ".kNukkuNNuFFuNk.",
    ".kNuuuuNNuuuuNk.",
    ".kNukkuNNNNNNNk.",
    ".kNuuuuNNuuuuNk.",
    ".kNNNNNNNuFFuNk.",
    ".kNNNNNNNuuuuNk.",
    ".kkkkkkkkkkkkkk.",
    "...kn......nk...",
    "...kn......nk...",
    "...kn......nk...",
    "..gkkg....gkkg..",
    "................",
]

LECTERN = [
    "................",
    "................",
    "................",
    "................",
    "...kkkkkkkkkk...",
    "..kuuuuukuuuuuk.",
    "..kuCCCukuCCCuk.",
    "..kuuuuukuuuuuk.",
    "..kuCCuukuCCCuk.",
    "...kkkkkkkkkkk..",
    "......kNNk......",
    "......kNNk......",
    "......kNNk......",
    ".....kNNNNk.....",
    "....kkkkkkkk....",
    "....gggggggg....",
]

FIRE_BASE = [
    "...nbbnbbnbbn...",
    "..nbbnbbnbbnbbn.",
    "..XxXXxXXxXXxX..",
    "...gggggggggg...",
    "................",
]
FIRE_0 = ["................"] * 4 + [
    "........f.......",
    ".......fO.......",
    "......fOO.f.....",
    ".....fOORfO.....",
    ".....OORRRO.....",
    "....fORRRRRO....",
    "....ORRfRRRO....",
] + FIRE_BASE
FIRE_1 = ["................"] * 4 + [
    "......f.........",
    "......Of.f......",
    ".....OOf.fO.....",
    ".....OROOfO.....",
    "....fORRROO.....",
    "....ORRRRRRf....",
    "....ORRRfRRO....",
] + FIRE_BASE


def fill(fn):
    return ["".join(fn(x, y) for x in range(16)) for y in range(16)]


def grass(seed):
    def px(x, y):
        n = noise(x, y, seed)
        return "g" if n < 9 else "l" if n < 14 else "G"
    return fill(px)


def flowers(seed):
    g = [list(r) for r in grass(seed)]
    spots = [(3, 4), (11, 3), (6, 11), (12, 12)]
    for i, (x, y) in enumerate(spots):
        c = "F" if (i + seed) % 2 else "u"
        g[y][x] = "f"
        g[y - 1][x] = c
        g[y + 1][x] = c
        g[y][x - 1] = c
        g[y][x + 1] = c
    return ["".join(r) for r in g]


def water(phase):
    def px(x, y):
        if (y + phase) % 8 == 2 and (x + y // 8 * 4 + phase * 3) % 8 < 4:
            return "w"
        if (y + phase) % 8 == 3 and (x + y // 8 * 4 + phase * 3) % 8 in (1, 2):
            return "v"
        return "W"
    return fill(px)


def path():
    def px(x, y):
        n = noise(x, y, 7)
        return "p" if n < 12 else "q" if n < 18 else "P"
    return fill(px)


def floor():
    """Wood planks, 4 px high, seams staggered."""
    def px(x, y):
        if y % 4 == 3:
            return "m"
        if x == ((y // 4) * 5 + 3) % 16:
            return "m"
        return "e" if y % 4 == 0 and noise(x, y, 9) < 30 else "L"
    return fill(px)


def wall():
    """Timber: vertical boards with a dark cap and a skirting line."""
    def px(x, y):
        if y < 2:
            return "k" if y == 0 else "V"
        if y >= 14:
            return "V" if y == 14 else "k"
        if x % 4 == 3:
            return "V"
        return "z" if x % 4 == 0 else "Z"
    return fill(px)


def mat():
    """The doormat: a red rug with a gold border, on planks."""
    g = [list(r) for r in floor()]
    for y in range(3, 13):
        for x in range(2, 14):
            edge = y in (3, 12) or x in (2, 13)
            g[y][x] = "O" if edge else ("r" if (x + y) % 4 == 0 else "R")
    return ["".join(r) for r in g]


def house():
    """32x32: roof, walls, a door and a lit window."""
    g = [["." for _ in range(32)] for _ in range(32)]

    def put(x, y, c):
        if 0 <= x < 32 and 0 <= y < 32:
            g[y][x] = c

    # chimney
    for y in range(1, 7):
        for x in range(22, 26):
            put(x, y, "k" if x in (22, 25) or y == 1 else "x")
    # roof: rows 3..14, widening
    for y in range(3, 15):
        inset = max(0, 12 - y)
        for x in range(inset, 32 - inset):
            edge = x in (inset, 31 - inset) or y == 3 or y == 14
            put(x, y, "k" if edge else ("r" if (y + x // 4) % 3 == 0 else "R"))
    # walls
    for y in range(15, 31):
        for x in range(2, 30):
            edge = x in (2, 29) or y == 30
            put(x, y, "k" if edge else ("h" if y == 15 or y == 16 else "H"))
    # door
    for y in range(20, 30):
        for x in range(6, 13):
            edge = x in (6, 12) or y == 20
            put(x, y, "k" if edge else ("d" if x == 9 else "D"))
    put(11, 25, "O")
    # window
    for y in range(19, 25):
        for x in range(18, 26):
            edge = x in (18, 25) or y in (19, 24)
            put(x, y, "k" if edge or x == 21 or y == 21 else "Y")
    # shadow
    for x in range(3, 30):
        put(x, 31, "g")
    return ["".join(r) for r in g]


def main():
    write("hero-down-0", HERO_TOP_DOWN + LEGS_A)
    write("hero-down-1", HERO_TOP_DOWN + LEGS_B)
    write("hero-up-0", HERO_TOP_UP + LEGS_A)
    write("hero-up-1", HERO_TOP_UP + LEGS_B)
    write("hero-right-0", HERO_RIGHT_TOP + RIGHT_LEGS_A)
    write("hero-right-1", HERO_RIGHT_TOP + RIGHT_LEGS_B)
    write("hero-left-0", mirror(HERO_RIGHT_TOP + RIGHT_LEGS_A))
    write("hero-left-1", mirror(HERO_RIGHT_TOP + RIGHT_LEGS_B))
    write("hero-down-2", HERO_TOP_DOWN + LEGS_C)
    write("hero-up-2", HERO_TOP_UP + LEGS_C)
    write("hero-right-2", HERO_RIGHT_TOP + RIGHT_LEGS_C)
    write("hero-left-2", mirror(HERO_RIGHT_TOP + RIGHT_LEGS_C))
    for name, (m, mm) in ROBES.items():
        write(f"npc-{name}", NPC, {**PAL, "M": m, "m": mm})
    write("tree", TREE)
    write("sign", SIGN)
    write("well", WELL)
    write("grass-0", grass(1))
    write("grass-1", grass(2))
    write("flowers-0", flowers(3))
    write("flowers-1", flowers(4))
    write("water-0", water(0))
    write("water-1", water(4))
    write("path", path())
    write("house", house(), size=32)
    write("chest", CHEST)
    write("floor", floor())
    write("wall", wall())
    write("mat", mat())
    write("board", BOARD)
    write("lectern", LECTERN)
    write("fire-0", FIRE_0)
    write("fire-1", FIRE_1)


if __name__ == "__main__":
    main()

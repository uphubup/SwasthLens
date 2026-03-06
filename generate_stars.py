import random

random.seed(42)
WIDTH, HEIGHT = 1440, 900

config = {
    "far": ([0.8] * 30 + [1.2] * 7 + [1.8] * 3),
    "mid": ([0.8] * 12 + [1.2] * 20 + [1.8] * 8),
    "near": ([1.2] * 20 + [1.8] * 20),
}

for layer, radii in config.items():
    print(f"<!-- {layer} stars -->")
    for radius in radii:
        cx = round(random.uniform(0, WIDTH), 1)
        cy = round(random.uniform(0, HEIGHT), 1)
        base_opacity = round(random.uniform(0.3, 1.0), 2)
        duration = round(random.uniform(2.0, 4.0), 2)
        delay = round(random.uniform(0.0, 5.0), 2)
        fill = "#E8F4FF" if random.random() > 0.4 else "#FFFFFF"
        print(
            f'<circle class="star" cx="{cx}" cy="{cy}" r="{radius}" fill="{fill}" '
            f'style="--star-base-opacity:{base_opacity}; --twinkle-duration:{duration}s; '
            f'animation-delay:{delay}s"></circle>'
        )
    print()

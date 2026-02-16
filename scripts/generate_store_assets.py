#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "marketing" / "store-assets" / "raw"
OUT_ROOT = ROOT / "marketing" / "store-assets" / "generated"
LOGO_DIR = OUT_ROOT / "logo"
APP_ASSETS_DIR = ROOT / "assets" / "images"
IOS_APP_ICON_PATH = ROOT / "ios" / "AgentTown" / "Images.xcassets" / "AppIcon.appiconset" / "App-Icon-1024x1024@1x.png"
IOS_SPLASH_LEGACY_DIR = ROOT / "ios" / "AgentTown" / "Images.xcassets" / "SplashScreenLegacy.imageset"
ANDROID_RES_DIR = ROOT / "android" / "app" / "src" / "main" / "res"
IOS_SCREENSHOT_DIR_EN = ROOT / "fastlane" / "screenshots" / "en-US"
IOS_SCREENSHOT_DIR_ZH = ROOT / "fastlane" / "screenshots" / "zh-Hans"
ANDROID_IMAGES_DIR = ROOT / "fastlane" / "metadata" / "android" / "images"
ANDROID_EN_SCREENSHOT_DIR = (
    ROOT / "fastlane" / "metadata" / "android" / "en-US" / "images" / "phoneScreenshots"
)
ANDROID_ZH_SCREENSHOT_DIR = (
    ROOT / "fastlane" / "metadata" / "android" / "zh-CN" / "images" / "phoneScreenshots"
)


def ensure_dirs(paths: Iterable[Path]) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def find_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def gradient(size: Tuple[int, int], top: Tuple[int, int, int], bottom: Tuple[int, int, int]) -> Image.Image:
    width, height = size
    canvas = Image.new("RGB", size, top)
    draw = ImageDraw.Draw(canvas)
    for y in range(height):
        t = y / max(1, height - 1)
        color = tuple(int(top[idx] * (1 - t) + bottom[idx] * t) for idx in range(3))
        draw.line((0, y, width, y), fill=color)
    return canvas


def rounded_mask(size: Tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def add_blurred_ellipse(
    canvas: Image.Image,
    bbox: Tuple[int, int, int, int],
    color: Tuple[int, int, int, int],
    blur: int,
) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(bbox, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(radius=blur))
    canvas.alpha_composite(layer)


def draw_world_chat_symbol(
    canvas: Image.Image,
    center_x: int,
    center_y: int,
    icon_size: int,
    dark_bg: bool,
) -> None:
    draw = ImageDraw.Draw(canvas)
    line_color = (246, 252, 255, 248) if dark_bg else (22, 40, 77, 236)
    stroke = max(6, icon_size // 52)

    globe_r = int(icon_size * 0.39)
    globe_cy = center_y - int(icon_size * 0.20)
    globe_left = center_x - globe_r
    globe_top = globe_cy - globe_r
    globe_size = globe_r * 2

    add_blurred_ellipse(
        canvas,
        (
            globe_left - int(globe_r * 0.35),
            globe_top - int(globe_r * 0.30),
            globe_left + globe_size + int(globe_r * 0.35),
            globe_top + globe_size + int(globe_r * 0.45),
        ),
        (34, 197, 94, 130) if dark_bg else (16, 185, 129, 90),
        blur=max(16, icon_size // 12),
    )

    globe_top_color = (88, 246, 178) if dark_bg else (47, 219, 152)
    globe_bottom_color = (25, 190, 123) if dark_bg else (20, 161, 109)
    globe = gradient((globe_size, globe_size), globe_top_color, globe_bottom_color).convert("RGBA")
    globe_mask = Image.new("L", (globe_size, globe_size), 0)
    ImageDraw.Draw(globe_mask).ellipse((0, 0, globe_size - 1, globe_size - 1), fill=255)
    globe.putalpha(globe_mask)

    gloss = Image.new("RGBA", (globe_size, globe_size), (0, 0, 0, 0))
    gloss_draw = ImageDraw.Draw(gloss)
    gloss_draw.ellipse(
        (
            int(globe_size * 0.12),
            int(globe_size * 0.04),
            int(globe_size * 0.56),
            int(globe_size * 0.46),
        ),
        fill=(255, 255, 255, 62 if dark_bg else 46),
    )
    gloss = gloss.filter(ImageFilter.GaussianBlur(radius=max(6, icon_size // 58)))
    globe = Image.alpha_composite(globe, gloss)
    canvas.alpha_composite(globe, (globe_left, globe_top))

    draw.ellipse(
        (
            center_x - int(globe_r * 0.57),
            globe_cy - globe_r + int(globe_r * 0.02),
            center_x + int(globe_r * 0.57),
            globe_cy + globe_r - int(globe_r * 0.02),
        ),
        outline=line_color,
        width=stroke,
    )
    draw.ellipse(
        (
            center_x - globe_r + int(globe_r * 0.02),
            globe_cy - int(globe_r * 0.34),
            center_x + globe_r - int(globe_r * 0.02),
            globe_cy + int(globe_r * 0.34),
        ),
        outline=line_color,
        width=stroke,
    )
    draw.line(
        (
            center_x - int(globe_r * 0.90),
            globe_cy,
            center_x + int(globe_r * 0.90),
            globe_cy,
        ),
        fill=line_color,
        width=stroke,
    )

    dot_r = max(6, icon_size // 36)
    dot_x = center_x + int(globe_r * 0.76)
    dot_y = globe_cy + int(globe_r * 0.70)
    add_blurred_ellipse(
        canvas,
        (dot_x - dot_r * 3, dot_y - dot_r * 3, dot_x + dot_r * 3, dot_y + dot_r * 3),
        (32, 221, 136, 128 if dark_bg else 90),
        blur=max(6, icon_size // 84),
    )
    draw.ellipse(
        (dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r),
        fill=(34, 197, 94, 255),
        outline=(255, 255, 255, 248),
        width=max(2, stroke // 3),
    )

    bubble_w = int(icon_size * 0.86)
    bubble_h = int(icon_size * 0.30)
    bubble_tail_h = int(icon_size * 0.11)
    bubble_x = center_x - bubble_w // 2
    bubble_y = center_y + int(icon_size * 0.26)
    bubble_radius = int(bubble_h * 0.48)

    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    shadow_offset = max(6, icon_size // 96)
    shadow_draw.rounded_rectangle(
        (
            bubble_x + shadow_offset,
            bubble_y + shadow_offset + 1,
            bubble_x + bubble_w + shadow_offset,
            bubble_y + bubble_h + shadow_offset + 1,
        ),
        radius=bubble_radius,
        fill=(8, 22, 44, 120 if dark_bg else 72),
    )
    shadow_draw.polygon(
        [
            (bubble_x + int(bubble_w * 0.44) + shadow_offset, bubble_y + bubble_h + shadow_offset + 1),
            (bubble_x + int(bubble_w * 0.56) + shadow_offset, bubble_y + bubble_h + shadow_offset + 1),
            (
                bubble_x + int(bubble_w * 0.50) + shadow_offset,
                bubble_y + bubble_h + bubble_tail_h - int(icon_size * 0.01) + 1,
            ),
        ],
        fill=(8, 22, 44, 120 if dark_bg else 72),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=max(8, icon_size // 64)))
    canvas.alpha_composite(shadow_layer)

    bubble = Image.new("RGBA", (bubble_w, bubble_h + bubble_tail_h), (0, 0, 0, 0))
    bubble_draw = ImageDraw.Draw(bubble)
    top_color = (250, 252, 255) if dark_bg else (247, 250, 255)
    bottom_color = (226, 234, 246) if dark_bg else (222, 233, 246)
    for y in range(bubble_h):
        t = y / max(1, bubble_h - 1)
        bubble_line = tuple(int(top_color[i] * (1 - t) + bottom_color[i] * t) for i in range(3)) + (255,)
        bubble_draw.line((0, y, bubble_w, y), fill=bubble_line)
    bubble_draw.polygon(
        [
            (int(bubble_w * 0.44), bubble_h),
            (int(bubble_w * 0.56), bubble_h),
            (int(bubble_w * 0.50), bubble_h + bubble_tail_h - int(icon_size * 0.01)),
        ],
        fill=bottom_color + (255,),
    )

    bubble_mask = Image.new("L", (bubble_w, bubble_h + bubble_tail_h), 0)
    mask_draw = ImageDraw.Draw(bubble_mask)
    mask_draw.rounded_rectangle((0, 0, bubble_w, bubble_h), radius=bubble_radius, fill=255)
    mask_draw.polygon(
        [
            (int(bubble_w * 0.44), bubble_h),
            (int(bubble_w * 0.56), bubble_h),
            (int(bubble_w * 0.50), bubble_h + bubble_tail_h - int(icon_size * 0.01)),
        ],
        fill=255,
    )
    bubble.putalpha(bubble_mask)

    gloss_overlay = Image.new("RGBA", bubble.size, (0, 0, 0, 0))
    gloss_draw = ImageDraw.Draw(gloss_overlay)
    gloss_draw.rounded_rectangle(
        (int(bubble_w * 0.08), int(bubble_h * 0.20), int(bubble_w * 0.92), int(bubble_h * 0.34)),
        radius=max(6, bubble_h // 16),
        fill=(204, 215, 232, 145 if dark_bg else 118),
    )
    gloss_overlay = gloss_overlay.filter(ImageFilter.GaussianBlur(radius=max(4, icon_size // 140)))
    bubble = Image.alpha_composite(bubble, gloss_overlay)
    canvas.alpha_composite(bubble, (bubble_x, bubble_y))


def draw_brand_mark(size: int = 1024, dark_bg: bool = True, mode: str = "card") -> Image.Image:
    if dark_bg:
        bg_start, bg_end = (2, 10, 36), (8, 23, 66)
        border_color = (74, 103, 171, 196)
    else:
        bg_start, bg_end = (240, 247, 255), (228, 239, 252)
        border_color = (170, 194, 225, 196)

    base = gradient((size, size), bg_start, bg_end).convert("RGBA")

    add_blurred_ellipse(
        base,
        (int(size * 0.15), int(size * -0.18), int(size * 0.92), int(size * 0.52)),
        (43, 223, 149, 95) if dark_bg else (52, 211, 153, 56),
        blur=max(36, size // 8),
    )
    add_blurred_ellipse(
        base,
        (int(size * -0.24), int(size * 0.46), int(size * 0.44), int(size * 1.14)),
        (75, 158, 255, 70) if dark_bg else (96, 165, 250, 52),
        blur=max(40, size // 8),
    )
    if dark_bg:
        add_blurred_ellipse(
            base,
            (int(size * 0.36), int(size * 0.60), int(size * 1.08), int(size * 1.24)),
            (203, 35, 128, 72),
            blur=max(48, size // 8),
        )

    center = size // 2
    symbol_size = int(size * (0.58 if mode == "card" else 0.64))

    if mode == "card":
        draw = ImageDraw.Draw(base)
        pad = int(size * 0.07)
        radius = int(size * 0.23)
        card_color = (7, 23, 64, 238) if dark_bg else (248, 252, 255, 248)
        draw.rounded_rectangle(
            (pad, pad, size - pad, size - pad),
            radius=radius,
            fill=card_color,
            outline=border_color,
            width=max(2, size // 280),
        )
        draw.rounded_rectangle(
            (pad + 3, pad + 3, size - pad - 3, size - pad - 3),
            radius=max(6, radius - 3),
            outline=(180, 220, 255, 38) if dark_bg else (153, 176, 206, 62),
            width=max(1, size // 512),
        )
        symbol_size = int(size * 0.56)

    draw_world_chat_symbol(base, center, center, symbol_size, dark_bg=dark_bg)

    return base


def generate_runtime_icons() -> None:
    ensure_dirs([APP_ASSETS_DIR, IOS_SPLASH_LEGACY_DIR, ANDROID_IMAGES_DIR])
    icon_1024 = draw_brand_mark(size=1024, dark_bg=True, mode="plain").convert("RGB")
    icon_1024.save(APP_ASSETS_DIR / "icon.png", quality=95)
    icon_1024.save(APP_ASSETS_DIR / "adaptive-icon.png", quality=95)
    icon_1024.save(APP_ASSETS_DIR / "splash-icon.png", quality=95)
    icon_1024.resize((48, 48), Image.Resampling.LANCZOS).save(APP_ASSETS_DIR / "favicon.png")
    icon_1024.save(IOS_APP_ICON_PATH, quality=95)
    for splash_name in ("image.png", "image@2x.png", "image@3x.png"):
        icon_1024.save(IOS_SPLASH_LEGACY_DIR / splash_name, quality=95)

    launcher_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    foreground_sizes = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    splash_sizes = {"mdpi": 288, "hdpi": 432, "xhdpi": 576, "xxhdpi": 864, "xxxhdpi": 1152}

    for density, px in launcher_sizes.items():
        mipmap_dir = ANDROID_RES_DIR / f"mipmap-{density}"
        ensure_dirs([mipmap_dir])
        resized = icon_1024.resize((px, px), Image.Resampling.LANCZOS)
        resized.save(mipmap_dir / "ic_launcher.webp", format="WEBP", quality=95, method=6)
        resized.save(mipmap_dir / "ic_launcher_round.webp", format="WEBP", quality=95, method=6)

    for density, px in foreground_sizes.items():
        mipmap_dir = ANDROID_RES_DIR / f"mipmap-{density}"
        ensure_dirs([mipmap_dir])
        icon_1024.resize((px, px), Image.Resampling.LANCZOS).save(
            mipmap_dir / "ic_launcher_foreground.webp",
            format="WEBP",
            quality=95,
            method=6,
        )

    for density, px in splash_sizes.items():
        drawable_dir = ANDROID_RES_DIR / f"drawable-{density}"
        ensure_dirs([drawable_dir])
        icon_1024.resize((px, px), Image.Resampling.LANCZOS).save(
            drawable_dir / "splashscreen_logo.png",
            quality=95,
        )


def draw_logo_variants() -> None:
    ensure_dirs([LOGO_DIR])

    mark_dark = draw_brand_mark(size=1024, dark_bg=True, mode="card")
    mark_light = draw_brand_mark(size=1024, dark_bg=False, mode="card")
    mark_dark.save(LOGO_DIR / "agenttown-logo-mark-dark-1024.png")
    mark_light.save(LOGO_DIR / "agenttown-logo-mark-light-1024.png")

    for theme_name, is_dark in [("dark", True), ("light", False)]:
        width, height = 2048, 640
        bg = gradient((width, height), (10, 16, 34), (17, 23, 42)) if is_dark else gradient((width, height), (247, 250, 255), (234, 242, 252))
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        o_draw = ImageDraw.Draw(overlay)
        o_draw.ellipse((width - 520, 110, width - 120, 510), fill=(34, 197, 94, 45))
        overlay = overlay.filter(ImageFilter.GaussianBlur(radius=44))
        bg = Image.alpha_composite(bg.convert("RGBA"), overlay)

        mark = draw_brand_mark(size=420, dark_bg=is_dark, mode="card")
        bg.alpha_composite(mark, (120, (height - 420) // 2))

        draw = ImageDraw.Draw(bg)
        title_font = find_font(126, bold=True)
        subtitle_font = find_font(42, bold=False)
        title_color = (242, 247, 255, 255) if is_dark else (11, 23, 41, 255)
        subtitle_color = (168, 184, 208, 255) if is_dark else (71, 85, 105, 255)
        accent = (34, 197, 94, 255)
        draw.text((600, 196), "AgentTown", font=title_font, fill=title_color)
        draw.text((600, 340), "Chat-driven Mini Apps for AI Teams", font=subtitle_font, fill=subtitle_color)
        draw.rounded_rectangle((600, 126, 835, 171), radius=22, fill=(34, 197, 94, 32))
        draw.text((630, 130), "AI WORLD", font=find_font(30, bold=True), fill=accent)
        bg.convert("RGB").save(LOGO_DIR / f"agenttown-logo-horizontal-{theme_name}-2048x640.png", quality=95)

    app_icon = draw_brand_mark(size=512, dark_bg=True, mode="plain").convert("RGB")
    app_icon.save(OUT_ROOT / "agenttown-play-icon-512.png", quality=95)


def crop_cover(image: Image.Image, target_size: Tuple[int, int]) -> Image.Image:
    target_w, target_h = target_size
    src_w, src_h = image.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h
    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        box = (left, 0, left + new_w, src_h)
    else:
        new_h = int(src_w / target_ratio)
        top = (src_h - new_h) // 2
        box = (0, top, src_w, top + new_h)
    cropped = image.crop(box)
    return cropped.resize(target_size, Image.Resampling.LANCZOS)


def add_phone_mockup(
    canvas: Image.Image,
    screenshot: Image.Image,
    x: int,
    y: int,
    width: int,
    radius: int = 66,
) -> None:
    shot_ratio = screenshot.height / screenshot.width
    height = int(width * shot_ratio)
    shot = screenshot.resize((width, height), Image.Resampling.LANCZOS).convert("RGBA")
    mask = rounded_mask((width, height), radius)
    framed = Image.new("RGBA", (width + 20, height + 20), (255, 255, 255, 0))
    f_draw = ImageDraw.Draw(framed)
    f_draw.rounded_rectangle(
        (0, 0, width + 19, height + 19),
        radius=radius + 10,
        fill=(245, 248, 255, 255),
        outline=(220, 229, 245, 255),
        width=2,
    )
    shadow = Image.new("RGBA", (width + 40, height + 40), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle((0, 0, width + 39, height + 39), radius=radius + 12, fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=20))
    canvas.alpha_composite(shadow, (x - 10, y + 12))
    framed.paste(shot, (10, 10), mask)
    canvas.alpha_composite(framed, (x, y))


def create_store_poster(
    output_path: Path,
    size: Tuple[int, int],
    title: str,
    subtitle: str,
    badge: str,
    screenshot: Image.Image,
    dark: bool = True,
) -> None:
    width, height = size
    if dark:
        bg = gradient(size, (7, 9, 34), (22, 24, 48))
    else:
        bg = gradient(size, (240, 247, 255), (228, 244, 232))
    canvas = bg.convert("RGBA")

    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    g_draw.ellipse((width - 640, height - 980, width + 80, height - 220), fill=(34, 197, 94, 82))
    g_draw.ellipse((-320, -140, 380, 560), fill=(59, 130, 246, 75))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=70))
    canvas = Image.alpha_composite(canvas, glow)

    title_color = (247, 250, 255, 255) if dark else (15, 23, 42, 255)
    sub_color = (190, 204, 224, 255) if dark else (71, 85, 105, 255)
    badge_bg = (34, 197, 94, 255)
    badge_text = (12, 22, 28, 255)

    draw = ImageDraw.Draw(canvas)
    badge_font = find_font(40, bold=True)
    title_font = find_font(112, bold=True)
    sub_font = find_font(54, bold=False)

    badge_x, badge_y = 92, 110
    badge_w = int(draw.textlength(badge, font=badge_font) + 72)
    draw.rounded_rectangle((badge_x, badge_y, badge_x + badge_w, badge_y + 70), radius=35, fill=badge_bg)
    draw.text((badge_x + 34, badge_y + 14), badge, font=badge_font, fill=badge_text)

    draw.text((92, 225), title, font=title_font, fill=title_color)
    draw.text((92, 360), subtitle, font=sub_font, fill=sub_color)

    shot_w = int(width * 0.72)
    shot_x = (width - shot_w) // 2
    shot_y = int(height * 0.44)
    add_phone_mockup(canvas, screenshot, shot_x, shot_y, shot_w, radius=88 if width > 1200 else 70)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output_path, quality=95)


def create_feature_graphic(output_path: Path, title: str, subtitle: str) -> None:
    size = (1024, 500)
    bg = gradient(size, (8, 13, 36), (23, 20, 47)).convert("RGBA")
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    o_draw = ImageDraw.Draw(overlay)
    o_draw.ellipse((560, -100, 1100, 470), fill=(34, 197, 94, 95))
    o_draw.ellipse((420, 240, 920, 700), fill=(220, 38, 127, 85))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=56))
    bg = Image.alpha_composite(bg, overlay)

    logo_mark = draw_brand_mark(size=200, dark_bg=True)
    bg.alpha_composite(logo_mark, (70, 145))
    draw = ImageDraw.Draw(bg)
    draw.text((300, 165), title, font=find_font(78, bold=True), fill=(245, 249, 255, 255))
    draw.text((300, 270), subtitle, font=find_font(34, bold=False), fill=(180, 196, 218, 255))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bg.convert("RGB").save(output_path, quality=95)


def resolve_raw_path(primary_name: str, fallback_name: str | None = None) -> Path:
    primary = RAW_DIR / primary_name
    if primary.exists():
        return primary
    if fallback_name:
        fallback = RAW_DIR / fallback_name
        if fallback.exists():
            return fallback
    raise FileNotFoundError(primary_name)


def file_sha1(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()


def render_all_screens() -> None:
    ensure_dirs(
        [
            OUT_ROOT,
            IOS_SCREENSHOT_DIR_EN,
            IOS_SCREENSHOT_DIR_ZH,
            ANDROID_IMAGES_DIR,
            ANDROID_EN_SCREENSHOT_DIR,
            ANDROID_ZH_SCREENSHOT_DIR,
        ]
    )

    world_path = resolve_raw_path("screen-world-map.png", "screen-home.png")
    mini_path = resolve_raw_path("screen-mini-apps.png", "screen-town-map.png")
    chat_path = resolve_raw_path("screen-team-chat.png")

    hashes = {
        "world": file_sha1(world_path),
        "mini": file_sha1(mini_path),
        "chat": file_sha1(chat_path),
    }
    if len(set(hashes.values())) < 3:
        raise SystemExit(
            "Raw screenshots are duplicated. Please provide 3 distinct files:\n"
            "- marketing/store-assets/raw/screen-world-map.png\n"
            "- marketing/store-assets/raw/screen-mini-apps.png\n"
            "- marketing/store-assets/raw/screen-team-chat.png\n"
            f"Current hashes: {hashes}"
        )

    world_shot = Image.open(world_path).convert("RGB")
    mini_shot = Image.open(mini_path).convert("RGB")
    chat_shot = Image.open(chat_path).convert("RGB")
    world_1290 = crop_cover(world_shot, (1170, 2532))
    mini_1290 = crop_cover(mini_shot, (1170, 2532))
    chat_1290 = crop_cover(chat_shot, (1170, 2532))

    en_shots = [
        ("01_world_map", "Agent World", "Explore your AI neighborhood", "AGENTTOWN", world_1290),
        ("02_mini_apps", "Mini App Builder", "Create and run apps from chat", "CREATE APP", mini_1290),
        ("03_team_chat", "Team Collaboration", "Chat, tasks, and bot execution in one place", "TEAM CHAT", chat_1290),
    ]
    zh_shots = [
        ("01_world_map", "世界地图", "在 AI 社区中探索你的 Bot 世界", "AGENTTOWN", world_1290),
        ("02_mini_apps", "Mini App 生成器", "在聊天中创建并运行应用", "创建应用", mini_1290),
        ("03_team_chat", "团队协作", "聊天、任务与 Bot 执行一体化", "团队聊天", chat_1290),
    ]

    ios_sizes = [(1290, 2796), (1242, 2688)]
    for key, title, subtitle, badge, shot in en_shots:
        for width, height in ios_sizes:
            out = IOS_SCREENSHOT_DIR_EN / f"{key}_{width}x{height}.png"
            create_store_poster(out, (width, height), title, subtitle, badge, shot, dark=True)
    for key, title, subtitle, badge, shot in zh_shots:
        for width, height in ios_sizes:
            out = IOS_SCREENSHOT_DIR_ZH / f"{key}_{width}x{height}.png"
            create_store_poster(out, (width, height), title, subtitle, badge, shot, dark=True)

    android_size = (1080, 1920)
    for idx, (_, title, subtitle, badge, shot) in enumerate(en_shots, start=1):
        create_store_poster(
            ANDROID_EN_SCREENSHOT_DIR / f"{idx}.png",
            android_size,
            title,
            subtitle,
            badge,
            shot,
            dark=True,
        )
    for idx, (_, title, subtitle, badge, shot) in enumerate(zh_shots, start=1):
        create_store_poster(
            ANDROID_ZH_SCREENSHOT_DIR / f"{idx}.png",
            android_size,
            title,
            subtitle,
            badge,
            shot,
            dark=True,
        )

    create_feature_graphic(
        ANDROID_IMAGES_DIR / "featureGraphic.png",
        "AgentTown",
        "Chat-driven AI Mini Apps",
    )
    draw_brand_mark(size=512, dark_bg=True, mode="plain").convert("RGB").save(
        ANDROID_IMAGES_DIR / "icon.png", quality=95
    )


def main() -> None:
    ensure_dirs([RAW_DIR])
    required_names = [
        "screen-world-map.png",
        "screen-mini-apps.png",
        "screen-team-chat.png",
    ]
    compatibility_missing = []
    try:
        resolve_raw_path("screen-world-map.png", "screen-home.png")
    except FileNotFoundError:
        compatibility_missing.append("screen-world-map.png (or screen-home.png)")
    try:
        resolve_raw_path("screen-mini-apps.png", "screen-town-map.png")
    except FileNotFoundError:
        compatibility_missing.append("screen-mini-apps.png (or screen-town-map.png)")
    try:
        resolve_raw_path("screen-team-chat.png")
    except FileNotFoundError:
        compatibility_missing.append("screen-team-chat.png")

    missing = compatibility_missing
    if missing:
        raise SystemExit(
            "Missing raw screenshots:\n"
            + "\n".join(missing)
            + "\nCapture examples:\n"
            + "xcrun simctl io booted screenshot marketing/store-assets/raw/screen-world-map.png\n"
            + "xcrun simctl io booted screenshot marketing/store-assets/raw/screen-mini-apps.png\n"
            + "xcrun simctl io booted screenshot marketing/store-assets/raw/screen-team-chat.png"
        )
    draw_logo_variants()
    render_all_screens()
    generate_runtime_icons()
    print("Store assets generated successfully.")
    print(f"- Logos: {LOGO_DIR}")
    print(f"- iOS screenshots: {IOS_SCREENSHOT_DIR_EN} and {IOS_SCREENSHOT_DIR_ZH}")
    print(
        "- Android assets: "
        f"{ANDROID_IMAGES_DIR}, {ANDROID_EN_SCREENSHOT_DIR}, {ANDROID_ZH_SCREENSHOT_DIR}"
    )


if __name__ == "__main__":
    main()

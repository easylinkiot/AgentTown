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


def draw_world_chat_symbol(
    canvas: Image.Image,
    center_x: int,
    center_y: int,
    icon_size: int,
    dark_bg: bool,
) -> None:
    draw = ImageDraw.Draw(canvas)
    accent = (34, 197, 94, 255)
    fg = (248, 250, 252, 248) if dark_bg else (15, 23, 42, 240)
    globe_line = (255, 255, 255, 235)
    stroke = max(3, icon_size // 32)

    globe_r = int(icon_size * 0.28)
    globe_cy = center_y - int(icon_size * 0.17)

    draw.ellipse(
        (
            center_x - globe_r,
            globe_cy - globe_r,
            center_x + globe_r,
            globe_cy + globe_r,
        ),
        fill=accent,
    )
    draw.ellipse(
        (
            center_x - int(globe_r * 0.56),
            globe_cy - globe_r,
            center_x + int(globe_r * 0.56),
            globe_cy + globe_r,
        ),
        outline=globe_line,
        width=stroke,
    )
    draw.ellipse(
        (
            center_x - globe_r,
            globe_cy - int(globe_r * 0.34),
            center_x + globe_r,
            globe_cy + int(globe_r * 0.34),
        ),
        outline=globe_line,
        width=stroke,
    )
    draw.line(
        (
            center_x - int(globe_r * 0.92),
            globe_cy,
            center_x + int(globe_r * 0.92),
            globe_cy,
        ),
        fill=globe_line,
        width=stroke,
    )

    bubble_w = int(icon_size * 0.76)
    bubble_h = int(icon_size * 0.24)
    bubble_x = center_x - bubble_w // 2
    bubble_y = center_y + int(icon_size * 0.18)
    bubble_radius = int(icon_size * 0.09)
    draw.rounded_rectangle(
        (bubble_x, bubble_y, bubble_x + bubble_w, bubble_y + bubble_h),
        radius=bubble_radius,
        fill=fg,
    )
    draw.polygon(
        [
            (bubble_x + int(bubble_w * 0.44), bubble_y + bubble_h),
            (bubble_x + int(bubble_w * 0.56), bubble_y + bubble_h),
            (bubble_x + int(bubble_w * 0.50), bubble_y + bubble_h + int(icon_size * 0.08)),
        ],
        fill=fg,
    )

    dot_r = max(4, icon_size // 24)
    dot_x = center_x + int(globe_r * 0.7)
    dot_y = globe_cy + int(globe_r * 0.7)
    draw.ellipse(
        (dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r),
        fill=accent,
        outline=(255, 255, 255, 250),
        width=max(1, stroke // 2),
    )


def draw_brand_mark(size: int = 1024, dark_bg: bool = True, mode: str = "card") -> Image.Image:
    if dark_bg:
        bg_start, bg_end = (9, 6, 22), (14, 24, 48)
        border_color = (49, 67, 106, 255)
    else:
        bg_start, bg_end = (246, 250, 255), (233, 241, 251)
        border_color = (198, 215, 239, 255)

    base = gradient((size, size), bg_start, bg_end).convert("RGBA")

    if mode == "card":
        draw = ImageDraw.Draw(base)
        pad = int(size * 0.06)
        radius = int(size * 0.22)
        card_color = (9, 21, 55, 245) if dark_bg else (250, 252, 255, 252)
        draw.rounded_rectangle(
            (pad, pad, size - pad, size - pad),
            radius=radius,
            fill=card_color,
            outline=border_color,
            width=max(3, size // 220),
        )
        center = size // 2
        glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        glow_r = int(size * 0.26)
        glow_draw.ellipse(
            (center - glow_r, center - glow_r - int(size * 0.1), center + glow_r, center + glow_r),
            fill=(34, 197, 94, 76),
        )
        glow = glow.filter(ImageFilter.GaussianBlur(radius=size // 18))
        base = Image.alpha_composite(base, glow)
        draw_world_chat_symbol(base, center, center, int(size * 0.56), dark_bg=True)
    else:
        center = size // 2
        glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        glow_r = int(size * 0.34)
        glow_draw.ellipse(
            (
                center - glow_r,
                center - glow_r - int(size * 0.08),
                center + glow_r,
                center + glow_r + int(size * 0.04),
            ),
            fill=(34, 197, 94, 62),
        )
        glow = glow.filter(ImageFilter.GaussianBlur(radius=size // 16))
        base = Image.alpha_composite(base, glow)
        draw_world_chat_symbol(base, center, center, int(size * 0.62), dark_bg=dark_bg)

    return base


def generate_runtime_icons() -> None:
    ensure_dirs([APP_ASSETS_DIR])
    icon_1024 = draw_brand_mark(size=1024, dark_bg=True, mode="plain").convert("RGB")
    icon_1024.save(APP_ASSETS_DIR / "icon.png", quality=95)
    icon_1024.save(APP_ASSETS_DIR / "adaptive-icon.png", quality=95)
    icon_1024.save(APP_ASSETS_DIR / "splash-icon.png", quality=95)
    icon_1024.resize((48, 48), Image.Resampling.LANCZOS).save(APP_ASSETS_DIR / "favicon.png")


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

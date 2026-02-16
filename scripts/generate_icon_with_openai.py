#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import urllib.request
import urllib.error
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CANDIDATE_DIR = ROOT / "marketing" / "store-assets" / "generated" / "logo" / "openai-icon-candidates"
APP_ASSETS_DIR = ROOT / "assets" / "images"
IOS_APP_ICON_PATH = ROOT / "ios" / "AgentTown" / "Images.xcassets" / "AppIcon.appiconset" / "App-Icon-1024x1024@1x.png"
IOS_SPLASH_LEGACY_DIR = ROOT / "ios" / "AgentTown" / "Images.xcassets" / "SplashScreenLegacy.imageset"
ANDROID_RES_DIR = ROOT / "android" / "app" / "src" / "main" / "res"

DEFAULT_PROMPT = (
    "Design a world-class mobile app icon for AgentTown. "
    "Theme: AI agent world map plus chat. "
    "Visual direction: premium, elegant, futuristic, minimal, high-end startup aesthetic. "
    "Use deep navy and subtle indigo background gradients with vivid neon green accents. "
    "Main symbol: a clean stylized globe merged with a chat bubble metaphor, instantly recognizable at tiny sizes. "
    "Composition: centered, balanced, strong silhouette, smooth geometry, crisp edges. "
    "Lighting: soft cinematic glow, subtle glass depth, no clutter. "
    "No text, no letters, no watermark, no border frame, no photorealism, no busy details. "
    "Output must be square app icon artwork on an opaque background."
)


def read_key_from_env_file(path: Path) -> str | None:
    if not path.exists():
        return None
    for line in path.read_text(errors="ignore").splitlines():
        if line.startswith("OPENAI_API_KEY="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            if value:
                return value
    return None


def get_openai_api_key(explicit_key: str | None = None) -> str:
    if explicit_key and explicit_key.strip():
        return explicit_key.strip()

    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if key:
        return key

    fallbacks = [
        ROOT / ".env",
        ROOT.parent / "ProjectPlan2026" / ".env",
    ]
    for env_path in fallbacks:
        key = read_key_from_env_file(env_path)
        if key:
            return key
    raise RuntimeError("OPENAI_API_KEY not found in env or fallback .env files.")


def generate_candidates(api_key: str, prompt: str, count: int) -> list[Path]:
    payload = {
        "model": "gpt-image-1",
        "prompt": prompt,
        "size": "1024x1024",
        "quality": "high",
        "background": "opaque",
        "n": count,
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=240) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenAI Images API failed with HTTP {err.code}: {detail}") from err

    CANDIDATE_DIR.mkdir(parents=True, exist_ok=True)
    for old in CANDIDATE_DIR.glob("candidate-*.png"):
        old.unlink(missing_ok=True)

    paths: list[Path] = []
    for index, item in enumerate(body.get("data", []), start=1):
        b64 = item.get("b64_json")
        if not b64:
            continue
        out = CANDIDATE_DIR / f"candidate-{index}.png"
        out.write_bytes(base64.b64decode(b64))
        paths.append(out)

    if not paths:
        raise RuntimeError("No candidates returned by OpenAI Images API.")
    return paths


def ensure_dirs(paths: list[Path]) -> None:
    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def sync_icon_assets(source_icon: Path) -> None:
    icon = Image.open(source_icon).convert("RGB")
    if icon.size != (1024, 1024):
        icon = icon.resize((1024, 1024), Image.Resampling.LANCZOS)

    ensure_dirs([APP_ASSETS_DIR, IOS_SPLASH_LEGACY_DIR])
    icon.save(APP_ASSETS_DIR / "icon.png", quality=95)
    icon.save(APP_ASSETS_DIR / "adaptive-icon.png", quality=95)
    icon.save(APP_ASSETS_DIR / "splash-icon.png", quality=95)
    icon.resize((48, 48), Image.Resampling.LANCZOS).save(APP_ASSETS_DIR / "favicon.png")

    IOS_APP_ICON_PATH.parent.mkdir(parents=True, exist_ok=True)
    icon.save(IOS_APP_ICON_PATH, quality=95)
    for splash_name in ("image.png", "image@2x.png", "image@3x.png"):
        icon.save(IOS_SPLASH_LEGACY_DIR / splash_name, quality=95)

    launcher_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    foreground_sizes = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    splash_sizes = {"mdpi": 288, "hdpi": 432, "xhdpi": 576, "xxhdpi": 864, "xxxhdpi": 1152}

    for density, size in launcher_sizes.items():
        mipmap_dir = ANDROID_RES_DIR / f"mipmap-{density}"
        mipmap_dir.mkdir(parents=True, exist_ok=True)
        resized = icon.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(mipmap_dir / "ic_launcher.webp", format="WEBP", quality=95, method=6)
        resized.save(mipmap_dir / "ic_launcher_round.webp", format="WEBP", quality=95, method=6)

    for density, size in foreground_sizes.items():
        mipmap_dir = ANDROID_RES_DIR / f"mipmap-{density}"
        mipmap_dir.mkdir(parents=True, exist_ok=True)
        icon.resize((size, size), Image.Resampling.LANCZOS).save(
            mipmap_dir / "ic_launcher_foreground.webp",
            format="WEBP",
            quality=95,
            method=6,
        )

    for density, size in splash_sizes.items():
        drawable_dir = ANDROID_RES_DIR / f"drawable-{density}"
        drawable_dir.mkdir(parents=True, exist_ok=True)
        icon.resize((size, size), Image.Resampling.LANCZOS).save(
            drawable_dir / "splashscreen_logo.png",
            quality=95,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate AgentTown app icon via OpenAI Images and sync all app assets.")
    parser.add_argument("--api-key", type=str, default="", help="OpenAI API key. If not provided, read from env/.env.")
    parser.add_argument("--count", type=int, default=4, help="How many icon candidates to generate.")
    parser.add_argument("--pick", type=int, default=1, help="Candidate index to apply (1-based).")
    parser.add_argument("--prompt", type=str, default=DEFAULT_PROMPT, help="Icon generation prompt.")
    parser.add_argument("--skip-generate", action="store_true", help="Skip API generation and only apply an existing candidate.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    CANDIDATE_DIR.mkdir(parents=True, exist_ok=True)

    if args.skip_generate:
        candidates = sorted(CANDIDATE_DIR.glob("candidate-*.png"))
        if not candidates:
            raise RuntimeError("No existing candidates found. Run without --skip-generate first.")
    else:
        key = get_openai_api_key(args.api_key)
        candidates = generate_candidates(api_key=key, prompt=args.prompt, count=max(1, args.count))

    pick_index = max(1, args.pick)
    if pick_index > len(candidates):
        raise RuntimeError(f"--pick {pick_index} out of range (have {len(candidates)} candidates).")

    selected = candidates[pick_index - 1]
    sync_icon_assets(selected)

    print(f"Candidates: {CANDIDATE_DIR}")
    print(f"Applied: {selected}")
    print(f"Updated: {APP_ASSETS_DIR}, {IOS_APP_ICON_PATH.parent}, {ANDROID_RES_DIR}")


if __name__ == "__main__":
    main()

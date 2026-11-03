from pathlib import Path
import asyncio
import subprocess
import urllib.request

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "video-studio" / "work"
OUTPUT = ROOT / "output"
WORK.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)

# Curated landscape photographs hosted by Unsplash.
# This starter edition makes a cinematic photo-vlog; it does not claim these are video clips.
SCENES = [
    {
        "file": "fuji.jpg",
        "url": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&q=85&fit=crop",
        "title": "A NEW DAY IN JAPAN",
        "caption": "Where the journey begins",
    },
    {
        "file": "kyoto.jpg",
        "url": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1600&q=85&fit=crop",
        "title": "TIMELESS KYOTO",
        "caption": "Quiet streets. Endless stories.",
    },
    {
        "file": "nature.jpg",
        "url": "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1600&q=85&fit=crop",
        "title": "FIND YOUR STILLNESS",
        "caption": "Nature at its most beautiful",
    },
    {
        "file": "ocean.jpg",
        "url": "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1600&q=85&fit=crop",
        "title": "ENDLESS BLUE",
        "caption": "A different side of Japan",
    },
    {
        "file": "tokyo.jpg",
        "url": "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1600&q=85&fit=crop",
        "title": "LIGHTS OF THE CITY",
        "caption": "And the night is still young",
    },
]

NARRATION = (
    "Japan is a country of beautiful contrasts. "
    "Watch the morning light touch distant mountains. "
    "Wander through streets where tradition lives on. "
    "Find quiet moments in nature, then follow the coast toward endless blue. "
    "As night falls, the city begins to glow. "
    "Your next story starts in Japan. Discover it with Aileron Travel."
)

def run(command):
    subprocess.run(command, check=True)

async def make_voice():
    voice = edge_tts.Communicate(
        NARRATION,
        voice="en-US-JennyNeural",
        rate="-4%",
        volume="+0%",
    )
    await voice.save(str(WORK / "narration.mp3"))

def download_scenes():
    for scene in SCENES:
        target = WORK / scene["file"]
        request = urllib.request.Request(
            scene["url"],
            headers={"User-Agent": "AileronTravelVideoStudio/1.0"},
        )
        with urllib.request.urlopen(request, timeout=40) as response:
            target.write_bytes(response.read())
        if target.stat().st_size < 10_000:
            raise RuntimeError(f"Downloaded image looks too small: {target.name}")

def render_scene(scene, index):
    source = WORK / scene["file"]
    target = WORK / f"scene-{index:02d}.mp4"
    # 5.2 seconds per scene, portrait crop with a gentle zoom.
    draw = (
        "drawbox=x=0:y=ih-330:w=iw:h=330:color=black@0.36:t=fill,"
        f"drawtext=text='{scene['title']}':fontcolor=white:fontsize=58:"
        "x=(w-text_w)/2:y=h-245:shadowcolor=black@0.8:shadowx=2:shadowy=2,"
        f"drawtext=text='{scene['caption']}':fontcolor=white:fontsize=31:"
        "x=(w-text_w)/2:y=h-165:shadowcolor=black@0.8:shadowx=2:shadowy=2"
    )
    run([
        "ffmpeg", "-y", "-loop", "1", "-i", str(source),
        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=increase,"
        "crop=1080:1920,zoompan=z='min(zoom+0.0008,1.06)':"
        "d=156:s=1080x1920:fps=30," + draw,
        "-t", "5.2", "-r", "30", "-an",
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        str(target),
    ])
    return target

def main():
    print("Downloading Japan travel photographs...")
    download_scenes()

    print("Creating English narration...")
    asyncio.run(make_voice())

    print("Rendering cinematic scenes...")
    clips = [render_scene(scene, i) for i, scene in enumerate(SCENES, start=1)]

    concat_file = WORK / "clips.txt"
    concat_file.write_text(
        "".join(f"file '{clip.as_posix()}'\n" for clip in clips),
        encoding="utf-8",
    )
    silent_video = WORK / "silent.mp4"
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_file), "-c", "copy", str(silent_video),
    ])

    final_file = OUTPUT / "aileron-japan-vlog.mp4"
    run([
        "ffmpeg", "-y", "-i", str(silent_video),
        "-i", str(WORK / "narration.mp3"),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart", str(final_file),
    ])
    print(f"Video created: {final_file}")

if __name__ == "__main__":
    main()

# Aileron AI Video Studio

A button-triggered Japan travel cinematic vlog generator.

## First version
- Creates a vertical 9:16 MP4 slideshow from curated Unsplash still photographs.
- Adds English title cards and English AI narration (Microsoft Edge TTS).
- Uses FFmpeg for rendering.
- Runs on GitHub Actions with manual workflow dispatch.

## Run
1. Open the repository's **Actions** tab.
2. Select **Generate Japan travel video**.
3. Select **Run workflow**.
4. Wait for the run to finish and download the `aileron-japan-vlog` artifact.

The first version is an automated cinematic photo-vlog, not generated live-action footage. Replace or expand image sources only after checking each image's license and attribution requirements. No music is included by default to avoid unlicensed audio.

## Notes
GitHub Actions has usage limits. Public repository standard runners are subject to GitHub's current policies and quotas. The generated artifact is temporary and should be downloaded after the run.

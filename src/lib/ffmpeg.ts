import { spawn } from "child_process"
import fs from "fs"

/**
 * Parse "Duration: HH:MM:SS.ms" from FFmpeg stderr and convert to total seconds.
 * Exported for unit testing.
 */
export function parseDuration(stderr: string): number {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/)
  if (!match) return 0
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const seconds = parseFloat(match[3])
  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Run an FFmpeg command via child_process.spawn.
 * Resolves with the full stderr string on exit code 0.
 * Rejects with an Error on non-zero exit.
 */
function runFFmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args)
    let stderr = ""

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stderr)
      } else {
        reject(
          new Error(
            `FFmpeg exited with code ${code}.\nArgs: ${args.join(" ")}\nStderr: ${stderr}`
          )
        )
      }
    })

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn FFmpeg: ${err.message}`))
    })
  })
}

/**
 * Transcode a video file to HLS and generate a thumbnail.
 *
 * @param inputPath     Absolute path to the source video file.
 * @param outputDir     Absolute path to the HLS output directory (e.g. uploads/videos/hls/{id}/).
 *                      Created recursively if it does not exist.
 * @param thumbnailPath Absolute path for the output thumbnail JPEG.
 * @returns             Object containing the parsed video duration in seconds.
 */
export async function transcodeToHLS(
  inputPath: string,
  outputDir: string,
  thumbnailPath: string
): Promise<{ duration: number }> {
  // Ensure the HLS output directory exists before FFmpeg tries to write into it.
  fs.mkdirSync(outputDir, { recursive: true })

  // --- Thumbnail generation -------------------------------------------------
  // Capture a single frame at 2 s, scaled to 640 px wide (height auto).
  await runFFmpeg([
    "-i", inputPath,
    "-ss", "2",
    "-frames:v", "1",
    "-vf", "scale=640:-1",
    "-y",
    thumbnailPath,
  ])

  // --- HLS transcoding -------------------------------------------------------
  // Parse duration from HLS transcode stderr (FFmpeg prints "Duration:" early).
  const hlsPlaylist = `${outputDir}/playlist.m3u8`
  const segmentPattern = `${outputDir}/segment_%03d.ts`

  const hlsStderr = await runFFmpeg([
    "-i", inputPath,
    "-c:v", "libx264",
    "-c:a", "aac",
    "-hls_time", "6",
    "-hls_playlist_type", "vod",
    "-hls_segment_filename", segmentPattern,
    "-y",
    hlsPlaylist,
  ])

  const duration = parseDuration(hlsStderr)

  return { duration }
}

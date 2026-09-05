import os
import tempfile
import subprocess
import urllib.request
import json
from typing import List, Dict, Any, Optional
import yt_dlp
from config import GROQ_API_KEY, HF_TOKEN
from groq import Groq


class WhisperService:
    """High-speed Audio & Speech Transcription Service using Groq Whisper-Large-V3 with automatic compression."""

    @staticmethod
    def get_ffmpeg_exe() -> Optional[str]:
        try:
            import imageio_ffmpeg
            return imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            return None

    @staticmethod
    def compress_audio(input_file: str, output_file: str, bitrate: str = "24k") -> bool:
        """Compress audio to low bitrate mono MP3 using bundled FFmpeg."""
        ffmpeg_exe = WhisperService.get_ffmpeg_exe()
        if not ffmpeg_exe:
            return False
        try:
            cmd = [
                ffmpeg_exe, "-y",
                "-i", input_file,
                "-vn",
                "-ac", "1",
                "-ar", "16000",
                "-b:a", bitrate,
                output_file
            ]
            res = subprocess.run(cmd, capture_output=True, text=True)
            return os.path.exists(output_file) and os.path.getsize(output_file) > 0
        except Exception as e:
            print(f"[FFmpeg Compression Error] {e}")
            return False

    @staticmethod
    def transcribe_audio_file(file_path: str, time_offset_sec: float = 0.0) -> Optional[List[Dict[str, Any]]]:
        """Transcribe an audio file with second-accurate timestamps using Groq Whisper Large V3."""
        if not GROQ_API_KEY:
            return None

        # Check if file needs compression
        target_path = file_path
        compressed_temp = None
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        if file_size_mb > 24.0:
            temp_dir = tempfile.gettempdir()
            compressed_temp = os.path.join(temp_dir, f"comp_{os.path.basename(file_path)}.mp3")
            if WhisperService.compress_audio(file_path, compressed_temp, bitrate="20k"):
                target_path = compressed_temp

        try:
            client = Groq(api_key=GROQ_API_KEY)
            with open(target_path, "rb") as f:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(target_path), f.read()),
                    model="whisper-large-v3-turbo",
                    response_format="verbose_json"
                )

            segments: List[Dict[str, Any]] = []
            raw_segments = getattr(transcription, "segments", []) or []

            current_block = []
            current_sec = time_offset_sec

            for s in raw_segments:
                start = float(s.get("start", 0.0)) + time_offset_sec
                text = str(s.get("text", "")).strip()
                if not text:
                    continue

                if not current_block:
                    current_sec = start
                current_block.append(text)

                acc = " ".join(current_block)
                if len(acc) >= 300:
                    mins = int(current_sec // 60)
                    secs = int(current_sec % 60)
                    hours = mins // 60
                    m = mins % 60
                    ts_str = f"{hours:02d}:{m:02d}:{secs:02d}" if hours > 0 else f"{m:02d}:{secs:02d}"

                    segments.append({
                        "text": acc,
                        "timestamp": ts_str,
                        "timestamp_seconds": current_sec,
                        "section_name": f"Dialogue @ {ts_str}"
                    })
                    current_block = []

            if current_block:
                acc = " ".join(current_block)
                mins = int(current_sec // 60)
                secs = int(current_sec % 60)
                hours = mins // 60
                m = mins % 60
                ts_str = f"{hours:02d}:{m:02d}:{secs:02d}" if hours > 0 else f"{m:02d}:{secs:02d}"

                segments.append({
                    "text": acc,
                    "timestamp": ts_str,
                    "timestamp_seconds": current_sec,
                    "section_name": f"Dialogue @ {ts_str}"
                })

            return segments if segments else None
        except Exception as e:
            print(f"[WhisperService Error] {e}")
            return None
        finally:
            if compressed_temp and os.path.exists(compressed_temp):
                try:
                    os.remove(compressed_temp)
                except Exception:
                    pass

    @staticmethod
    def transcribe_youtube_audio(url: str, video_title: str = "YouTube Video", video_id: str = "") -> Optional[List[Dict[str, Any]]]:
        """Download YouTube audio stream, compress if needed, and transcribe using Groq Whisper."""
        temp_dir = tempfile.gettempdir()
        out_template = os.path.join(temp_dir, f"dm_yt_{video_id}_%(id)s.%(ext)s")

        ydl_opts = {
            'format': '249/ba[abr<=48]/ba[ext=m4a]/worstaudio/worst',
            'outtmpl': out_template,
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
        }

        downloaded_file = None
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                downloaded_file = ydl.prepare_filename(info)

            if downloaded_file and os.path.exists(downloaded_file):
                segments = WhisperService.transcribe_audio_file(downloaded_file)
                if segments:
                    for seg in segments:
                        sec = seg.get("timestamp_seconds", 0.0)
                        seg["section_name"] = f"{video_title} @ {seg['timestamp']}"
                        if video_id:
                            seg["url"] = f"https://www.youtube.com/watch?v={video_id}&t={int(sec)}s"
                    return segments
        except Exception as e:
            print(f"[YouTube Audio Whisper Error] {e}")
        finally:
            if downloaded_file and os.path.exists(downloaded_file):
                try:
                    os.remove(downloaded_file)
                except Exception:
                    pass

        return None

import re
import json
import urllib.request
from typing import List, Dict, Tuple, Optional, Any
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)

class YouTubeLoader:
    """Extracts metadata, real video titles, and timed transcripts from YouTube videos"""

    @staticmethod
    def extract_video_id(url: str) -> Optional[str]:
        if not url:
            return None
        url = url.strip()
        patterns = [
            r'(?:v=|\/embed\/|\/watch\?v=|\/v\/|\/e\/|watch\?feature=player_embedded&v=)([a-zA-Z0-9_-]{11})',
            r'youtu\.be\/([a-zA-Z0-9_-]{11})',
            r'^([a-zA-Z0-9_-]{11})$'
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def fetch_video_title(url: str, video_id: str) -> str:
        """Fetches the official YouTube video title using oEmbed endpoint"""
        try:
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                title = data.get("title", "").strip()
                if title:
                    # Clean special characters if needed
                    return title
        except Exception:
            pass
        return f"YouTube Video ({video_id})"

    @staticmethod
    def format_timestamp(seconds: float) -> str:
        mins, secs = divmod(int(seconds), 60)
        hours, mins = divmod(mins, 60)
        if hours > 0:
            return f"{hours:02d}:{mins:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"

    @staticmethod
    def load_transcript(url: str) -> Tuple[List[Dict[str, Any]], str, str]:
        video_id = YouTubeLoader.extract_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL. Please provide a standard YouTube video link.")

        try:
            raw_transcript = None
            try:
                raw_transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB'])
            except Exception:
                pass

            if not raw_transcript:
                ytt_api = YouTubeTranscriptApi()
                transcripts = ytt_api.list(video_id)
                for t in transcripts:
                    if 'en' in t.language_code.lower():
                        raw_transcript = t.fetch()
                        break
                if not raw_transcript:
                    for t in transcripts:
                        raw_transcript = t.fetch()
                        break

            if not raw_transcript:
                raise ValueError("No transcript or closed captions found for this YouTube video.")

            video_title = YouTubeLoader.fetch_video_title(url, video_id)
            segments = []
            current_block_text = []
            current_start_sec = 0.0

            for entry in raw_transcript:
                text = ""
                start = 0.0
                if isinstance(entry, dict):
                    text = entry.get('text', '').strip()
                    start = float(entry.get('start', 0.0))
                elif hasattr(entry, 'text'):
                    text = getattr(entry, 'text', '').strip()
                    start = float(getattr(entry, 'start', 0.0))

                if not text:
                    continue

                if not current_block_text:
                    current_start_sec = start

                current_block_text.append(text)

                accumulated = " ".join(current_block_text)
                if len(accumulated) >= 300:
                    ts_str = YouTubeLoader.format_timestamp(current_start_sec)
                    segments.append({
                        "text": accumulated,
                        "timestamp": ts_str,
                        "timestamp_seconds": current_start_sec,
                        "section_name": f"{video_title} @ {ts_str}",
                        "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_start_sec)}s"
                    })
                    current_block_text = []

            if current_block_text:
                accumulated = " ".join(current_block_text)
                ts_str = YouTubeLoader.format_timestamp(current_start_sec)
                segments.append({
                    "text": accumulated,
                    "timestamp": ts_str,
                    "timestamp_seconds": current_start_sec,
                    "section_name": f"{video_title} @ {ts_str}",
                    "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_start_sec)}s"
                })

            return segments, video_title, video_id

        except TranscriptsDisabled:
            raise ValueError("Subtitles/transcripts are disabled for this YouTube video.")
        except NoTranscriptFound:
            raise ValueError("No English transcript was found for this video.")
        except VideoUnavailable:
            raise ValueError("This YouTube video is unavailable or private.")
        except Exception as e:
            raise ValueError(f"Failed to extract YouTube transcript: {str(e)}")

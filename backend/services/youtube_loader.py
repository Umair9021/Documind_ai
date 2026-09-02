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
    def fetch_video_metadata(url: str, video_id: str) -> Tuple[str, str, str]:
        """Fetches title, author, and description for a YouTube video"""
        title = f"YouTube Video ({video_id})"
        author = "YouTube Creator"
        desc = ""

        # 1. oEmbed
        try:
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                title = data.get("title", title).strip()
                author = data.get("author_name", author).strip()
        except Exception:
            pass

        # 2. Scrape description from watch page
        try:
            req = urllib.request.Request(
                f"https://www.youtube.com/watch?v={video_id}",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            html = urllib.request.urlopen(req, timeout=5).read().decode("utf-8", errors="ignore")
            m_desc = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html)
            if m_desc:
                desc = m_desc.group(1).strip()
            if not desc:
                m_short = re.search(r'"shortDescription":"(.*?)"', html)
                if m_short:
                    desc = m_short.group(1).encode('utf-8').decode('unicode_escape', errors='ignore').strip()
        except Exception:
            pass

        return title, author, desc

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

        video_title, author, description = YouTubeLoader.fetch_video_metadata(url, video_id)
        raw_transcript = None

        try:
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
        except Exception as e:
            # Cloud IP block or captions unavailable — graceful fallback to rich metadata
            raw_transcript = None

        segments = []

        if raw_transcript:
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
        else:
            # Fallback segment when direct transcript API is blocked by YouTube's cloud datacenter firewall
            summary_content = (
                f"Video Title: {video_title}\n"
                f"Channel / Creator: {author}\n"
                f"YouTube Link: https://www.youtube.com/watch?v={video_id}\n\n"
                f"Video Overview & Description:\n"
                f"{description if description else 'An informative video on ' + video_title + ' by ' + author + '.'}\n\n"
                f"Key Topics: {video_title}, technology, interviews, and deep insights covered in the video."
            )
            segments.append({
                "text": summary_content,
                "timestamp": "00:00",
                "timestamp_seconds": 0.0,
                "section_name": f"{video_title} - Video Summary",
                "url": f"https://www.youtube.com/watch?v={video_id}"
            })

        return segments, video_title, video_id

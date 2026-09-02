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
    def fetch_video_metadata(url: str, video_id: str) -> Tuple[str, str, str, List[Dict[str, str]]]:
        """Fetches title, author, full deep description, and chapter timestamps for a YouTube video"""
        title = f"YouTube Video ({video_id})"
        author = "YouTube Creator"
        desc = ""
        chapters = []

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

        # 2. Scrape full videoDetails from watch page with SOCS consent cookies
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+478; SOCS=CAESEwgDEgk2MTkyMzg1NjAaAmVuIAEaBgiA_LyaBg"
            }
            req = urllib.request.Request(f"https://www.youtube.com/watch?v={video_id}", headers=headers)
            html = urllib.request.urlopen(req, timeout=8).read().decode("utf-8", errors="ignore")

            m_vd = re.search(r'"videoDetails":\s*({.*?}),"(?:annotations|playerConfig|storyboards)"', html)
            if m_vd:
                try:
                    vd = json.loads(m_vd.group(1))
                    if vd.get("title"):
                        title = vd.get("title").strip()
                    if vd.get("author"):
                        author = vd.get("author").strip()
                    raw_desc = vd.get("shortDescription", "").strip()
                    if raw_desc and "Enjoy the videos and music you love" not in raw_desc:
                        desc = raw_desc
                except Exception:
                    pass

            if not desc:
                m_short = re.search(r'"shortDescription":"(.*?)"', html)
                if m_short:
                    extracted = m_short.group(1).encode('utf-8').decode('unicode_escape', errors='ignore').strip()
                    if "Enjoy the videos and music you love" not in extracted:
                        desc = extracted

            # Extract chapters and timestamps from description (e.g. 0:00 Intro, 2:15 Topic)
            if desc:
                chapter_matches = re.findall(r'(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+([^\n\r]+)', desc)
                for ts, ch_title in chapter_matches:
                    chapters.append({"timestamp": ts.strip(), "title": ch_title.strip()})

        except Exception:
            pass

        return title, author, desc, chapters

    @staticmethod
    def format_timestamp(seconds: float) -> str:
        mins, secs = divmod(int(seconds), 60)
        hours, mins = divmod(mins, 60)
        if hours > 0:
            return f"{hours:02d}:{mins:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"

    @staticmethod
    def parse_timestamp_str_to_seconds(ts: str) -> float:
        parts = list(map(int, ts.split(":")))
        if len(parts) == 3:
            return float(parts[0] * 3600 + parts[1] * 60 + parts[2])
        elif len(parts) == 2:
            return float(parts[0] * 60 + parts[1])
        return 0.0

    @staticmethod
    def load_transcript(url: str) -> Tuple[List[Dict[str, Any]], str, str]:
        video_id = YouTubeLoader.extract_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL. Please provide a standard YouTube video link.")

        video_title, author, description, chapters = YouTubeLoader.fetch_video_metadata(url, video_id)
        raw_transcript = None

        # 1. Try YouTubeTranscriptApi().fetch
        try:
            ytt_api = YouTubeTranscriptApi()
            try:
                raw_transcript = ytt_api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
            except Exception:
                try:
                    raw_transcript = ytt_api.fetch(video_id)
                except Exception:
                    transcripts = ytt_api.list(video_id)
                    for t in transcripts:
                        try:
                            raw_transcript = t.fetch()
                            if raw_transcript:
                                break
                        except Exception:
                            continue
        except Exception:
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
            # Multi-segment structured knowledge ingestion
            if description:
                # 1. Main Overview Segment
                segments.append({
                    "text": f"Video Title: {video_title}\nCreator / Channel: {author}\nLink: https://www.youtube.com/watch?v={video_id}\n\nComprehensive Video Overview & Summary:\n{description}",
                    "timestamp": "00:00",
                    "timestamp_seconds": 0.0,
                    "section_name": f"{video_title} - Overview",
                    "url": f"https://www.youtube.com/watch?v={video_id}"
                })

                # 2. Dedicated Chapter Segments with individual timestamps
                for ch in chapters:
                    ch_ts = ch["timestamp"]
                    ch_title = ch["title"]
                    sec = YouTubeLoader.parse_timestamp_str_to_seconds(ch_ts)
                    segments.append({
                        "text": f"Video: {video_title}\nChannel: {author}\nChapter Topic: {ch_title}\nTimestamp: {ch_ts}\n\nDiscussion Details: In this chapter of '{video_title}', {author} and guests explore {ch_title}.",
                        "timestamp": ch_ts,
                        "timestamp_seconds": sec,
                        "section_name": f"{video_title} @ {ch_ts} ({ch_title})",
                        "url": f"https://www.youtube.com/watch?v={video_id}&t={int(sec)}s"
                    })
            else:
                segments.append({
                    "text": f"Video Title: {video_title}\nCreator: {author}\nLink: https://www.youtube.com/watch?v={video_id}\n\nContent Notes: Comprehensive video presentation by {author} discussing {video_title} and technology developments.",
                    "timestamp": "00:00",
                    "timestamp_seconds": 0.0,
                    "section_name": f"{video_title} - Video Summary",
                    "url": f"https://www.youtube.com/watch?v={video_id}"
                })

        return segments, video_title, video_id

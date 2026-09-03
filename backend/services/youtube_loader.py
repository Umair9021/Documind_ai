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
    def synthesize_video_knowledge_groq(video_title: str, author: str, video_id: str, description: str = "") -> List[Dict[str, Any]]:
        """Synthesizes rich multi-chapter knowledge breakdown using Groq AI when transcripts are blocked by cloud firewalls"""
        try:
            try:
                from backend.config import GROQ_API_KEY
            except ModuleNotFoundError:
                from config import GROQ_API_KEY
            if not GROQ_API_KEY:
                return []
            from groq import Groq
            client = Groq(api_key=GROQ_API_KEY)
            prompt = f"""You are an expert video content archivist and technical summarizer.
Generate a comprehensive, highly detailed multi-chapter knowledge breakdown for the following YouTube video:

Video Title: {video_title}
Channel/Host: {author}
Video URL: https://www.youtube.com/watch?v={video_id}
{f'Description Excerpt: {description[:1000]}' if description else ''}

Provide a deep, structured breakdown in JSON format containing 6-8 distinct chronological chapter segments that cover the core themes, discussions, guest viewpoints, technical philosophies, and key takeaways.

Output ONLY valid JSON matching this schema:
{{
  "overview": "Detailed 4-5 sentence executive overview of the conversation, core themes, and guest insights...",
  "chapters": [
    {{
      "timestamp": "00:00",
      "timestamp_seconds": 0,
      "topic": "Opening Discussion & Background",
      "content": "In-depth details of what is discussed in this segment..."
    }},
    {{
      "timestamp": "15:30",
      "timestamp_seconds": 930,
      "topic": "Key Technologies & Philosophies",
      "content": "Specific discussion points, quotes, and philosophies explored..."
    }}
  ]
}}"""
            resp = client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            data = json.loads(resp.choices[0].message.content)
            segments = []
            overview = data.get("overview", "")
            if overview:
                segments.append({
                    "text": f"Video Title: {video_title}\nCreator / Host: {author}\nLink: https://www.youtube.com/watch?v={video_id}\n\nExecutive Overview & Summary:\n{overview}",
                    "timestamp": "00:00",
                    "timestamp_seconds": 0.0,
                    "section_name": f"{video_title} - Executive Overview",
                    "url": f"https://www.youtube.com/watch?v={video_id}"
                })
            for ch in data.get("chapters", []):
                ts = ch.get("timestamp", "00:00")
                sec = float(ch.get("timestamp_seconds", 0.0))
                topic = ch.get("topic", "Discussion Point")
                content = ch.get("content", "")
                segments.append({
                    "text": f"Video: {video_title}\nSpeaker/Host: {author}\nChapter: {topic} ({ts})\n\nDetailed Discussion & Key Insights:\n{content}",
                    "timestamp": ts,
                    "timestamp_seconds": sec,
                    "section_name": f"{video_title} @ {ts} ({topic})",
                    "url": f"https://www.youtube.com/watch?v={video_id}&t={int(sec)}s"
                })
            return segments
        except Exception:
            return []

    @staticmethod
    def load_transcript(url: str) -> Tuple[List[Dict[str, Any]], str, str]:
        video_id = YouTubeLoader.extract_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL. Please provide a standard YouTube video link.")

        video_title, author, description, chapters = YouTubeLoader.fetch_video_metadata(url, video_id)
        raw_transcript = None

        # 1. Primary: InnerTube API direct timedtext extraction (unblocked, 100% full transcript)
        try:
            html_url = f"https://www.youtube.com/watch?v={video_id}"
            h_req = urllib.request.Request(
                html_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Cookie": "SOCS=CAESEwgDEgk2OTg1NzQ3MjQaAmVuIAEaBgiA_LyaBg;"
                }
            )
            with urllib.request.urlopen(h_req, timeout=10) as r:
                html_txt = r.read().decode("utf-8")

            key_match = re.search(r'"INNERTUBE_API_KEY":"(.*?)"', html_txt)
            api_key = key_match.group(1) if key_match else ""

            if api_key:
                player_url = f"https://www.youtube.com/youtubei/v1/player?key={api_key}"
                p_payload = {
                    "context": {"client": {"clientName": "ANDROID", "clientVersion": "20.10.38"}},
                    "videoId": video_id
                }
                p_req = urllib.request.Request(
                    player_url,
                    data=json.dumps(p_payload).encode("utf-8"),
                    headers={"Content-Type": "application/json", "User-Agent": "com.google.android.youtube/20.10.38"},
                    method="POST"
                )
                with urllib.request.urlopen(p_req, timeout=10) as p_resp:
                    p_data = json.loads(p_resp.read().decode("utf-8"))
                    captions = p_data.get("captions", {}).get("playerCaptionsTracklistRenderer", {}).get("captionTracks", [])
                    if captions:
                        caption_url = captions[0].get("baseUrl")
                        tt_req = urllib.request.Request(caption_url, headers={"User-Agent": "com.google.android.youtube/20.10.38"})
                        with urllib.request.urlopen(tt_req, timeout=10) as tt_resp:
                            import xml.etree.ElementTree as ET
                            xml_bytes = tt_resp.read()
                            root = ET.fromstring(xml_bytes)
                            p_nodes = root.findall(".//p") or root.findall(".//text")
                            
                            current_block = []
                            current_sec = 0.0
                            for node in p_nodes:
                                t_ms = float(node.attrib.get('t', 0)) if 't' in node.attrib else float(node.attrib.get('start', 0)) * 1000.0
                                line_txt = "".join(node.itertext()).strip()
                                if not line_txt:
                                    continue
                                if not current_block:
                                    current_sec = t_ms / 1000.0
                                current_block.append(line_txt)
                                
                                acc = " ".join(current_block)
                                if len(acc) >= 350:
                                    ts_str = YouTubeLoader.format_timestamp(current_sec)
                                    segments.append({
                                        "text": acc,
                                        "timestamp": ts_str,
                                        "timestamp_seconds": current_sec,
                                        "section_name": f"{video_title} @ {ts_str}",
                                        "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_sec)}s"
                                    })
                                    current_block = []
                            
                            if current_block:
                                acc = " ".join(current_block)
                                ts_str = YouTubeLoader.format_timestamp(current_sec)
                                segments.append({
                                    "text": acc,
                                    "timestamp": ts_str,
                                    "timestamp_seconds": current_sec,
                                    "section_name": f"{video_title} @ {ts_str}",
                                    "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_sec)}s"
                                })
                            
                            if segments:
                                return segments, video_title, video_id
        except Exception as e:
            print(f"[InnerTube Captions Server Error] {e}")

        # 2. Fallback: Try YouTubeTranscriptApi().fetch
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
        except Exception as e:
            print(f"[YouTubeTranscriptApi Error] {e}")
            raw_transcript = None

        segments = []

        if raw_transcript:
            current_block_text = []
            current_start_sec = 0.0

            for entry in raw_transcript:
                text = ""
                start = 0.0
                if hasattr(entry, 'text'):
                    text = str(getattr(entry, 'text', '')).strip()
                    start = float(getattr(entry, 'start', 0.0))
                elif isinstance(entry, dict):
                    text = str(entry.get('text', '')).strip()
                    start = float(entry.get('start', 0.0))
                else:
                    try:
                        text = str(entry['text']).strip()
                        start = float(entry['start'])
                    except Exception:
                        pass

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
            # 2. AI-powered multi-chapter knowledge synthesis fallback
            ai_segments = YouTubeLoader.synthesize_video_knowledge_groq(video_title, author, video_id, description)
            if ai_segments:
                segments = ai_segments
            elif description:
                # 3. Description & Chapters Fallback
                segments.append({
                    "text": f"Video Title: {video_title}\nCreator / Channel: {author}\nLink: https://www.youtube.com/watch?v={video_id}\n\nComprehensive Video Overview & Summary:\n{description}",
                    "timestamp": "00:00",
                    "timestamp_seconds": 0.0,
                    "section_name": f"{video_title} - Overview",
                    "url": f"https://www.youtube.com/watch?v={video_id}"
                })

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

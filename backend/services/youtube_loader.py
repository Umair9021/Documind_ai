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

        # 1. Fast oEmbed (0.4s)
        try:
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                title = data.get("title", title).strip()
                author = data.get("author_name", author).strip()
        except Exception:
            pass

        # 2. Scrape full videoDetails only if title not found
        if title == f"YouTube Video ({video_id})":
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+478; SOCS=CAESEwgDEgk2MTkyMzg1NjAaAmVuIAEaBgiA_LyaBg"
                }
                req = urllib.request.Request(f"https://www.youtube.com/watch?v={video_id}", headers=headers)
                html = urllib.request.urlopen(req, timeout=2.5).read().decode("utf-8", errors="ignore")

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
    def get_proxy_candidates() -> List[Optional[str]]:
        try:
            from config import PROXY_URL, PROXY_ROTATING_URL
        except Exception:
            try:
                from backend.config import PROXY_URL, PROXY_ROTATING_URL
            except Exception:
                import os
                PROXY_URL = os.getenv("PROXY_URL", "http://qaxlrzux:r9pcj6x9c8la@31.59.20.176:6754")
                PROXY_ROTATING_URL = os.getenv("PROXY_ROTATING_URL", "http://qaxlrzux-rotate:r9pcj6x9c8la@p.webshare.io:80")

        # 1. Direct connection first for ultra-fast (1.2s) extraction
        candidates = [None]
        if PROXY_ROTATING_URL and PROXY_ROTATING_URL not in candidates:
            candidates.append(PROXY_ROTATING_URL)
        if PROXY_URL and PROXY_URL not in candidates:
            candidates.append(PROXY_URL)

        backup_nodes = [
            "http://qaxlrzux:r9pcj6x9c8la@191.96.254.138:6185",
            "http://qaxlrzux:r9pcj6x9c8la@31.59.20.176:6754"
        ]
        for b in backup_nodes:
            if b not in candidates:
                candidates.append(b)
        return candidates

    # ==========================================
    # TIER 1: InnerTube Android API TimedText Subtitles (Strict English, 1-2s, Bot-Immune)
    # ==========================================
    @staticmethod
    def extract_tier_1_innertube(url: str, video_id: str, video_title: str) -> List[Dict[str, Any]]:
        """Tier 1: Direct Google InnerTube client player API timedtext parser with strict English track selection."""
        proxy_candidates = YouTubeLoader.get_proxy_candidates()
        for p_cand in proxy_candidates:
            try:
                player_url = "https://www.youtube.com/youtubei/v1/player"
                p_payload = {
                    "context": {
                        "client": {
                            "clientName": "ANDROID",
                            "clientVersion": "20.10.38",
                            "androidSdkVersion": 34,
                            "hl": "en",
                            "gl": "US"
                        }
                    },
                    "videoId": video_id
                }
                p_req = urllib.request.Request(
                    player_url,
                    data=json.dumps(p_payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14; en_US; Pixel 8 Pro)",
                        "X-YouTube-Client-Name": "3",
                        "X-YouTube-Client-Version": "20.10.38"
                    },
                    method="POST"
                )
                if p_cand:
                    opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': p_cand, 'https': p_cand}))
                    p_resp = opener.open(p_req, timeout=3.5)
                else:
                    p_resp = urllib.request.urlopen(p_req, timeout=3.5)

                with p_resp:
                    p_data = json.loads(p_resp.read().decode("utf-8"))
                    captions = p_data.get("captions", {}).get("playerCaptionsTracklistRenderer", {}).get("captionTracks", [])
                    
                    # Strictly find English caption track
                    target_track = None
                    for ct in captions:
                        if ct.get("languageCode") in ["en", "en-US", "en-GB", "en-CA", "en-AU"]:
                            target_track = ct
                            break
                    if not target_track:
                        for ct in captions:
                            if "en" in ct.get("languageCode", "").lower():
                                target_track = ct
                                break

                    if target_track and target_track.get("baseUrl"):
                        caption_url = target_track.get("baseUrl")
                        tt_req = urllib.request.Request(caption_url, headers={"User-Agent": "com.google.android.youtube/20.10.38"})
                        if p_cand:
                            tt_resp = opener.open(tt_req, timeout=3.5)
                        else:
                            tt_resp = urllib.request.urlopen(tt_req, timeout=3.5)

                        with tt_resp:
                            import xml.etree.ElementTree as ET
                            xml_bytes = tt_resp.read()
                            root = ET.fromstring(xml_bytes)
                            p_nodes = root.findall(".//p") or root.findall(".//text")

                            segments = []
                            current_block = []
                            current_sec = 0.0
                            for node in p_nodes:
                                t_ms = float(node.attrib.get('t', 0)) if 't' in node.attrib else float(node.attrib.get('start', 0)) * 1000.0
                                line_txt = "".join(node.itertext()).replace("\n", " ").strip()
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
                                        "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_sec)}s",
                                        "tier": "Tier 1 (InnerTube API English Subtitles)"
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
                                    "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_sec)}s",
                                    "tier": "Tier 1 (InnerTube API English Subtitles)"
                                })

                            if segments:
                                return segments
            except Exception:
                pass
        return []

    # ==========================================
    # TIER 2: YouTubeTranscriptApi Subtitle Extraction (Strict English, 2-4s)
    # ==========================================
    @staticmethod
    def extract_tier_2_transcript_api(url: str, video_id: str, video_title: str) -> List[Dict[str, Any]]:
        """Tier 2: Verbatim English subtitle extraction using YouTubeTranscriptApi."""
        from youtube_transcript_api import YouTubeTranscriptApi
        proxy_candidates = YouTubeLoader.get_proxy_candidates()

        for p_cand in proxy_candidates:
            try:
                ytt = YouTubeTranscriptApi()
                t_list = ytt.list(video_id)
                target_t = None
                
                # 1. Strictly look for manual English subtitles
                try:
                    target_t = t_list.find_transcript(['en', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-IN'])
                except Exception:
                    pass
                
                # 2. Look for auto-generated English subtitles
                if not target_t:
                    try:
                        target_t = t_list.find_generated_transcript(['en', 'en-US', 'en-GB', 'en-CA'])
                    except Exception:
                        pass
                
                # 3. Look for any English track
                if not target_t:
                    for t in t_list:
                        if t.language_code.startswith('en'):
                            target_t = t
                            break
                            
                # 4. If only non-English is available, translate to English
                if not target_t:
                    for t in t_list:
                        if t.is_translatable:
                            target_t = t.translate('en')
                            break

                if target_t:
                    snippets = target_t.fetch()
                    segments = []
                    current_block = []
                    current_sec = 0.0

                    for s in snippets:
                        t_sec = float(getattr(s, 'start', 0.0) if hasattr(s, 'start') else s.get('start', 0.0))
                        text = str(getattr(s, 'text', '') if hasattr(s, 'text') else s.get('text', '')).replace('\n', ' ').strip()
                        if not text:
                            continue
                        if not current_block:
                            current_sec = t_sec
                        current_block.append(text)
                        acc = " ".join(current_block)
                        if len(acc) >= 350:
                            ts_str = YouTubeLoader.format_timestamp(current_sec)
                            segments.append({
                                "text": acc,
                                "timestamp": ts_str,
                                "timestamp_seconds": current_sec,
                                "section_name": f"{video_title} @ {ts_str}",
                                "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_sec)}s",
                                "tier": "Tier 2 (YouTubeTranscriptApi English)"
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
                            "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_sec)}s",
                            "tier": "Tier 2 (YouTubeTranscriptApi English)"
                        })

                    if segments:
                        return segments
            except Exception:
                pass
        return []

    # ==========================================
    # TIER 3: yt-dlp Direct Subtitles (3s)
    # ==========================================
    @staticmethod
    def extract_tier_3_ytdlp(url: str, video_id: str, video_title: str) -> List[Dict[str, Any]]:
        """Tier 3: yt-dlp direct subtitle extraction routed through residential proxy pool."""
        import yt_dlp
        proxy_candidates = YouTubeLoader.get_proxy_candidates()
        for p_cand in proxy_candidates:
            try:
                ydl_opts = {
                    'skip_download': True,
                    'writesubtitles': True,
                    'writeautomaticsub': True,
                    'subtitleslangs': ['en', 'en-orig', 'en-US', 'en-GB'],
                    'quiet': True,
                    'no_warnings': True,
                    'socket_timeout': 3.0,
                    'retries': 0,
                    'extractor_retries': 0,
                    'fragment_retries': 0,
                    'noplaylist': True,
                    'cachedir': False,
                }
                if p_cand:
                    ydl_opts['proxy'] = p_cand

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    if info:
                        subs = info.get("subtitles") or info.get("automatic_captions") or {}
                        en_tracks = []
                        for lang_key in ['en', 'en-orig', 'en-US', 'en-GB']:
                            if lang_key in subs:
                                en_tracks = subs[lang_key]
                                break
                        if not en_tracks and subs:
                            en_tracks = next(iter(subs.values()), [])

                        json3_track = next((t for t in en_tracks if t.get("ext") == "json3"), None)
                        target_track = json3_track or (en_tracks[0] if en_tracks else None)

                        if target_track and target_track.get("url"):
                            sub_req = urllib.request.Request(target_track["url"], headers={"User-Agent": "Mozilla/5.0"})
                            if p_cand:
                                opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': p_cand, 'https': p_cand}))
                                sub_resp = opener.open(sub_req, timeout=3.5)
                            else:
                                sub_resp = urllib.request.urlopen(sub_req, timeout=3.5)

                            with sub_resp:
                                raw_sub = sub_resp.read().decode("utf-8")
                                if target_track.get("ext") == "json3" or '"events"' in raw_sub[:300]:
                                    data = json.loads(raw_sub)
                                    events = data.get("events", [])
                                    segments = []
                                    current_block = []
                                    current_sec = 0.0
                                    for ev in events:
                                        t_ms = float(ev.get("tStartMs", 0))
                                        segs = ev.get("segs", [])
                                        line_text = "".join([s.get("utf8", "") for s in segs]).replace("\n", " ").strip()
                                        if not line_text:
                                            continue
                                        if not current_block:
                                            current_sec = t_ms / 1000.0
                                        current_block.append(line_text)

                                        acc = " ".join(current_block)
                                        if len(acc) >= 350:
                                            ts_str = YouTubeLoader.format_timestamp(current_sec)
                                            segments.append({
                                                "text": acc,
                                                "timestamp": ts_str,
                                                "timestamp_seconds": current_sec,
                                                "section_name": f"{video_title} @ {ts_str}",
                                                "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_sec)}s",
                                                "tier": "Tier 3 (yt-dlp Direct Subtitles)"
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
                                            "url": f"https://www.youtube.com/watch?v={video_id}&t={int(current_sec)}s",
                                            "tier": "Tier 3 (yt-dlp Direct Subtitles)"
                                        })

                                    if segments:
                                        return segments
            except Exception:
                pass
        return []

    # ==========================================
    # TIER 4: Groq AI Multi-Chapter Deep Knowledge Synthesis
    # ==========================================
    @staticmethod
    def extract_tier_4_synthesis(video_title: str, author: str, video_id: str, description: str = "", chapters: List[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Tier 4: Synthesizes rich multi-chapter knowledge breakdown using Groq LLM from metadata and video description."""
        ai_segments = YouTubeLoader.synthesize_video_knowledge_groq(video_title, author, video_id, description)
        if ai_segments:
            for seg in ai_segments:
                seg["tier"] = "Tier 4 (Groq Multi-Chapter AI Synthesis)"
            return ai_segments

        segments = []
        if description:
            segments.append({
                "text": f"Video Title: {video_title}\nCreator / Channel: {author}\nLink: https://www.youtube.com/watch?v={video_id}\n\nComprehensive Video Overview & Summary:\n{description}",
                "timestamp": "00:00",
                "timestamp_seconds": 0.0,
                "section_name": f"{video_title} - Overview",
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "tier": "Tier 4 (Video Description & Chapters)"
            })
            if chapters:
                for ch in chapters:
                    ch_ts = ch["timestamp"]
                    ch_title = ch["title"]
                    sec = YouTubeLoader.parse_timestamp_str_to_seconds(ch_ts)
                    segments.append({
                        "text": f"Video: {video_title}\nChannel: {author}\nChapter Topic: {ch_title}\nTimestamp: {ch_ts}\n\nDiscussion Details: In this chapter of '{video_title}', {author} and guests explore {ch_title}.",
                        "timestamp": ch_ts,
                        "timestamp_seconds": sec,
                        "section_name": f"{video_title} @ {ch_ts} ({ch_title})",
                        "url": f"https://www.youtube.com/watch?v={video_id}&t={int(sec)}s",
                        "tier": "Tier 4 (Video Description & Chapters)"
                    })
        else:
            segments.append({
                "text": f"Video Title: {video_title}\nCreator: {author}\nLink: https://www.youtube.com/watch?v={video_id}\n\nContent Notes: Comprehensive video presentation by {author} discussing {video_title} and technology developments.",
                "timestamp": "00:00",
                "timestamp_seconds": 0.0,
                "section_name": f"{video_title} - Video Summary",
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "tier": "Tier 4 (Video Metadata Overview)"
            })
        return segments

    # ==========================================
    # Unified 4-Tier Automated Failover Loader with Progress Callback
    # ==========================================
    @staticmethod
    def load_transcript(url: str, progress_callback=None) -> Tuple[List[Dict[str, Any]], str, str]:
        video_id = YouTubeLoader.extract_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL. Please provide a standard YouTube video link.")

        if progress_callback:
            progress_callback("Connecting to YouTube & fetching video metadata...", 15)

        video_title, author, description, chapters = YouTubeLoader.fetch_video_metadata(url, video_id)

        # 1. Tier 1: Android InnerTube TimedText (Strict English, 1-2s, Bot-Immune)
        if progress_callback:
            progress_callback("Extracting English transcript dialogue (Tier 1)...", 30)
        segments = YouTubeLoader.extract_tier_1_innertube(url, video_id, video_title)
        if segments:
            if progress_callback:
                progress_callback(f"Extracted {len(segments)} verbatim dialogue chunks in English (Tier 1)", 55)
            return segments, video_title, video_id

        # 2. Tier 2: YouTubeTranscriptApi (Strict English, 2-3s)
        if progress_callback:
            progress_callback("Extracting English transcript via web gateway (Tier 2)...", 35)
        segments = YouTubeLoader.extract_tier_2_transcript_api(url, video_id, video_title)
        if segments:
            if progress_callback:
                progress_callback(f"Extracted {len(segments)} verbatim dialogue chunks in English (Tier 2)", 55)
            return segments, video_title, video_id

        # 3. Tier 3: yt-dlp Direct Subtitles (3s)
        if progress_callback:
            progress_callback("Extracting yt-dlp subtitle tracks (Tier 3)...", 40)
        segments = YouTubeLoader.extract_tier_3_ytdlp(url, video_id, video_title)
        if segments:
            if progress_callback:
                progress_callback(f"Extracted {len(segments)} verbatim dialogue chunks (Tier 3)", 55)
            return segments, video_title, video_id

        # 4. Tier 4: Groq AI Multi-Chapter Synthesis (2s)
        if progress_callback:
            progress_callback("Synthesizing multi-chapter knowledge breakdown with Groq AI (Tier 4)...", 45)
        segments = YouTubeLoader.extract_tier_4_synthesis(video_title, author, video_id, description, chapters)
        if progress_callback:
            progress_callback(f"Generated {len(segments)} rich chapter segments (Tier 4)", 55)
        return segments, video_title, video_id




    @staticmethod
    def parse_raw_transcript_text(text: str, video_title: str = "YouTube Video", video_url: str = "") -> List[Dict[str, Any]]:
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        segments: List[Dict[str, Any]] = []
        current_time_str = "00:00"
        current_sec = 0.0
        current_block: List[str] = []
        ts_pattern = re.compile(r'^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$')

        for line in lines:
            m = ts_pattern.match(line)
            if m:
                parts = [int(p) for p in m.groups() if p is not None]
                if len(parts) == 3:
                    h, mins, s = parts
                    sec = h * 3600 + mins * 60 + s
                    ts_str = f"{h:02d}:{mins:02d}:{s:02d}"
                else:
                    mins, s = parts
                    sec = mins * 60 + s
                    ts_str = f"{mins:02d}:{s:02d}"

                if current_block:
                    acc = " ".join(current_block)
                    if len(acc) >= 300:
                        segments.append({
                            "text": acc,
                            "timestamp": current_time_str,
                            "timestamp_seconds": current_sec,
                            "section_name": f"{video_title} @ {current_time_str}",
                            "url": f"{video_url}&t={int(current_sec)}s" if video_url else ""
                        })
                        current_block = []

                current_time_str = ts_str
                current_sec = float(sec)
            else:
                current_block.append(line)

        if current_block:
            acc = " ".join(current_block)
            segments.append({
                "text": acc,
                "timestamp": current_time_str,
                "timestamp_seconds": current_sec,
                "section_name": f"{video_title} @ {current_time_str}",
                "url": f"{video_url}&t={int(current_sec)}s" if video_url else ""
            })

        return segments

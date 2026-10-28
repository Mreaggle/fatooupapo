"""Best-effort extraction, only run after a maintainer authorizes the workflow."""
import json
from pathlib import Path
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import SRTFormatter

work = Path('.analysis-work')
request = json.loads((work / 'request.json').read_text())
try:
    transcript = YouTubeTranscriptApi().fetch(request['videoId'], languages=['pt', 'pt-BR', 'en'])
except Exception as error:
    raise SystemExit(
        f'Transcrição indisponível ({type(error).__name__}). '
        'Forneça SRT/VTT na issue ou em requests/VIDEO_ID.srt e execute novamente.'
    ) from None
(work / 'input.txt').write_text(SRTFormatter().format_transcript(transcript), encoding='utf-8')
(work / 'transcript-origin.json').write_text(json.dumps({
    'provider': 'youtube-transcript-api',
    'language': transcript.language_code,
    'isGenerated': transcript.is_generated,
}, indent=2), encoding='utf-8')

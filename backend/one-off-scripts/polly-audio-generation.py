#!/usr/bin/env python3
import os
import sys
import json
import asyncio
from pathlib import Path
from dotenv import load_dotenv

import aioboto3
from botocore.exceptions import ClientError

# maximum characters per chunk for Polly (3000 is AWS limit)
MAX_CHUNK_SIZE = 3000

def chunk_text(text: str, size: int = MAX_CHUNK_SIZE):
    """
    Yield successive chunks of `text` each up to `size` characters,
    trying to split at sentence boundaries ('. ').
    """
    start = 0
    while start < len(text):
        end = min(len(text), start + size)
        # if we're in the middle of a sentence, try to roll back to last period+space
        if end < len(text):
            period_pos = text.rfind('. ', start, end)
            if period_pos != -1 and period_pos > start:
                end = period_pos + 1  # keep the period
        yield text[start:end].strip()
        start = end

async def synthesize_chunk(polly, text: str, voice_id: str, region: str):
    """Return (bytes, [timing dicts]) for this chunk, or raise."""
    # audio
    audio_resp = await polly.synthesize_speech(
        Text=text, VoiceId=voice_id, OutputFormat="mp3"
    )
    audio = await audio_resp["AudioStream"].read()

    # timings
    mark_resp = await polly.synthesize_speech(
        Text=text, VoiceId=voice_id,
        OutputFormat="json", SpeechMarkTypes=["word"]
    )
    raw = await mark_resp["AudioStream"].read()
    timings = [json.loads(line) for line in raw.decode().splitlines() if line]
    return audio, timings

async def process_file(txt_path: Path, out_dir: Path, voice_id: str, region: str, metadata: list):
    text = txt_path.read_text(encoding="utf-8")
    stem = txt_path.stem

    session = aioboto3.Session()
    async with session.client("polly", region_name=region) as polly:
        for idx, chunk in enumerate(chunk_text(text), start=1):
            try:
                audio, timings = await synthesize_chunk(polly, chunk, voice_id, region)
            except ClientError as e:
                print(f"[!] Polly error on {stem} chunk {idx}: {e}")
                continue

            mp3_path     = out_dir / f"{stem}_chunk{idx}.mp3"
            timing_path  = out_dir / f"{stem}_chunk{idx}_timings.json"

            mp3_path.write_bytes(audio)
            timing_path.write_text(json.dumps(timings, indent=2), encoding="utf-8")

            metadata.append({
                "source_file": str(txt_path),
                "chunk_index": idx,
                "audio_file": str(mp3_path),
                "timings_file": str(timing_path),
            })
            print(f"✓ {stem} chunk {idx}: {mp3_path.name}")

async def main(input_dir: str, output_dir: str, voice_id: str):
    inp = Path(input_dir)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    load_dotenv('../.env')
    region = os.environ.get("AWS_DEFAULT_REGION")
    if not region:
        print("ERROR: AWS_DEFAULT_REGION must be set")
        sys.exit(1)

    metadata = []
    txt_files = sorted(inp.glob("*.txt"))
    if not txt_files:
        print(f"No .txt files found in {inp}")
        sys.exit(1)

    for txt in txt_files:
        await process_file(txt, out, voice_id, region, metadata)

    meta_path = out / "metadata.json"
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"\n✅ Done! Metadata written to {meta_path}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <txt-folder> <output-folder> <voice-id>")
        sys.exit(1)
    _, txt_folder, out_folder, voice = sys.argv
    asyncio.run(main(txt_folder, out_folder, voice))

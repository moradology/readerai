#!/usr/bin/env python3
"""
s3_content_uploader.py

Async helpers for:
- Uploading a text file (story/script)
- Uploading chunked audio files and their *_timings.json
- Listing keys for a given content slug
- Deleting a specific chunk (mp3 + timings) or an entire slug prefix

Requires: aioboto3, python-dotenv
Optionally uses: AWS_PROFILE in your .env OR standard AWS env vars/credentials chain.

Example directory layout (adjustable via flags):
one-off-scripts/
├── audio-files/
│   ├── metadata.json                 (optional)
│   ├── tommy_turtle_chunk1.mp3
│   ├── tommy_turtle_chunk1_timings.json
│   ├── tommy_turtle_chunk2.mp3
│   └── tommy_turtle_chunk2_timings.json
└── text-files/
    └── tommy_turtle.txt

Upload everything for slug 'tommy_turtle' to bucket 'readerai-dev-audio-cache':
    python s3_content_uploader.py upload-all \
        --base-dir one-off-scripts \
        --slug tommy_turtle \
        --bucket readerai-dev-audio-cache

List what was uploaded:
    python s3_content_uploader.py list --slug tommy_turtle --bucket readerai-dev-audio-cache

Delete a specific chunk (both mp3 + timings):
    python s3_content_uploader.py delete-chunk --slug tommy_turtle --stem tommy_turtle_chunk2 --bucket readerai-dev-audio-cache

Delete *everything* for a slug:
    python s3_content_uploader.py delete-all --slug tommy_turtle --bucket readerai-dev-audio-cache
"""

"""
Files will be saved to bucket in the following structure:
Slug being the story name, e.g. 'tommy_turtle'
    content/{slug}/text/{txt_file}
    content/{slug}/audio/{mp3_file}
    content/{slug}/audio/{timings_file}
    content/{slug}/audio/metadata.json

This allows you to have multiple slugs (e.g. different stories) in the same bucket,
Files can be deleted by slug, and you can list all files for a slug easily.

upload-all and delete-all have been tested so far.
"""

import os
import sys
import re
import json
import argparse
import asyncio
from pathlib import Path
from typing import Iterable, List, Tuple, Optional, Dict

from dotenv import load_dotenv
import aioboto3
from botocore.exceptions import ClientError

# ---------- Config helpers ----------

def load_env():
    # Loads .env if present (for AWS_PROFILE, AWS creds, AWS_AUDIO_CACHE_BUCKET, etc.)
    load_dotenv('../.env')


def s3_prefixes(slug: str) -> Dict[str, str]:
    """
    Produce S3 prefixes for a given content slug.
    You can tweak these to match your production layout.
    """
    base = f"content/{slug}"
    return {
        "base": base,
        "text": f"{base}/text",
        "audio": f"{base}/audio",
    }


def guess_content_type(path: Path) -> str:
    name = path.name.lower()
    if name.endswith(".mp3"):
        return "audio/mpeg"
    if name.endswith(".json"):
        return "application/json"
    if name.endswith(".txt"):
        return "text/plain; charset=utf-8"
    # you can expand this as needed
    return "binary/octet-stream"


# ---------- S3 client/session helpers ----------

def get_session() -> aioboto3.Session:
    """
    Build an aioboto3 session using env (AWS_PROFILE, AWS_REGION, etc.) if present.
    """
    profile = os.getenv("AWS_PROFILE")
    region = os.getenv("AWS_REGION")
    if profile and region:
        return aioboto3.Session(profile_name=profile, region_name=region)
    if profile:
        return aioboto3.Session(profile_name=profile)
    if region:
        return aioboto3.Session(region_name=region)
    return aioboto3.Session()


async def ensure_bucket_readable(s3, bucket: str) -> None:
    """
    HeadBucket to verify access. Raises on failure.
    """
    try:
        await s3.head_bucket(Bucket=bucket)
    except ClientError as e:
        raise RuntimeError(f"Bucket '{bucket}' not accessible: {e}")


# ---------- Core S3 ops ----------

async def put_bytes(s3, bucket: str, key: str, data: bytes, content_type: Optional[str] = None, **extra):
    params = {
        "Bucket": bucket,
        "Key": key,
        "Body": data,
    }
    if content_type:
        params["ContentType"] = content_type
    params.update(extra)
    await s3.put_object(**params)


async def upload_file(s3, bucket: str, local: Path, key: str, skip_if_same_size: bool = True) -> Tuple[str, int]:
    """
    Upload a file. If skip_if_same_size is True, performs a HEAD to see if the size matches first.
    Returns (key, bytes_uploaded). If skipped, bytes_uploaded = 0.
    """
    size = local.stat().st_size
    if skip_if_same_size:
        try:
            head = await s3.head_object(Bucket=bucket, Key=key)
            if head.get("ContentLength") == size:
                # already there with same size -> skip
                return key, 0
        except ClientError as e:
            # Not found or other - continue to upload
            pass

    data = local.read_bytes()  # small files; for very large files, switch to multipart
    await put_bytes(s3, bucket, key, data, content_type=guess_content_type(local))
    return key, size


async def list_keys(s3, bucket: str, prefix: str) -> List[str]:
    keys: List[str] = []
    continuation = None
    while True:
        kwargs = {"Bucket": bucket, "Prefix": prefix}
        if continuation:
            kwargs["ContinuationToken"] = continuation
        resp = await s3.list_objects_v2(**kwargs)
        for item in resp.get("Contents", []):
            keys.append(item["Key"])
        if resp.get("IsTruncated"):
            continuation = resp.get("NextContinuationToken")
        else:
            break
    return keys


async def delete_keys(s3, bucket: str, keys: Iterable[str]) -> int:
    # Batch deletes (1000 max per call); we chunk by 1000 just in case
    keys = list(keys)
    total = 0
    for i in range(0, len(keys), 1000):
        chunk = keys[i:i+1000]
        if not chunk:
            continue
        resp = await s3.delete_objects(
            Bucket=bucket,
            Delete={"Objects": [{"Key": k} for k in chunk], "Quiet": True},
        )
        deleted = len(resp.get("Deleted", []))
        total += deleted
    return total


# ---------- Higher-level content helpers ----------

CHUNK_MP3_RE = re.compile(r"^(?P<stem>.+)_chunk(?P<index>\d+)\.mp3$", re.IGNORECASE)
TIMINGS_RE   = re.compile(r"^(?P<stem>.+)_chunk(?P<index>\d+)_timings\.json$", re.IGNORECASE)

def find_chunks_and_timings(audio_dir: Path) -> List[Tuple[Path, Optional[Path]]]:
    """
    Returns list of (mp3_path, timings_json_or_none), matched by shared stem/index.
    """
    mp3s = {p.name: p for p in audio_dir.glob("*.mp3")}
    jsons = {p.name: p for p in audio_dir.glob("*.json")}

    pairs: List[Tuple[Path, Optional[Path]]] = []
    for name, p in mp3s.items():
        m = CHUNK_MP3_RE.match(name)
        if not m:
            continue
        stem = m.group("stem")
        idx  = m.group("index")
        timings_name = f"{stem}_chunk{idx}_timings.json"
        pairs.append((p, jsons.get(timings_name)))
    return sorted(pairs, key=lambda t: t[0].name)


async def upload_all_for_slug(
    base_dir: Path,
    slug: str,
    bucket: str,
    concurrency: int = 8,
    include_metadata: bool = True,
) -> None:
    """
    Uploads text file(s) in base_dir/'text-files', audio files + timings in base_dir/'audio-files'.
    """
    prefixes = s3_prefixes(slug)
    text_dir = base_dir / "text-files"
    audio_dir = base_dir / "audio-files"

    session = get_session()
    async with session.client("s3") as s3:
        await ensure_bucket_readable(s3, bucket)

        # Collect uploads
        tasks: List[asyncio.Task] = []

        # Text files
        if text_dir.exists():
            for txt in sorted(text_dir.glob("*.txt")):
                key = f"{prefixes['text']}/{txt.name}"
                tasks.append(asyncio.create_task(upload_file(s3, bucket, txt, key)))
        else:
            print(f"[warn] No text-files directory at: {text_dir}")

        # Audio chunks + timings
        if audio_dir.exists():
            # Optional metadata.json
            if include_metadata:
                metadata = audio_dir / "metadata.json"
                if metadata.exists():
                    key = f"{prefixes['audio']}/metadata.json"
                    tasks.append(asyncio.create_task(upload_file(s3, bucket, metadata, key)))
            # mp3 + timings pairs
            for mp3, timings in find_chunks_and_timings(audio_dir):
                mp3_key = f"{prefixes['audio']}/{mp3.name}"
                tasks.append(asyncio.create_task(upload_file(s3, bucket, mp3, mp3_key)))
                if timings is not None:
                    t_key = f"{prefixes['audio']}/{timings.name}"
                    tasks.append(asyncio.create_task(upload_file(s3, bucket, timings, t_key)))
        else:
            print(f"[warn] No audio-files directory at: {audio_dir}")

        # Throttle concurrency
        # Instead of a semaphore wrapper for every task, we can run in limited batches.
        results: List[Tuple[str, int]] = []
        if concurrency < 1:
            concurrency = 1

        pending = tasks
        in_flight: set = set()
        while pending or in_flight:
            while pending and len(in_flight) < concurrency:
                t = pending.pop()
                in_flight.add(t)
            if not in_flight:
                break
            done, in_flight = await asyncio.wait(in_flight, return_when=asyncio.FIRST_COMPLETED)
            for d in done:
                try:
                    results.append(d.result())
                except Exception as e:
                    print(f"[error] Upload failed: {e}", file=sys.stderr)

        uploaded = sum(sz for _, sz in results)
        skipped  = len([1 for _, sz in results if sz == 0])
        print(f"[done] Completed uploads. Bytes uploaded: {uploaded:,}. Files skipped (already up-to-date): {skipped}.")


async def cmd_list(bucket: str, slug: str, which: str):
    prefixes = s3_prefixes(slug)
    prefix = {
        "all": prefixes["base"],
        "text": prefixes["text"],
        "audio": prefixes["audio"]
    }.get(which, prefixes["base"])

    session = get_session()
    async with session.client("s3") as s3:
        await ensure_bucket_readable(s3, bucket)
        keys = await list_keys(s3, bucket, prefix + "/")
        for k in keys:
            print(k)
        print(f"[info] {len(keys)} keys under '{prefix}/'")


async def cmd_delete_chunk(bucket: str, slug: str, stem: str):
    """
    Deletes both the mp3 and the *_timings.json for a given chunk stem.
    Example stem: tommy_turtle_chunk2
    """
    prefixes = s3_prefixes(slug)
    mp3_key = f"{prefixes['audio']}/{stem}.mp3"
    timing_key = f"{prefixes['audio']}/{stem}_timings.json"

    session = get_session()
    async with session.client("s3") as s3:
        await ensure_bucket_readable(s3, bucket)
        deleted = await delete_keys(s3, bucket, [mp3_key, timing_key])
        print(f"[info] Deleted {deleted} objects.")


async def cmd_delete_all(bucket: str, slug: str):
    prefixes = s3_prefixes(slug)
    base = prefixes["base"] + "/"
    session = get_session()
    async with session.client("s3") as s3:
        await ensure_bucket_readable(s3, bucket)
        keys = await list_keys(s3, bucket, base)
        if not keys:
            print(f"[info] Nothing to delete under '{base}'")
            return
        deleted = await delete_keys(s3, bucket, keys)
        print(f"[info] Deleted {deleted} objects under '{base}'.")


# ---------- CLI ----------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Async S3 uploader for text + chunked audio + timings.")
    p.add_argument("--bucket", required=False, default=os.getenv("AWS_AUDIO_CACHE_BUCKET"), help="Target S3 bucket (or set AWS_AUDIO_CACHE_BUCKET in .env)")
    p.add_argument("--region", required=False, default=os.getenv("AWS_REGION"), help="AWS region (optional; otherwise from env/credentials)")

    sub = p.add_subparsers(dest="cmd", required=True)

    # upload-all
    up_all = sub.add_parser("upload-all", help="Upload text + audio + timings from a base directory for a content slug.")
    up_all.add_argument("--base-dir", required=True, type=Path, help="Base directory that contains 'text-files' and 'audio-files'")
    up_all.add_argument("--slug", required=True, help="Content slug (becomes part of S3 prefix)")
    up_all.add_argument("--concurrency", type=int, default=8, help="Max concurrent uploads")
    up_all.add_argument("--no-metadata", action="store_true", help="Skip uploading audio-files/metadata.json")

    # list
    ls = sub.add_parser("list", help="List keys for a slug")
    ls.add_argument("--slug", required=True)
    ls.add_argument("--which", choices=["all", "text", "audio"], default="all")

    # delete-chunk
    dc = sub.add_parser("delete-chunk", help="Delete a specific chunk (mp3 + *_timings.json)")
    dc.add_argument("--slug", required=True)
    dc.add_argument("--stem", required=True, help="Chunk stem, e.g. 'tommy_turtle_chunk2'")

    # delete-all
    da = sub.add_parser("delete-all", help="Delete everything for a slug (DANGEROUS)")
    da.add_argument("--slug", required=True)

    return p


def main(argv: Optional[List[str]] = None):
    load_env()
    parser = build_parser()
    args = parser.parse_args(argv)

    if not args.bucket:
        parser.error("--bucket is required (or set AWS_AUDIO_CACHE_BUCKET in .env)")

    # Set region via env if supplied at CLI
    if getattr(args, "region", None):
        os.environ["AWS_REGION"] = args.region

    if args.cmd == "upload-all":
        include_metadata = not args.no_metadata
        asyncio.run(upload_all_for_slug(
            base_dir=args.base_dir,
            slug=args.slug,
            bucket=args.bucket,
            concurrency=args.concurrency,
            include_metadata=include_metadata
        ))
    elif args.cmd == "list":
        asyncio.run(cmd_list(bucket=args.bucket, slug=args.slug, which=args.which))
    elif args.cmd == "delete-chunk":
        asyncio.run(cmd_delete_chunk(bucket=args.bucket, slug=args.slug, stem=args.stem))
    elif args.cmd == "delete-all":
        asyncio.run(cmd_delete_all(bucket=args.bucket, slug=args.slug))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

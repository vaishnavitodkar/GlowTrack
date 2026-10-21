"""Idempotently index PDFs in the private GlowTrack Storage bucket."""
from __future__ import annotations

import hashlib
import json
import math
import os
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

BUCKET = "Skincare-Documents"
AI_PROVIDER = os.environ.get("AI_PROVIDER", "ollama").strip().lower()
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
EMBED_MODEL = os.environ.get("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
EMBEDDING_DIMENSIONS = 768
CHUNK_CHARS = 1800
OVERLAP_CHARS = 250
TRANSIENT_HTTP_STATUSES = {408, 429, 500, 502, 503, 504}
MAX_API_ATTEMPTS = 3


def api(url: str, *, method: str = "GET", headers: dict[str, str], body: bytes | None = None):
    for attempt in range(MAX_API_ATTEMPTS):
        request = Request(url, data=body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=60) as result:
                data = result.read()
                content_type = result.headers.get("content-type", "")
                return data if "application/json" not in content_type else json.loads(data)
        except HTTPError as error:
            if error.code in TRANSIENT_HTTP_STATUSES and attempt + 1 < MAX_API_ATTEMPTS:
                error.close()
                time.sleep(2 ** attempt)
                continue
            detail = error.read(500).decode("utf-8", "replace")
            raise RuntimeError(f"HTTP {error.code}: {detail}") from error
        except (URLError, TimeoutError, ConnectionError) as error:
            if attempt + 1 < MAX_API_ATTEMPTS:
                time.sleep(2 ** attempt)
                continue
            reason = getattr(error, "reason", error)
            raise RuntimeError(f"Network request failed: {reason}") from error


def chunks_for_page(page_number: int, text: str):
    text = " ".join(text.split())
    if not text:
        return []
    output = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_CHARS, len(text))
        if end < len(text):
            split_at = text.rfind(" ", start + CHUNK_CHARS // 2, end)
            if split_at > start:
                end = split_at
        content = text[start:end].strip()
        if content:
            output.append({"page_number": page_number, "chunk_index": len(output), "content": content,
                           "content_sha256": hashlib.sha256(content.encode()).hexdigest()})
        if end >= len(text):
            break
        start = max(start + 1, end - OVERLAP_CHARS)
    return output


def embed_batch(texts: list[str]):
    payload = json.dumps({"model": EMBED_MODEL, "input": [f"search_document: {text}" for text in texts]}).encode()
    data = api(f"{OLLAMA_BASE_URL}/api/embed", method="POST",
               headers={"Content-Type": "application/json"}, body=payload)
    vectors = data.get("embeddings", [])
    if len(vectors) != len(texts) or any(
        len(vector) != EMBEDDING_DIMENSIONS
        or any(not isinstance(value, (int, float)) or not math.isfinite(value) for value in vector)
        for vector in vectors
    ):
        raise RuntimeError(f"Ollama embedding response must contain {EMBEDDING_DIMENSIONS}-dimensional finite vectors")
    return vectors


def verify_ollama_embedding():
    vector = embed_batch(["GlowTrack local embedding dimension verification"])[0]
    print(f"Ollama model {EMBED_MODEL} returned {len(vector)} dimensions; expected {EMBEDDING_DIMENSIONS}.")


def main():
    if sys.argv[1:] == ["--verify-ollama"]:
        try:
            verify_ollama_embedding()
            return 0
        except Exception as error:
            print(f"Ollama verification failed: {error}", file=sys.stderr)
            return 2

    try:
        from pypdf import PdfReader
    except ImportError:
        print("Install the PDF worker dependency with: python -m pip install -r requirements-rag.txt", file=sys.stderr)
        return 2

    target_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    target_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    # Optional split credentials let a trusted local worker read the private
    # hosted source bucket while writing only to a local/test Supabase target.
    source_url = os.environ.get("SKINCARE_SOURCE_SUPABASE_URL", target_url).rstrip("/")
    source_key = os.environ.get("SKINCARE_SOURCE_SERVICE_ROLE_KEY", target_key)
    if AI_PROVIDER != "ollama":
        print(f"Unsupported AI_PROVIDER {AI_PROVIDER!r}; this worker currently supports ollama.", file=sys.stderr)
        return 2
    if not target_url or not target_key:
        print("Set the target SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in this worker's environment.", file=sys.stderr)
        return 2
    if not source_url or not source_key:
        print("Set SKINCARE_SOURCE_SUPABASE_URL and SKINCARE_SOURCE_SERVICE_ROLE_KEY for the private source bucket.", file=sys.stderr)
        return 2
    target_host = urlparse(target_url).hostname
    if target_host not in {"localhost", "127.0.0.1"} and os.environ.get("SKINCARE_ALLOW_REMOTE_INGEST") != "1":
        print("Refusing to write to a non-local Supabase target. Set SKINCARE_ALLOW_REMOTE_INGEST=1 only after explicitly approving remote ingestion.", file=sys.stderr)
        return 2
    try:
        verify_ollama_embedding()
    except Exception as error:
        print(f"Ollama preflight failed; no Storage objects were read and no database rows were changed: {error}", file=sys.stderr)
        return 2

    source_storage = f"{source_url}/storage/v1"
    target_rest = f"{target_url}/rest/v1"
    source_headers = {"apikey": source_key, "Authorization": f"Bearer {source_key}"}
    target_headers = {"apikey": target_key, "Authorization": f"Bearer {target_key}"}
    listed = api(f"{source_storage}/object/list/{quote(BUCKET, safe='')}", method="POST",
                 headers={**source_headers, "Content-Type": "application/json"},
                 body=json.dumps({"prefix": "", "limit": 1000, "offset": 0,
                                  "sortBy": {"column": "name", "order": "asc"}}).encode())
    if not isinstance(listed, list):
        raise RuntimeError("Storage returned an unexpected object listing")
    documents = api(f"{target_rest}/skincare_documents?select=object_path,source_sha256,ingestion_status,embedding_model&bucket_id=eq.{quote(BUCKET, safe='')}", headers=target_headers)
    previous = {row["object_path"]: row for row in documents}
    incompatible = [row for row in previous.values()
                    if row.get("ingestion_status") == "ready" and row.get("embedding_model") != EMBED_MODEL]
    if incompatible:
        models = sorted({str(row.get("embedding_model") or "unknown") for row in incompatible})
        raise RuntimeError(
            f"Ready documents use a different embedding model ({', '.join(models)}). "
            "No PDF was downloaded or changed; migrate into a versioned vector destination before re-embedding."
        )
    pdfs = [item for item in listed if isinstance(item, dict) and item.get("name", "").lower().endswith(".pdf")]
    print(f"Found {len(pdfs)} PDF objects in the private bucket.")
    failures = 0

    for index, item in enumerate(pdfs, start=1):
        path = item["name"]
        digest = "unavailable"
        print(f"[{index}/{len(pdfs)}] Processing {path}…")
        try:
            encoded_path = quote(path, safe="/")
            blob = api(f"{source_storage}/object/{quote(BUCKET, safe='')}/{encoded_path}", headers=source_headers)
            digest = hashlib.sha256(blob).hexdigest()
            old = previous.get(path)
            if old and old.get("source_sha256") == digest and old.get("ingestion_status") == "ready":
                print("  unchanged; already indexed")
                continue

            reader = PdfReader(__import__("io").BytesIO(blob), strict=False)
            page_chunks = []
            for page_no, page in enumerate(reader.pages, start=1):
                page_chunks.extend(chunks_for_page(page_no, page.extract_text() or ""))
            if not page_chunks:
                raise RuntimeError("No extractable text found; OCR is not configured")

            api(f"{target_rest}/rpc/ingest_skincare_document", method="POST",
                headers={**target_headers, "Content-Type": "application/json"},
                body=json.dumps({"p_bucket_id": BUCKET, "p_object_path": path, "p_document_name": path.rsplit("/", 1)[-1],
                                 "p_source_sha256": digest, "p_status": "processing", "p_page_count": len(reader.pages),
                                 "p_chunks": [], "p_embedding_model": EMBED_MODEL}).encode())

            for start in range(0, len(page_chunks), 64):
                batch = page_chunks[start:start + 64]
                vectors = embed_batch([chunk["content"] for chunk in batch])
                for chunk, vector in zip(batch, vectors):
                    chunk["embedding"] = "[" + ",".join(f"{value:.8f}" for value in vector) + "]"

            api(f"{target_rest}/rpc/ingest_skincare_document", method="POST",
                headers={**target_headers, "Content-Type": "application/json"},
                body=json.dumps({"p_bucket_id": BUCKET, "p_object_path": path, "p_document_name": path.rsplit("/", 1)[-1],
                                 "p_source_sha256": digest, "p_status": "ready", "p_page_count": len(reader.pages),
                                 "p_chunks": page_chunks, "p_embedding_model": EMBED_MODEL}).encode())
            print(f"  indexed {len(page_chunks)} chunks across {len(reader.pages)} pages")
        except Exception as error:  # error text excludes extracted PDF contents and credentials
            failures += 1
            print(f"  failed: {error}", file=sys.stderr)
            try:
                if digest == "unavailable":
                    raise RuntimeError("No object checksum was available to record")
                api(f"{target_rest}/rpc/ingest_skincare_document", method="POST",
                    headers={**target_headers, "Content-Type": "application/json"},
                    body=json.dumps({"p_bucket_id": BUCKET, "p_object_path": path,
                                     "p_document_name": path.rsplit("/", 1)[-1], "p_source_sha256": digest,
                                     "p_status": "failed", "p_error": str(error)[:500], "p_chunks": [],
                                     "p_embedding_model": EMBED_MODEL}).encode())
            except Exception:
                pass
        time.sleep(0.1)

    print(f"Ingestion finished: {len(pdfs) - failures} successful or unchanged, {failures} failed.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

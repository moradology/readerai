# Passage Extractor User Guide

The Passage Extractor is a command-line tool that breaks down longer texts into semantically coherent, self-contained passages. These passages can serve as the foundation for comprehension and vocabulary exercises.

## Key Features

- **Memory-Efficient Streaming**: Process files of any size with minimal memory footprint
- **Semantic Coherence**: Extract passages that maintain narrative integrity and make sense on their own
- **Quality Validation**: Evaluate passages against multiple quality dimensions (optional)
- **Project Gutenberg Support**: Automatically handle header/footer cleaning for public domain books
- **Unix Pipeline Integration**: Seamlessly connects with other command-line tools

## Installation

The Passage Extractor is part of the ReaderAI package. To install it:

```bash
# Clone the repository
git clone https://github.com/your-org/readerai.git
cd readerai

# Install the package with uv (recommended)
uv pip install -e .

# Or with traditional pip
pip install -e .
```

## Environment Setup

Before using the tool, make sure you have set up your environment:

1. Create a `.env` file in your project directory
2. Add your Google API key:
   ```
   GOOGLE_API_KEY=your_google_api_key
   ```

## How It Works

The Passage Extractor processes text in a streaming fashion:

1. **Stream Processing**: Text is read line-by-line from stdin, avoiding loading the entire file into memory
2. **Chunk Creation**: Content is accumulated into manageable chunks at natural paragraph boundaries
3. **Passage Extraction**: Each chunk is processed by an LLM to identify coherent passages
4. **Quality Validation**: (Optional) Each passage is evaluated for coherence, independence, etc.
5. **Immediate Output**: Passages are written to stdout or a file as they're processed

This design enables processing of extremely large files (like entire novels) without memory constraints.

![Passage Extractor Flow](https://mermaid.ink/img/pako:eNplksFuwjAMhl_F8mFSpzKJw4AKadIkOExiF1R6CG3cNqJNUCYQD7XvPhOgjJ1y-f3bv-04B1FrDQJELe_aNtYSLmmyZMPU_L4xJIVWw1X2RXJMk2sGnV1baEqGXcAVKUPcnZcNccpw0qOW7FEOXuqgMPyKI41XFcz5t8mKtEF5n6QdOt4Vqe9Rx4F3HMw1-OAj6JHAZxzUbVD0mAWxH44c-I5-LnUb2U7kn3M5cDvs2WRwrk8y1lVrxIBN4jDGxZN5BFdzM3Qe-fZF3Qnt8BZBj7U26CkHHCFaNlYX6bvQYFYQjLKN6Jv6G0b5-cXnlmKDSf4aN7FGYaWx55Vj6qvM6gzvqYbmVhgXmQC9Z_W6qJtUwE4o3rWwEe50YVZCpCTbBe_zyeKTJ_QZf9QUiZuZ9e4x1f4T9GYWfL6jFyCkZ6FrjYq9Ou9vOCX1aw?type=png)

## Basic Usage

The Passage Extractor is designed to work with Unix-style pipelines. It reads text from standard input and writes passage data in line-delimited JSON format to standard output.

```bash
# Basic usage
cat your_text_file.txt | readerai-passages > passages.jsonl

# Process a Project Gutenberg book
curl -s https://www.gutenberg.org/files/1342/1342-0.txt | readerai-passages > pride_and_prejudice_passages.jsonl

# Watch progress in real-time
cat moby_dick.txt | readerai-passages --verbose > moby_dick_passages.jsonl

# Process a file with customized settings
cat war_and_peace.txt | readerai-passages --max_chunk_size 20000 --chunk_overlap 3000 \
  --min_paragraphs 2 --max_paragraphs 5 --strip-formatting > war_and_peace_passages.jsonl
```

## Command-Line Options

```
usage: readerai-passages [-h] [--output_file OUTPUT_FILE] [--min_paragraphs MIN_PARAGRAPHS]
                        [--max_paragraphs MAX_PARAGRAPHS] [--validate] [--no-validate]
                        [--max_chunk_size MAX_CHUNK_SIZE] [--chunk_overlap CHUNK_OVERLAP]
                        [--verbose] [--model MODEL] [--clean-text] [--strip-formatting]

Extract passages from text.

options:
  -h, --help            show this help message and exit
  --output_file OUTPUT_FILE
                        Output file path (defaults to stdout)
  --min_paragraphs MIN_PARAGRAPHS
                        Minimum paragraphs per passage (default: 3)
  --max_paragraphs MAX_PARAGRAPHS
                        Maximum paragraphs per passage (default: 7)
  --validate            Perform quality validation (default: True)
  --no-validate         Skip quality validation
  --max_chunk_size MAX_CHUNK_SIZE
                        Maximum chunk size in characters (default: 15000)
  --chunk_overlap CHUNK_OVERLAP
                        Chunk overlap in characters (default: 2000)
  --verbose, -v         Enable verbose progress reporting
  --model MODEL         LLM model to use (default: gemini/gemini-2.0-flash-001)
  --clean-text          Clean special characters from text (default: True)
  --strip-formatting    Remove formatting characters like underscores and asterisks
```

## Output Format

The output is in line-delimited JSON (JSONL) format, with each line containing a passage object:

```json
{"title": "The Cathedral's Solitude", "content": "The sunlight poured through the stained-glass windows...", "chunk_index": 0, "timestamp": "2025-04-11 13:36:43", "quality_metrics": {"coherence": 5, "independence": 4, "boundaries": 5, "title_relevance": 5, "content_purity": 5, "feedback": "This passage forms a complete narrative unit...", "overall_score": 4.8}}
{"title": "A Writer's Challenge", "content": "Across town, in a small apartment overlooking the river...", "chunk_index": 0, "timestamp": "2025-04-11 13:37:12", "quality_metrics": {"coherence": 4, "independence": 5, "boundaries": 4, "title_relevance": 5, "content_purity": 5, "feedback": "This passage stands well on its own...", "overall_score": 4.6}}
```

Each passage includes:

- `title`: A descriptive title for the passage
- `content`: The text content of the passage
- `chunk_index`: Which chunk of the original text this passage came from
- `timestamp`: When the passage was extracted
- `quality_metrics`: (If validation is enabled) Quality metrics for the passage:
  - `coherence`: How well the passage represents a complete thought (1-5)
  - `independence`: How well the passage can be understood without external context (1-5)
  - `boundaries`: How natural the passage boundaries are (1-5)
  - `title_relevance`: How well the title reflects the content (1-5)
  - `content_purity`: How free the passage is from extraneous material (1-5)
  - `feedback`: Specific feedback on the passage quality
  - `overall_score`: Average of all quality scores

## Real-Time Progress Monitoring

With the `--verbose` flag, you can monitor the extraction process in real-time:

```
$ cat moby_dick.txt | readerai-passages --verbose > moby_dick_passages.jsonl

Starting stream processing from stdin using model: gemini/gemini-2.0-flash-001...
Configuration:
  - Chunk size: 15000 chars
  - Chunk overlap: 2000 chars
  - Paragraphs per passage: 3-7
  - Quality validation: True
Processing stream at position 15243 bytes, chunk 1...
  Rate: 15243.21 chars/sec
  Extracted passage: The Whiteness of the Whale
  Extracted passage: Captain Ahab's Quest
Processing stream at position 31892 bytes, chunk 2...
  Rate: 12756.80 chars/sec
  Extracted passage: The Pequod Sets Sail
...

Processing complete: 12 chunks, 47 passages extracted
Total processing time: 189.54 seconds
Average processing rate: 8753.21 chars/sec
Average passage size: 2232.68 chars/passage
```

## Special Character Handling

The Passage Extractor can automatically handle special characters that might cause issues:

- **Smart Quotes & Dashes**: Converted to standard ASCII equivalents
- **Formatting Characters**: Optionally remove emphasis markers like `_italic_` or `*bold*`
- **Project Gutenberg Headers/Footers**: Automatically detected and removed

This simplifies downstream processing and display of passages.

## Performance Considerations

- **Memory Efficiency**: The streaming approach means RAM usage stays nearly constant regardless of file size
- **Processing Speed**: Depends primarily on LLM request latency, not file size
- **Validation Trade-off**: The `--no-validate` option reduces LLM calls by approximately 50%
- **Progress Monitoring**: Use `--verbose` for real-time statistics on processing rate
- **Error Recovery**: The tool can continue processing even if individual chunks fail

## Example Shell Scripts

### Process all text files in a directory

```bash
#!/bin/bash
mkdir -p passages
for file in *.txt; do
  echo "Processing $file..."
  cat "$file" | readerai-passages --output_file "passages/${file%.txt}.jsonl"
done
```

### Convert passages to readable format

```bash
#!/bin/bash
# Takes a JSONL file and outputs passages in a human-readable format
input_file=$1
output_file="${input_file%.jsonl}.txt"

echo "Converting $input_file to readable format in $output_file..."
cat "$input_file" | jq -r '"\(._index_+1). \(.title)\n\n\(.content)\n\n---\n"' > "$output_file"
echo "Done!"
```

### Extract passages from a large corpus

```bash
#!/bin/bash
# Process a directory of books with progress tracking

CORPUS_DIR="./books"
OUTPUT_DIR="./passages"
mkdir -p "$OUTPUT_DIR"

echo "Processing corpus of $(find "$CORPUS_DIR" -name "*.txt" | wc -l) books..."

for book in "$CORPUS_DIR"/*.txt; do
  basename=$(basename "$book" .txt)
  echo "$(date +"%Y-%m-%d %H:%M:%S") - Starting $basename..."

  cat "$book" | readerai-passages \
    --output_file "$OUTPUT_DIR/$basename.jsonl" \
    --verbose \
    --no-validate

  echo "$(date +"%Y-%m-%d %H:%M:%S") - Completed $basename"
done

echo "Corpus processing complete."
```

## Advanced Usage Examples

### Process only specific sections of a file

```bash
# Extract passages only from chapters 10-20 of a book
sed -n '/Chapter 10/,/Chapter 21/p' full_book.txt | readerai-passages > chapters_10_to_20.jsonl
```

### Filter passages by quality score

```bash
# Extract only high-quality passages (overall score >= 4.0)
cat passages.jsonl | jq -c 'select(.quality_metrics.overall_score >= 4.0)' > high_quality_passages.jsonl
```

### Convert passages to CSV for spreadsheet analysis

```bash
# Convert JSONL to CSV format
cat passages.jsonl | jq -r '[.title, .content, .quality_metrics.overall_score] | @csv' > passages.csv
```

## Troubleshooting

- **Error: GOOGLE_API_KEY not found**: Make sure you have created a `.env` file with your API key.
- **No passages extracted**: Check if your text is too short or lacks clear semantic boundaries.
- **Processing seems slow**: Use `--verbose` to monitor progress. For very large files, extraction takes time.
- **Out of memory errors**: This shouldn't happen with streaming mode. Reduce `--max_chunk_size` if needed.
- **Poor quality passages**: Adjust the `--min_paragraphs` and `--max_paragraphs` parameters to better match your content.
- **Unicode/special character issues**: The `--clean-text` option (enabled by default) should handle most cases.

## Development and Testing

To run the test suite for the passage extractor:

```bash
uv run pytest -xvs tests/test_passage_extractor.py
```

To profile memory usage during processing:

```bash
/usr/bin/time -v cat large_file.txt | readerai-passages > /dev/null
```

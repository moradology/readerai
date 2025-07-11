#!/usr/bin/env python
"""
Vocabulary Flow CLI

Usage:
  readerai-vocabulary --passage TEXT [--model MODEL] [--json]
  readerai-vocabulary --passage-file PATH [--model MODEL] [--json]
"""

import argparse
import json
import os
import sys
from pathlib import Path

from readerai.flows.vocabulary import VocabularyFlow
from readerai.utils.dspy_config import configure_dspy


def main():
    parser = argparse.ArgumentParser(
        description="Run vocabulary analysis on a text passage"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--passage", help="Direct text input for analysis")
    group.add_argument(
        "--passage-file", type=Path, help="Path to text file containing passage"
    )

    parser.add_argument(
        "--model",
        default=os.getenv("DEFAULT_LLM_MODEL", "gemini/gemini-2.5-flash-preview-04-17"),
        help="LLM model to use (default: $DEFAULT_LLM_MODEL from .env)",
    )
    parser.add_argument(
        "--json", action="store_true", help="Output results in JSON format"
    )

    args = parser.parse_args()

    # Read passage content
    if args.passage_file:
        passage = args.passage_file.read_text(encoding="utf-8")
    else:
        passage = args.passage

    # Configure DSPy
    try:
        configure_dspy(model_name=args.model)
    except Exception as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        sys.exit(1)

    # Run vocabulary flow
    flow = VocabularyFlow()
    result = flow(passage=passage)

    # Format output
    if args.json:
        print(json.dumps(result.toDict(), indent=2))
    else:
        print(f"Challenging Word: {result.challenging_word}")
        print(f"Question: {result.question}")
        print(f"Viability: {result.question_viability}")
        print(f"Feedback: {result.feedback}")


if __name__ == "__main__":
    main()

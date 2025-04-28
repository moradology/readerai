#!/usr/bin/env python
"""
Comprehension Flow CLI

Usage:
  readerai-comprehension --passage TEXT [--model MODEL] [--json]
  readerai-comprehension --passage-file PATH [--model MODEL] [--json]
"""

import argparse
import json
import os
import sys
from pathlib import Path

from readerai.flows.comprehension import ComprehensionFlow
from readerai.utils.dspy_config import configure_dspy


def main():
    parser = argparse.ArgumentParser(
        description="Run comprehension analysis on a text passage"
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

    # Run comprehension flow
    flow = ComprehensionFlow()
    result = flow(passage=passage)

    # Format output
    if args.json:
        print(json.dumps(result.toDict(), indent=2))
    else:
        print(f"Question: {result.question}")
        print(f"Answerable: {result.answerable}")
        if result.answerable:
            print(f"Relevance Score: {result.relevance_score}/5")
            print(f"Depth Score: {result.depth_score}/5")
            print(f"Specificity Score: {result.specificity_score}/5")
        print(f"Feedback: {result.feedback}")


if __name__ == "__main__":
    main()

"""
Passage Extractor Flow

This module provides functionality to extract semantically coherent passages from text.
It divides longer texts into self-contained segments that maintain narrative integrity.
"""

import json
from typing import Any

import dspy

# Import TEST_PASSAGE for testing, with fallback
try:
    from readerai.constants import TEST_PASSAGE
except ImportError:
    TEST_PASSAGE = "Default passage for testing extraction functionality."

# --- DSPy Signatures ---


class PassageSegmentation(dspy.Signature):
    """Signature for segmenting text into passages."""

    text: str = dspy.InputField(
        description="The text to be segmented into semantically coherent passages."
    )
    target_length: int = dspy.InputField(
        description="Preferred number of paragraphs per passage, though only extract passages that form complete, coherent units."
    )
    passages: list[dict[str, str]] = dspy.OutputField(
        description="List of extracted passages, each with a title and content. Some text may not yield good passages."
    )


class PassageQualityEvaluation(dspy.Signature):
    """Signature for evaluating the quality of an extracted passage."""

    passage_title: str = dspy.InputField(description="The title of the passage.")
    passage_content: str = dspy.InputField(description="The content of the passage.")
    coherence_score: int = dspy.OutputField(
        description="How well the passage represents a complete thought (1-5)."
    )
    independence_score: int = dspy.OutputField(
        description="How well the passage can be understood without external context (1-5)."
    )
    boundaries_score: int = dspy.OutputField(
        description="How natural the passage boundaries are (1-5)."
    )
    title_relevance_score: int = dspy.OutputField(
        description="How well the title reflects the content (1-5)."
    )
    content_purity_score: int = dspy.OutputField(
        description="How free the passage is from extraneous material (1-5)."
    )
    feedback: str = dspy.OutputField(
        description="Specific feedback on the passage quality."
    )


# --- Main Flow Module ---


class PassageExtractorFlow(dspy.Module):
    """
    A module that extracts semantically coherent passages from text.
    Takes a chunk of text and produces 0 or more semantic passages.
    """

    def __init__(self):
        """
        Initialize the passage extractor flow.
        Sets up the segmenter and quality evaluator components.
        """
        super().__init__()
        self.segmenter = dspy.ChainOfThought(PassageSegmentation)
        self.quality_evaluator = dspy.ChainOfThought(PassageQualityEvaluation)

    def forward(
        self, text: str, target_length: int = 5, validate_quality: bool = True
    ) -> dspy.Prediction:
        """
        Extract semantically coherent passages from the provided text chunk.

        Args:
            text: The text chunk to extract passages from
            target_length: Preferred number of paragraphs per passage, but quality and coherence take precedence
            validate_quality: Whether to perform quality validation on passages

        Returns:
            dspy.Prediction containing passages and quality metrics. May return empty passages if no good
            semantic units are found in the text.
        """
        # 1. Segment the text into passages
        segmentation_result = self.segmenter(text=text, target_length=target_length)

        # Handle case where no valid passages were produced
        if not segmentation_result.passages or len(segmentation_result.passages) == 0:
            return dspy.Prediction(
                passages=[],
                error="Failed to extract any valid passages from the text.",
                quality_metrics=None,
            )

        # 2. Evaluate passage quality if requested
        if validate_quality:
            quality_metrics = []

            for passage in segmentation_result.passages:
                # Evaluate each passage's quality
                quality_result = self.quality_evaluator(
                    passage_title=passage["title"], passage_content=passage["content"]
                )

                # Add metrics to the passage
                passage["quality_metrics"] = {
                    "coherence": quality_result.coherence_score,
                    "independence": quality_result.independence_score,
                    "boundaries": quality_result.boundaries_score,
                    "title_relevance": quality_result.title_relevance_score,
                    "content_purity": quality_result.content_purity_score,
                    "feedback": quality_result.feedback,
                    "overall_score": (
                        quality_result.coherence_score
                        + quality_result.independence_score
                        + quality_result.boundaries_score
                        + quality_result.title_relevance_score
                        + quality_result.content_purity_score
                    )
                    / 5,
                }

                quality_metrics.append(passage["quality_metrics"])
        else:
            quality_metrics = None

        # 3. Return the results
        return dspy.Prediction(
            passages=segmentation_result.passages, quality_metrics=quality_metrics
        )

    def to_jsonl(self, passages: list[dict[str, Any]]) -> str:
        """
        Convert passages to JSONL format.

        Args:
            passages: List of passage dictionaries

        Returns:
            String in JSONL format
        """
        return "\n".join(json.dumps(p) for p in passages)

    # --- Metric function for optimization ---
    @classmethod
    def metric(cls, example, prediction, trace=None):
        """
        Metric function for evaluating passage extraction quality.
        Primarily for use with MIPROv2 optimization.

        Args:
            example: Expected output (ground truth)
            prediction: Model prediction to evaluate
            trace: Optional execution trace

        Returns:
            Score between 0.0 and 1.0
        """
        # Convert prediction to dictionary if needed
        pred_dict = (
            prediction
            if isinstance(prediction, dict)
            else prediction.toDict()
            if hasattr(prediction, "toDict")
            else vars(prediction)
        )

        # Get passages from prediction
        pred_passages = pred_dict.get("passages", [])

        # Basic check: did we extract any passages?
        if not pred_passages:
            # It's actually ok if we don't extract passages from poor quality text
            # This is a valid outcome for low-quality input text
            # For testing purposes, we'll return 0 only if we expected passages
            if (
                hasattr(example, "expected_passage_count")
                and example.expected_passage_count > 0
            ):
                return 0.0
            else:
                return 0.5  # No passages might be correct for certain inputs

        # If example expects passages, evaluate quality over quantity
        if hasattr(example, "expected_passage_count"):
            # We prefer fewer high-quality passages over more low-quality ones
            # A reasonable deviation from expected count is acceptable
            actual_count = len(pred_passages)

            # Calculate how close we are to expected count, but with flexibility
            # We care more about being within a reasonable range than exact matches
            count_diff_ratio = abs(actual_count - example.expected_passage_count) / max(
                example.expected_passage_count, 1
            )
            count_score = 1.0 - min(
                1.0, count_diff_ratio * 0.5
            )  # Less strict penalty for count differences

            # Only moderate weight on passage count - it's a guideline, not a rule
            return max(0.3, count_score * 0.6)

        # Quality evaluation is the primary metric
        if hasattr(example, "minimum_quality_score") and "quality_metrics" in pred_dict:
            # Extract quality scores from passages that have them
            quality_scores = []
            for p in pred_passages:
                if isinstance(p, dict) and p.get("quality_metrics"):
                    score = p.get("quality_metrics", {}).get("overall_score", 0)
                    if score > 0:
                        quality_scores.append(score)

            # Calculate average quality
            if quality_scores:
                avg_quality = sum(quality_scores) / len(quality_scores)
                min_score = max(0.1, getattr(example, "minimum_quality_score", 1.0))

                # Heavily weight quality - this is what matters most
                return max(0.4, min(1.0, avg_quality / min_score) * 0.9)

            # Even if we can't evaluate quality precisely, extracting passages is still good
            return 0.6

        # Default score for having extracted some passages
        return 0.8  # Good but not perfect (quality matters most)


# --- Main block for direct execution (Testing/Compilation) ---
if __name__ == "__main__":
    from readerai.utils.dspy_config import configure_dspy

    configure_dspy()

    # --- Examples for testing and optimization ---
    examples = [
        # Example 1: Basic passage extraction
        dspy.Example(
            text="Chapter 1\n\nIt was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way - in short, the period was so far like the present period, that some of its noisiest authorities insisted on its being received, for good or for evil, in the superlative degree of comparison only.\n\nThere were a king with a large jaw and a queen with a plain face, on the throne of England; there were a king with a large jaw and a queen with a fair face, on the throne of France. In both countries it was clearer than crystal to the lords of the State preserves of loaves and fishes, that things in general were settled for ever.\n\nChapter 2\n\nIt was the Dover road that lay, on a Friday night late in November, before the first of the persons with whom this history has business.",
            target_length=2,
            expected_passage_count=2,
            minimum_quality_score=3.5,
        ),
        # Example 2: Text with complex structure
        dspy.Example(
            text="The sunlight poured through the stained-glass windows, casting a kaleidoscope of colors across the marble floor. The cathedral stood empty save for a solitary figure kneeling in prayer at the altar. Outside, the sounds of the city were muffled by the thick stone walls, creating an atmosphere of serene contemplation.\n\nDays earlier, the same cathedral had been filled with mourners, their collective grief hanging in the air like incense. The funeral had drawn people from across the country, a testament to the deceased's impact on so many lives. Now, in the quiet aftermath, only memories remained.\n\nAcross town, in a small apartment overlooking the river, a woman sat at her desk, pen in hand. The blank page before her seemed to mock her attempts at finding the right words. How could she possibly capture in writing the essence of a life so fully lived? The biography she had been commissioned to write suddenly felt like an impossible task.",
            target_length=1,
            expected_passage_count=2,
            minimum_quality_score=4.0,
        ),
    ]

    # Format examples for compilation/testing
    examples_with_inputs = [
        example.with_inputs("text", "target_length") for example in examples
    ]

    # --- Instantiate the Flow ---
    extractor_flow = PassageExtractorFlow()

    # --- Run with basic model (using TEST_PASSAGE from constants) ---
    print("\n--- Basic Model Test Run ---")
    basic_result = extractor_flow(
        text=TEST_PASSAGE, target_length=4, validate_quality=True
    )

    # Print passages in readable format
    print(f"Extracted {len(basic_result.passages)} passages:")
    for i, passage in enumerate(basic_result.passages):
        print(f"\nPASSAGE {i + 1}: {passage['title']}")
        print(passage["content"])
        if "quality_metrics" in passage:
            print("\nQuality Metrics:")
            for key, value in passage["quality_metrics"].items():
                if key != "feedback":
                    print(f"  {key}: {value}")
            print(f"  feedback: {passage['quality_metrics']['feedback']}")

    # --- Optional: Compile with MIPROv2 ---
    print("\n--- Compiling with MIPROv2 ---")
    compile_flow = False  # Set to True to enable compilation (resource-intensive)
    if compile_flow:
        try:
            compflow_optimizer = dspy.MIPROv2(
                metric=PassageExtractorFlow.metric,
                num_candidates=2,
                max_bootstrapped_demos=2,
            )
            optimized_extractor = compflow_optimizer.compile(
                student=extractor_flow, trainset=examples_with_inputs, max_iters=1
            )

            print("\n--- Optimized Model Test Run ---")
            optimized_result = optimized_extractor(
                text=TEST_PASSAGE, target_length=4, validate_quality=True
            )
            print(f"Extracted {len(optimized_result.passages)} passages")

        except Exception as e:
            print(f"!!! ERROR during compilation: {e} !!!")
            print("Skipping optimized run.")
    else:
        print("Skipping compilation.")

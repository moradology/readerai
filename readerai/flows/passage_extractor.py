"""
Passage Extractor Flow

This module provides functionality to extract semantically coherent passages from text.
It divides longer texts into self-contained segments that maintain narrative integrity.
"""

import os
import json
import dspy
from typing import Dict, Any, Optional, List, Union

# Import TEST_PASSAGE for testing, with fallback
try:
    from ..constants import TEST_PASSAGE
except ImportError:
    print("Warning: Could not import TEST_PASSAGE from readerai.constants. Using default.")
    TEST_PASSAGE = "Default passage for testing extraction functionality."

# --- DSPy Signatures ---

class PassageSegmentation(dspy.Signature):
    """Signature for segmenting text into passages."""
    text: str = dspy.InputField(description="The text to be segmented into passages.")
    target_length: int = dspy.InputField(description="Target number of paragraphs per passage (3-7 is ideal).")
    passages: List[Dict[str, str]] = dspy.OutputField(description="List of extracted passages, each with a title and content.")

class PassageQualityEvaluation(dspy.Signature):
    """Signature for evaluating the quality of an extracted passage."""
    passage_title: str = dspy.InputField(description="The title of the passage.")
    passage_content: str = dspy.InputField(description="The content of the passage.")
    coherence_score: int = dspy.OutputField(description="How well the passage represents a complete thought (1-5).")
    independence_score: int = dspy.OutputField(description="How well the passage can be understood without external context (1-5).")
    boundaries_score: int = dspy.OutputField(description="How natural the passage boundaries are (1-5).")
    title_relevance_score: int = dspy.OutputField(description="How well the title reflects the content (1-5).")
    content_purity_score: int = dspy.OutputField(description="How free the passage is from extraneous material (1-5).")
    feedback: str = dspy.OutputField(description="Specific feedback on the passage quality.")

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
    
    def forward(self, text: str, target_length: int = 5, validate_quality: bool = True) -> dspy.Prediction:
        """
        Extract passages from the provided text chunk.
        
        Args:
            text: The text chunk to extract passages from
            target_length: Target number of paragraphs per passage (3-7 recommended)
            validate_quality: Whether to perform quality validation on passages
            
        Returns:
            dspy.Prediction containing passages and quality metrics
        """
        # 1. Segment the text into passages
        segmentation_result = self.segmenter(text=text, target_length=target_length)
        
        # Handle case where no valid passages were produced
        if not segmentation_result.passages or len(segmentation_result.passages) == 0:
            return dspy.Prediction(
                passages=[],
                error="Failed to extract any valid passages from the text.",
                quality_metrics=None
            )
        
        # 2. Evaluate passage quality if requested
        if validate_quality:
            quality_metrics = []
            
            for passage in segmentation_result.passages:
                # Evaluate each passage's quality
                quality_result = self.quality_evaluator(
                    passage_title=passage['title'],
                    passage_content=passage['content']
                )
                
                # Add metrics to the passage
                passage['quality_metrics'] = {
                    'coherence': quality_result.coherence_score,
                    'independence': quality_result.independence_score,
                    'boundaries': quality_result.boundaries_score,
                    'title_relevance': quality_result.title_relevance_score,
                    'content_purity': quality_result.content_purity_score,
                    'feedback': quality_result.feedback,
                    'overall_score': (
                        quality_result.coherence_score +
                        quality_result.independence_score +
                        quality_result.boundaries_score +
                        quality_result.title_relevance_score + 
                        quality_result.content_purity_score
                    ) / 5
                }
                
                quality_metrics.append(passage['quality_metrics'])
        else:
            quality_metrics = None
        
        # 3. Return the results
        return dspy.Prediction(
            passages=segmentation_result.passages,
            quality_metrics=quality_metrics
        )
    
    def to_jsonl(self, passages: List[Dict[str, Any]]) -> str:
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
        pred_dict = prediction if isinstance(prediction, dict) else prediction.toDict() if hasattr(prediction, 'toDict') else vars(prediction)
        
        # Get passages from prediction
        pred_passages = pred_dict.get('passages', [])
        
        # Basic check: did we extract any passages?
        if not pred_passages:
            return 0.0
            
        # Compare passage count if example has an expected count
        if hasattr(example, 'expected_passage_count'):
            if len(pred_passages) != example.expected_passage_count:
                # Partial score based on how close we are
                count_diff = abs(len(pred_passages) - example.expected_passage_count)
                max_diff = max(example.expected_passage_count, 5)  # Cap at 5 for normalization
                count_score = 1.0 - (count_diff / max_diff)
                # Heavily weight this metric
                return max(0.1, count_score * 0.7)  # Minimum 0.1 if we extracted something
        
        # If example has quality metrics, compare those
        if hasattr(example, 'minimum_quality_score') and 'quality_metrics' in pred_dict:
            quality_scores = [p.get('overall_score', 0) for p in pred_passages if 'quality_metrics' in p]
            avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
            
            if avg_quality < example.minimum_quality_score:
                # Score is proportional to quality
                return max(0.2, avg_quality / example.minimum_quality_score)
                
        # Default success if we got here
        return 0.9  # Not perfect, but good


# --- Main block for direct execution (Testing/Compilation) ---
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found. Please set it in your .env file.")
    
    model = 'gemini/gemini-2.0-flash-001'
    llm = dspy.LM(model, api_key=api_key)
    dspy.settings.configure(lm=llm)
    
    print("--- DSPy configured for direct script execution ---")
    
    # --- Examples for testing and optimization ---
    examples = [
        # Example 1: Basic passage extraction
        dspy.Example(
            text="Chapter 1\n\nIt was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way - in short, the period was so far like the present period, that some of its noisiest authorities insisted on its being received, for good or for evil, in the superlative degree of comparison only.\n\nThere were a king with a large jaw and a queen with a plain face, on the throne of England; there were a king with a large jaw and a queen with a fair face, on the throne of France. In both countries it was clearer than crystal to the lords of the State preserves of loaves and fishes, that things in general were settled for ever.\n\nChapter 2\n\nIt was the Dover road that lay, on a Friday night late in November, before the first of the persons with whom this history has business.",
            target_length=2,
            expected_passage_count=2,
            minimum_quality_score=3.5
        ),
        
        # Example 2: Text with complex structure
        dspy.Example(
            text="The sunlight poured through the stained-glass windows, casting a kaleidoscope of colors across the marble floor. The cathedral stood empty save for a solitary figure kneeling in prayer at the altar. Outside, the sounds of the city were muffled by the thick stone walls, creating an atmosphere of serene contemplation.\n\nDays earlier, the same cathedral had been filled with mourners, their collective grief hanging in the air like incense. The funeral had drawn people from across the country, a testament to the deceased's impact on so many lives. Now, in the quiet aftermath, only memories remained.\n\nAcross town, in a small apartment overlooking the river, a woman sat at her desk, pen in hand. The blank page before her seemed to mock her attempts at finding the right words. How could she possibly capture in writing the essence of a life so fully lived? The biography she had been commissioned to write suddenly felt like an impossible task.",
            target_length=1,
            expected_passage_count=2,
            minimum_quality_score=4.0
        )
    ]
    
    # Format examples for compilation/testing
    examples_with_inputs = [example.with_inputs("text", "target_length") for example in examples]
    
    # --- Instantiate the Flow ---
    extractor_flow = PassageExtractorFlow()
    
    # --- Run with basic model (using TEST_PASSAGE from constants) ---
    print("\n--- Basic Model Test Run ---")
    basic_result = extractor_flow(text=TEST_PASSAGE, target_length=4, validate_quality=True)
    
    # Print passages in readable format
    print(f"Extracted {len(basic_result.passages)} passages:")
    for i, passage in enumerate(basic_result.passages):
        print(f"\nPASSAGE {i+1}: {passage['title']}")
        print(passage['content'])
        if 'quality_metrics' in passage:
            print("\nQuality Metrics:")
            for key, value in passage['quality_metrics'].items():
                if key != 'feedback':
                    print(f"  {key}: {value}")
            print(f"  feedback: {passage['quality_metrics']['feedback']}")
    
    # --- Optional: Compile with MIPROv2 ---
    print("\n--- Compiling with MIPROv2 ---")
    compile_flow = False  # Set to True to enable compilation (resource-intensive)
    if compile_flow:
        try:
            compflow_optimizer = dspy.MIPROv2(metric=PassageExtractorFlow.metric, num_candidates=2, max_bootstrapped_demos=2)
            optimized_extractor = compflow_optimizer.compile(
                student=extractor_flow,
                trainset=examples_with_inputs,
                max_iters=1
            )
            
            print("\n--- Optimized Model Test Run ---")
            optimized_result = optimized_extractor(text=TEST_PASSAGE, target_length=4, validate_quality=True)
            print(f"Extracted {len(optimized_result.passages)} passages")
            
        except Exception as e:
            print(f"!!! ERROR during compilation: {e} !!!")
            print("Skipping optimized run.")
    else:
        print("Skipping compilation.")
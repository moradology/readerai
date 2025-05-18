# readerai/flows/vocabulary.py


import dspy

# Attempt to import TEST_PASSAGE, provide a default if constants.py doesn't exist yet
from readerai.constants import TEST_PASSAGE
from typing import Optional
# --- Signatures ---


class IdentifyChallengingWord(dspy.Signature):
    """Finds a single challenging or complicated word in the passage, if any."""

    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: Optional[str] | None = dspy.OutputField(
        description="A single challenging or complicated word from the passage, if any."
    )
    usage_sentences: Optional[str] = dspy.OutputField(
        description="Two example sentences using the challenging word in context."
    )


class GenerateVocabularyQuestion(dspy.Signature):
    """Generates a vocabulary question based on the identified challenging word."""

    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: str = dspy.InputField(description="A challenging word to define.")
    question: str = dspy.OutputField(
        description="A question asking the student to define the word in context."
    )
    vague_score: int = dspy.OutputField(
        description="How vague are the usage sentences to derive context of the challenging word from? (1-5)"
    )
    feedback: str = dspy.OutputField(
        description="Explanation of why the question is or isn't answerable based on the passage."
    )


class VocabularyAssessment(dspy.Signature):
    """Assesses the quality and viability of a vocabulary question."""

    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: str = dspy.InputField(
        description="The challenging word being tested."
    )
    question: str = dspy.InputField(description="The generated vocabulary question.")
    context_sufficiency: int = dspy.OutputField(
        description="Does the passage provide sufficient context to determine the word's meaning? (1-5)"
    )
    question_quality: int = dspy.OutputField(
        description="Overall quality considering clarity, difficulty level, and educational value (1-5)"
    )
    question_viability: bool = dspy.OutputField(
        description="Is this a viable vocabulary question overall? (True/False)"
    )
    feedback: str = dspy.OutputField(
        description="Specific assessment and suggestions for improving the vocabulary question."
    )


# --- Added Signature for Assessing Student Answer ---
class AssessStudentAnswer(dspy.Signature):
    """Assesses if the student's answer correctly defines the challenging word based on the passage context."""

    passage: str = dspy.InputField(description="The original text passage.")
    question: str = dspy.InputField(
        description="The vocabulary question that was asked."
    )
    challenging_word: str = dspy.InputField(
        description="The specific word the question was about."
    )
    student_answer: str = dspy.InputField(description="The student's provided answer.")
    is_correct: bool = dspy.OutputField(
        description="Whether the student's answer is substantially correct (True/False)."
    )
    assessment_feedback: str = dspy.OutputField(
        description="Feedback explaining why the answer is correct or incorrect, referencing the passage or word meaning."
    )
    # Optional: score: float = dspy.OutputField(...)


# --- VocabularyFlow Module (Using ChainOfThought as in original) ---
class VocabularyFlow(dspy.Module):
    """
    A module that identifies a challenging word, generates a question,
    and assesses the question's viability.
    """

    def __init__(self):
        super().__init__()
        # Using ChainOfThought as in the original example provided
        self.word_identifier = dspy.ChainOfThought(IdentifyChallengingWord)
        self.question_generator = dspy.ChainOfThought(GenerateVocabularyQuestion)
        self.assessor = dspy.ChainOfThought(
            VocabularyAssessment
        )  # Assesses the *question*

    def forward(self, passage: str) -> dspy.Prediction:
        """
        Generates and assesses a vocabulary question based on the passage.
        """
        # 1. Identify a challenging word
        word_id_result = self.word_identifier(passage=passage)

        # Handle case where no challenging word is found
        if not word_id_result.challenging_word:
            return dspy.Prediction(
                challenging_word=None,
                usage_sentences=None,
                question="No challenging words found in the passage.",
                feedback="Passage might be too simple or lack distinct vocabulary.",
                question_viability=False,
                # Add other fields expected by consuming code with default values
                # vague_score=None, context_sufficiency=None, question_quality=None
            )

        # 2. Generate a vocabulary question
        question_result = self.question_generator(
            passage=passage, challenging_word=word_id_result.challenging_word
        )

        # 3. Assess the generated question's viability
        assessment_result = self.assessor(
            passage=passage,
            challenging_word=word_id_result.challenging_word,
            question=question_result.question,
        )

        # 4. Build the final prediction based on assessment
        # Return comprehensive details regardless of viability, but mark viability clearly
        prediction = dspy.Prediction(
            challenging_word=word_id_result.challenging_word,
            usage_sentences=word_id_result.usage_sentences,
            vague_score=question_result.vague_score,  # From question generator
            question=question_result.question,
            feedback=assessment_result.feedback,  # Feedback from the *assessment* step
            context_sufficiency=assessment_result.context_sufficiency,
            question_quality=assessment_result.question_quality,
            question_viability=assessment_result.question_viability,  # The final viability decision
        )

        return prediction

    # --- Metric function (Retained from original) ---
    @classmethod
    def metric(cls, example, prediction, trace=None):
        # Ensure prediction is treated as a dictionary-like object
        pred_dict = (
            prediction
            if isinstance(prediction, dict)
            else prediction.toDict()
            if hasattr(prediction, "toDict")
            else vars(prediction)
        )

        # Default viability if missing in example (assume True if not specified)
        example_viability = getattr(example, "question_viability", True)
        pred_viability = pred_dict.get(
            "question_viability", False
        )  # Default prediction to False if missing

        # Got question_viability wrong; immediate and significant penalty
        if example_viability != pred_viability:
            # print(f"Viability mismatch: Example={example_viability}, Prediction={pred_viability}")
            return 0.2  # Small non-zero score

        # If not viable, check if we correctly identified it as not viable
        elif not example_viability:  # Example is not viable
            # print(f"Correctly identified non-viable? Prediction={pred_viability}")
            return 1.0  # Correctly identified as non-viable

        # If viable, evaluate the quality metrics if present
        else:
            # Check if necessary score attributes exist in both example and prediction
            required_attrs = ["vague_score", "context_sufficiency", "question_quality"]
            if not all(hasattr(example, attr) for attr in required_attrs):
                print(
                    "Warning: Example missing required attributes for metric calculation."
                )
                return 0.5  # Neutral score if example is incomplete

            if not all(pred_dict.get(attr) is not None for attr in required_attrs):
                print(
                    f"Warning: Prediction missing required attributes: {[attr for attr in required_attrs if pred_dict.get(attr) is None]}"
                )
                return 0.3  # Penalize missing prediction attributes

            # Calculate differences between predicted and example scores
            vague_diff = abs(pred_dict["vague_score"] - example.vague_score)
            context_diff = abs(
                pred_dict["context_sufficiency"] - example.context_sufficiency
            )
            quality_diff = abs(pred_dict["question_quality"] - example.question_quality)

            max_diff_per_metric = 4
            total_max_diff = max_diff_per_metric * 3
            total_diff = vague_diff + context_diff + quality_diff

            normalized_score = (
                1.0 - (total_diff / total_max_diff) if total_max_diff > 0 else 1.0
            )

            if total_diff > 0:
                normalized_score *= 0.95  # Slight penalty for imperfection

            # print(f"Viable match. Score: {max(0.0, normalized_score)}")
            return max(0.0, normalized_score)

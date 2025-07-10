# readerai/flows/response.py

# Import framework dependencies
from typing import Any, Optional, TypeVar

import dspy

from ..constants import TEST_PASSAGE  # Import from parent directory

# Define TypeVars for vocabulary components
T = TypeVar("T")
VocabFlowType = TypeVar("VocabFlowType")
AssessAnswerType = TypeVar("AssessAnswerType")


# Define types for clarity - these will be used regardless of which implementation is used
class MockPrediction:
    """Mock prediction for vocabulary questions."""

    question: str = "Mock Question: What does 'subterranean' mean?"
    feedback: str = "Mock Feedback: Check context clues."
    challenging_word: str = "subterranean"
    usage_sentences: str = "Mock usage sentences."
    question_viability: bool = True

    def get(self, key: str, default: Any = None) -> Any:
        """Get attribute with fallback to default."""
        return getattr(self, key, default)


# Forward declarations to avoid mypy redefinition errors
class _VocabularyFlowBase:
    pass


class _AssessStudentAnswerBase:
    pass


# Global variables to hold either real or mock implementations
VocabularyFlow: Any
AssessStudentAnswer: Any

# Import or define vocabulary flow components
try:
    # Try to import the real implementations
    from .vocabulary import AssessStudentAnswer as RealAssessStudentAnswer
    from .vocabulary import VocabularyFlow as RealVocabularyFlow

    # Use the real implementations
    VocabularyFlow = RealVocabularyFlow
    AssessStudentAnswer = RealAssessStudentAnswer
except ImportError:
    # Define mock implementations if imports fail
    class MockVocabularyFlow:
        """Mock implementation for vocabulary flow."""

        def __call__(self, passage: str) -> MockPrediction:
            """Generate a mock prediction."""
            return MockPrediction()

    class MockAssessStudentAnswer(dspy.Signature):
        """Mock implementation for assessment."""

        passage: str = dspy.InputField()
        question: str = dspy.InputField()
        challenging_word: str = dspy.InputField()
        student_answer: str = dspy.InputField()
        is_correct: bool = dspy.OutputField()
        assessment_feedback: str = dspy.OutputField()

    # Use the mock implementations
    VocabularyFlow = MockVocabularyFlow
    AssessStudentAnswer = MockAssessStudentAnswer

    print("Warning: Using mock implementations for VocabularyFlow/AssessStudentAnswer.")


# --- Helper function for generating vocab question data ---
def generate_vocab_question_data(passage_text: str) -> Optional[dict]:
    """
    Takes a passage string and returns a dictionary with 'question',
    'feedback', 'challenging_word', and 'usage_sentences'.
    Returns None or an error dict if question generation fails.
    """
    if not passage_text:
        print("Error: No passage provided to generate_vocab_question_data")
        return None
    if not dspy.settings.lm:
        print("Error: DSPy LLM not configured.")
        return {
            "question": "Error: LLM not configured.",
            "feedback": "Please check server logs.",
        }
    vocab_flow = VocabularyFlow()
    prediction = vocab_flow(passage=passage_text)  # Pass the text argument

    if not prediction.get("question_viability", False):
        return {
            "question": prediction.get(
                "question", "Could not generate viable question."
            ),
            "feedback": prediction.get("feedback", "Assessment failed."),
            "challenging_word": prediction.get("challenging_word"),
            "usage_sentences": prediction.get("usage_sentences"),
            "question_viability": False,
        }

    return {
        "question": prediction.get("question", "Error: Question format invalid."),
        "feedback": prediction.get("feedback", "Error: Feedback format invalid."),
        "challenging_word": prediction.get("challenging_word", None),
        "usage_sentences": prediction.get("usage_sentences", None),
        "question_viability": True,
    }


# --- Function to assess student answer (uses passage passed to it) ---
def assess_student_answer(
    passage_text: str, question_asked: str, word_asked: str, student_answer: str
) -> Optional[dict]:
    """
    Assesses the student's answer using the AssessStudentAnswer signature.
    Returns a dictionary with 'is_correct' and 'assessment_feedback'.
    """
    if not all([passage_text, question_asked, word_asked, student_answer]):
        print("Error: Missing data for assessment.")
        return {"assessment_feedback": "Error: Missing context for assessment."}
    if not dspy.settings.lm:
        print("Error: DSPy LLM not configured.")
        return {"assessment_feedback": "Error: LLM not configured. Cannot assess."}

    answer_assessor = dspy.Predict(AssessStudentAnswer)
    assessment = answer_assessor(
        passage=passage_text,
        question=question_asked,
        challenging_word=word_asked,
        student_answer=student_answer,
    )
    return {
        "is_correct": assessment.get("is_correct", False),
        "assessment_feedback": assessment.get(
            "assessment_feedback", "Could not get assessment feedback."
        ),
    }


# --- Main function called by the /chat endpoint ---
def generate_ai_reply(user_message: str) -> str:
    """
    Generates an AI response for NEW messages (not answers to questions).
    Handles greetings or requests for new vocabulary questions.
    """
    lower_message = user_message.lower()

    # Handle simple greetings and farewells
    if "hello" in lower_message or "hi" in lower_message:
        return "Hello there! How can I assist?"
    # ... (other simple handlers) ...
    elif "bye" in lower_message or "goodbye" in lower_message:
        return "Goodbye!"
    elif (
        "vocabulary question" in lower_message
        or "vocab question" in lower_message
        or "next question" in lower_message
    ):
        # --- Use the imported TEST_PASSAGE when user explicitly asks ---
        question_data = generate_vocab_question_data(
            TEST_PASSAGE
        )  # Use imported constant
        if question_data and question_data.get("question_viability"):
            # Format the response for the new question
            # The calling function needs to store question_data['challenging_word'] and question_data['question']
            return f"Okay, here's a new vocabulary question:\n{question_data.get('question', '')}\nUsage: \n{question_data.get('usage_sentences', '')}"
        else:
            error_feedback = (
                question_data.get("feedback", "Could not generate question.")
                if question_data
                else "Could not generate question."
            )
            return f"Sorry, I encountered an issue generating the question. Details: {error_feedback}"
    else:
        # Default fallback response
        return "I can provide vocabulary questions about the passage. Try asking 'vocabulary question' or answer the last question."

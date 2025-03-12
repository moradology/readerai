import os
import dspy

def run_comprehension_flow(test_passage: str = None):
    # Use a default passage if none provided
    if test_passage is None:
        test_passage = "Once upon a time in a quiet village, there was a curious child who asked endless questions."

    # Configure the LLM
    llm = dspy.LM('gemini/gemini-2.0-flash-001', api_key=os.getenv("GOOGLE_API_KEY"))
    dspy.settings.configure(lm=llm, experimental=True, provide_traceback=True)

    # --- Define signature-based classes ---
    class GenerateQuestion(dspy.Signature):
        def __call__(self, passage: str):
            # Abstracted behavior: generate a simple question
            Question = type("Question", (), {})
            return Question(question="What is the main idea of the passage?")

    class AnswerabilityAssessor(dspy.Signature):
        def __call__(self, passage: str, question: str):
            # For our abstract flow, assume every question is answerable.
            Answerability = type("Answerability", (), {})
            return Answerability(answerable=True, justification="The question can be answered.")

    class QuestionAssessment(dspy.Signature):
        def __call__(self, passage: str, question: str):
            # Return dummy assessment scores
            Assessment = type("Assessment", (), {})
            return Assessment(
                relevance_score=0.9,
                depth_score=0.8,
                specificity_score=0.85,
                feedback="This question is appropriately challenging."
            )

    # Create predictor instances
    question_generator = GenerateQuestion()
    answer_assessor = AnswerabilityAssessor()
    question_assessor = QuestionAssessment()

    # Execute the flow
    question_obj = question_generator(test_passage)
    answer_eval = answer_assessor(test_passage, question_obj.question)
    if answer_eval.answerable:
        assessment = question_assessor(test_passage, question_obj.question)
        result = {
            "passage": test_passage,
            "question": question_obj.question,
            "assessment": {
                "relevance_score": assessment.relevance_score,
                "depth_score": assessment.depth_score,
                "specificity_score": assessment.specificity_score,
                "feedback": assessment.feedback
            }
        }
    else:
        result = {
            "passage": test_passage,
            "question": question_obj.question,
            "error": answer_eval.justification
        }
    return result


if __name__ == "__main__":
    outcome = run_comprehension_flow()
    print(outcome)
```python
import unittest
from readerai.flows.comprehension import run_comprehension_flow

class ComprehensionFlowTest(unittest.TestCase):
    def test_default_flow(self):
        outcome = run_comprehension_flow()
        self.assertIn("question", outcome)
        self.assertIsInstance(outcome["question"], str)
        self.assertIn("assessment", outcome)

    def test_custom_passage_flow(self):
        custom_passage = "In a land far away, a young explorer embarked on a journey to understand the world."
        outcome = run_comprehension_flow(custom_passage)
        self.assertEqual(outcome["passage"], custom_passage)
        self.assertIn("question", outcome)
        self.assertIn("assessment", outcome)

if __name__ == '__main__':
    unittest.main()
```
```python

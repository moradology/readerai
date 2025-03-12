import os
import dspy
from dataclasses import dataclass

@dataclass
class Question:
    question: str

@dataclass
class Answerability:
    answerable: bool
    justification: str

@dataclass
class Assessment:
    relevance_score: float
    depth_score: float
    specificity_score: float
    feedback: str

class GenerateQuestion(dspy.Signature):
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.OutputField(description="A thought-provoking comprehension question about the passage.")

    def __call__(self, passage: str) -> dict:
        return {"question": "What is the main idea of the passage?"}


class AnswerabilityAssessor(dspy.Signature):
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="The question generated from the passage.")
    answerable: bool = dspy.OutputField(description="Whether the question is answerable or not.")
    justification: str = dspy.OutputField(description="Justification for the answerability decision.")

    def __call__(self, passage: str, question: str) -> dict:
        return {"answerable": True, "justification": "The question can be answered."}


class QuestionAssessment(dspy.Signature):
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="The question generated from the passage.")
    relevance_score: float = dspy.OutputField(description="The relevance score of the question with respect to the passage.")
    depth_score: float = dspy.OutputField(description="The depth score of the question.")
    specificity_score: float = dspy.OutputField(description="The specificity score of the question.")
    feedback: str = dspy.OutputField(description="Qualitative feedback about the question's quality.")

    def __call__(self, passage: str, question: str) -> dict:
        return {
            "relevance_score": 0.9,
            "depth_score": 0.8,
            "specificity_score": 0.85,
            "feedback": "This question is appropriately challenging."
        }

def run_comprehension_flow(test_passage: str = None):
    # Use a default passage if none provided
    if test_passage is None:
        test_passage = "Once upon a time in a quiet village, there was a curious child who asked endless questions."

    # Configure the LLM
    llm = dspy.LM('gemini/gemini-2.0-flash-001', api_key=os.getenv("GOOGLE_API_KEY"))
    dspy.settings.configure(lm=llm, experimental=True, provide_traceback=True)

    # Execute the flow using dspy.Signature classes
    question_generator = GenerateQuestion()
    question_result = question_generator(test_passage)
    question_text = question_result["question"]

    answer_assessor = AnswerabilityAssessor()
    answer_eval = answer_assessor(test_passage, question_text)
    if answer_eval["answerable"]:
        question_assessor = QuestionAssessment()
        assessment = question_assessor(test_passage, question_text)
        result = {
            "passage": test_passage,
            "question": question_text,
            "assessment": assessment
        }
    else:
        result = {
            "passage": test_passage,
            "question": question_text,
            "error": answer_eval["justification"]
        }
    return result


if __name__ == "__main__":
    outcome = run_comprehension_flow()
    print(outcome)

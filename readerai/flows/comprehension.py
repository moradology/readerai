import os
import dspy
from dataclasses import dataclass
from typing import Optional

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
    question: Optional[str] = dspy.OutputField(description="A thought-provoking comprehension question about the passage.", default=None)



class AnswerabilityAssessor(dspy.Signature):
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="The question generated from the passage.")
    answerable: Optional[bool] = dspy.OutputField(description="Whether the question is answerable or not.", default=None)
    justification: Optional[str] = dspy.OutputField(description="Justification for the answerability decision.", default=None)



class QuestionAssessment(dspy.Signature):
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="The question generated from the passage.")
    relevance_score: Optional[float] = dspy.OutputField(description="The relevance score of the question with respect to the passage.", default=None)
    depth_score: Optional[float] = dspy.OutputField(description="The depth score of the question.", default=None)
    specificity_score: Optional[float] = dspy.OutputField(description="The specificity score of the question.", default=None)
    feedback: Optional[str] = dspy.OutputField(description="Qualitative feedback about the question's quality.", default=None)


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

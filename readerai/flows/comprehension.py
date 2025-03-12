import os
import dspy

# --- Define signature-based classes ---
class GenerateQuestion(dspy.Signature):
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.OutputField(description="A thought-provoking comprehension question about the passage.")

class AnswerabilityAssessor(dspy.Signature):
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="The question generated from the passage.")
    answerable: bool = dspy.OutputField(description="Whether the question is answerable or not.")
    justification: str = dspy.OutputField(description="Justification for the answerability decision.")

class QuestionAssessment(dspy.Signature):
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="The question generated from the passage.")
    relevance_score: int = dspy.OutputField(description="The relevance score of the question with respect to the passage.")
    depth_score: int = dspy.OutputField(description="The depth score of the question.")
    specificity_score: int = dspy.OutputField(description="The specificity score of the question.")
    feedback: str = dspy.OutputField(description="Qualitative feedback about the question's quality.")

def run_comprehension_flow(test_passage: str):
    # Use a default passage if none provided
    if test_passage is None:
        test_passage = "Once upon a time in a quiet village, there was a curious child who asked endless questions."

    # Configure the LLM
    llm = dspy.LM('gemini/gemini-2.0-flash-001', api_key=os.getenv("GOOGLE_API_KEY"))
    dspy.settings.configure(lm=llm, experimental=True, provide_traceback=True)

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

import os
import dspy

# --- Define signature-based classes ---
class GenerateQuestion(dspy.Signature):
    def __call__(self, passage: str):
        # Abstracted behavior: generate a simple question
        class Question:
            def __init__(self, question):
                self.question = question
        return Question("What is the main idea of the passage?")

class AnswerabilityAssessor(dspy.Signature):
    def __call__(self, passage: str, question: str):
        # For our abstract flow, assume every question is answerable.
        class Answerability:
            def __init__(self, answerable, justification):
                self.answerable = answerable
                self.justification = justification
        return Answerability(True, "The question can be answered.")

class QuestionAssessment(dspy.Signature):
    def __call__(self, passage: str, question: str):
        # Return dummy assessment scores
        class Assessment:
            def __init__(self, relevance_score, depth_score, specificity_score, feedback):
                self.relevance_score = relevance_score
                self.depth_score = depth_score
                self.specificity_score = specificity_score
                self.feedback = feedback
        return Assessment(0.9, 0.8, 0.85, "This question is appropriately challenging.")

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

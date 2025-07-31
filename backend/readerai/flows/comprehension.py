import dspy


class GenerateQuestion(dspy.Signature):
    """Signature for generating a comprehension question from a passage."""

    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.OutputField(
        description="A thought-provoking comprehension question about the passage."
    )


class AnswerabilityAssessor(dspy.Signature):
    """Signature for assessing whether a question is answerable based on a passage."""

    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="A generated comprehension question.")
    answerable: bool = dspy.OutputField(
        description="True if the passage contains enough information to answer the question, otherwise False."
    )
    feedback: str = dspy.OutputField(
        description="Explanation of why the question is or isn't answerable based on the passage."
    )


class QuestionAssessment(dspy.Signature):
    """Signature for assessing the quality of a comprehension question."""

    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="A generated comprehension question.")
    relevance_score: int = dspy.OutputField(
        description="How relevant is the question? (1-5)"
    )
    depth_score: int = dspy.OutputField(
        description="How deep or thought-provoking is the question? (1-5)"
    )
    specificity_score: int = dspy.OutputField(
        description="How specific is the question? (1-5)"
    )
    feedback: str = dspy.OutputField(description="Overall feedback on the question.")


class ComprehensionFlow(dspy.Module):
    """
    A module that generates and evaluates comprehension questions for a given passage.
    """

    def __init__(self):
        super().__init__()
        self.question_generator = dspy.ChainOfThought(GenerateQuestion)
        self.answerability_assessor = dspy.ChainOfThought(AnswerabilityAssessor)
        self.question_assessor = dspy.ChainOfThought(QuestionAssessment)

    def forward(self, passage: str) -> dspy.Prediction:
        """
        Generate and evaluate a comprehension question for a passage.

        Args:
            passage: Text passage to generate a question for

        Returns:
            dspy.Prediction containing the question and its evaluation
        """
        # Generate a question
        question_result = self.question_generator(passage=passage)

        # Check if the question is answerable
        answerability = self.answerability_assessor(
            passage=passage, question=question_result.question
        )

        # Evaluate question quality if it's answerable
        if answerability.answerable:
            assessment = self.question_assessor(
                passage=passage, question=question_result.question
            )

            return dspy.Prediction(
                question=question_result.question,
                answerable=True,
                relevance_score=assessment.relevance_score,
                depth_score=assessment.depth_score,
                specificity_score=assessment.specificity_score,
                feedback=assessment.feedback,
            )
        else:
            return dspy.Prediction(
                question=question_result.question,
                answerable=False,
                relevance_score=-1,
                depth_score=-1,
                specificity_score=-1,
                feedback=answerability.feedback,
            )

    @classmethod
    def metric(cls, example, prediction, trace=None):
        # Got answerable wrong; immediate and total failure
        if example.answerable != prediction.answerable:
            return 0
        # Not answerable; total success
        elif not prediction.answerable:
            return 1
        else:
            relevance_diff = abs(prediction.relevance_score - example.relevance_score)
            depth_diff = abs(prediction.depth_score - example.depth_score)
            specificity_diff = abs(
                prediction.specificity_score - example.specificity_score
            )

            # Normalize to a [0,1] range (lower difference = better score)
            normalized_score = 1 - (
                (relevance_diff + depth_diff + specificity_diff) / 3.0
            )
            return max(0, normalized_score)

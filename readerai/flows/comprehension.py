import os
import dspy
from typing import Dict, Any, Optional, List, Union

class GenerateQuestion(dspy.Signature):
    """Signature for generating a comprehension question from a passage."""
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.OutputField(description="A thought-provoking comprehension question about the passage.")

class AnswerabilityAssessor(dspy.Signature):
    """Signature for assessing whether a question is answerable based on a passage."""
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="A generated comprehension question.")
    answerable: bool = dspy.OutputField(description="True if the passage contains enough information to answer the question, otherwise False.")
    feedback: str = dspy.OutputField(description="Explanation of why the question is or isn't answerable based on the passage.")

class QuestionAssessment(dspy.Signature):
    """Signature for assessing the quality of a comprehension question."""
    passage: str = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.InputField(description="A generated comprehension question.")
    relevance_score: int = dspy.OutputField(description="How relevant is the question? (1-5)")
    depth_score: int = dspy.OutputField(description="How deep or thought-provoking is the question? (1-5)")
    specificity_score: int = dspy.OutputField(description="How specific is the question? (1-5)")
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
            passage=passage, 
            question=question_result.question
        )
        
        # Evaluate question quality if it's answerable
        if answerability.answerable:
            assessment = self.question_assessor(
                passage=passage, 
                question=question_result.question
            )
            
            return dspy.Prediction(
                question=question_result.question,
                answerable=True,
                relevance_score=assessment.relevance_score,
                depth_score=assessment.depth_score,
                specificity_score=assessment.specificity_score,
                feedback=assessment.feedback
            )
        else:
            return dspy.Prediction(
                question=question_result.question,
                answerable=False,
                relevance_score=-1,
                depth_score=-1,
                specificity_score=-1,
                feedback=answerability.feedback
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
            specificity_diff = abs(prediction.specificity_score - example.specificity_score)
        
            # Normalize to a [0,1] range (lower difference = better score)
            normalized_score = 1 - ((relevance_diff + depth_diff + specificity_diff) / 3.0)
            return max(0, normalized_score)
    

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    api_key = os.getenv("GOOGLE_API_KEY")
    model = 'gemini/gemini-2.0-flash-001'
    llm = dspy.LM(model, api_key=api_key)
    dspy.settings.configure(lm=llm, experimental=True, provide_traceback=True)

    examples = [
        # Example 1: Good Question
        dspy.Example(
            passage="In 1945, the world saw the end of World War II, leading to the division of Germany and the rise of the Cold War.",
            question="How did the end of World War II contribute to the start of the Cold War?",
            answerable=True,
            relevance_score=5,
            depth_score=4,
            specificity_score=4,
            feedback="Highly relevant and focused on a key historical consequence."
        ),
        # Example 2: Unanswerable Question
        dspy.Example(
            passage="In 1945, the world saw the end of World War II, leading to the division of Germany and the rise of the Cold War.",
            question="What were the economic policies of Germany in 1947?",
            answerable=False,
            relevance_score=-1,
            depth_score=-1,
            specificity_score=-1,
            feedback="The passage does not mention German economic policies in 1947."
        ),
        # Example 3: Vague Question
        dspy.Example(
            passage="Photosynthesis is the process by which plants convert sunlight into energy, using carbon dioxide and water.",
            question="What happens during photosynthesis?",
            answerable=True,
            relevance_score=4,
            depth_score=3,
            specificity_score=1,
            feedback="This question is relevant but too broad. It could ask about specific steps."
        ),
        # Example 4: Bad Question
        dspy.Example(
            passage="Photosynthesis is the process by which plants convert sunlight into energy, using carbon dioxide and water.",
            question="What is a plant?",
            answerable=False,
            relevance_score=-1,
            depth_score=-1,
            specificity_score=-1,
            feedback="The passage discusses photosynthesis but does not define plants in general."
        ),
        # Example 5: Unanswerable Question
        dspy.Example(
            passage="The Great Depression led to widespread unemployment and economic hardship, prompting government intervention through the New Deal.",
            question="How did the Great Depression influence the role of government in the economy, and what specific measures were implemented to address the crisis?",
            answerable=False,
            relevance_score=-1,
            depth_score=-1,
            specificity_score=-1,
            feedback="The passage mentions the New Deal but does not describe any 'specific measures'."
        ),
        # Example 6: Unanswerable Question
        dspy.Example(
            passage="In 768, Charlemagne became King of the Franks and began an extensive expansion of the realm. He eventually incorporated the territories of present-day France, Germany, northern Italy, the Low Countries and beyond, linking the Frankish kingdom with Papal lands.",
            question="What were the key geographical areas encompassed by Charlemagne's expansion, and what was the significance of linking the Frankish kingdom with Papal lands?",
            answerable=False,
            relevance_score=-1,
            depth_score=-1,
            specificity_score=-1,
            feedback="The passage does not explain why linking the Frankish kingdom with the Papal lands was significant."
        )
    ]
    examples_with_inputs = [example.with_inputs("passage") for example in examples]

    test_passage = """Alice opened the door and found that it led into a small passage, not much larger
    than a rat-hole: she knelt down and looked along the passage into the loveliest garden you ever saw.
    How she longed to get out of that dark hall, and wander about among those beds of bright flowers
    and those cool fountains, but she could not even get her head through the doorway; "and even if my
    head would go through," thought poor Alice, "it would be of very little use without my shoulders.
    Oh, how I wish I could shut up like a telescope! I think I could, if I only knew how to begin."
    For, you see, so many out-of-the-way things had happened lately, that Alice had begun to think that
    very few things indeed were really impossible.
    """

    comp_flow = ComprehensionFlow()
    
    # Run with basic model
    basic_result = comp_flow(passage=test_passage) 
    print("Basic Model Result:", basic_result)

    # Run with few shot optimized model
    question_optimizer = dspy.BootstrapFewShotWithRandomSearch(metric=ComprehensionFlow.metric)
    optimized_question_generator = question_optimizer.compile(
        comp_flow, 
        trainset=examples_with_inputs
    )
    optimized_result = optimized_question_generator(passage=test_passage)
    print("Optimized Model Result:", optimized_result)
import os
import dspy
from typing import Dict, Any, Optional, List, Union

class IdentifyChallengingWord(dspy.Signature):
    """Finds a single challenging or complicated word in the passage, if any."""
    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: Optional[str] = dspy.OutputField(description="A single challenging or complicated word from the passage, if any.")
    usage_sentences: Optional[str] = dspy.OutputField(description="Two example sentences using the challenging word in context.")

class GenerateVocabularyQuestion(dspy.Signature):
    """Generates a vocabulary question based on the identified challenging word."""
    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: str = dspy.InputField(description="A challenging word to define.")
    question: str = dspy.OutputField(description="A question asking the student to define the word in context.")
    vague_score: int = dspy.OutputField(description="How vague are the usage sentences to derive context of the challenging word from? (1-5)")
    feedback: str = dspy.OutputField(description="Overall feedback on the identified challenging word.")

class VocabularyAssessment(dspy.Signature):
    """Assesses the student's response for correctness in context."""
    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: str = dspy.InputField(description="The challenging word to be defined.")
    #student_response: str = dspy.InputField(description="The student's definition of the challenging word.")
    #correctness: bool = dspy.OutputField(description="Whether the student's definition is correct in context.")

class VocabularyFlow(dspy.Module):
    """A module that identifies a challenging word in a passage, generates a question, and optionally assesses a student's response.
    """
    
    def __init__(self):
        super().__init__()
        self.word_identifier = dspy.ChainOfThought(IdentifyChallengingWord)
        self.question_generator = dspy.ChainOfThought(GenerateVocabularyQuestion)
        #self.assessor = dspy.ChainOfThought(VocabularyAssessment)
    
    def forward(self, passage: str, student_response: Optional[str] = None) -> dspy.Prediction:
        """
        1) Identify a challenging word in the passage.
        2) Generate a question asking for a definition of that word in context.
        3) To do: If 'student_response' is provided, assess it for correctness.
        
        Args:
            passage: The text passage to analyze.
            
        Returns:
            dspy.Prediction containing:
                - challenging_word
                - usage_sentences
                - question
        """
        # Identify a challenging word
        word_id_result = self.word_identifier(passage=passage)
        
        # If no word identified, return immediately
        if not word_id_result.challenging_word:
            return dspy.Prediction(
                challenging_word=None,
                usage_sentences=None,
                vaguer_score=None,
                question="No challenging words found in the passage.",
                feedback=None
            )
        
        # Generate a vocabulary question
        question_result = self.question_generator(
            passage=passage,
            challenging_word=word_id_result.challenging_word
        )
        
        # Build the final prediction
        prediction = dspy.Prediction(
            challenging_word=word_id_result.challenging_word,
            usage_sentences=word_id_result.usage_sentences,
            vague_score=question_result.vague_score,
            question=question_result.question,
            feedback=question_result.feedback
        )
        
        return prediction
    
    @classmethod
    def metric(cls, example, prediction, trace=None):
        """
        Example metric function. You can define how to grade performance:
         - Did we find a challenging word when expected?
         - Was the question generated properly?
         - Was the correctness/feedback aligned with a reference answer?
        """
        # Very naive check: if example has a 'challenging_word' but we didn't produce one, score=0
        if example.challenging_word and not prediction.challenging_word:
            return 0
        
        # If we had no word to find, but the code produced one, also 0
        if not example.challenging_word and prediction.challenging_word:
            return 0
        
        
        vague_diff = abs(prediction.vague_score - example.vague_score)
        normalized_score = 1 - (vague_diff / 4.0) # Maximum possible difference if scores range from 1 to 5
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
            passage="The sunlight poured through the stained-glass windows, casting a kaleidoscope of color across the marble floor.",
            challenging_word="kaleidoscope",
            usage_sentences=(
                "1) 'The child's drawing was a kaleidoscope of swirling colors and shapes.'\n"
                "2) 'Her emotions were a kaleidoscope of joy, fear, and excitement as she stepped onto the stage.'"
            ),
            vague_score=1,
            question="In the context of the passage, how would you define 'kaleidoscope'?",
            feedback="This question prompts the student to interpret the meaning of a visually descriptive term by examining its usage in the passage."
        ),
        # Example 2: No challenging word found
        dspy.Example(
            passage="In 1945, the world saw the end of World War II, leading to the division of Germany and the rise of the Cold War.",
            challenging_word=None,
            usage_sentences=None,
            vague_score=None,
            question="No challenging words found in the passage.",
            feedback=None
        ),
        # Example 3: Vague Usage Sentences
        dspy.Example(
            passage="Photosynthesis is the process by which plants convert sunlight into energy, using carbon dioxide and water.",
            challenging_word="Photosynthesis",
            usage_sentences=(
                "1) 'The sun helps along the process of photosynthesis.'\n"
                "2) 'Photosynthesis requires water and sunlight.'"
            ),
            vague_score=4,
            question="In the context of the passage, how would you define 'Photosynthesis'?",
            feedback="The usage sentences are too vague and oversimplify the concept. They state basic facts described in the passage. More detailed examples should provide more detailed context."
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

    voc_flow = VocabularyFlow()
    
    # Run with basic model
    basic_result = voc_flow(passage=test_passage) 
    print("Basic Model Result:", basic_result)

    # Run with few shot optimized model
    compflow_optimizer = dspy.MIPROv2(metric=VocabularyFlow.metric)
    optimized_vocflow = compflow_optimizer.compile(
        student=voc_flow, 
        trainset=examples_with_inputs,
        minibatch_size=1
    )
    optimized_result = optimized_vocflow(passage=test_passage)
    print("Optimized Model Result:", optimized_result)
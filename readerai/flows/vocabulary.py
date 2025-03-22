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
    feedback: str = dspy.OutputField(description="Explanation of why the question is or isn't answerable based on the passage.")

class VocabularyAssessment(dspy.Signature):
    """Assesses the quality and viability of a vocabulary question."""
    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: str = dspy.InputField(description="The challenging word being tested.")
    question: str = dspy.InputField(description="The generated vocabulary question.")
    context_sufficiency: int = dspy.OutputField(description="Does the passage provide sufficient context to determine the word's meaning? (1-5)")
    question_quality: int = dspy.OutputField(description="Overall quality considering clarity, difficulty level, and educational value (1-5)")
    question_viability: bool = dspy.OutputField(description="Is this a viable vocabulary question overall? (True/False)")
    feedback: str = dspy.OutputField(description="Specific assessment and suggestions for improving the vocabulary question.")

class VocabularyFlow(dspy.Module):
    """A module that identifies a challenging word in a passage, generates a question, and optionally assesses a student's response.
    """
    
    def __init__(self):
        super().__init__()
        self.word_identifier = dspy.ChainOfThought(IdentifyChallengingWord)
        self.question_generator = dspy.ChainOfThought(GenerateVocabularyQuestion)
        self.assessor = dspy.ChainOfThought(VocabularyAssessment)
    
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
                vague_score=None,
                question="No challenging words found in the passage.",
                feedback=None,
                context_sufficiency=1,
                question_quality=None,
                question_viability=None
            )
        
        # Generate a vocabulary question
        question_result = self.question_generator(
            passage=passage,
            challenging_word=word_id_result.challenging_word
        )

        # Assess a vocabulary question
        assessment_result = self.assessor(
            passage = passage,
            challenging_word = word_id_result.challenging_word,
            question = question_result.question
        )
        
        # Build the final prediction
        prediction = dspy.Prediction(
            challenging_word=word_id_result.challenging_word,
            usage_sentences=word_id_result.usage_sentences,
            vague_score=question_result.vague_score,
            question=question_result.question,
            feedback=question_result.feedback,
            context_sufficiency=assessment_result.context_sufficiency,
            question_quality=assessment_result.question_quality,
            question_viability=assessment_result.question_viability
        )
        
        return prediction
    
    @classmethod
    def metric(cls, example, prediction, trace=None):
        # Got question_viability wrong; immediate and significant penalty
        if example.question_viability != prediction.question_viability:
            return 0.2  # Small non-zero score to allow for some partial credit
        
        # If not viable, just check if we correctly identified it as not viable
        elif not prediction.question_viability:
            return 1
        
        # If viable, evaluate the quality metrics
        else:
            # Calculate differences between predicted and example scores
            vague_diff = abs(prediction.vague_score - example.vague_score)
            context_diff = abs(prediction.context_sufficiency - example.context_sufficiency)
            quality_diff = abs(prediction.question_quality - example.question_quality)
            
            # Calculate maximum possible difference (assuming 1-5 scale for each metric)
            max_diff_per_metric = 4  # Maximum difference on a 1-5 scale
            total_max_diff = max_diff_per_metric * 3  # For all three metrics
            
            # Calculate total difference and normalize to [0,1] range
            total_diff = vague_diff + context_diff + quality_diff
            normalized_score = 1 - (total_diff / total_max_diff)
            
            # Apply a slight penalty for any non-perfect metric to encourage precision
            if total_diff > 0:
                normalized_score *= 0.95
                
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
            feedback="This question prompts the student to interpret the meaning of a visually descriptive term by examining its usage in the passage.",
            context_sufficiency=5,
            question_quality=5,
            question_viability=True
        ),
        # Example 2: No challenging word found
        dspy.Example(
            passage="In 1945, the world saw the end of World War II, leading to the division of Germany and the rise of the Cold War.",
            challenging_word=None,
            usage_sentences=None,
            vague_score=None,
            question="No challenging words found in the passage.",
            feedback=None,
            context_sufficiency=1,
            question_quality=1,
            question_viability=False
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
            feedback="The usage sentences are too vague and oversimplify the concept. They state basic facts described in the passage. More detailed examples should provide more detailed context.",
            context_sufficiency=2,
            question_quality=3,
            question_viability=True
        ),
        # Example 4: Word with multiple meanings, clear context
        dspy.Example(
            passage="The detective tried to ferret out the truth from the reluctant witness, using a combination of gentle persuasion and clever questioning.",
            challenging_word="ferret",
            usage_sentences=(
                "1) 'The journalist spent months trying to ferret out corruption in the local government.'\n"
                "2) 'It took us hours to ferret out all the details of what happened that night.'"
            ),
            vague_score=1,
            question="In the passage, what does it mean when the detective tries to 'ferret out' the truth?",
            feedback="This question targets a verb form of a word more commonly known as an animal, providing good context for understanding figurative language.",
            context_sufficiency=5,
            question_quality=5,
            question_viability=True
        ),
        
        # Example 5: Technical term with sufficient context
        dspy.Example(
            passage="The patient presented with acute myocardial infarction, requiring immediate intervention. The doctors noted pallor, diaphoresis, and severe chest pain radiating to the left arm.",
            challenging_word="diaphoresis",
            usage_sentences=(
                "1) 'The marathon runner experienced extreme diaphoresis in the final miles of the race.'\n"
                "2) 'Diaphoresis can be a symptom of several medical conditions including infection and hormone disorders.'"
            ),
            vague_score=2,
            question="Based on the context of the medical emergency described, what physical symptom does 'diaphoresis' most likely refer to?",
            feedback="This question requires inferring meaning from context clues in a technical passage. The question format asks for the specific symptom rather than just a definition.",
            context_sufficiency=3,
            question_quality=4,
            question_viability=True
        ),
        
        # Example 6: Abstract concept with metaphorical usage
        dspy.Example(
            passage="The old man's face was a palimpsest of experiences—joy, sorrow, triumph, and loss all etched into the lines around his eyes and mouth.",
            challenging_word="palimpsest",
            usage_sentences=(
                "1) 'The ancient manuscript was a palimpsest, with newer text written over partially erased older writing.'\n"
                "2) 'The city itself is a palimpsest, with modern buildings standing alongside structures from the colonial era.'"
            ),
            vague_score=1,
            question="How is the term 'palimpsest' being used metaphorically in the passage, and what does it suggest about the old man's face?",
            feedback="This question addresses both the literal meaning and the metaphorical application, encouraging deeper analysis of figurative language.",
            context_sufficiency=4,
            question_quality=5,
            question_viability=True
        ),
        
        # Example 7: Word with insufficient context
        dspy.Example(
            passage="The obdurate official refused to change the policy despite numerous complaints.",
            challenging_word="obdurate",
            usage_sentences=(
                "1) 'He remained obdurate in his decision.'\n"
                "2) 'Her obdurate stance on the issue frustrated her colleagues.'"
            ),
            vague_score=4,
            question="What does 'obdurate' mean in the passage?",
            feedback="Both the passage and usage sentences provide minimal context clues. The question is too direct and doesn't encourage inference or analysis.",
            context_sufficiency=2,
            question_quality=2,
            question_viability=True
        ),
        
        # Example 8: Word with rich context but poor question
        dspy.Example(
            passage="The cacophony of the bustling market—vendors shouting, children laughing, and music blaring—made it nearly impossible to hear her soft voice.",
            challenging_word="cacophony",
            usage_sentences=(
                "1) 'The cacophony of the construction site drove the neighbors to complain.'\n"
                "2) 'What seemed like cacophony to the parents was beautiful music to the teenagers.'"
            ),
            vague_score=1,
            question="Define cacophony.",
            feedback="While the context is rich and the word is appropriate, the question is too basic and doesn't encourage engagement with the context clues provided in the passage.",
            context_sufficiency=5,
            question_quality=2,
            question_viability=False
        ),
        
        # Example 9: Challenging word with excellent question design
        dspy.Example(
            passage="The professor's erudition was evident in his lecture, as he effortlessly connected literature, history, and philosophy in ways his students had never considered.",
            challenging_word="erudition",
            usage_sentences=(
                "1) 'Her erudition in classical languages impressed even the senior scholars.'\n"
                "2) 'Despite his erudition, he could explain complex concepts in simple terms.'"
            ),
            vague_score=1,
            question="Based on how 'erudition' is used in the passage, what qualities would a person with erudition likely demonstrate in an academic setting?",
            feedback="This question goes beyond simple definition to application and inference, encouraging deeper understanding of the concept.",
            context_sufficiency=4,
            question_quality=5,
            question_viability=True
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
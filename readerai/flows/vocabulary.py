# readerai/flows/vocabulary.py

import os

import dspy
from dotenv import load_dotenv  # Needed for the __main__ block

# Attempt to import TEST_PASSAGE, provide a default if constants.py doesn't exist yet
try:
    from ..constants import TEST_PASSAGE
except ImportError:
    print(
        "Warning: Could not import TEST_PASSAGE from readerai.constants. Using default."
    )
    TEST_PASSAGE = "Default passage: The quick brown fox jumps over the lazy dog."

# --- Signatures ---


class IdentifyChallengingWord(dspy.Signature):
    """Finds a single challenging or complicated word in the passage, if any."""

    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: str | None = dspy.OutputField(
        description="A single challenging or complicated word from the passage, if any."
    )
    usage_sentences: str | None = dspy.OutputField(
        description="Two example sentences using the challenging word in context."
    )


class GenerateVocabularyQuestion(dspy.Signature):
    """Generates a vocabulary question based on the identified challenging word."""

    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: str = dspy.InputField(description="A challenging word to define.")
    question: str = dspy.OutputField(
        description="A question asking the student to define the word in context."
    )
    vague_score: int = dspy.OutputField(
        description="How vague are the usage sentences to derive context of the challenging word from? (1-5)"
    )
    feedback: str = dspy.OutputField(
        description="Explanation of why the question is or isn't answerable based on the passage."
    )


class VocabularyAssessment(dspy.Signature):
    """Assesses the quality and viability of a vocabulary question."""

    passage: str = dspy.InputField(description="A passage from a text.")
    challenging_word: str = dspy.InputField(
        description="The challenging word being tested."
    )
    question: str = dspy.InputField(description="The generated vocabulary question.")
    context_sufficiency: int = dspy.OutputField(
        description="Does the passage provide sufficient context to determine the word's meaning? (1-5)"
    )
    question_quality: int = dspy.OutputField(
        description="Overall quality considering clarity, difficulty level, and educational value (1-5)"
    )
    question_viability: bool = dspy.OutputField(
        description="Is this a viable vocabulary question overall? (True/False)"
    )
    feedback: str = dspy.OutputField(
        description="Specific assessment and suggestions for improving the vocabulary question."
    )


# --- Added Signature for Assessing Student Answer ---
class AssessStudentAnswer(dspy.Signature):
    """Assesses if the student's answer correctly defines the challenging word based on the passage context."""

    passage: str = dspy.InputField(description="The original text passage.")
    question: str = dspy.InputField(
        description="The vocabulary question that was asked."
    )
    challenging_word: str = dspy.InputField(
        description="The specific word the question was about."
    )
    student_answer: str = dspy.InputField(description="The student's provided answer.")
    is_correct: bool = dspy.OutputField(
        description="Whether the student's answer is substantially correct (True/False)."
    )
    assessment_feedback: str = dspy.OutputField(
        description="Feedback explaining why the answer is correct or incorrect, referencing the passage or word meaning."
    )
    # Optional: score: float = dspy.OutputField(...)


# --- VocabularyFlow Module (Using ChainOfThought as in original) ---
class VocabularyFlow(dspy.Module):
    """
    A module that identifies a challenging word, generates a question,
    and assesses the question's viability.
    """

    def __init__(self):
        super().__init__()
        # Using ChainOfThought as in the original example provided
        self.word_identifier = dspy.ChainOfThought(IdentifyChallengingWord)
        self.question_generator = dspy.ChainOfThought(GenerateVocabularyQuestion)
        self.assessor = dspy.ChainOfThought(
            VocabularyAssessment
        )  # Assesses the *question*

    def forward(self, passage: str) -> dspy.Prediction:
        """
        Generates and assesses a vocabulary question based on the passage.
        """
        # 1. Identify a challenging word
        word_id_result = self.word_identifier(passage=passage)

        # Handle case where no challenging word is found
        if not word_id_result.challenging_word:
            return dspy.Prediction(
                challenging_word=None,
                usage_sentences=None,
                question="No challenging words found in the passage.",
                feedback="Passage might be too simple or lack distinct vocabulary.",
                question_viability=False,
                # Add other fields expected by consuming code with default values
                # vague_score=None, context_sufficiency=None, question_quality=None
            )

        # 2. Generate a vocabulary question
        question_result = self.question_generator(
            passage=passage, challenging_word=word_id_result.challenging_word
        )

        # 3. Assess the generated question's viability
        assessment_result = self.assessor(
            passage=passage,
            challenging_word=word_id_result.challenging_word,
            question=question_result.question,
        )

        # 4. Build the final prediction based on assessment
        # Return comprehensive details regardless of viability, but mark viability clearly
        prediction = dspy.Prediction(
            challenging_word=word_id_result.challenging_word,
            usage_sentences=word_id_result.usage_sentences,
            vague_score=question_result.vague_score,  # From question generator
            question=question_result.question,
            feedback=assessment_result.feedback,  # Feedback from the *assessment* step
            context_sufficiency=assessment_result.context_sufficiency,
            question_quality=assessment_result.question_quality,
            question_viability=assessment_result.question_viability,  # The final viability decision
        )

        return prediction

    # --- Metric function (Retained from original) ---
    @classmethod
    def metric(cls, example, prediction, trace=None):
        # Ensure prediction is treated as a dictionary-like object
        pred_dict = (
            prediction
            if isinstance(prediction, dict)
            else prediction.toDict()
            if hasattr(prediction, "toDict")
            else vars(prediction)
        )

        # Default viability if missing in example (assume True if not specified)
        example_viability = getattr(example, "question_viability", True)
        pred_viability = pred_dict.get(
            "question_viability", False
        )  # Default prediction to False if missing

        # Got question_viability wrong; immediate and significant penalty
        if example_viability != pred_viability:
            # print(f"Viability mismatch: Example={example_viability}, Prediction={pred_viability}")
            return 0.2  # Small non-zero score

        # If not viable, check if we correctly identified it as not viable
        elif not example_viability:  # Example is not viable
            # print(f"Correctly identified non-viable? Prediction={pred_viability}")
            return 1.0  # Correctly identified as non-viable

        # If viable, evaluate the quality metrics if present
        else:
            # Check if necessary score attributes exist in both example and prediction
            required_attrs = ["vague_score", "context_sufficiency", "question_quality"]
            if not all(hasattr(example, attr) for attr in required_attrs):
                print(
                    "Warning: Example missing required attributes for metric calculation."
                )
                return 0.5  # Neutral score if example is incomplete

            if not all(pred_dict.get(attr) is not None for attr in required_attrs):
                print(
                    f"Warning: Prediction missing required attributes: {[attr for attr in required_attrs if pred_dict.get(attr) is None]}"
                )
                return 0.3  # Penalize missing prediction attributes

            # Calculate differences between predicted and example scores
            vague_diff = abs(pred_dict["vague_score"] - example.vague_score)
            context_diff = abs(
                pred_dict["context_sufficiency"] - example.context_sufficiency
            )
            quality_diff = abs(pred_dict["question_quality"] - example.question_quality)

            max_diff_per_metric = 4
            total_max_diff = max_diff_per_metric * 3
            total_diff = vague_diff + context_diff + quality_diff

            normalized_score = (
                1.0 - (total_diff / total_max_diff) if total_max_diff > 0 else 1.0
            )

            if total_diff > 0:
                normalized_score *= 0.95  # Slight penalty for imperfection

            # print(f"Viable match. Score: {max(0.0, normalized_score)}")
            return max(0.0, normalized_score)


# --- Main block for direct execution (Testing/Compilation - Retained from original) ---
if __name__ == "__main__":
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found. Please set it in your .env file.")

    model = "gemini/gemini-2.0-flash-001"  # Ensure this model name is correct
    llm = dspy.LM(model, api_key=api_key)
    # Configure DSPy settings for this execution context
    # Note: The FastAPI app uses the config set in main.py
    dspy.settings.configure(
        lm=llm
    )  # Removed experimental=True, provide_traceback=True unless needed

    print("--- DSPy configured for direct script execution ---")

    # --- Examples (Retained from original) ---
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
            question_viability=True,
        ),
        # Example 2: No challenging word found
        dspy.Example(
            passage="In 1945, the world saw the end of World War II, leading to the division of Germany and the rise of the Cold War.",
            challenging_word=None,
            usage_sentences=None,
            vague_score=None,
            question="No challenging words found in the passage.",
            feedback=None,
            context_sufficiency=1,  # Min context if no word
            question_quality=1,  # Min quality if no word
            question_viability=False,
        ),
        # Example 3: Vague Usage Sentences (Adjusted viability based on assessment)
        dspy.Example(
            passage="Photosynthesis is the process by which plants convert sunlight into energy, using carbon dioxide and water.",
            challenging_word="Photosynthesis",
            usage_sentences=(
                "1) 'The sun helps along the process of photosynthesis.'\n"
                "2) 'Photosynthesis requires water and sunlight.'"
            ),
            vague_score=4,  # Usage sentences are vague
            question="In the context of the passage, how would you define 'Photosynthesis'?",
            feedback="The usage sentences are too vague and oversimplify the concept. They state basic facts described in the passage. More detailed examples should provide more detailed context.",
            context_sufficiency=2,  # Passage context is okay, usage is weak
            question_quality=3,
            question_viability=True,  # Assume question is still viable despite weak usage examples
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
            question_viability=True,
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
            question_viability=True,
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
            question_viability=True,
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
            question_viability=True,
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
            question_viability=False,
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
            question_viability=True,
        ),
    ]
    # Ensure examples used for training/compilation have the 'passage' input field
    examples_with_inputs = [example.with_inputs("passage") for example in examples]

    # --- Instantiate the Flow ---
    voc_flow = VocabularyFlow()

    # --- Run with basic model (using TEST_PASSAGE from constants) ---
    print("\n--- Basic Model Test Run ---")
    basic_result = voc_flow(passage=TEST_PASSAGE)
    print("Result:", basic_result)

    # --- Compile with MIPROv2 (Retained from original) ---
    print("\n--- Compiling with MIPROv2 ---")
    # Note: Compilation can take time and consume API credits
    compile_flow = True  # Set to False to skip compilation during testing
    if compile_flow:
        compflow_optimizer = dspy.MIPROv2(
            metric=VocabularyFlow.metric,
            num_candidates=4,
            max_bootstrapped_demos=2,
            max_labeled_demos=5,
        )  # Example params
        try:
            optimized_vocflow = compflow_optimizer.compile(
                student=voc_flow,  # Pass the base flow instance
                trainset=examples_with_inputs,
                max_iters=1,  # Limit iterations for quicker testing
                # minibatch_size=1 # Adjust as needed
            )
            print("\n--- Optimized Model Test Run ---")
            optimized_result = optimized_vocflow(passage=TEST_PASSAGE)
            print("Result:", optimized_result)

            # You might want to save the optimized program:
            # optimized_vocflow.save("optimized_vocflow_program.json")
            # And load it later:
            # loaded_flow = VocabularyFlow()
            # loaded_flow.load("optimized_vocflow_program.json")

        except Exception as e:
            print(f"!!! ERROR during compilation: {e} !!!")
            print("Skipping optimized run.")
    else:
        print("Skipping compilation.")

    # --- Test Answer Assessment (using the basic result for simplicity) ---
    print("\n--- Answer Assessment Test ---")
    if basic_result.get("question_viability") and basic_result.get("challenging_word"):
        assessment_module = dspy.Predict(
            AssessStudentAnswer
        )  # Use Predict for the signature
        student_answer = "It means lasting only a short time."  # Example answer
        assessment_pred = assessment_module(
            passage=TEST_PASSAGE,
            question=basic_result.question,
            challenging_word=basic_result.challenging_word,
            student_answer=student_answer,
        )
        print(f"Student Answer: {student_answer}")
        print(f"Is Correct: {assessment_pred.get('is_correct')}")
        print(f"Assessment Feedback: {assessment_pred.get('assessment_feedback')}")
    else:
        print(
            "Skipping assessment test as no viable question was generated by basic model."
        )

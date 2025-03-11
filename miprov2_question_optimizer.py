import dspy
import os

# Configure the LLM
llm = dspy.LM('gemini/gemini-2.0-flash-001', api_key=os.getenv("GOOGLE_KEY"))
dspy.settings.configure(lm=llm, experimental=True, provide_traceback=True)

# Step 1: Define the question-generation task
class GenerateQuestion(dspy.Signature):
    passage = dspy.InputField(description="A passage from a book or article.")
    question: str = dspy.OutputField(description="A thought-provoking comprehension question about the passage.")

question_predictor = dspy.Predict(GenerateQuestion, provide_traceback=True)

# Step 2: Define the answerability assessment
class AnswerabilityAssessor(dspy.Signature):
    passage = dspy.InputField(description="A passage from a book or article.")
    question = dspy.InputField(description="A generated comprehension question.")
    
    answerable: bool = dspy.OutputField(description="True if the passage contains enough information to answer the question, otherwise False.")
    justification: str = dspy.OutputField(description="Explanation of why the question is or isn't answerable based on the passage.")

answerability_assessor = dspy.Predict(AnswerabilityAssessor, provide_traceback=True)

# Step 3: Define the question quality assessment
class QuestionAssessment(dspy.Signature):
    passage = dspy.InputField(description="A passage from a book or article.")
    question = dspy.InputField(description="A generated comprehension question.")
    
    relevance_score: int = dspy.OutputField(description="How relevant is the question? (0-10)")
    depth_score: int = dspy.OutputField(description="How deep or thought-provoking is the question? (0-10)")
    specificity_score: int = dspy.OutputField(description="How specific is the question? (0-10)")
    feedback: str = dspy.OutputField(description="Overall feedback on the question.")

question_assessor = dspy.Predict(QuestionAssessment, provide_traceback=True)

# Step 4: Provide **both good and bad** question examples
examples = [
    # Example 1: Good Question
    dspy.Example(
        passage="In 1945, the world saw the end of World War II, leading to the division of Germany and the rise of the Cold War.",
        question="How did the end of World War II contribute to the start of the Cold War?",
        answerable=True,
        relevance_score=10,
        depth_score=9,
        specificity_score=9,
        feedback="Highly relevant and focused on a key historical consequence."
    ),
    # Example 2: Unanswerable Question
    dspy.Example(
        passage="In 1945, the world saw the end of World War II, leading to the division of Germany and the rise of the Cold War.",
        question="What were the economic policies of Germany in 1947?",
        answerable=False,
        justification="The passage does not mention German economic policies in 1947."
    ),
    # Example 3: Vague Question
    dspy.Example(
        passage="Photosynthesis is the process by which plants convert sunlight into energy, using carbon dioxide and water.",
        question="What happens during photosynthesis?",
        answerable=True,
        relevance_score=8,
        depth_score=5,
        specificity_score=4,
        feedback="This question is relevant but too broad. It could ask about specific steps."
    ),
    # Example 4: Bad Question
    dspy.Example(
        passage="Photosynthesis is the process by which plants convert sunlight into energy, using carbon dioxide and water.",
        question="What is a plant?",
        answerable=False,
        justification="The passage discusses photosynthesis but does not define plants in general."
    ),
    dspy.Example(
        passage="The Great Depression led to widespread unemployment and economic hardship, prompting government intervention through the New Deal.",
        question="How did the Great Depression influence the role of government in the economy, and what specific measures were implemented to address the crisis?",
        answerable=False,
        justification="The passage mentions the New Deal but does not describe any 'specific measures'."
    ),
    dspy.Example(
        passage="In 768, Charlemagne became King of the Franks and began an extensive expansion of the realm. He eventually incorporated the territories of present-day France, Germany, northern Italy, the Low Countries and beyond, linking the Frankish kingdom with Papal lands.",
        question="What were the key geographical areas encompassed by Charlemagne's expansion, and what was the significance of linking the Frankish kingdom with Papal lands?",
        answerable=False,
        justification="The passage does not explain why linking the Frankish kingdom with the Papal lands was significant."
    )
]

# Train assessors using examples
assessment_examples = [example.with_inputs("passage", "question") for example in examples]

def answerability_training_metric(example, prediction, trace=None):
    return 1 if prediction.answerable == example.answerable else 0

answerability_optimizer = dspy.MIPROv2(metric=answerability_training_metric)
optimized_answerability_assessor = answerability_optimizer.compile(
    student=answerability_assessor, 
    trainset=assessment_examples,
    minibatch_size=1
)

def question_assessor_training_metric(example, prediction, trace=None):
    relevance_diff = abs(prediction.relevance_score - example.relevance_score)
    depth_diff = abs(prediction.depth_score - example.depth_score)
    specificity_diff = abs(prediction.specificity_score - example.specificity_score)
    
    normalized_score = 1 - ((relevance_diff + depth_diff + specificity_diff) / 30)
    return max(0, normalized_score)

quality_examples = [example for example in assessment_examples if example.answerable]
quality_optimizer = dspy.MIPROv2(metric=question_assessor_training_metric)
optimized_question_assessor = quality_optimizer.compile(
    student=question_assessor,
    trainset=quality_examples,
    minibatch_size=1
)

def llm_based_question_metric(example, prediction, trace=None):
    answerability = optimized_answerability_assessor(
        passage=example.passage, 
        question=prediction.question
    )
    if answerability.answerable != example.answerable:
        return 0
    elif not answerability.answerable:
        return 1
    else:
        quality = optimized_question_assessor(
            passage=example.passage, 
            question=prediction.question
        )
        relevance_diff = abs(quality.relevance_score - example.relevance_score)
        depth_diff = abs(quality.depth_score - example.depth_score)
        specificity_diff = abs(quality.specificity_score - example.specificity_score)
    
        normalized_score = 1 - ((relevance_diff + depth_diff + specificity_diff) / 30)
        return max(0, normalized_score)

question_gen_examples = [example.with_inputs("passage") for example in examples]
question_optimizer = dspy.MIPROv2(metric=llm_based_question_metric)
optimized_question_predictor = question_optimizer.compile(
    student=question_predictor,
    trainset=question_gen_examples,
    minibatch_size=1
)

print("Optimization complete! The system is now using MIPROV2 for prompt improvement.")

# Step 8: Testing the optimized system
test_passage = """Alice opened the door and found that it led into a small passage, not much larger
than a rat-hole: she knelt down and looked along the passage into the loveliest garden you ever saw.
How she longed to get out of that dark hall, and wander about among those beds of bright flowers
and those cool fountains, but she could not even get her head through the doorway; “and even if my
head would go through,” thought poor Alice, “it would be of very little use without my shoulders.
Oh, how I wish I could shut up like a telescope! I think I could, if I only knew how to begin.”
For, you see, so many out-of-the-way things had happened lately, that Alice had begun to think that
very few things indeed were really impossible.
"""

# Generate a question
question = optimized_question_predictor(passage=test_passage)

# Check if the question is answerable
answerability = optimized_answerability_assessor(passage=test_passage, question=question.question)

# Evaluate question quality if it's answerable
if answerability.answerable:
    assessment = optimized_question_assessor(passage=test_passage, question=question.question)
    
    print("Passage:", test_passage)
    print("Generated Question:", question.question)
    print("Relevance Score:", assessment.relevance_score)
    print("Depth Score:", assessment.depth_score)
    print("Specificity Score:", assessment.specificity_score)
    print("Feedback:", assessment.feedback)
else:
    print("Generated Question:", question.question)
    print("This question is unanswerable based on the passage.")
    print("Justification:", answerability.justification)
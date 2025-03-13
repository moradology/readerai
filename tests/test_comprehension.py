import dspy
from readerai.flows.comprehension import ComprehensionFlow

def test_metric_answerable_correct():
    """Test the metric function with a correctly identified answerable question."""
    example = dspy.Example(
        answerable=True,
        relevance_score=0.8,
        depth_score=0.7,
        specificity_score=0.9
    )
    
    prediction = dspy.Prediction(
        answerable=True,
        relevance_score=0.8,
        depth_score=0.7,
        specificity_score=0.9
    )
    
    score = ComprehensionFlow.metric(example, prediction)
    assert score == 1.0

def test_metric_answerable_with_differences():
    """Test the metric function with an answerable question but different scores."""
    example = dspy.Example(
        answerable=True,
        relevance_score=0.8,
        depth_score=0.7,
        specificity_score=0.9
    )
    
    prediction = dspy.Prediction(
        answerable=True,
        relevance_score=0.7,
        depth_score=0.6,
        specificity_score=0.8
    )
    
    score = ComprehensionFlow.metric(example, prediction)
    assert score < 1.0
    assert score > 0.0

def test_metric_unanswerable_correct():
    """Test the metric function with a correctly identified unanswerable question."""
    example = dspy.Example(
        answerable=False
    )
    
    prediction = dspy.Prediction(
        answerable=False
    )
    
    score = ComprehensionFlow.metric(example, prediction)
    assert score == 1.0

def test_metric_answerable_incorrect():
    """Test the metric function with an incorrectly identified answerable question."""
    example = dspy.Example(
        answerable=True,
        relevance_score=0.8,
        depth_score=0.7,
        specificity_score=0.9
    )
    
    prediction = dspy.Prediction(
        answerable=False
    )
    
    score = ComprehensionFlow.metric(example, prediction)
    assert score == 0.0

def test_metric_unanswerable_incorrect():
    """Test the metric function with an incorrectly identified unanswerable question."""
    example = dspy.Example(
        answerable=False
    )
    
    prediction = dspy.Prediction(
        answerable=True,
        relevance_score=0.8,
        depth_score=0.7,
        specificity_score=0.9
    )
    
    score = ComprehensionFlow.metric(example, prediction)
    assert score == 0.0


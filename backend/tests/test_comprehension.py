import dspy

from readerai.flows.comprehension import ComprehensionFlow


def test_metric_answerable_correct():
    """Test the metric function with a correctly identified answerable question."""
    example = dspy.Example(
        answerable=True, relevance_score=4, depth_score=4, specificity_score=5
    )

    prediction = dspy.Prediction(
        answerable=True, relevance_score=4, depth_score=4, specificity_score=5
    )

    score = ComprehensionFlow.metric(example, prediction)
    assert score == 1.0


def test_metric_answerable_with_differences():
    """Test the metric function with an answerable question but different scores."""
    example = dspy.Example(
        answerable=True, relevance_score=4, depth_score=4, specificity_score=5
    )

    prediction = dspy.Prediction(
        answerable=True, relevance_score=4, depth_score=3, specificity_score=4
    )

    score = ComprehensionFlow.metric(example, prediction)
    assert score < 1.0
    assert score > 0.0


def test_metric_unanswerable_correct():
    """Test the metric function with a correctly identified unanswerable question."""
    example = dspy.Example(answerable=False)

    prediction = dspy.Prediction(answerable=False)

    score = ComprehensionFlow.metric(example, prediction)
    assert score == 1.0


def test_metric_answerable_incorrect():
    """Test the metric function with an incorrectly identified answerable question."""
    example = dspy.Example(
        answerable=True, relevance_score=4, depth_score=3, specificity_score=4
    )

    prediction = dspy.Prediction(answerable=False)

    score = ComprehensionFlow.metric(example, prediction)
    assert score == 0.0


def test_metric_unanswerable_incorrect():
    """Test the metric function with an incorrectly identified unanswerable question."""
    example = dspy.Example(answerable=False)

    prediction = dspy.Prediction(
        answerable=True, relevance_score=4, depth_score=3, specificity_score=5
    )

    score = ComprehensionFlow.metric(example, prediction)
    assert score == 0.0

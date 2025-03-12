import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import unittest
from readerai.flows.comprehension import run_comprehension_flow

class TestComprehensionFlow(unittest.TestCase):
    def test_run_default(self):
        # Run the flow with a default passage
        result = run_comprehension_flow()
        print("Default flow result:", result)
        self.assertIn("passage", result)
        self.assertIn("question", result)
        # Either assessment should be present or an error key if unanswerable
        if "assessment" in result:
            self.assertIn("relevance_score", result["assessment"])
            self.assertIn("depth_score", result["assessment"])
            self.assertIn("specificity_score", result["assessment"])
            self.assertIn("feedback", result["assessment"])
        elif "error" in result:
            self.assertTrue(result["error"])
        else:
            self.fail("Result must include either assessment or error.")

    def test_custom_passage(self):
        # Run the flow with a custom passage
        custom_passage = "Custom passage text for testing."
        result = run_comprehension_flow(custom_passage)
        print("Custom passage result:", result)
        self.assertEqual(result["passage"], custom_passage)
        self.assertIn("question", result)

if __name__ == "__main__":
    unittest.main()

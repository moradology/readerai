import os
from dotenv import load_dotenv

import dspy

load_dotenv()

lm = dspy.LM('gemini/gemini-2.0-flash-001', api_key=os.getenv("GOOGLE_KEY"))
dspy.configure(lm=lm)

def cot(q):
    math = dspy.ChainOfThought("question -> answer: float")
    resp = math(question=q)
    return resp

# main.py (Using Constants)

import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
import dspy
from dotenv import load_dotenv

# --- DSPy Configuration (Keep as before) ---
load_dotenv()
try:
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables.")
    llm_model_name = 'gemini/gemini-2.0-flash-001'
    llm = dspy.LM(llm_model_name, api_key=google_api_key)
    dspy.settings.configure(lm=llm)
    print(f"DSPy configured successfully with model: {llm_model_name}")
except Exception as e:
    print(f"!!! ERROR configuring DSPy: {e} !!!")
    llm = None

# --- Import from constants and response modules ---
from readerai.constants import TEST_PASSAGE # Import passage from constants
from readerai.flows.response import (
    generate_ai_reply,
    generate_vocab_question_data,
    assess_student_answer
)

# --- Simple In-Memory State (Keep as before) ---
session_state = {}

# --- FastAPI Application Code ---

# Define Request and Response Models
class UserInput(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

# Initialize FastAPI
app = FastAPI(
    title="ReaderAI Chatbot API",
    description="API interface for the ReaderAI project.",
    version="1.0.0",
)

# --- Endpoints ---

@app.get("/initial_passage")
async def get_initial_passage_with_question():
    """Endpoint using the passage from constants.py"""
    global session_state
    # --- Use the imported TEST_PASSAGE ---
    initial_passage = TEST_PASSAGE
    question_data = None
    response_data = {"passage": initial_passage}

    if dspy.settings.lm:
        # Pass the constant passage to the helper
        question_data = generate_vocab_question_data(initial_passage)
        if question_data and question_data.get("question_viability"):
            session_state['last_question'] = question_data.get("question")
            session_state['last_word'] = question_data.get("challenging_word")
            print(f"Stored question state: Word='{session_state['last_word']}'")
            response_data["question"] = question_data.get("question")
            response_data["feedback"] = question_data.get("feedback")
            response_data["usage_sentences"] = question_data.get("usage_sentences")
        else:
             response_data["question"] = question_data.get("question", "Error generating initial question.")
             response_data["feedback"] = question_data.get("feedback", "Check server logs.")
             session_state.pop('last_question', None)
             session_state.pop('last_word', None)
    else:
        print("Skipping initial question generation - LLM not configured.")
        response_data["question"] = "Error: LLM not configured."
        response_data["feedback"] = "Please check server logs."
        session_state.pop('last_question', None)
        session_state.pop('last_word', None)

    return JSONResponse(response_data)


@app.get("/", response_class=HTMLResponse)
async def read_index():
    """Serves the main HTML user interface."""
    global session_state
    session_state = {}
    print("Cleared session state on page load.")
    try:
        return FileResponse("index.html")
    except RuntimeError as e:
        if "No file/directory" in str(e):
             return HTMLResponse(content="<html><body><h1>Error</h1><p>index.html not found.</p></body></html>", status_code=404)
        raise e

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(user_input: UserInput):
    """Handles incoming chat messages, assessing answers or generating new replies."""
    global session_state
    print(f"--- API Endpoint /chat received request ---")
    user_message = user_input.message
    print(f"Message from user: {user_message}")
    print(f"Current state: {session_state}")

    ai_response_text = "Error: LLM not configured. Cannot process request."
    if not dspy.settings.lm:
        print("Skipping chat processing - LLM not configured.")
        return ChatResponse(response=ai_response_text)

    last_question = session_state.get('last_question')
    last_word = session_state.get('last_word')

    if last_question and last_word:
        print(f"Expecting answer for word '{last_word}'. Assessing...")
        # --- Use the imported TEST_PASSAGE for assessment context ---
        assessment_result = assess_student_answer(
            passage_text=TEST_PASSAGE, # Use imported constant
            question_asked=last_question,
            word_asked=last_word,
            student_answer=user_message
        )
        ai_response_text = assessment_result.get('assessment_feedback', "Assessment failed.")

        session_state.pop('last_question', None)
        session_state.pop('last_word', None)
        print("Cleared question state after assessment.")

    else:
        print("Not expecting an answer. Generating standard reply...")
        ai_response_text = generate_ai_reply(user_message) # This function now uses TEST_PASSAGE internally

        # Check if generate_ai_reply produced a NEW question
        if "Here's a new vocabulary question:" in ai_response_text:
             # Use TEST_PASSAGE to get context for the new question state
             new_question_data = generate_vocab_question_data(TEST_PASSAGE)
             if new_question_data and new_question_data.get("question_viability"):
                 session_state['last_question'] = new_question_data.get("question")
                 session_state['last_word'] = new_question_data.get("challenging_word")
                 print(f"Stored NEW question state: Word='{session_state['last_word']}'")
             else:
                 print("generate_ai_reply indicated a question, but couldn't retrieve context to store.")

    print(f"Sending back response: {ai_response_text}")
    print(f"--- API Endpoint /chat finishing request ---")
    return ChatResponse(response=ai_response_text)


# Run the App
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

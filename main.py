# main.py (Using Constants & WebSocket)

import json  # Added for WebSocket message handling
import os
from typing import Any  # Added type hints

import dspy
import uvicorn
from dotenv import load_dotenv
from fastapi import (  # Added WebSocket imports
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel

from readerai.constants import TEST_PASSAGE  # Import passage from constants
from readerai.flows.response import (
    assess_student_answer,
    generate_ai_reply,
    generate_vocab_question_data,
)

# --- DSPy Configuration (Keep as before) ---
load_dotenv()
try:
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables.")
    llm_model_name = "gemini/gemini-2.0-flash-001"
    llm = dspy.LM(llm_model_name, api_key=google_api_key)
    dspy.settings.configure(lm=llm)
    print(f"DSPy configured successfully with model: {llm_model_name}")
except Exception as e:
    print(f"!!! ERROR configuring DSPy: {e} !!!")
    llm = None

# --- Simple In-Memory State (REPLACED by Connection Manager for WebSockets) ---
# session_state = {} # This global state is problematic for concurrent WebSocket users


# --- Connection Manager for WebSocket State ---
class ConnectionManager:
    def __init__(self):
        # Stores active connections: {websocket: {"last_question": str, "last_word": str}}
        self.active_connections: dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = {"last_question": None, "last_word": None}
        print(
            f"WebSocket {websocket.client} connected. Total connections: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]
            print(
                f"WebSocket {websocket.client} disconnected. Total connections: {len(self.active_connections)}"
            )

    def get_state(self, websocket: WebSocket) -> dict:
        return self.active_connections.get(
            websocket, {"last_question": None, "last_word": None}
        )

    def update_state(self, websocket: WebSocket, key: str, value: Any):
        if websocket in self.active_connections:
            self.active_connections[websocket][key] = value

    def clear_question_state(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections[websocket]["last_question"] = None
            self.active_connections[websocket]["last_word"] = None

    async def send_personal_message(self, message: str | dict, websocket: WebSocket):
        """Sends a JSON message to a specific websocket connection."""
        try:
            if isinstance(message, dict):
                await websocket.send_json(message)
            else:  # Assume string
                await websocket.send_json({"type": "text", "payload": message})
        except Exception as e:
            print(f"Error sending message to {websocket.client}: {e}")
            # Optionally try to disconnect if send fails repeatedly
            # self.disconnect(websocket)


manager = ConnectionManager()

# --- FastAPI Application Code ---


# Define Request and Response Models (Keep for HTTP endpoints if needed)
class UserInput(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


# Initialize FastAPI
app = FastAPI(
    title="ReaderAI Chatbot API",
    description="API interface for the ReaderAI project (including WebSockets).",
    version="1.1.0",  # Updated version
)

# --- WebSocket Endpoint ---


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    client_state = manager.get_state(websocket)  # Initial empty state

    # --- Send Initial Passage and Question on Connect ---
    initial_passage = TEST_PASSAGE
    initial_data_payload = {"passage": initial_passage}
    question_data = None

    if dspy.settings.lm:
        print(f"WS {websocket.client}: Generating initial question...")
        question_data = generate_vocab_question_data(initial_passage)
        if question_data and question_data.get("question_viability"):
            client_state["last_question"] = question_data.get("question")
            client_state["last_word"] = question_data.get("challenging_word")
            manager.update_state(
                websocket, "last_question", client_state["last_question"]
            )
            manager.update_state(websocket, "last_word", client_state["last_word"])
            print(
                f"WS {websocket.client}: Stored initial question state: Word='{client_state['last_word']}'"
            )
            initial_data_payload["question"] = question_data.get("question")
            initial_data_payload["feedback"] = question_data.get(
                "feedback"
            )  # Optional: maybe send later
            initial_data_payload["usage_sentences"] = question_data.get(
                "usage_sentences"
            )
        else:
            print(
                f"WS {websocket.client}: Initial question not viable or error generating."
            )
            initial_data_payload["question"] = question_data.get(
                "question", "Error generating initial question."
            )
            initial_data_payload["feedback"] = question_data.get(
                "feedback", "Check server logs."
            )
            # No state to store
    else:
        print(
            f"WS {websocket.client}: Skipping initial question generation - LLM not configured."
        )
        initial_data_payload["question"] = "Error: LLM not configured."
        initial_data_payload["feedback"] = "Please check server logs."

    # Send the initial data bundle
    await manager.send_personal_message(
        {"type": "initial", "payload": initial_data_payload}, websocket
    )
    print(f"WS {websocket.client}: Sent initial data.")

    # --- Main Loop to Handle Incoming Messages ---
    try:
        while True:
            raw_data = (
                await websocket.receive_text()
            )  # Or receive_json if client always sends JSON
            print(f"WS {websocket.client}: Received raw data: {raw_data}")

            try:
                # Assume client sends JSON like {"type": "chat", "message": "..."}
                data = json.loads(raw_data)
                message_type = data.get("type")
                user_message = data.get("message")

                if message_type != "chat" or not user_message:
                    await manager.send_personal_message(
                        {"type": "error", "payload": "Invalid message format."},
                        websocket,
                    )
                    continue

            except json.JSONDecodeError:
                await manager.send_personal_message(
                    {"type": "error", "payload": "Invalid JSON received."}, websocket
                )
                print(f"WS {websocket.client}: Invalid JSON received: {raw_data}")
                continue
            except Exception as e:
                await manager.send_personal_message(
                    {"type": "error", "payload": f"Error processing message: {e}"},
                    websocket,
                )
                print(f"WS {websocket.client}: Error processing message: {e}")
                continue

            print(f"WS {websocket.client}: Message from user: {user_message}")
            client_state = manager.get_state(
                websocket
            )  # Get current state for this client
            print(f"WS {websocket.client}: Current state: {client_state}")

            ai_response_text = "Error: LLM not configured. Cannot process request."
            response_payload = {}

            if not dspy.settings.lm:
                print(
                    f"WS {websocket.client}: Skipping chat processing - LLM not configured."
                )
                response_payload = {"type": "error", "payload": ai_response_text}
            else:
                last_question = client_state.get("last_question")
                last_word = client_state.get("last_word")

                if last_question and last_word:
                    print(
                        f"WS {websocket.client}: Expecting answer for word '{last_word}'. Assessing..."
                    )
                    assessment_result = assess_student_answer(
                        passage_text=TEST_PASSAGE,
                        question_asked=last_question,
                        word_asked=last_word,
                        student_answer=user_message,
                    )
                    ai_response_text = assessment_result.get(
                        "assessment_feedback", "Assessment failed."
                    )
                    response_payload = {"type": "chat", "payload": ai_response_text}

                    # Clear state *for this client* after assessment
                    manager.clear_question_state(websocket)
                    print(
                        f"WS {websocket.client}: Cleared question state after assessment."
                    )

                else:
                    print(
                        f"WS {websocket.client}: Not expecting an answer. Generating standard reply or new question..."
                    )
                    # generate_ai_reply handles asking for a new question internally
                    ai_response_text = generate_ai_reply(user_message)

                    # Check if generate_ai_reply resulted in a NEW question being presented
                    # This relies on the specific text returned by generate_ai_reply
                    if "Okay, here's a new vocabulary question:" in ai_response_text:
                        print(
                            f"WS {websocket.client}: generate_ai_reply triggered a new question. Attempting to store state..."
                        )
                        # Regenerate context to be sure we capture the *latest* question state
                        # Note: This might regenerate a *different* question if the LLM is non-deterministic
                        # A better approach might be for generate_ai_reply to *return* the question details.
                        new_question_data = generate_vocab_question_data(TEST_PASSAGE)
                        if new_question_data and new_question_data.get(
                            "question_viability"
                        ):
                            manager.update_state(
                                websocket,
                                "last_question",
                                new_question_data.get("question"),
                            )
                            manager.update_state(
                                websocket,
                                "last_word",
                                new_question_data.get("challenging_word"),
                            )
                            print(
                                f"WS {websocket.client}: Stored NEW question state from generate_ai_reply: Word='{manager.get_state(websocket).get('last_word')}'"
                            )
                        else:
                            print(
                                f"WS {websocket.client}: Failed to store state for new question generated by generate_ai_reply."
                            )
                            # Consider sending an error or clarification back to the user?

                    response_payload = {"type": "chat", "payload": ai_response_text}

            print(f"WS {websocket.client}: Sending back response: {response_payload}")
            await manager.send_personal_message(response_payload, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"WS {websocket.client}: WebSocket disconnected.")
    except Exception as e:
        print(f"WS {websocket.client}: An error occurred: {e}")
        # Attempt to inform the client before disconnecting
        try:
            await manager.send_personal_message(
                {"type": "error", "payload": f"Server error: {e}. Disconnecting."},
                websocket,
            )
        except Exception:
            pass  # Ignore if sending fails during error handling
        finally:
            manager.disconnect(websocket)  # Ensure cleanup


# --- Existing HTTP Endpoints (Can be kept for testing or alternative access) ---


@app.get("/", response_class=HTMLResponse)
async def read_index():
    """Serves the main HTML user interface."""
    # Note: Global session_state clearing doesn't apply to WebSockets
    print("HTTP GET / requested. Serving index.html.")
    try:
        return FileResponse("index.html")
    except RuntimeError as e:
        if "No file/directory" in str(e):
            return HTMLResponse(
                content="<html><body><h1>Error</h1><p>index.html not found.</p></body></html>",
                status_code=404,
            )
        raise e


# You might comment out or remove these HTTP chat/initial endpoints if
# you want to force WebSocket usage for the main interaction.
# For now, let's keep them but note they use the old global state logic.


@app.get("/initial_passage_http")  # Renamed to avoid conflict if needed
async def get_initial_passage_with_question_http():
    """Endpoint using the passage from constants.py (HTTP version, uses global state)."""
    # WARNING: This uses a simple state approach, not suitable for multiple users.
    # It's kept here primarily for comparison or testing.
    # No shared state anymore - each request has its own state
    print("HTTP GET /initial_passage_http requested.")

    initial_passage = TEST_PASSAGE
    question_data = None
    response_data = {"passage": initial_passage}

    if dspy.settings.lm:
        question_data = generate_vocab_question_data(initial_passage)
        if question_data and question_data.get("question_viability"):
            # global_session_state['last_question'] = question_data.get("question") # Don't modify actual global state
            # global_session_state['last_word'] = question_data.get("challenging_word")
            response_data["question"] = question_data.get("question")
            response_data["feedback"] = question_data.get("feedback")
            response_data["usage_sentences"] = question_data.get("usage_sentences")
        else:
            response_data["question"] = question_data.get(
                "question", "Error generating initial question."
            )
            response_data["feedback"] = question_data.get(
                "feedback", "Check server logs."
            )
    else:
        print("Skipping initial question generation - LLM not configured.")
        response_data["question"] = "Error: LLM not configured."
        response_data["feedback"] = "Please check server logs."

    return JSONResponse(response_data)


@app.post("/chat_http", response_model=ChatResponse)  # Renamed
async def chat_endpoint_http(user_input: UserInput):
    """Handles incoming chat messages (HTTP version, uses global state)."""
    # WARNING: Uses per-request state. Not recommended for maintaining context.
    print("--- HTTP POST /chat_http received request ---")
    # Each request has its own isolated state - no shared context
    user_message = user_input.message
    print(f"Message from user: {user_message}")

    ai_response_text = "Error: LLM not configured. Cannot process request."
    if not dspy.settings.lm:
        print("Skipping chat processing - LLM not configured.")
        return ChatResponse(response=ai_response_text)

    # This part is difficult to simulate correctly without actual shared state.
    # We'll pretend there's no prior question for this simplified HTTP version.
    print("HTTP version assumes no prior question state. Generating standard reply...")
    ai_response_text = generate_ai_reply(user_message)

    print(f"Sending back response: {ai_response_text}")
    print("--- HTTP Endpoint /chat_http finishing request ---")
    return ChatResponse(response=ai_response_text)


# Run the App
if __name__ == "__main__":
    # Ensure the host allows external connections if needed, e.g., host="0.0.0.0"
    # Use 127.0.0.1 for local development.
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

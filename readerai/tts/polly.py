import base64
import json
import os
from typing import Dict, Any

import boto3
from botocore.exceptions import BotoCoreError

# --- AWS Polly Client Initialization ---
try:
    if os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"):
        polly_client = boto3.client("polly")
        print("AWS Polly client configured successfully for TTS module.")
    else:
        polly_client = None
        print("!!! WARNING: AWS credentials not found. Polly synthesis will be disabled. !!!")
except BotoCoreError as e:
    polly_client = None
    print(f"!!! ERROR configuring AWS Polly client in TTS module: {e} !!!")


class PollySynthesisError(Exception):
    """Custom exception for Polly synthesis failures."""
    pass


def synthesize_speech_with_marks(text: str, voice_id: str = "Joanna") -> Dict[str, Any]:
    """
    Synthesizes speech and speech marks using AWS Polly.

    Args:
        text: The text to synthesize.
        voice_id: The Polly voice ID to use.

    Returns:
        A dictionary containing base64 audio data and a list of speech marks.
    
    Raises:
        PollySynthesisError: If the Polly service is not configured or fails.
    """
    if not polly_client:
        raise PollySynthesisError("Polly service is not configured or available.")

    try:
        # 1. Synthesize Audio
        audio_response = polly_client.synthesize_speech(
            Text=text,
            OutputFormat="mp3",
            VoiceId=voice_id,
            Engine="neural"
        )
        audio_stream = audio_response.get("AudioStream")
        if not audio_stream:
            raise PollySynthesisError("Polly did not return an audio stream.")
        
        audio_base64 = base64.b64encode(audio_stream.read()).decode('utf-8')

        # 2. Synthesize Speech Marks
        marks_response = polly_client.synthesize_speech(
            Text=text,
            OutputFormat="json",
            VoiceId=voice_id,
            Engine="neural",
            SpeechMarkTypes=["word"]
        )
        marks_stream = marks_response.get("AudioStream")
        if not marks_stream:
            raise PollySynthesisError("Polly did not return speech marks.")

        marks_data_str = marks_stream.read().decode('utf-8')
        speech_marks = [json.loads(line) for line in marks_data_str.strip().split('\n')]

        return {
            "audioData": f"data:audio/mpeg;base64,{audio_base64}",
            "speechMarks": speech_marks
        }

    except BotoCoreError as e:
        print(f"AWS BotoCoreError during synthesis: {e}")
        raise PollySynthesisError(f"An AWS error occurred: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during synthesis: {e}")
        raise PollySynthesisError("An unexpected server error occurred during synthesis.")
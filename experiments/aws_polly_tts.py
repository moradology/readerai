# Import the AWS SDK for Python (Boto3)
import boto3
import os
import sys # For sys.exit

# --- Configuration ---
# AWS Region
AWS_REGION = "us-east-2"
# The text you want to convert to speech
TEXT_TO_SYNTHESIZE = (
    "Hello! My name is Polly. "
    "I can say things like, 'this is a quote', and emphasize certain words. "
    "For example, I can say 'WOW' with excitement."
)
# The voice you want to use
VOICE_ID = "Joanna"  # Example: Joanna (US English, Female)
# Language code for the voice
LANGUAGE_CODE = "en-US"
# Engine to use
ENGINE = "standard"
# Output format for the audio
OUTPUT_FORMAT = "mp3"

# --- Output Directory and File Names ---
# Define the subdirectory for output files
OUTPUT_SUBDIRECTORY = "experiments/createdfiles"
# Base file names
BASE_AUDIO_FILE_NAME = "speech_output.mp3"
BASE_SPEECH_MARKS_FILE_NAME = "speech_marks.json"

# Get the current working directory (where the script is run from)
current_working_directory = os.getcwd()
# Create the full path for the output subdirectory
output_directory_path = os.path.join(current_working_directory, OUTPUT_SUBDIRECTORY)

# Create full paths for the output files
audio_file_path = os.path.join(output_directory_path, BASE_AUDIO_FILE_NAME)
speech_marks_file_path = os.path.join(output_directory_path, BASE_SPEECH_MARKS_FILE_NAME)


# --- AWS Polly Client Initialization ---
# Using credentials from environment variables as per your working setup
try:
    print(f"Initializing Polly client for region: {AWS_REGION}...")
    polly_client = boto3.client(
        'polly',
        region_name=AWS_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        aws_session_token=os.getenv("AWS_SESSION_TOKEN") # Include if using temporary credentials
    )
    print("Polly client initialized successfully.")
except Exception as e: # Catch a broad exception as in your script
    print(f"Error creating Polly client: {e}")
    print("Please ensure your AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) and region are configured correctly.")
    sys.exit("Exiting due to Polly client initialization error.")


def synthesize_speech_with_marks():
    """
    Synthesizes speech from text using AWS Polly, saves the audio,
    and saves the speech marks to the specified subdirectory.
    """
    try:
        # --- Create Output Directory ---
        # Ensure the output directory exists, create it if not
        os.makedirs(output_directory_path, exist_ok=True)
        print(f"Ensured output directory exists: {output_directory_path}")

        print(f"\nSynthesizing audio for: '{TEXT_TO_SYNTHESIZE}'")
        print(f"Voice ID: {VOICE_ID}, Language: {LANGUAGE_CODE}, Engine: {ENGINE}")

        # Request speech synthesis for the audio file
        audio_response = polly_client.synthesize_speech(
            Text=TEXT_TO_SYNTHESIZE,
            OutputFormat=OUTPUT_FORMAT,
            VoiceId=VOICE_ID,
            LanguageCode=LANGUAGE_CODE,
            Engine=ENGINE
        )

        # --- Save Audio Stream ---
        if "AudioStream" in audio_response:
            with open(audio_file_path, 'wb') as audio_file:
                audio_file.write(audio_response['AudioStream'].read())
            print(f"Audio stream saved to: {audio_file_path}")
        else:
            print("Could not find AudioStream in the response for audio generation.")
            return

        # --- Get and Save Speech Marks ---
        print(f"\nRequesting speech marks (JSON output)...")
        marks_response = polly_client.synthesize_speech(
            Text=TEXT_TO_SYNTHESIZE,
            OutputFormat='json', # Request JSON for speech marks
            VoiceId=VOICE_ID,
            LanguageCode=LANGUAGE_CODE, # Added for consistency
            Engine=ENGINE,             # Added for consistency
            SpeechMarkTypes=['sentence', 'word', 'viseme'] # As per your script
        )

        if "AudioStream" in marks_response: # For 'json' OutputFormat, marks are in AudioStream
            marks_data = marks_response['AudioStream'].read().decode('utf-8')

            with open(speech_marks_file_path, 'w') as marks_file:
                marks_file.write(marks_data)
            print(f"Speech marks saved to: {speech_marks_file_path}")

            # Optional: Print a snippet of the marks to console
            print("\n--- Speech Marks Snippet (first 500 chars) ---")
            print(marks_data[:500] + "..." if len(marks_data) > 500 else marks_data)
            print("---------------------------------------------")
        else:
            print("Could not retrieve speech marks (AudioStream not found in marks response).")

    except boto3.exceptions.Boto3Error as e: # More specific Boto3 errors
        print(f"AWS Boto3 error during synthesis: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during synthesis: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("AWS Polly Text-to-Speech with Speech Marks Demo")
    print("==============================================")
    print(f"AWS Region: {AWS_REGION}")
    print(f"Voice ID: {VOICE_ID}")
    print(f"Output Audio File: {audio_file_path}") # Show full path
    print(f"Output Speech Marks File: {speech_marks_file_path}") # Show full path
    print("----------------------------------------------\n")

    synthesize_speech_with_marks()

    print("\nScript finished.")
    print(f"Please check the directory '{output_directory_path}' for your files.")


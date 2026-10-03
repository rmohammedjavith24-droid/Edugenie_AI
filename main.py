import os
import json
import time
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY is missing. Please add it to your .env file."
    )

# Create Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)


def generate_content_with_retry(prompt):
    last_error = None
    models = (
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
    )

    for model in models:
        for attempt in range(2):
            try:
                return client.models.generate_content(
                    model=model,
                    contents=prompt
                )
            except Exception as error:
                code = getattr(error, "code", None)
                if code not in (404, 429, 503):
                    raise
                last_error = error
                if code == 503 and attempt == 0:
                    time.sleep(1)
                    continue
                break

    raise last_error


# --------------------------------------------------
# Home page
# --------------------------------------------------

@app.route("/")
def home():
    return render_template("index.html")


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "success",
        "message": "EduGenie backend is running!"
    })


# --------------------------------------------------
# Ask Gemini
# --------------------------------------------------

@app.route("/api/ask", methods=["POST"])
def ask_gemini():

    try:
        data = request.get_json()

        question = data.get("question", "").strip()
        subject = data.get("subject", "General")
        level = data.get("level", "College")

        if not question:
            return jsonify({
                "success": False,
                "error": "Please enter a question."
            }), 400

        # System-style instruction for EduGenie
        prompt = f"""
You are EduGenie, an intelligent AI learning assistant for students.

Student level: {level}
Subject: {subject}

The student asked:
{question}

Give a clear, educational and student-friendly answer.

Follow these rules:
1. Explain difficult concepts in simple language.
2. Use examples whenever useful.
3. Use headings and bullet points where appropriate.
4. If the question involves programming, provide working code.
5. If the question is asking for an exam answer, make it easy to memorize.
6. Do not unnecessarily make the answer too complicated.
7. If you are uncertain about something, clearly say so.
8. End with a short "Quick Revision" section when appropriate.
"""

        response = generate_content_with_retry(prompt)

        answer = response.text

        return jsonify({
            "success": True,
            "answer": answer
        })

    except Exception as e:

        print("Gemini Error:", str(e))

        return jsonify({
            "success": False,
            "error": "Unable to generate the answer.",
            "details": str(e)
        }), 500


# --------------------------------------------------
# Summarizer
# --------------------------------------------------

@app.route("/api/summarize", methods=["POST"])
def summarize():

    try:
        data = request.get_json()

        text = data.get("text", "").strip()

        if not text:
            return jsonify({
                "success": False,
                "error": "Please enter text to summarize."
            }), 400

        prompt = f"""
You are EduGenie, an AI study assistant.

Summarize the following study material for a college student.

Requirements:
- Keep the important information.
- Remove unnecessary repetition.
- Use simple English.
- Use headings and bullet points.
- Make it easy to revise before an exam.

Study material:

{text}
"""

        response = generate_content_with_retry(prompt)

        return jsonify({
            "success": True,
            "summary": response.text
        })

    except Exception as e:

        print("Summarization Error:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# --------------------------------------------------
# Quiz Generator
# --------------------------------------------------

@app.route("/api/quiz", methods=["POST"])
def generate_quiz():

    try:
        data = request.get_json()

        topic = data.get("topic", "").strip()
        try:
            number = int(data.get("number", 5))
        except (TypeError, ValueError):
            number = 0

        if not topic:
            return jsonify({
                "success": False,
                "error": "Please enter a topic."
            }), 400

        if number not in (5, 10, 15):
            return jsonify({
                "success": False,
                "error": "Choose 5, 10, or 15 questions."
            }), 400

        prompt = f"""
You are EduGenie, an AI quiz generator.

Create exactly {number} multiple-choice questions about:

{topic}

Return only valid JSON with this exact structure:
{{
  "questions": [
    {{
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Short explanation of the correct answer"
    }}
  ]
}}

Each question must have exactly four distinct options and one correct answer.
correctIndex is the zero-based index of the correct option (0 to 3).
Keep the questions suitable for college students, educational, and clear.
Do not wrap the JSON in Markdown fences.
"""

        response = generate_content_with_retry(prompt)
        quiz_data = json.loads(response.text)
        questions = quiz_data.get("questions") if isinstance(quiz_data, dict) else None

        if not isinstance(questions, list) or len(questions) != number:
            raise ValueError("The generated quiz has an invalid question list.")

        for item in questions:
            if not isinstance(item, dict):
                raise ValueError("The generated quiz contains an invalid question.")

            options = item.get("options")
            correct_index = item.get("correctIndex")
            if (
                not isinstance(item.get("question"), str)
                or not isinstance(options, list)
                or len(options) != 4
                or not all(isinstance(option, str) for option in options)
                or type(correct_index) is not int
                or not 0 <= correct_index < len(options)
                or not isinstance(item.get("explanation"), str)
            ):
                raise ValueError("The generated quiz contains an invalid answer format.")

        return jsonify({
            "success": True,
            "quiz": questions
        })

    except (json.JSONDecodeError, TypeError, ValueError):

        return jsonify({
            "success": False,
            "error": "The AI returned an invalid quiz format. Please generate it again."
        }), 502

    except Exception as e:

        print("Quiz Error:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# --------------------------------------------------
# Run application
# --------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
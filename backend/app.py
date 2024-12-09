from flask import Flask, request, jsonify, Response, make_response
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv
import os
from openai import OpenAI
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# 2. Initialize OpenAI client
if not os.getenv("OPENAI_API_KEY"):
    logger.error("No OpenAI API key found!")
    raise ValueError("OpenAI API key not found in environment variables")

openai_client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)
logger.info("OpenAI client initialized successfully")


app = Flask(__name__)

# Simplified CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": "http://localhost:5173",  # String instead of list
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

class CustomChatbot:
    def __init__(self):
        self.conversation_history = []
        # Define available models
        self.available_models = {
            'gpt-4o': 'GPT-4o',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo',
        }

    def get_available_models(self):
        logger.info("Getting available models")
        logger.info(f"Returning models: {self.available_models}")
        return self.available_models

    def generate_response(self, message, model="gpt-3.5-turbo"):
        try:
            logger.info(f"Generating response using model: {model}")
            messages = [{"role": "system", "content": "You are a helpful assistant."}]

            for entry in self.conversation_history[-5:]:
                messages.append({"role": "user", "content": entry["user_message"]})
                messages.append({"role": "assistant", "content": entry["bot_response"]})

            messages.append({"role": "user", "content": message})

            chat_completion = openai_client.chat.completions.create(
                messages=messages,
                model=model,
                max_tokens=3000,
            )

            bot_response = chat_completion.choices[0].message.content.strip()

            self.conversation_history.append({
                "user_message": message,
                "bot_response": bot_response,
                "model": model,
                "timestamp": datetime.now().isoformat()
            })

            return bot_response
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise

chatbot = CustomChatbot()

@app.route('/models', methods=['GET', 'OPTIONS'])
def get_models():
    try:
        if request.method == 'OPTIONS':
            return make_response('', 204)

        models = chatbot.get_available_models()
        logger.info(f"Models endpoint called. Returning models: {models}")
        return jsonify(models)
    except Exception as e:
        logger.error(f"Error in models endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    try:
        if request.method == 'OPTIONS':
            return make_response('', 204)

        data = request.json
        logger.info(f"Received chat request: {data}")

        user_message = data.get('message', '')
        model = data.get('model', 'gpt-3.5-turbo')

        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        response = chatbot.generate_response(user_message, model)
        return jsonify({
            "response": response,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    logger.info(f"Starting server on port {port}")
    app.run(debug=True, port=port)

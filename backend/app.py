from flask import Flask, request, jsonify, Response, make_response
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv
import os
from openai import OpenAI
import logging
import json
import uuid
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize OpenAI client
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
        "origins": "http://localhost:5173",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

class ConversationManager:
    def __init__(self):
        self.data_dir = Path("data")
        self.data_dir.mkdir(exist_ok=True)

    def create_conversation(self):
        """Create a new conversation and return its ID"""
        conversation_id = str(uuid.uuid4())
        conversation_data = {
            "id": conversation_id,
            "created_at": datetime.now().isoformat(),
            "messages": [],
            "title": "Untitled"  # Set default title to "Untitled"
        }
        self._save_conversation(conversation_id, conversation_data)
        return conversation_id

    def get_conversation(self, conversation_id):
        """Get a specific conversation by ID"""
        try:
            with open(self.data_dir / f"{conversation_id}.json", 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return None

    def list_conversations(self):
        """List all conversations with basic metadata"""
        conversations = []
        for file in self.data_dir.glob("*.json"):
            with open(file, 'r') as f:
                data = json.load(f)
                conversations.append({
                    "id": data["id"],
                    "title": data["title"],
                    "created_at": data["created_at"]
                })
        return sorted(conversations, key=lambda x: x["created_at"], reverse=True)

    def generate_title(self, user_message, bot_response, model):
        """Generate a title for the conversation using the LLM"""
        try:
            prompt = f"""Based on this initial exchange, generate a very brief, concise title (max 6 words) that captures the main topic:

User: {user_message}
Assistant: {bot_response}

Generate only the title without any additional text or punctuation."""

            chat_completion = openai_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that generates very concise titles."},
                    {"role": "user", "content": prompt}
                ],
                model=model,
                max_tokens=20,
                temperature=0.7
            )

            title = chat_completion.choices[0].message.content.strip()
            return title

        except Exception as e:
            logger.error(f"Error generating title: {str(e)}")
            return "Untitled Conversation"

    def add_message(self, conversation_id, user_message, bot_response, model):
        """Add a message pair to a conversation"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")

        conversation["messages"].append({
            "user_message": user_message,
            "bot_response": bot_response,
            "model": model,
            "timestamp": datetime.now().isoformat()
        })

        # Generate title if this is the first message
        if len(conversation["messages"]) == 1:
            generated_title = self.generate_title(user_message, bot_response, model)
            conversation["title"] = generated_title

        self._save_conversation(conversation_id, conversation)

    def _save_conversation(self, conversation_id, data):
        """Save conversation data to file"""
        with open(self.data_dir / f"{conversation_id}.json", 'w') as f:
            json.dump(data, f, indent=2)

class CustomChatbot:
    def __init__(self):
        self.conversation_manager = ConversationManager()
        self.available_models = {
            'gpt-4o': 'GPT-4o',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo',
        }

    def get_available_models(self):
        logger.info("Getting available models")
        return self.available_models

    def generate_response(self, conversation_id, message, model="gpt-4o"):
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                conversation_id = self.conversation_manager.create_conversation()
                conversation = self.conversation_manager.get_conversation(conversation_id)

            messages = [{"role": "system", "content": "You are a helpful assistant."}]

            # Add last 5 messages from conversation history
            for msg in conversation["messages"][-5:]:
                messages.append({"role": "user", "content": msg["user_message"]})
                messages.append({"role": "assistant", "content": msg["bot_response"]})

            messages.append({"role": "user", "content": message})

            chat_completion = openai_client.chat.completions.create(
                messages=messages,
                model=model,
                max_tokens=3000,
            )

            bot_response = chat_completion.choices[0].message.content.strip()

            # Save the message pair
            self.conversation_manager.add_message(conversation_id, message, bot_response, model)

            return {"response": bot_response, "conversation_id": conversation_id}

        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise

chatbot = CustomChatbot()

@app.route('/conversations', methods=['GET', 'POST', 'OPTIONS'])
def handle_conversations():
    try:
        if request.method == 'OPTIONS':
            return make_response('', 204)

        if request.method == 'GET':
            conversations = chatbot.conversation_manager.list_conversations()
            return jsonify(conversations)

        if request.method == 'POST':
            conversation_id = chatbot.conversation_manager.create_conversation()
            return jsonify({"conversation_id": conversation_id})

    except Exception as e:
        logger.error(f"Error in conversations endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/conversations/<conversation_id>', methods=['GET', 'OPTIONS'])
def get_conversation(conversation_id):
    try:
        if request.method == 'OPTIONS':
            return make_response('', 204)

        conversation = chatbot.conversation_manager.get_conversation(conversation_id)
        if not conversation:
            return jsonify({"error": "Conversation not found"}), 404

        return jsonify(conversation)

    except Exception as e:
        logger.error(f"Error getting conversation: {str(e)}")
        return jsonify({"error": str(e)}), 500

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
        conversation_id = data.get('conversation_id')

        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        response = chatbot.generate_response(conversation_id, user_message, model)
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    logger.info(f"Starting server on port {port}")
    app.run(debug=True, port=port)

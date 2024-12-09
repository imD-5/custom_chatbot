# Custom Chatbot
***Since API usage is usually cheaper than monthly subscription, why not make it mysef????***

## Setup
1. Ensure you have Python 3.x and Node.js installed
2. Run the setup script: `./setup.sh`

## Development
- Backend code goes in `backend/app.py`
- Frontend code goes in `frontend/src/App.jsx`

## Running the Application
1. Navigate to the project directory: `cd chatbot`
2. Run the start script: `./start.sh`

## Environment Variables
### Backend (.env)
- FLASK_APP=app.py
- FLASK_ENV=development
- PORT=5001
- OPENAI_API_KEY="your-key"

### Frontend (.env)
- VITE_API_URL=http://localhost:5000

## Dependencies
### Backend
- Flask
- Flask-CORS

### Frontend
- React
- Vite
- Lucide React
- Tailwind CSS

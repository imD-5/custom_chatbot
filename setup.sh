#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${GREEN}Starting chatbot setup...${NC}"

# Check for Python
if ! command_exists python3; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3 first.${NC}"
    exit 1
fi

# Check for pip
if ! command_exists pip3; then
    echo -e "${RED}pip3 is not installed. Please install pip3 first.${NC}"
    exit 1
fi

# Check for Node.js and npm
if ! command_exists node; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}npm is not installed. Please install npm first.${NC}"
    exit 1
fi

# Create project directories
echo -e "${YELLOW}Creating project directories...${NC}"
mkdir -p backend frontend

# Setup Python virtual environment
echo -e "${YELLOW}Setting up Python virtual environment...${NC}"
cd backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install flask flask-cors

# Create requirements.txt
echo "flask
flask-cors" > requirements.txt

# Create .env file for backend
echo "FLASK_APP=app.py
FLASK_ENV=development
PORT=5001" > .env

# Setup frontend
cd ../frontend
echo -e "${YELLOW}Setting up React frontend...${NC}"
npm create vite@latest . -- --template react
npm install

# Install additional frontend dependencies
echo -e "${YELLOW}Installing additional frontend dependencies...${NC}"
npm install lucide-react @tailwindcss/forms tailwindcss postcss autoprefixer

# Initialize Tailwind CSS
npx tailwindcss init -p

# Create .env file for frontend
echo "VITE_API_URL=http://localhost:5001" > .env

# Create a start script
cd ..
echo -e "${YELLOW}Creating start script...${NC}"
cat > start.sh << 'EOL'
#!/bin/bash

# Start backend
cd backend
source venv/bin/activate
python app.py &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Function to kill processes on script exit
cleanup() {
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

trap cleanup INT

# Wait for processes
wait
EOL

chmod +x start.sh

echo -e "${GREEN}Setup complete! To start the application:${NC}"
echo -e "1. cd chatbot"
echo -e "2. ./start.sh"
echo -e "\n${YELLOW}Note: Make sure to copy your backend (app.py) and frontend (App.jsx) files into their respective directories.${NC}"

# Create README
cat > README.md << 'EOL'
# Custom Chatbot

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
- PORT=5000

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
EOL

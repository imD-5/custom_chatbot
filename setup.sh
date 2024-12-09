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

echo -e "${GREEN}Starting chatbot environment setup...${NC}"

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

# Setup Python virtual environment
echo -e "${YELLOW}Setting up Python virtual environment...${NC}"
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

# Install Python dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo -e "${RED}requirements.txt not found in backend directory${NC}"
    exit 1
fi

# Create backend .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating backend .env file...${NC}"
    echo "FLASK_APP=app.py
FLASK_ENV=development
PORT=5001
OPENAI_API_KEY=" > .env
    echo -e "${RED}Please add your OpenAI API key to backend/.env${NC}"
fi

# Setup frontend
cd ../frontend

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
if [ -f "package.json" ]; then
    npm install
else
    echo -e "${RED}package.json not found in frontend directory${NC}"
    exit 1
fi

# Create frontend .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating frontend .env file...${NC}"
    echo "VITE_API_URL=http://localhost:5001" > .env
fi

# Create or update start script in root directory
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

echo -e "${GREEN}Setup complete!${NC}"
echo -e "\n${YELLOW}Important:${NC}"
echo -e "1. Make sure to add your OpenAI API key to backend/.env"
echo -e "2. To start the application, run: ${GREEN}./start.sh${NC}"
echo -e "3. Access the application at: ${GREEN}http://localhost:5173${NC}"

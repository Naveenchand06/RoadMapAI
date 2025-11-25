# RoadMap AI

RoadMap AI is an intelligent application designed to help you master any topic.  
By understanding your current knowledge level, it generates personalized learning roadmaps tailored specifically to your needs.

A big shoutout to **[Motia](https://motia.dev)** — an incredible tool that makes building products like this easier, faster, and smarter.


## 🚀 Features

- **Personalized Roadmaps**: Generates step-by-step learning paths based on your specific topic and current expertise.
- **Knowledge Level Adaptation**: Tailors content whether you are a beginner, intermediate, or expert.

> **Note**: Video generation is currently not supported.

## 🛠️ Technology Stack

This application is built using **Motia**, a unified backend platform that simplifies development.

- **Backend Platform**: [Motia](https://motia.dev)
- **AI/Agent System**: LangGraph Multi-Agent System
- **LLM Provider**: Groq
- **Model**: gtp-oss-120
- **Languages**: TypeScript & Python
- **Database**: MongoDB
- **Authentication**: JWT

## 🏁 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

- **Node.js** (v20 or higher)
- **Python** (v3.11 or higher)
- **npm** 

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Naveenchand06/RoadMapAI
    cd RoadMapAI
    ```

2.  **Install dependencies:**
    This command installs both Node.js and Python dependencies managed by Motia.
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Copy the example environment file and update it with your credentials.
    ```bash
    cp .env.example .env
    ```
    Open `.env` and fill in the following:
    - `GROQ_API_KEY`: Your Groq API Key.
    - `MONGODB_URL`: Your MongoDB connection string.
    - `JWT_SECRET`: Your JWT secret key.

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will start, and you can access the APIs and backend services managed by Motia.

---
*Powered by [Motia](https://motia.dev) - The Unified Backend Platform.*

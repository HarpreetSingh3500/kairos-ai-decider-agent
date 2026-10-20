# KAIROS AI: Predictive Cyber Threat Decision Agent

> **Tags:** `#strands-decider-2b` `#tool-selection` `#amazon-bedrock`

KAIROS AI is an ultra-low-latency, autonomous bridge command and cyber-threat decision agent. It utilizes **Strands Decider 2B** running locally on CUDA for instant (~115ms) voice command classification and tool selection, paired with **Amazon Bedrock** for generative tactical incident reports.

---

## 🚀 Architecture Overview

* **User Command Input:** Voice/text transcript received via sci-fi React Dashboard (`App.jsx`).
* **Instant Decision Routing (~115ms):** `StrandsDeciderModel` (`strands-decider-2B-hobson-v19`) classifies incoming commands into discrete execution states (`raise_shields`, `kill_docker_containers`, or `ignore`).
* **Generative Incident Briefing:** Amazon Bedrock (`anthropic.claude-3-haiku-20240307-v1:0`) generates a concise tactical security report based on the calibrated decision and confidence score.
* **Dynamic UI Reaction:** React sci-fi dashboard renders real-time state updates, alert color flashes (Cyan/Red), and confidence telemetry in the log panel.

---

## 🛠️ Reusable Strands Decider 2B Decision Pattern (#tool-selection)

This repository provides a standalone, reusable **#tool-selection** pattern that other builders can drop directly into their agent's decision path to bypass expensive LLM tool selection calls.

### Typed Question & Option Set Definition

```python
ACTIONS = {
    "kill_docker_containers": (
        "The speaker wants to stop, kill, remove, or shut down Docker "
        "containers or the container runtime."
    ),
    "raise_shields": (
        "The speaker wants to raise, enable, or boost defensive shields "
        "or the ship's security posture."
    ),
    "ignore": (
        "The utterance is unrelated, ambiguous, small talk, or not a "
        "command about Docker or raising shields."
    ),
}

ACTION_QUESTION = {
    "action": {
        "type": "choice",
        "instructions": (
            "Classify the voice command into exactly one bridge action. "
            "Prefer ignore unless the speaker clearly asks to kill Docker "
            "containers or raise shields."
        ),
        "criteria": ACTIONS,
    }
}
```

### Execution Wiring

```python
from strands_decider.infer import load_engine
from strands_decider.schema import SystemOneRequest

# Load the Decider 2B engine
engine = load_engine("StrandsAgents/strands-decider-2B-hobson-v19")

# Evaluate input state against question criteria
request = SystemOneRequest(state=user_input_text, questions=ACTION_QUESTION)
result = engine.evaluate(request)

answer = result.answers["action"]
decision = answer.choice        # e.g., 'raise_shields'
confidence = answer.confidence  # Calibrated probability float
```

### How to Reuse

Drop `ACTION_QUESTION` and the `engine.evaluate()` invocation directly into any FastAPI, Flask, or Python agent path to get instant, calibrated decision routing before or alongside invoking an LLM.

---

## ⚡ Performance Benchmark

* **Decider 2B Latency:** ~115ms (Local CUDA inference on NVIDIA GeForce RTX 3060)
* **LLM Baseline Comparison:** ~700ms–1500ms (6x–10x latency reduction for decision routing)
* **Confidence Calibration:** High-confidence routing prevents unnecessary LLM execution on ambiguous or out-of-scope inputs.

---

## 📦 Project Structure

```text
├── backend.py          # FastAPI server, Strands Decider 2B engine, & Bedrock integration
├── App.jsx             # React command bridge dashboard with telemetry logs & visual alerts
├── package.json        # Frontend React dependencies
├── requirements.txt    # Python backend dependencies (PyTorch, FastAPI, Strands Decider, Boto3)
├── LICENSE             # Open-Source MIT License
└── README.md           # Documentation & reusable pattern guide
```

---

## 🔧 Local Setup & Run Instructions

### Prerequisites
* Python 3.10+ with CUDA PyTorch enabled
* Node.js v18+
* AWS Credentials configured (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) for Bedrock access.

### Backend Setup

```bash
# Clone repository
git clone https://github.com/HarpreetSingh3500/kairos-ai-decider-agent.git
cd kairos-ai-decider-agent

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
python backend.py
```

### Frontend Setup

```bash
# Install frontend dependencies
npm install

# Start React dev server
npm run dev
```

Open `http://localhost:5173` in your browser to interact with the KAIROS AI dashboard.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

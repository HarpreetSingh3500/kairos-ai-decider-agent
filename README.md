# KAIROS AI: Predictive Cyber Threat Decision Agent

> **Tags:** `#strands-decider-2b` `#tool-selection` `#amazon-bedrock`

KAIROS AI is an ultra-low-latency, autonomous bridge command and cyber-threat decision agent. It utilizes **Strands Decider 2B** running locally on CUDA for instant (~115ms) voice command classification and tool selection, paired with **Amazon Bedrock** for generative tactical incident reports.

---

## Architecture Overview

1. **User Command Input:** Voice transcript received via React Dashboard (`App.jsx`).
2. **Instant Decision Routing (~115ms):** `StrandsDeciderModel` (`strands-decider-2B-hobson-v19`) classifies the utterance into one of three action states: `raise_shields`, `kill_docker_containers`, or `ignore`.
3. **Generative Incident Briefing:** Amazon Bedrock (`anthropic.claude-3-haiku`) generates a concise tactical response based on the calibrated decision and confidence score.
4. **Dynamic UI Reaction:** React sci-fi dashboard renders real-time state updates, alert color flashes (Cyan/Red), and confidence telemetry.

---

## Reusable Strands Decider 2B Decision Pattern (#tool-selection)

This repository provides a standalone, reusable **#tool-selection** pattern that other builders can drop directly into their agent's decision path.

### 1. Typed Question & Option Set
```python
ACTIONS = {
    "kill_docker_containers": "The speaker wants to stop, kill, remove, or shut down Docker containers or runtime.",
    "raise_shields": "The speaker wants to raise, enable, or boost defensive shields or security posture.",
    "ignore": "The utterance is unrelated, ambiguous, small talk, or not a command."
}

ACTION_QUESTION = {
    "action": {
        "type": "choice",
        "instructions": "Classify the voice command into exactly one bridge action.",
        "criteria": ACTIONS,
    }
}


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

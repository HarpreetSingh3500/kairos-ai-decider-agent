# KAIROS AI: Predictive Cyber Threat Decision Agent

An intelligent, low-latency bridge security agent powered by **Strands Decider 2B** on local GPU and **Amazon Bedrock**.

## Reusable Strands Decider 2B Decision Pattern (#tool-selection)

This repository includes a reusable **#tool-selection** decision pattern that routes natural language user commands into discrete system execution paths in ~115ms.

### 1. Typed Question & Criteria Definition
```python
ACTIONS = {
    "kill_docker_containers": "The speaker wants to stop, kill, remove, or shut down Docker containers.",
    "raise_shields": "The speaker wants to raise, enable, or boost defensive shields or security posture.",
    "ignore": "The utterance is unrelated, ambiguous, or small talk."
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

engine = load_engine("StrandsAgents/strands-decider-2B-hobson-v19")
request = SystemOneRequest(state=user_input, questions=ACTION_QUESTION)
result = engine.evaluate(request)
decision = result.answers["action"].choice
confidence = result.answers["action"].confidence

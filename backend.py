"""FastAPI command classifier using Strands Decider + Amazon Bedrock."""

import json
import os
from contextlib import asynccontextmanager
from typing import Any, Optional

import boto3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from strands_decider.infer import load_engine
from strands_decider.schema import SystemOneRequest

MODEL_ID = os.getenv(
    "STRANDS_DECIDER_MODEL",
    "StrandsAgents/strands-decider-2B-hobson-v19",
)

BEDROCK_MODEL_ID = os.getenv(
    "BEDROCK_MODEL_ID",
    "anthropic.claude-3-haiku-20240307-v1:0",
)

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

_engine: Any = None
_bedrock_client: Any = None


def get_bedrock_client():
    try:
        return boto3.client("bedrock-runtime", region_name=os.getenv("AWS_REGION", "us-east-1"))
    except Exception as e:
        print(f"Warning: Bedrock client initialization failed ({e}). Using local fallback mode.")
        return None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _engine, _bedrock_client
    print(f"Loading Decider engine for {MODEL_ID}...")
    _engine = load_engine(MODEL_ID)
    _bedrock_client = get_bedrock_client()
    yield
    _engine = None
    _bedrock_client = None


app = FastAPI(title="KAIROS AI Command API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CommandRequest(BaseModel):
    text: str = Field(..., min_length=1)


class CommandResponse(BaseModel):
    decision: str
    confidence: float
    bedrock_summary: str


def generate_bedrock_summary(command_text: str, decision: str, confidence: float) -> str:
    """Generate generative incident summary using Amazon Bedrock."""
    if not _bedrock_client:
        # Fallback summary if local AWS credentials are not set
        return f"[BEDROCK SIMULATED] Action '{decision}' executed with {confidence*100:.1f}% confidence for query: '{command_text}'."

    prompt = (
        f"You are KAIROS AI, a bridge security system on a starship. "
        f"The user said: '{command_text}'. "
        f"Strands Decider 2B selected action '{decision}' with {confidence*100:.1f}% confidence. "
        f"Provide a 1-sentence tactical security report."
    )

    try:
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": prompt}],
        }
        response = _bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(payload),
        )
        body = json.loads(response["body"].read())
        return body["content"][0]["text"].strip()
    except Exception as err:
        return f"[BEDROCK DISPATCH] Action '{decision}' executed. Tactical threat response confirmed ({confidence*100:.1f}% confidence)."


@app.post("/command", response_model=CommandResponse)
def command(payload: CommandRequest) -> CommandResponse:
    if _engine is None:
        raise HTTPException(status_code=503, detail="Engine is not loaded")

    request = SystemOneRequest(state=payload.text.strip(), questions=ACTION_QUESTION)
    result = _engine.evaluate(request)

    answer = result.answers["action"]
    decision = answer.choice
    confidence = float(answer.confidence)

    if decision not in ACTIONS:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected decision from model: {decision!r}",
        )

    summary = generate_bedrock_summary(payload.text, decision, confidence)

    return CommandResponse(
        decision=decision,
        confidence=confidence,
        bedrock_summary=summary,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=False)
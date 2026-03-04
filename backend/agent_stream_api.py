from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.messages import HumanMessage

import json
import asyncio
import uuid

load_dotenv()

app = FastAPI(title="LangChain Agent Streaming API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # para dev apenas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Armazenamento simples em memória
executions = {}

class AgentRequest(BaseModel):
    system_prompt: str
    prompt: str

# Execução
@app.post("/agent/execute")
async def execute_agent(request: AgentRequest):
    
    execution_id = str(uuid.uuid4())
    
    executions[execution_id] = {
        "system_prompt": request.system_prompt,
        "prompt": request.prompt
    }
    
    return {
        "execution_id": execution_id,
        "stream_url": f"/agent/stream/{execution_id}"
    }

@app.get("/agent/stream")
async def agent_stream(execution_id: str):
    """
    Endpoint streaming de um agent LangChain.
    Envia tokens para o front-end usando Server-Sent Events (SSE).
    """
    if execution_id not in executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    data = executions[execution_id]    
    
    agent = create_agent(
        model="gpt-5-nano",
        system_prompt= data["system_prompt"]
    )
    
    # Generator async que envia tokens
    async def event_generator():
        ## Com o astream, não espera o resultado ficar pronto para enviar
        async for token, metadata in agent.astream(
            {"messages": [HumanMessage(content=data["prompt"])]},
            stream_mode="messages"
        ):
            if token.content:
                # SSE requer prefixo 'data:'
                yield f"data: {json.dumps({'content': token.content})}\n\n"
                await asyncio.sleep(0)  # cede controle ao loop de evento

        # Indica que terminou
        yield "event: end\ndata: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

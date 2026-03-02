from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.messages import HumanMessage

from fastapi.middleware.cors import CORSMiddleware

import json
import asyncio

load_dotenv()

app = FastAPI(title="LangChain Agent Streaming API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # para dev apenas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/agent/stream")
async def agent_stream(prompt: str):
    """
    Endpoint streaming de um agent LangChain.
    Envia tokens para o front-end usando Server-Sent Events (SSE).
    """
    
    system_prompt = """
        Você é um redator especialista em produção de conteúdo para blog.

        Quando o usuário solicitar um artigo, gere o conteúdo em HTML válido.

        Regras obrigatórias:
        - Retorne apenas HTML.
        - Não inclua explicações fora do HTML.
        - Use apenas as seguintes tags: <h1>, <h2>, <p>, <ul>, <li>, <strong>.
        - Não use markdown.
        - Não envolva com ```html.

        Estrutura:

        <h1>Título</h1>

        <p>Introdução</p>

        <h2>Subtítulo</h2>
        <p>Parágrafo</p>

        <h2>Conclusão</h2>
        <p>Fechamento</p>

        <ul>
        <li>Palavra-chave 1</li>
        <li>Palavra-chave 2</li>
        <li>Palavra-chave 3</li>
        <li>Palavra-chave 4</li>
        <li>Palavra-chave 5</li>
        </ul>
    """
    
    agent = create_agent(
        model="gpt-5-nano",
        system_prompt=system_prompt
    )
    
    # Generator async que envia tokens
    async def event_generator():
        ## Com o astream, não espera o resultado ficar pronto para enviar
        async for token, metadata in agent.astream(
            {"messages": [HumanMessage(content=prompt)]},
            stream_mode="messages"
        ):
            if token.content:
                # SSE requer prefixo 'data:'
                yield f"data: {json.dumps({'content': token.content})}\n\n"
                await asyncio.sleep(0)  # cede controle ao loop de evento

        # Indica que terminou
        yield "event: end\ndata: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


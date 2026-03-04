let fullText = "";
let renderedLength = 0;
let isAnimating = false;
let streamFinished = false;

function startStream() {
    const input = document.getElementById("prompt");
    console.log("=== Iniciando ===")
    console.log("prompt: " + input)
    const userPrompt = input.value.trim();
    
    if(!userPrompt) return;
        
    const chat = document.getElementById("chat");
    //chat.innerText = ""; // limpa antes de começar
    chat.innerHTML = "";

    fullText = "";
    //renderedLength = 0;
    //isAnimating = false;
    //streamFinished = false;
    let renderQueue = [];
    let isRendering = false;
    let buffer = "";


    //const cursor = document.createElement("span");
    //cursor.classList.add("cursor");
    //chat.appendChild(cursor);

    // Encode para envitar problemas com espaços e caracteres especiais
    const encodedPrompt = encodeURIComponent(userPrompt);
    const eventSource = new EventSource(`http://localhost:8000/agent/stream?prompt=${encodedPrompt}`);
    console.log("=== Chamando api phython ===")

    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        buffer += data.content;

        const { blocks, remaining } = extractCompleteBlocks(buffer);

        renderQueue.push(...blocks);

        if (!isRendering) {
            processQueue(chat);
        }
        /*
        blocks.forEach(block => {
            animateBlock(chat, block);
        });*/

        buffer = remaining;
        /*const data = JSON.parse(event.data);
          fullText += data.content;

        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(() => animate(chat, cursor));
        }*/
    };

    eventSource.addEventListener("end", function() {
        console.log("Stream finished");
        eventSource.close();
    });

    eventSource.onerror = function(err) {
        console.error("Stream error:", err);
        eventSource.close();
    };
}
/*
function animate(chat, cursor) {
    if (renderedLength < fullText.length) {
        const nextChunk = fullText.slice(renderedLength, renderedLength + 3);
        cursor.insertAdjacentText("beforebegin", nextChunk);
        renderedLength += nextChunk.length;

        requestAnimationFrame(() => animate(chat, cursor));
    } else {
        if (!streamFinished) {
            requestAnimationFrame(() => animate(chat, cursor));
        } else {
            isAnimating = false;
        }
    }
}*/

document.getElementById("chat-form").addEventListener("submit", function(event) {
    event.preventDefault();
    startStream();
});

function animateBlock(container, html) {

    const temp = document.createElement("div");
    temp.innerHTML = html;

    const element = temp.firstElementChild;

    element.style.opacity = 0;
    element.style.transform = "translateY(5px)";
    element.style.transition = "all 0.3s ease";

    container.appendChild(element);

    requestAnimationFrame(() => {
        element.style.opacity = 1;
        element.style.transform = "translateY(0)";
    });
}


function extractCompleteBlocks(buffer) {
    console.log(">>>>" + buffer)
    const regex = /<(h1|h2|p)[^>]*>[\s\S]*?<\/\1>\s*(<br\s*\/?>)?/gi;

    let match;
    let blocks = [];
    let lastIndex = 0;

    while ((match = regex.exec(buffer)) !== null) {
        blocks.push(match[0]);
        lastIndex = regex.lastIndex;
    }

    return {
        blocks,
        remaining: buffer.slice(lastIndex)
    };
}

function processQueue(container) {
    if (renderQueue.length === 0) {
        isRendering = false;
        return;
    }

    isRendering = true;

    const block = renderQueue.shift();
    animateBlock(container, block);

    setTimeout(() => {
        processQueue(container);
    }, 400); // controla velocidade por parágrafo
}
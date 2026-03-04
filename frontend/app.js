let renderQueue = [];
let isRendering = false;
let buffer = "";

async function executeButton() {
    const res = await fetch("http://localhost:8000/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({
            system_prompt: document.getElementById("system-prompt").value,
            prompt: document.getElementById("prompt").value
        })
    });
    
    const data = await res.json();    
    console.log(">>> Execution:" + data.execution_id )        
    return data.execution_id;
}


function startStream(executionId) {
    const loader = document.getElementById("loader");
    const chat = document.getElementById("chat");

    // Limpa o chat, mas mantém o loader visível
    chat.innerHTML = "";
    chat.appendChild(loader);
    loader.style.display = "flex";

    buffer = "";
    renderQueue = [];
    isRendering = false;

    const eventSource = new EventSource(`http://localhost:8000/agent/stream?execution_id=${executionId}`);

    eventSource.onmessage = function (event) {        
        const data = JSON.parse(event.data);
        buffer += data.content;
        console.log(">>>" + buffer)

        const { blocks, remaining } = extractCompleteBlocks(buffer);

        if (blocks.length > 0) {
            // Esconde o loader assim que o primeiro bloco chega
            if (loader.style.display !== "none") {
                loader.style.display = "none";
            }

            renderQueue.push(...blocks);
            if (!isRendering) {
                processQueue(chat);
            }
        }

        buffer = remaining;
    };

    eventSource.addEventListener("end", function () {
        console.log("Stream finished");
        eventSource.close();
    });

    eventSource.onerror = function (err) {
        console.error("Stream error:", err);
        loader.style.display = "none";
        eventSource.close();
    };
}

document.getElementById("chat-form")
    .addEventListener("submit", async function (event) {
        event.preventDefault();
    
    const executionId = await executeButton();
    startStream(executionId);
});

function extractCompleteBlocks(buffer) {
    const regex = /<(h1|p)[^>]*>[\s\S]*?<\/\1>(?:<br\s*\/?>)?/gi;

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

    const blockHtml = renderQueue.shift();
    animateBlock(container, blockHtml);

    setTimeout(() => {
        processQueue(container);
    }, 150);
}

function animateBlock(container, html) {
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const element = temp.firstElementChild;
    const br = temp.querySelector('br');

    if (!element) return;

    element.style.opacity = "0";
    element.style.transform = "translateY(5px)";
    element.style.transition = "opacity 0.4s ease, transform 0.4s ease";

    container.appendChild(element);
    if (br) container.appendChild(br);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            element.style.opacity = "1";
            element.style.transform = "translateY(0)";
        });
    });
}

async function getShader(name) {
    const result = {};
    const url = window.location;
    const response = await fetch(url + "shaders") || null;
    const shadersJson = response ? await response.text() : null;
    const shadersList = shadersJson ? JSON.parse(shadersJson) : [];
    for (const s of shadersList) {
        if (s.name && typeof s.name === "string" && s.code && typeof s.code === "string") {
            const name = s.name.substring(0, s.name.length - 5);
            if (result[name]) console.error("Shader " + s.name + " already exists");
            result[name] = s.code;
        }
    }
    return result;
}

function initialize() {
    const logs = [];

    function log(content, clas, elementToReplace) {
        if (!clas) clas = "info";
        let element;
        if (typeof content === "string") {
            element = document.createElement("div");
            element.innerText = content;
        } else {
            element = content;
        }
        element.className = "script " + clas;
        if (elementToReplace) {
            document.body.insertBefore(element, elementToReplace);
            elementToReplace.remove();
        } else {
            document.body.appendChild(element);
        }
        logs.push(element);
    }

    function clearLogs() {
        for (const l of logs) {
            l.remove();
        }
        logs.length = 0;
    }

    const gpu = navigator.gpu || null;
    if (!gpu) {
        log("Your current browser does NOT support WebGPU!", "error");
        return;
    }

    (async () => {
        const context = await WG.WgContext.get();
        if (typeof context === "string") {
            log(context, "error");
            return;
        }

        const inputButton = document.getElementById("input");
        const recompileButton = document.getElementById("recompile");
        const runTestsButton = document.getElementById("test");

        let shaders = [];

        shaders = await getShader();

        async function uploadShader(shaderCode, shaderName) {
            const url = window.location;
            const shader = JSON.stringify({name: shaderName, code: shaderCode});
            const response = await fetch(url + "shaders", {
                method: "POST",
                headers: {"Content-Type": "text/plain"},
                body: shader
            }) || null;
            const error = response ? await response.text() : null;
            if (error) {
                console.error(response);
                alert(response);
            }
        }

        function compileShader(shaderCode, shaderName, elementToReplace, reuseEditor) {
            return new Promise(res => {
                const shaderModule = context.device.createShaderModule({
                    code: shaderCode
                });
                shaderModule.compilationInfo().then((compilationInfo) => {
                    if (compilationInfo.messages.length === 0) {
                        log(shaderName + ": Compilation successful!", "success header", elementToReplace);
                        res(true);
                        return;
                    }
                    for (const m of compilationInfo.messages) {
                        // Get the class name ('clas')
                        let clas;
                        switch (m.type) {
                            case "info":
                                clas = "info";
                                break;
                            case "warning":
                                clas = "warning";
                                break;
                            default:
                                clas = "error";
                                break;
                        }

                        // Log header
                        const header = document.createElement("span");
                        header.className = "header";
                        header.textContent = shaderName + " " + clas + " at " + m.lineNum + ":" + m.linePos + " - " + m.message;

                        // Log content (code)
                        const lines = shaderCode.split("\n");
                        const before = lines.slice(0, m.lineNum - 1).join("\n") +
                            "\n" +
                            lines[m.lineNum - 1].substring(0, m.linePos - 1);
                        const after = lines[m.lineNum - 1].substring(m.linePos - 1 + m.length) +
                            (lines.length === m.linePos ? "" : "\n") +
                            lines.slice(m.lineNum).join("\n");
                        const faulty = document.createElement("span");
                        faulty.className = "highlight";
                        faulty.textContent = lines[m.lineNum - 1].substring(m.linePos - 1, m.linePos - 1 + m.length);

                        // Editor
                        /*const editor = reuseEditor ? reuseEditor : document.createElement("textarea");
                        if (!reuseEditor) editor.value = shaderCode;
                        const submit = document.createElement("button");
                        submit.textContent = "Resubmit";
                        submit.addEventListener("click", () => {
                            (async () => {
                                const success = await compileShader(editor.value, shaderName, element, editor);
                                if (success) {
                                    const upload = confirm("Compilation successful! Upload and replace old shader code?");
                                    if (upload) {
                                        await uploadShader(editor.value, shaderName);
                                    }
                                }
                            })();
                        });
                        const editorPanel = document.createElement("div");
                        editorPanel.className = "editor";
                        editorPanel.appendChild(editor);
                        editorPanel.appendChild(submit);*/

                        // Add all elements
                        const logPanel = document.createElement("div");
                        logPanel.classList = "feedback";
                        logPanel.appendChild(header);
                        logPanel.insertAdjacentText("beforeend", before);
                        logPanel.insertAdjacentElement("beforeend", faulty);
                        logPanel.insertAdjacentText("beforeend", after);

                        // Create master element
                        const element = document.createElement("div");
                        element.appendChild(header);
                        element.appendChild(logPanel);
                        //element.appendChild(editorPanel);

                        // Finally log!
                        log(element, clas, elementToReplace);
                    }
                    res(false);
                });
            });
        }

        if (shaders.length === 0) {
            recompileButton.classList.add("invisible");
        } else {
            inputButton.classList.add("invisible");
            compileShaders();
        }

        function compileShaders() {
            clearLogs();
            for (const [name, code] of Object.entries(shaders)) {
                compileShader(code, name);
            }
        }

        function readFile(event, filename) {
            const code = event.target.result;
            shaders.push({name: filename, code: code});
            compileShader(code, filename);
        }

        function readFiles(files) {
            shaders.length = 0;
            clearLogs();
            for (const file of files) {
                //console.log(file.type);
                const reader = new FileReader();
                reader.addEventListener("load", (event) => readFile(event, file.name));
                reader.readAsText(file);
            }
        }

        document.body.addEventListener("dragover", (event) => {
            event.stopPropagation();
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
        });
        document.body.addEventListener("drop", (event) => {
            event.stopPropagation();
            event.preventDefault();
            readFiles(event.dataTransfer.files);
        });
        inputButton.addEventListener("change", (event) => {
            readFiles(event.target.files);
        });
        recompileButton.addEventListener("click", () => {
            (async () => {
                shaders = await getShader();
                clearLogs();
                compileShaders();
            })();
        });
        runTestsButton.addEventListener("click", () => {
            const testWindow = runTests();
            document.body.appendChild(testWindow);
        });
    })();
}

window.addEventListener("load", () => {
    initialize();
});
const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
app.use(express.text()); // Read and decode request body as text/plain
app.use("/static", express.static(__dirname + "/static"));

const port = process.env.PORT || 8080;

function p(filePath) {
    const result = path.join(__dirname, "../src/catana/webgpu/shaders/src");
    return filePath ? path.join(result, filePath) : result;
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/shaders", (req, res) => {
    (async() => {
        const fileNames = [
            ...((await fs.promises.readdir(p())).map(v => path.join(p(), v))),
            ...((await fs.promises.readdir(path.join(__dirname, "static"))).map(v => path.join(__dirname, "static", v)))
        ];
        const shaders = [];
        for (const fileName of fileNames) {
            if (!fileName.endsWith(".wgsl")) continue;
            try {
                const buffer = await fs.promises.readFile(fileName);
                shaders.push({name: path.basename(fileName), code: buffer.toString()});
            } catch (e) {
                console.error(e);
            }
        }
        res.send(JSON.stringify(shaders));
    })();
});

app.post("/shaders", (req, res) => {
    const body = req.body;
    const shader = body ? JSON.parse(body) : null;
    if (!body || !shader || !shader.name || !shader.code || typeof shader.name !== "string" || typeof shader.code !== "string") {
        console.error("Posted shader does not have a valid name or code");
        console.error(body);
        res.send("Shader does not have a valid name or code. Format must be: {name: string, code: string}");
        return;
    }
    if (!shader.name.endsWith(".wgsl")) shader.name += ".wgsl";
    fs.writeFile(p(shader.name), shader.code, (err) => {
        if (err) {
            console.error(err);
            res.send("Shader could not be saved");
        } else {
            res.send(null);
        }
    });
}) ;

app.listen(port, () => {
    console.log("WG-Tools running at: http://localhost:" + port);
});
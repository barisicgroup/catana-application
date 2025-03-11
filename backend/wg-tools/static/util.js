let _id = 0;
function id() {
    return _id++;
}

function matrixEditor(matrix, onChangedCallback) {
    const div = document.createElement("div");
    div.className = "matrixEditor";
    const inputs = [];
    for (let i = 0; i < 16; ++i) {
        // i: 0, 1, 2, 3  | 4, 5, 6, 7  | 8, 9, 10, 11 | 12, 13, 14, 15
        const j = Math.floor(i / 4) + (i % 4) * 4; // j: 0, 4, 8, 12 | 1, 5, 9, 13 | 2, 6, 10, 14 | 3,  7,  11, 15
        const input = document.createElement("input");
        inputs.push(input);
        input.type = "number";
        input.step = "0.1";
        input.value = matrix.elements[j]
        input.addEventListener("input", () => {
            matrix.elements[j] = parseFloat(input.value);
            onChangedCallback();
        });
        div.appendChild(input);
    }
    return {
        container: div,
        update: (silent=false) => {
            const elements = matrix.clone().transpose().elements;
            for (let i = 0; i < elements.length; ++i) {
                inputs[i].value = elements[i];
            }
            if (!silent) onChangedCallback();
        }
    };
}

function cameraEditor(camMat, camera, onChangedCallback) {
    const div = document.createElement("div");
    div.className = "cameraEditor";

    const callback = () => {
        //camera.aspect = parseFloat(aspect.value);
        camera.near = parseFloat(near.value);
        camera.far = parseFloat(far.value);
        camera.fov = parseFloat(fov.value) * Math.PI / 180;
        camera.updateProjectionMatrix();
        //const view = new WG.Matrix4().getInverse(camMat);
        //const proj = camera.projectionMatrix;
        onChangedCallback();
    };

    const matrix = matrixEditor(camMat, callback)
    div.appendChild(matrix.container);

    const update = () => {
        near.value = camera.near;
        far.value = camera.far;
        fov.value = camera.fov * 180 / Math.PI;
    };

    const near = document.createElement("input");
    const far = document.createElement("input");
    const fov = document.createElement("input");
    update();
    const names = ["Near", "Far", "FOV (°)"];
    const inputs = [near, far, fov];
    console.assert(names.length === inputs.length);
    const div2 = document.createElement("div");
    div2.className = "params";
    for (let i = 0; i < names.length; ++i) {
        const name = names[i];
        const input = inputs[i];
        input.type = "number";
        input.step = "0.1";
        input.addEventListener("input", callback);
        const label = document.createElement("span");
        label.textContent = name;
        div2.appendChild(label);
        div2.appendChild(input);
    }
    div.appendChild(div2);

    return {
        container: div,
        update: (silent=false) => {
            matrix.update(true);
            update();
            if (!silent) onChangedCallback();
        }
    };
}

function renderer(canvas, camMat, camera, onChangedCallback) {
    const camEditor = cameraEditor(camMat, camera, onChangedCallback);

    /*canvases.push(canvas);
    canvas.addEventListener("click", () => {
        for (const c of canvases) {
            c.setAttribute("tabindex", "");
        }
        canvas.setAttribute("tabindex", 1);
    });*/
    canvas.setAttribute("tabindex", "1");

    const div = document.createElement("div");
    div.className = "renderer";
    div.appendChild(canvas);
    div.appendChild(camEditor.container);

    // Mouse interaction
    let drag = false;
    let lastPos = null;
    canvas.addEventListener("mousedown", (e) => {
        drag = true;
        lastPos = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener("mousemove", (e) => {
        if (!drag) return;
        const pos = { x: e.clientX, y: e.clientY };
        const delta = { x: pos.x - lastPos.x, y: pos.y - lastPos.y };
        lastPos = pos;
        const rot = new WG.Matrix4()
            .makeRotationX(delta.y * -0.0001)
            .premultiply(new WG.Matrix4()
                .makeRotationY(delta.x * -0.0001));
        camMat.multiply(rot);
        camEditor.update();
    });
    canvas.addEventListener("mouseup", () => {
        drag = false;
        lastPos = null;
    });
    canvas.addEventListener("keydown", (e) => {
        let x = 0;
        let y = 0;
        let z = 0;
        const unit = 0.1;
        switch (e.code) {
            case "ArrowUp": case "KeyW": z = -unit; break;
            case "ArrowRight": case "KeyD": x = unit; break;
            case "ArrowDown": case "KeyS": z = unit; break;
            case "ArrowLeft": case "KeyA": x = -unit; break;
            case "ControlLeft": y = -unit; break;
            case "Space": y = unit; break;
            case "KeyC":
                camMat.lookAt(new WG.Vector3().setFromMatrixPosition(camMat), new WG.Vector3(0, 0, 0), new WG.Vector3(0, 1, 0));
                camEditor.update();
                return;
        }
        if (x === 0 && y === 0 && z === 0) return;
        const right4 = new WG.Vector4(1, 0, 0, 0).applyMatrix4(camMat).multiplyScalar(x);
        const up4 = new WG.Vector4(0, 1, 0, 0).applyMatrix4(camMat).multiplyScalar(y);
        const front4 = new WG.Vector4(0, 0, 1, 0).applyMatrix4(camMat).multiplyScalar(z)
        const transVec4 = right4.clone().add(up4).add(front4);
        camMat.premultiply(new WG.Matrix4().makeTranslation(transVec4.x, transVec4.y, transVec4.z));
        camEditor.update();
    });

    return {
        container: div,
        controls: camEditor.container
    };
}
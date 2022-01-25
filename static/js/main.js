let colourSelect = "<input id=\"colour\" type=\"text\"/>";
let scriptEditor = "<div id=\"script\"/>";

let currentColour = "#000000";
let currentScript = "";

/**
 * Send the given payload to all selected controllers
 * @param {*} payload
 */
function submit(payload) {
    if ($("#controller-select").select2("data").length === 0) {
        alert("No controllers selected");
        return;
    }

    $("#controller-select").select2("data")
    .forEach(controller => {
        fetch(`api/submit/${controller.group}/${controller.name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                payload: payload
            })
        });
    });
}

function save() {
    let filename = prompt("Enter a filename");

    if (filename === null || filename === "") {
        return;
    }

    fetch("api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            filename: filename,
            payload: currentScript
        })
    })
}

/**
 * Handle toggling between colour and script modes
 * @param {*} colourMode Which mode is selected (true = colour, false = script)
 */
function toggleMode(colourMode) {
    if (colourMode) {
        // Hide script controls and create colour selector
        $(".script-container").css({ "display": "none" });
        $("#editor").html(colourSelect);

        $("#colour").spectrum({
            flat: true,
            showInput: false,
            showButtons: true,
            preferredFormat: "hex",
            clickoutFiresChange: true,
            cancelText: "",
            chooseText: "Submit"
        })

        // Remove cancel option
        $(".sp-cancel").remove();

        // Add event listeners
        $("#colour").on("move.spectrum", function(event, colour) {
            // Change submit button colour to match
            currentColour = colour.toHexString();
            $(".sp-container button").css({ "background-color": currentColour, "color": getContrastYIQ(currentColour) });
        });

        $(".sp-choose").on("click", function(event) {
            // Send current colour to selected controllers
            let rgb = hexToRgb(currentColour);
            submit(`r = ${rgb.r}\ng = ${rgb.g}\nb = ${rgb.b}\nsave`);
        });

        // Restore previous state if it exists
        $("#colour").spectrum("set", currentColour);
        $(".sp-container button").css({ "background-color": currentColour, "color": getContrastYIQ(currentColour) });
    } 
    
    else {
        $(".script-container").css({ "display": "block" });
        $("#editor").html(scriptEditor);

        // Load editor
        let editor = ace.edit("script");

        editor.setOptions({
            minLines: 0,
            maxLines: 200
        });

        editor.getSession().setMode("ace/mode/python");
        editor.getSession().setUseWorker(false);

        editor.setTheme("ace/theme/cobalt");
        editor.setFontSize("12pt");

        editor.resize(true);
        editor.setBehavioursEnabled(true);
        editor.getSession().setValue(currentScript);

        editor.session.on("change", function(event) {
            currentScript = editor.getValue();
        });

        $("#preset-select").on("select2:select", function(event) {
            editor.getSession().setValue(event.params.data.contents);
        })
    }
}

/**
 * Convert a hex colour to rgb
 * https://stackoverflow.com/a/5624139
 * @param {*} hex The hex colour to convert
 * @returns An equivalent JSON object with r, g, b properties, or null if hex is invalid
 */
 function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    let shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthand, (m, r, g, b) => r + r + g + g + b + b);
  
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Select whether black or white best contrasts a given hex colour
 * https://stackoverflow.com/a/11868398
 * @param {*} hex The hex colour to contrast
 * @returns Black or white (hex)
 */
 function getContrastYIQ(hex) {
    hex = hex.replace("#", "");

    var r = parseInt(hex.substr(0, 2), 16);
    var g = parseInt(hex.substr(2, 2), 16);
    var b = parseInt(hex.substr(4, 2), 16);

    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? "#000000" : "#FFFFFF";
}

// Get all known controllers using API
function getControllers() {
    fetch("api/controllers")
    .then(async res => {
        if (res.ok) {
            return res.json();
        }
        throw new Error(await res.text());
    })
    .then(data => {
        $("#controller-select").select2({ width: "auto", data: data.results });
    })
    .catch(err => {
        console.log(err);
        $("#controller-select").select2({ width: "auto" });
    });
}

// Get all known presets using API
function getPresets() {
    fetch("api/presets")
    .then(async res => {
        if (res.ok) {
            return res.json();
        }
        throw new Error(await res.text());
    })
    .then(data => {
        $("#preset-select").select2({ width: "auto", placeholder: "Presets", allowClear: true, data: data.results });
    })
    .catch(err => {
        console.log(err);
        $("#preset-select").select2({ width: "auto", placeholder: "Presets", allowClear: true });
    });
}

// On page load, initialise jQuery elements
$(document).ready(function() {
    // Select2
    getControllers();
    getPresets();

    // Toggle
    $("#mode").bootstrapToggle();
    $("#mode").change(function() {
        toggleMode($(this).prop("checked"));
    });

    // Buttons
    $("#submit-script").on("click", function() {
        submit(currentScript);
    });

    $("#save-script").on("click", function() {
        save();
    })

    // Artificially trigger mode toggle event using the default state 
    toggleMode($("#mode").prop("checked"));    
});
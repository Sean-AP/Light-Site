// Get all known controllers using API
function getControllers() {
    return fetch("/api/controllers")
    .then(async res => {
        if (res.ok) {
            return res.json();
        }
        throw new Error(await res.text());
    })
    .then(data => {
        console.log(data);
        $("#controller-select").select2({ width: "auto", placeholder: "Known Controllers", allowClear: true, data: data.results });
    })
    .catch(err => {
        console.log(err);
        $("#controller-select").select2({ width: "auto", placeholder: "Known Controllers", allowClear: true });
    });
}

function post() {
    fetch("/api/controllers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            group: $("#group").val(),
            name: $("#name").val(),
            host: $("#host").val(),
            port: $("#port").val()
        })
    })
    .then(handleRes);
}

function put() {
    fetch(`/api/controllers/${$("#group").val()}/${$("#name").val()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            host: $("#host").val(),
            port: $("#port").val()
        })
    })
    .then(handleRes);
}

function remove() {
    fetch(`/api/controllers/${$("#group").val()}/${$("#name").val()}`, {
        method: "DELETE",
    })
    .then(handleRes);
}

function handleRes(res) {
    if (res.ok) {
        alert("Success");
        $("#controller-select").select2().empty();
        getControllers().then(() => $("#controller-select").trigger("select2:clear"));
    }
    else {
        res.text()
        .then(err => alert(`Error: ${err}`));
    }
}

// On page load, initialise jQuery elements
$(document).ready(function() {
    // Select2
    getControllers()
    .then(() => {
        $("#controller-select").on("select2:select", function(event) {
            // Load controller's values
            $("#group").val(event.params.data.group);
            $("#name").val(event.params.data.name);
            $("#host").val(event.params.data.host);
            $("#port").val(event.params.data.port);
    
            // Prevent changing group name
            $("#group").prop("disabled", true);
    
            // Edit controller when selected
            $("#add-controller").text(`Edit ${event.params.data.name}`);
    
            $("#add-controller").unbind("click");
            $("#add-controller").on("click", function() {
                put();
            });
    
            // Allow removal when selected
            $("#remove-controller").text(`Remove ${event.params.data.name}`);
            
            $("#remove-controller").unbind("click");
            $("#remove-controller").on("click", function() {
                remove();
            });
    
            $("#remove-controller").css({ "display": "block" });
        });
    
        $("#controller-select").on("select2:clear", function() {
            console.log("cleared")
            // Remove controller's values
            $("#group").val("");
            $("#name").val("");
    
            $("#host").val("");
            $("#port").val("");
    
            // Allow changing group name
            $("#group").prop("disabled", false);
    
            // Add controller when unselected
            $("#add-controller").text("Add New Controller");
    
            $("#add-controller").unbind("click");
            $("#add-controller").on("click", function() {
                post();
            });
    
            // Prevent removal when unselected
            $("#remove-controller").text("Remove Controller");
            
            $("#remove-controller").unbind("click");
            $("#remove-controller").on("click", function() {
                alert("An existing controller must be selected");
            });
    
            $("#remove-controller").css({ "display": "none" });
        });
    
        // Artificially trigger a clear event
        $("#controller-select").trigger("select2:clear");
    });
});
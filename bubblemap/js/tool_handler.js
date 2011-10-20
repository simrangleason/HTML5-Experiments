/* tool handling */

function show_tool(show_toolid, hide_toolids) {
    select_tool(show_toolid);
    deselect_tools(hide_toolids);
}

function select_tool(toolid) {
    var tool = document.getElementById(toolid);
    //console.log("Selecte tool: " + toolid + " tool: " + tool);
    if (tool) {
        tool.setAttribute("class", "tool_selected");
    }                          
    var content = document.getElementById("toolcontent_" + toolid);
    //console.log("tool content: " + toolid + " : " + content);
    if (content) {
        content.style.visibility = "visible";
    }
}

function deselect_tools(toolids) {
    for(var i=0; i < toolids.length; i++) {
        var tool = document.getElementById(toolids[i]);
        //console.log("DESelect tool: " + toolids[i] + " tool: " + tool);
        if (tool) {
            tool.setAttribute("class", "tool");
        }                          
        var content = document.getElementById("toolcontent_" + toolids[i]);
        //console.log("tool content: " + toolids[i] + " : " + content);
        if (content) {
            content.style.visibility = "hidden";
        }
    }
}
            

/* tab handling */

function show_tab(show_tabid, hide_tabids) {
    select_tab(show_tabid);
    deselect_tabs(hide_tabids);
}

function select_tab(tabid) {
    var tab = document.getElementById(tabid);
    //console.log("Selecte tab: " + tabid + " tab: " + tab);
    if (tab) {
        tab.setAttribute("class", "tab_selected");
        var content = document.getElementById("tabcontent_" + tabid);
        //console.log("tab content: " + tabid + " : " + content);
        if (content) {
            content.style.visibility = "visible";
        }
    }
}

function deselect_tabs(tabids) {
    for(var i=0; i < tabids.length; i++) {
        var tab = document.getElementById(tabids[i]);
        //console.log("DESelect tab: " + tabids[i] + " tab: " + tab);
        if (tab) {
            tab.setAttribute("class", "tab");
            var content = document.getElementById("tabcontent_" + tabids[i]);
            //console.log("tab content: " + tabids[i] + " : " + content);
            if (content) {
                content.style.visibility = "hidden";
            }
        }
    }
}
            

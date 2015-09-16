function HtmlSummary() 
{
    var m_htmlPlaceholder = "";
    var m_Editor = null;
    var m_Keyword = "";
    var m_Markers = [];
    var m_PreviousCell;
    
    function queryBackend(url)
    {
        $.ajax({
            url: 'api.php?url='+url,
            dataType: "json",
            success: function(data, textStatus, jqXHR) {
                // since we are using jQuery, you don't need to parse response
                drawTable(data);
            },
            error: function(xhr, textStatus, errorThrown){
               alert('Request failed');
            }
        });
    }
    function searchMarkTextInView(line)
    {
        var linenum = m_Editor.getLineNumber(line);
        var str = m_Editor.getLine(linenum);

        var pos = -1;
        
        // Search all occurrences of the keyword in the line and mark them.
        while ((pos = str.toUpperCase().indexOf(m_Keyword.toUpperCase(), pos+1))>=0)
        {
            var startindex = pos;
            if ((startindex > 0 && str[startindex - 1] =='<') || (startindex > 1 && str[startindex - 1] == '/' && str[startindex-2] == '<'))
            {   
                var marker = m_Editor.markText({line: linenum, ch: startindex}, {line: linenum, ch: startindex+m_Keyword.length}, {className: "styled-background"});
                m_Markers.push(marker);
            }
        }
        
    }
    function doMatchTags(cm, keyword) {
        var range = cm.getViewport();
        cm.eachLine(range.from, range.to, searchMarkTextInView);   
        
        // If we did not find anything to mark in the current viewport, scroll and call again until we find.
        if (m_Markers.length == 0)
        {
            m_Editor.execCommand("goPageDown");
            doMatchTags(cm, keyword);
        }
        // TODO: Follow up with CodeMirror folks as scrollIntoView does not move view to the right place.
        /*
        else
        {
            var linenum = m_Markers[0].lines[0].lineNo();
            var str = m_Editor.getLine(linenum);
            var charPos = str.toUpperCase().indexOf("<"+m_Keyword.toUpperCase());
            if (charPos != -1)
            {
                m_Editor.scrollIntoView({linenum, charPos});
            }
                
        }*/ 
    }
    function upateMarkersInViewPort(cm) {
        if (m_Keyword == "") return;
        doMatchTags(cm, m_Keyword);
    }

    this.setHighlights = function (tableCell)
    {
        var keyword = tableCell.innerHTML;
        
        if (m_Editor == null)
            return;
            
        // For new click on a cell, remove the highlight on previous cell.
        if (m_PreviousCell != undefined)
        {
            var temp = m_PreviousCell.innerHTML;
            m_PreviousCell.style.backgroundColor = "#fff";
        }
        m_PreviousCell = tableCell;
        
        // Reset all previous marker highlights.
        m_Markers.forEach(function(markerentry) {
            markerentry.clear();
        });
        m_Markers = [];
        m_Keyword = keyword;
        m_Editor.execCommand("goDocStart");
        
        // If the user scrolls, update our marker highlights.
        m_Editor.on("viewportChange", upateMarkersInViewPort);    
        doMatchTags(m_Editor, keyword);
        tableCell.style.backgroundColor = "#ff7";
    }
    function drawTable(data) {
        
        // Prepare new result set..
        $('#summaryresults').empty();        
        
        // If there are no html nodes, then it's invalid URL or there is nothing in the site.
        if (data["nodes"].length == 0)
        {
            alert("Invalid URL");
            $('#url_query').val("");
            return;
        }
        
        // Prepare the boiler plate.
        $('#summaryresults').append(m_htmlPlaceholder);
        
        // For each html node process a row.
        for (var key in data["nodes"]) {
            if (key != "htmlcode") 
            {
                drawRow(key, data["nodes"][key]);
            }
        }
        
        // Create text area for html source code.
        $("#htmlplaceholder").append('<textarea id="htmlcontent" class="editor" data-editor-lang="text/html" readonly>');
        var editors = [];
        var elems = document.getElementsByClassName("editor");
        
        // Code borrowed from CodeMirror example to initialize.
        for(var i=0; i<elems.length; i++) {
          var elem = elems[i];
          var editor = CodeMirror.fromTextArea(elem, {
            mode: elem.dataset.editorLang,
            lineNumbers: true,
            styleSelectedText: true,
            readOnly:true
          });
          editors.push(editor);
        }
        
        // Clean the html using tidy html5 library.
        var html = data["htmlcode"];
        var jsonOptions = JSON.parse('{"indent": "auto","indent-spaces": 2,"wrap": 80,"markup": true,"output-xml": false,"numeric-entities": true,"quote-marks": true,"quote-nbsp": false,"show-body-only": false,"quote-ampersand": false,"break-before-br": true,"uppercase-tags": true,"uppercase-attributes": false,"drop-font-tags": true,"tidy-mark": false}');
        var cleanHtml = tidy_html5(html, jsonOptions);
        
        // Complete the CodeMirror setup with the html code.
        m_Editor = editors[0];
        m_Editor.setValue(cleanHtml);
    }

    function drawRow(key, value) {
        var row = $("<tr />")
        $("#countsummary").append(row);
        row.append($("<td><a href='#htmlplaceholder' onClick='g_HtmlSummary.setHighlights(this);'>" + key + "</a></td>"));
        row.append($("<td>" + value + "</td>"));
    }

    this.SummaryClick = function () 
    {
        // Clear the results div.
        var query = $('#url_query').val();
        
        if (query == "" || !query)
        {
            alert("You forget to enter url!!");
            return;
        }
        var protocolIdx = query.indexOf('://');
        var dotIdx = query.indexOf('.');
        
        // Validate for invalid protocols.
        if (protocolIdx != -1 && dotIdx > protocolIdx)
        {
            var protocol = query.substr(0,protocolIdx);
            if (protocol != 'http' && protocol != 'https')
            {
                alert(protocol + " is not a supported protocol.");
                $('#url_query').val("");
                return;
            }
        }
        else 
        {
            // Prefix http as default.
            var prefix = 'http://';       
            query = prefix + query;
        }
        
        // Initialize our boiler plate html code.
        if (m_htmlPlaceholder == "")
        {
            m_htmlPlaceholder = $('#summaryresults').html();
        }
        
        // Setup the results html.
        $('#summaryresults').empty();
        var node = '<div align="center" ><img src="loading.gif"/></div>';
        $('#summaryresults').append(node);
        
        // Time to query the backend for data.
        queryBackend(query);
    }
}

// Singleton object for our code engine.
var g_HtmlSummary = new HtmlSummary();

//Provide auto complete feature for the url entered using bing autocomplete.
$(function() 
{
    $("#url_query").autocomplete({
        source: function (request, response) {
            console.log("source");
            $.ajax({
                url: "http://api.bing.net/qson.aspx?Query=" + encodeURIComponent(request.term) + "&JsonType=callback&JsonCallback=?",
                dataType: "jsonp",
                success: function (data) {
                    console.log("success!");
                    var suggestions = [];
                    $.each(data.SearchSuggestion.Section, function (i, val) {
                        // Do not show non url like suggestions.
                        if (val.Text.indexOf('.') != -1)
                        {
                            suggestions.push(val.Text);
                        }
                    });
                    response(suggestions);
                }
            });
        }
    });
});

//Provide enter feature on the textbox.
$(function()
{
    $("#url_query").keyup(function(event){
        if(event.keyCode == 13){
            $("#bt_summary").click();
        }
    });
});
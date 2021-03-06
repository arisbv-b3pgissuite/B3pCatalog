if (typeof B3pCatalog == "undefined")
    B3pCatalog = {};

B3pCatalog.hashchange = function(event) {
   //console.log("hashchange", event);
    log("hashchange", event);
    // get possible cookie set by login page:
    var loginHash = $.cookie("mdeLoginHash");
    if (loginHash && $.trim(loginHash) !== "#") {
        // delete cookie first (prevent perpetual loops):
        $.cookie("mdeLoginHash", null);
        // we just logged in. get login hash from cookie.
        // this will trigger this event again ("hashchange")
        location.hash = loginHash;
        return; // stop the rest of the function (unnecessary loadFiletree)
    }

    if ($("#filetree-file").children().length == 0) {
        // first run:
        B3pCatalog.loadFiletreeFile();
        B3pCatalog.loadFiletreeSDE();
        B3pCatalog.loadFiletreeKB();
    }

    if (event.getState("page") === "organisations") {
        B3pCatalog.loadOrganisations();
        return;
    }

    if (event.getState("page") === "csw") {
        showTab($("#main-tabs a[href='#search']"));
        return;
    }
    
    if (event.getState("uuid")) {
        showTab($("#main-tabs a[href='#search']"));
        $('#searchStringBox').val(event.getState("uuid"));
        $('select[name=searchType]').val('Identifier');
        $('#searchForm').append('<input type="hidden" name="search" value="search" />');
        setTimeout(function() {
            $('#searchForm').trigger('submit');
        }, 0);
        return;
    }

    if (event.getState("page") == "metadata") {
        $(".selected", "#filetree").removeClass("selected");
        var mode = event.getState("mode");
        var $selectedFile = $("a[rel=\"" + RegExp.escape(event.getState("path")) + "\"]", "#filetree-" + mode);
        if ($selectedFile.length == 0) {
            B3pCatalog.loadFiletreeFile(event.getState("path"));
        } else {
            // highlight selected
            $selectedFile.addClass("selected");
            B3pCatalog.fileTreeScrollTo($selectedFile);
        }

        B3pCatalog.loadMetadata(
                mode,
                event.getState("path"),
                event.getState("title"),
                event.getState("isGeo", true),
                function() {
                    B3pCatalog.clickedFileAnchor.removeClass("selected");
                    B3pCatalog.getCurrentFileAnchor().addClass("selected").focus();
                }
        );
        return;
    }
};

// add file to tree in client, when saved the file will be created in the root
// only works for file roots
B3pCatalog.addFile = function() {
    var $form = $("<form />");

    // Find currently selected item
    var $selectedItem = $("#filetree-file").find('.selected');
    // Only works if an item is selected
    if ($selectedItem.length === 0) {
        var $errorDiv = $("<div />", {
            html: "Er kan geen bestand worden toegevoegd. " +
                "Kies eerst een bestand in de map waar bestand moet worden toegevoegd."
        });
        $form.append($errorDiv);
        var $submitEventInput = $("<input type='submit' name='addFile' value='OK' class='dialog-submit'/>");
        $form.append($submitEventInput);
    } else {
        var $fileNameDiv = $("<div />", {
            html: "Kies een naam voor het metadatabestand met extensie xml."
        });
        $form.append($fileNameDiv);
        // Prompt for new file name
        var $fileNameInput = $("<input type='text' value='metadata.xml' />")
        $form.append($fileNameInput);
        var $submitEventInput = $("<input type='submit' name='addFile' value='Bestand toevoegen' class='dialog-submit'/>");
        $form.append($submitEventInput);
    }

    $form.submit(function() {
        log("add file via form submit");
        // Only works if an item is selected
        if($selectedItem.length !== 0) {
            B3pCatalog._addFile($fileNameInput.val());
        }
        $dialogDiv.dialog("close");
        return false;
    });

    var $dialogDiv = $("<div/>", {
        "class": "ui-mde-textarea-wrapper",
        css: {
            overflow: "hidden"
        }
    });
    
    $dialogDiv.append($form);
    $dialogDiv.appendTo(document.body).dialog({
        title: "Nieuw bestand toevoegen",
        modal: true,
        width: $("body").calculateDialogWidth(33),
        close: function(event) {
            $(this).dialog("destroy").remove();
        }
    });
};

// add file to tree in client, when saved the file will be created in the root
// only works for file roots
B3pCatalog._addFile = function(bestandsnaam, skipTree) {
    if(!skipTree) {
        // Find currently selected item
        var $selectedItem = $("#filetree-file").find('.selected');
        // Only works if an item is selected
        if($selectedItem.length === 0) {
            return;
        }
        // Get rel
        var rel = $selectedItem.attr('rel');
        // Extract folder
        var folder = rel.substring(0, rel.lastIndexOf('/') + 1);
        // Create new list item
        var $newListItem = $('<li class="file ext_txt"></li>');
        // Create new link
        var $newLinkItem = $('<a href="#" rel="' + folder + bestandsnaam + '" title="' + bestandsnaam + '" isgeo="true">' + bestandsnaam + '</a>').appendTo($newListItem);
        // Append list item after selected item
        $selectedItem.parent().after($newListItem);
        // Trigger tree rebind (to add click event to items)
        $("#filetree-file").trigger('rebindtree');
        // Trigger click
        $newLinkItem.trigger('click');
    } else {
        if(bestandsnaam === '') {
            bestandsnaam = 'md-' + (new Date()).getTime() + '.xml';
        }
        folder = "0/";
    }

    B3pCatalog.loadMetadata(
            B3pCatalog.modes.FILE_MODE,
            folder + bestandsnaam,
            bestandsnaam,
            true,
            function() {
                B3pCatalog.clickedFileAnchor.removeClass("selected");
                B3pCatalog.getCurrentFileAnchor().addClass("selected").focus();
            }
    );

};

B3pCatalog.loadLocal = function(success) {
    var me = this;
    if (!this.local) {
        $.okCancel({
            text: "Voor het openen van lokale mappen is een Java applet nodig. Dit werkt het beste wanneer de laatste versie van Java geinstalleerd is. Doorgaan met het laden van het applet?",
            ok: function() {
                me.local = new LocalAccess();
                me.local.initApplet(B3pCatalog.contextPath + "/applet", "applet-container", success);
            }
        });
    } else {
        success();
    }
}

B3pCatalog.connectDirectory = function() {
    var me = this;
    this.loadLocal(function() {
        me.local.callApplet("selectDirectory", "Selecteer een map...",
                function(dir) {
                    if (dir != null) {
                        B3pCatalog.loadFiletreeLocal(dir);
                    }
                },
                B3pCatalog.openSimpleErrorDialog
                );
    });
}

function htmlEncode(str) {
    var div = document.createElement("div");
    var txt = document.createTextNode(str);
    div.appendChild(txt);
    return div.innerHTML;
}

function extension(f) {
    return f.substring((f.lastIndexOf(".") + 1));
}

function filterOutMetadataFiles(files) {
    var i = 0;
    while (i < files.length) {
        var f = files[i];
        var prev = files[i - 1];
        if (i > 0 && prev.n == f.n.substring(0, prev.n.length)) {
            if (f.n.substring(prev.n.length) == ".xml") {
                prev.m = true;
                files.splice(i, 1);
                continue;
            }
        }
        prev = f.n;
        i++;
    }
}

function filterOutShapeExtraFiles(files) {
    var shapefiles = [];
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f.d == 0) {
            if (extension(f.n) == "shp") {
                shapefiles[shapefiles.length] = f.n.substring(0, f.n.length - 4);
            }
        }
    }

    for (var i = 0; i < shapefiles.length; i++) {
        var shp = shapefiles[i];
        var j = 0;
        while (j < files.length) {
            var f = files[j];
            if (f.n.substring(0, shp.length) == shp) {
                if (extension(f.n) != "shp") {
                    files.splice(j, 1);
                    continue;
                }
            }
            j++;
        }
    }
}

B3pCatalog.decodeFileList = function(data, fileJSON, success) {


    eval("var files = " + fileJSON);

    var s = "<ul class=\"jqueryFileTree\">";

    files.sort(function(lhs, rhs) {
        if (lhs.d != rhs.d) {
            return lhs.d < rhs.d ? 1 : -1;
        }
        return lhs.n.localeCompare(rhs.n);
    });

    filterOutMetadataFiles(files);
    filterOutShapeExtraFiles(files);

    var dir = data.expandTo || data.dir;

    if (data.expandTo) {
        var d = htmlEncode(data.expandTo);
        s += "<li class=\"directory expanded\">" +
                "<a href=\"#\" rel=\"" + d + "\" title=\"" + d + "\">" + d + "</a>";
        s += "<ul class=\"jqueryFileTree\">";
    }

    for (i = 0; i < files.length; i++) {
        f = files[i];
        if (f.d != 0) {
            var en = htmlEncode(f.n);
            s += "<li class=\"directory collapsed\">";
            s += "<a href=\"#\" rel=\"" + htmlEncode(dir) + "/" + en + "\" title=\"" + en + "\">";
            s += en + "</a></li>";
        } else {
            var idx = f.n.lastIndexOf(".");
            var ext = "";
            if (idx != -1) {
                ext = f.n.substring(idx + 1);
                if (ext.indexOf(" ") == -1) { // not entirely foolproof
                    ext = "ext_" + ext;
                } else {
                    ext = "";
                }
            }
            if (f.m) {
                ext += " with_metadata";
            }
            s += "<li class=\"file " + ext + "\">";
            var en = htmlEncode(f.n);
            s += "<a href=\"#\" m=\"" + (!!f.m) + "\" rel=\"" + htmlEncode(dir) + "/" + en + "\" title=\"" + en + " (" + (f.s / 1024).toFixed(2) + " KB)" + (f.m ? " (metadata XML bestand aanwezig)" : "") + "\">";
            s += en + "</a></li>";
        }
    }
    if (data.expandTo) {
        s += "</ul></li>";
    }
    s += "</ul>";
    success(s);
}

B3pCatalog.loadFiletreeLocal = function(dir) {
    log("loadFiletreeLocal", dir);

    var me = this;

    B3pCatalog._loadFiletree(dir, $("#filetree-local"), {
        noAjax: function(data, success, error) {
            log("list directory", data.expandTo || data.dir);
            me.local.callApplet("listDirectory", data.expandTo || data.dir,
                    function(files) {
                        B3pCatalog.decodeFileList(data, files, success)
                    },
                    function(e) {
                        $.ok({text: e});
                        error();
                    }
            );
        },
        fileCallback: function(rel, aElement) {
            var anchor = B3pCatalog.clickedFileAnchor = $(aElement);
            if (anchor.length > 0 && anchor.hasClass("selected"))
                return;

            var newState = {
                page: "metadata",
                mode: B3pCatalog.modes.LOCAL_MODE,
                path: rel,
                title: anchor.attr("title")
            };

            $.bbq.pushState(newState, 2);
        }
    });
}

/////////////////////////////// Filetree ///////////////////////////////////////

// zou niet meer nodig moeten zijn nu.
B3pCatalog.loadingFiletreeFile = false;

// Deze functie wordt maar één keer aangeroepen per aanroep van de B3PCatalog pagina, vandaar de boolean.
// De boolean B3pCatalog.loadingFiletree voorkomt het voor een tweede keer starten van de filetree (met alleen de roots)
B3pCatalog.loadFiletreeFile = function(selectedFilePath) {
    log("loadFiletreeFile");
    if (B3pCatalog.loadingFiletreeFile)
        return;
    B3pCatalog.loadingFiletreeFile = true;

    B3pCatalog._loadFiletree(selectedFilePath, $("#filetree-file"), {
        scriptEvent: "listDir",
        fileCallback: function(rel, aElement) {
            //log("file clicked: " + filename);
            var anchor = B3pCatalog.clickedFileAnchor = $(aElement);
            if (anchor.length > 0 && anchor.hasClass("selected"))
                return;

            var newState = {
                page: "metadata",
                mode: B3pCatalog.modes.FILE_MODE,
                path: rel,
                title: anchor.attr("title"),
                isGeo: "true" == anchor.attr("isgeo")
            };
            //console.log("loadFiletreeFile", newState, $.bbq);
            log("loadFiletreeFile", newState, $.bbq);
            $.bbq.pushState(newState, 2);
        }
    });
};

// zou niet meer nodig moeten zijn nu.
B3pCatalog.loadingFiletreeSDE = false;

B3pCatalog.loadFiletreeSDE = function(selectedFilePath) {
    if (B3pCatalog.loadingFiletreeSDE)
        return;
    B3pCatalog.loadingFiletreeSDE = true;

    B3pCatalog._loadFiletree(selectedFilePath, $("#filetree-sde"), {
        scriptEvent: "listSDEDir",
        fileCallback: function(rel, aElement) {
            var anchor = B3pCatalog.clickedFileAnchor = $(aElement);
            if (anchor.length > 0 && anchor.hasClass("selected"))
                return;

            var newState = {
                page: "metadata",
                mode: B3pCatalog.modes.SDE_MODE,
                path: rel,
                title: anchor.attr("title")
            };

            $.bbq.pushState(newState, 2);
        }
    });
};

// zou niet meer nodig moeten zijn nu.
B3pCatalog.loadingFiletreeKB = false;

B3pCatalog.loadFiletreeKB = function(selectedFilePath) {
    if (B3pCatalog.loadingFiletreeKB)
        return;
    B3pCatalog.loadingFiletreeKB = true;

    B3pCatalog._loadFiletree(selectedFilePath, $("#filetree-kb"), {
        scriptEvent: "listKBDir",
        fileCallback: function(rel, aElement) {
            var anchor = B3pCatalog.clickedFileAnchor = $(aElement);
            if (anchor.length > 0 && anchor.hasClass("selected"))
                return;

            var newState = {
                page: "metadata",
                mode: B3pCatalog.modes.KB_MODE,
                path: rel,
                title: anchor.attr("title")
            };

            $.bbq.pushState(newState, 2);
        }
    });
};

B3pCatalog._loadFiletree = function(selectedFilePath, $elem, extraOpts) {
    // used to indicate that the selected file does not need to be selected in readyCallback
    var selectedFileFound = false;

    $elem.fileTree($.extend({
        scriptEvent: "",
        script: B3pCatalog.filetreeUrl,
        root: "",
        spinnerImage: B3pCatalog.contextPath + "/styles/images/spinner.gif",
        expandEasing: "", //"linear",
        collapseEasing: "", //"linear", //"easeOutBounce",
        expandSpeed: 0,
        collapseSpeed: 0,
        dragAndDrop: false,
        /*extraAjaxOptions: {
         global: false
         },*/
        activeClass: "selected",
        activateDirsOnClick: false,
        expandOnFirstCallTo: selectedFilePath,
        fileCallback: $.noop,
        dirExpandCallback: function(dir) {
        },
        readyCallback: function(root) {
            if (selectedFilePath && !selectedFileFound) {
                var $selectedFile = $("a[rel=\"" + RegExp.escape(selectedFilePath) + "\"]", root);
                //log(selectedFile);
                if ($selectedFile.length > 0) {
                    selectedFileFound = true;
                    $(".selected", root).removeClass("selected");
                    $selectedFile.addClass("selected");
                    B3pCatalog.fileTreeScrollTo($selectedFile);
                }
            } else {
                // no selected file or a directory (root) was clicked
                B3pCatalog.fileTreeScrollTo(root);
            }
        }
    }, extraOpts));
};

B3pCatalog.filetreeScrollToOptions = {
    axis: "y",
    duration: 0, //200, //1000,
    easing: "" //"linear" //"easeOutBounce"
};

B3pCatalog.fileTreeScrollTo = function(elem) {
    var $elem = $(elem),
            $pane = $("#sidebar"),
            paneHeight = $pane.height(),
            paneTop = $pane.offset().top,
            paneBottom = paneTop + paneHeight,
            elemHeight = $elem.height(),
            elemTop = $elem.offset().top,
            elemBottom = elemTop + elemHeight;

    var isScrolledIntoPane = ((elemBottom >= paneTop) && (elemTop <= paneBottom)
            && (elemBottom <= paneBottom) && (elemTop >= paneTop));

    if (!isScrolledIntoPane) {
        if (elemBottom > paneBottom && elemTop <= paneBottom &&
                elemTop > paneTop && elemHeight < paneHeight) {
            // element is partly out of range at the bottom of the pane: 
            // make sure the element bottom is visible at the bottom of the pane.
            $pane.scrollTo($pane.scrollTop() + elemBottom - paneBottom, B3pCatalog.filetreeScrollToOptions);
        } else {
            // element is completely out of range
            $pane.scrollTo($elem, B3pCatalog.filetreeScrollToOptions);
        }
    }
};

function scrollbarWidth() {
    var div = $('<div style="width:50px;height:50px;overflow:hidden;position:absolute;top:-200px;left:-200px;"><div style="height:100px;"></div>');
    // Append our div, do our calculation and then remove it
    $('body').append(div);
    var w1 = $('div', div).innerWidth();
    div.css('overflow-y', 'scroll');
    var w2 = $('div', div).innerWidth();
    div.remove();
    return (w1 - w2);
}

////////////////////////////// Algemeen ////////////////////////////////////////

$(document).ajaxError(function(event, xhr, ajaxOptions, thrownError) {
    var message = xhr.responseText;
    if (!!thrownError)
        message = thrownError + "<br /><br/>" + message;
    B3pCatalog.openErrorDialog(message);
    return false;
});

B3pCatalog.openErrorDialog = function(message) {
    message = !!message ? message : "Fouttekst is leeg.";
    log("error: " + message);
    $(".spinner").remove();
    $(".wait").removeClass("wait");
    $("<div/>").html(message).appendTo(document.body).dialog({
        title: "Fout",
        modal: true,
        width: $("body").calculateDialogWidth(66),
        height: $("body").calculateDialogHeight(80),
        buttons: [{
                text: "Ok",
                click: function(event) {
                    $(this).dialog("close");
                }
            }],
        close: function(event) {
            $(this).dialog("destroy").remove();
        }
    });
};

B3pCatalog.openSimpleErrorDialog = function(message) {
    message = !!message ? message : "Fouttekst is leeg.";
    log("error: " + message);
    $(".spinner").remove();
    $(".wait").removeClass("wait");
    $("<div/>").html(message).appendTo(document.body).dialog({
        title: "Fout",
        modal: true,
        buttons: [{
                text: "Ok",
                click: function(event) {
                    $(this).dialog("close");
                }
            }],
        close: function(event) {
            $(this).dialog("destroy").remove();
        }
    });
};


/////////////////////////////////// Status /////////////////////////////////////

// kan niet zomaar checken op zichtbaarheid van file of csw tab. 
// bij switchen van tab blijft metadata rechts in het scherm namelijk zichtbaar (by design).
// de modus hier beschreven is dus de modus van de metadata rechts in het scherm.
// het zou wellicht in een data veld in #mde-wrapper kunnen worden opgeslagen. weinig verschil met status quo.
B3pCatalog.modes = {
    NO_MODE: "none",
    FILE_MODE: "file",
    SDE_MODE: "sde",
    KB_MODE: "kaartenbalie",
    LOCAL_MODE: "local",
    CSW_MODE: "csw",
    ADMIN_MODE: "admin"
};

// dit kan wat consistenter:
B3pCatalog.currentMode = B3pCatalog.modes.NO_MODE;

B3pCatalog.currentFilename = "";

B3pCatalog.clickedFileAnchor = $();

B3pCatalog.getCurrentEsriType = function() {
    return $("#filetree .jqueryFileTree a.selected").attr("esritype");
};

B3pCatalog.getCurrentFileAnchor = function() {
    return $("a[rel='" + RegExp.escape(B3pCatalog.currentFilename) + "']", "#filetree");
};


/////////////////////////////// Functies ///////////////////////////////////////

B3pCatalog.loadMetadata = function(mode, path, title, isGeo, cancel) {

    // local mode aka Java applet
    if (mode == B3pCatalog.modes.LOCAL_MODE) {

        var me = this;
        var xmlFile = path + ".xml"

        // md contains the contents of the file selected with the Java applet.
        function loadLocalMetadata(md) {
            var opts = {
                done: function() {

                },
                cancel: cancel,
                ajaxOptions: {
                    url: B3pCatalog.metadataUrl,
                    type: "POST",
                    data: {
                        loadMdAsHtml: "t",
                        mode: mode,
                        metadata: md, // Added metadata parameter. Contains contents of a selected file with the Java applet.
                        path: path
                    },
                    dataType: "text", // jquery returns the limited (non-activeX) xml document version in IE when using the default or 'xml'. Could use dataType adapter override to fix this: text -> xml
                    success: function(data, textStatus, jqXHR) {
                        //log(data);
                        B3pCatalog.currentFilename = path;
                        B3pCatalog.currentMode = mode;
                        document.title = B3pCatalog.title + B3pCatalog.titleSeparator + title;
                        // TODO: on demand van PBL bv: laatst geopende doc opslaan
                        //$.cookie();
                        var access = jqXHR.getResponseHeader("X-MDE-Access");
                        var viewMode = (access != "WRITE" && access != "ADD");

                        B3pCatalog.createMdeHtml(data, false, isGeo, viewMode);
                    }
                }
            };

            $("#synchronizeMD").button("option", "disabled", false);

            B3pCatalog._loadMetadata(opts);
        }

        me.loadLocal(function() {
            me.local.callApplet("readFileUTF8", xmlFile,
                    
                    // called when contents file xmlFile (file.XML)could be read.
                    loadLocalMetadata,
                    
                    // Error callback. Called when file <file>.XML does not exist. loadLocalMetadata is
                    // still called but will now return a 'virgin' html document which 
                    // will be transformed into a mde document. 
                    loadLocalMetadata
                    );
            });

                        // file mode
                    } else {
        var opts = {
            done: function() {

            },
            cancel: cancel,
            ajaxOptions: {
                url: B3pCatalog.metadataUrl,
                type: "POST",
                data: {
                    loadMdAsHtml: "t",
                    mode: mode,
                    path: path
                },
                dataType: "text", // jquery returns the limited (non-activeX) xml document version in IE when using the default or 'xml'. Could use dataType adapter override to fix this: text -> xml
                success: function(data, textStatus, jqXHR) {
                    //log(data);
                    B3pCatalog.currentFilename = path;
                    B3pCatalog.currentMode = mode;
                    document.title = B3pCatalog.title + B3pCatalog.titleSeparator + title;
                    // TODO: on demand van PBL bv: laatst geopende doc opslaan
                    //$.cookie();
                    var access = jqXHR.getResponseHeader("X-MDE-Access");
                    var viewMode = (access != "WRITE" && access != "ADD");

                    B3pCatalog.createMdeHtml(data, false, isGeo, viewMode);
                }
            }
        };

        $("#synchronizeMD").button("option", "disabled", false);
        var me = this;

        this._loadMetadata(opts);
    }
};

B3pCatalog.loadMetadata4View = function(mode, path, title, isGeo, cancel) {

    if (mode != B3pCatalog.modes.LOCAL_MODE) {
        
        var localViewMode = true;
        
        var opts = {
            done: function() {

            },
            cancel: cancel,
            ajaxOptions: {
                url: B3pCatalog.metadataUrl,
                type: "POST",
                data: {
                    loadMdAsHtml: "t",
                    mode: mode,
                    path: path,
                    viewMode: localViewMode
                },
                dataType: "text", // jquery returns the limited (non-activeX) xml document version in IE when using the default or 'xml'. Could use dataType adapter override to fix this: text -> xml
                success: function(data, textStatus, jqXHR) {
                    //log(data);
                    B3pCatalog.currentFilename = path;
                    B3pCatalog.currentMode = mode;
                    document.title = B3pCatalog.title + B3pCatalog.titleSeparator + title;

                    B3pCatalog.createMdeHtml(data, false, isGeo, localViewMode);
                }
            }
        };

        this._loadMetadata(opts);
    }
};

B3pCatalog.resetMde = function() {
    var mde = $("#mde").data("mde");

    //console.log("resetMde");
    log("resetMde");

    var viewMode = mde.options.viewMode;
    var currentTab = mde.options.currentTab;
    var isGeo = !mde.options.geoTabsMinimized;

    $.ajax({
        url: B3pCatalog.metadataUrl,
        type: "POST",
        dataType: 'html',
        data: {
            resetXml: "t",
        },
        success: function(data, textStatus, xhr) {
            //console.log("resetXml", data);
            log("resetXml", data);

            B3pCatalog.createMdeHtml(data, false, isGeo, viewMode, {currentTab: currentTab});
        }
    });
};

B3pCatalog.refreshMde = function() {
    var mde = $("#mde").data("mde");

    var changedElements = mde.getChangedElements();
    var sectionChange = mde.getSectionChange();

    //console.log("refreshMde", changedElements, sectionChange);
    log("refreshMde", changedElements, sectionChange);

    var viewMode = mde.options.viewMode;
    var currentTab = mde.options.currentTab;
    var isGeo = !mde.options.geoTabsMinimized;

    $.ajax({
        url: B3pCatalog.metadataUrl,
        type: "POST",
        dataType: 'html',
        data: {
            updateXml: "t",
            elementChanges: JSON.stringify(changedElements),
            sectionChange: sectionChange === null ? null : JSON.stringify(sectionChange)
        },
        success: function(data, textStatus, xhr) {
            //console.log("updateXml", data);
            log("updateXml", data);

            B3pCatalog.createMdeHtml(data, true, isGeo, viewMode, {currentTab: currentTab});
        }
    });
};

B3pCatalog.addComment = function(comment) {
    B3pCatalog.fadeMessage("Comment toegevoegd");

    if (!$.trim(comment)) {
        B3pCatalog.openSimpleErrorDialog("Commentaar kan niet leeg zijn.");
        return false;
    } else {
        var me = B3pCatalog;

        if (me.commentUsername == null) {
            if (me.username != null && me.username.trim().length > 0) {
                me.commentUsername = me.username;
            } else {
                me.commentUsername = $.cookie('commentUsername');
                if (me.commentUsername == null) {
                    me.commentUsername = prompt("Onder welke naam wilt u dit commentaar plaatsen?");
                }
                if (me.commentUsername == null) {
                    return null;
                } else {
                    $.cookie("commentUsername", me.commentUsername, {expires: 30});
                }
            }
        }

        var metadata = "";
        var mde = $("#mde").data("mde");
        var viewMode = mde.options.viewMode;
        var currentTab = mde.options.currentTab;
        var isGeo = !mde.options.geoTabsMinimized;

        $.ajax({
            url: B3pCatalog.metadataUrl,
            dataType: "html",
            type: "POST",
//            async: false,
            data: {
                postComment: "t",
                comment: comment,
                path: B3pCatalog.currentFilename,
                mode: B3pCatalog.currentMode,
                metadata: metadata,
                username: me.commentUsername
            },
            success: function(data, textStatus, xhr) {
                //console.log("updateXml after comment", data);
                log("updateXml after comment", data);

                B3pCatalog.createMdeHtml(data, true, isGeo, viewMode, {currentTab: currentTab});
            }
        });
    }
};

B3pCatalog.loadMetadataByUUID = function(uuid) {
    this._loadMetadata({
        done: function() {
            B3pCatalog.getCurrentFileAnchor().removeClass("selected").blur();
            B3pCatalog.currentFilename = "";
            // TODO: eigenlijk moet ook oldrel in jquery.filetree nog leeg gemaakt worden, maar dat vereist wat veranderingen in die plugin
        },
        ajaxOptions: {
            url: B3pCatalog.catalogUrl,
            data: {
                loadMdAsHtml: "t",
                uuid: uuid
            },
            type: "POST",
            dataType: "text",
            success: function(data, textStatus, jqXHR) {
                //log("load by uuid success");
                B3pCatalog.currentMode = B3pCatalog.modes.CSW_MODE;
                // TODO: title kan geëxtract worden uit het xml
                document.title = B3pCatalog.title;
//                B3pCatalog.createCswMde(data);
                B3pCatalog.createMdeHtml(data, false, true, true);
            }
        }
    });
 };

B3pCatalog._loadMetadata = function(opts) {
    var options = $.extend({
        done: $.noop,
        cancel: $.noop,
        ajaxOptions: {}
    }, opts);
    B3pCatalog.saveDataUserConfirm({
        done: function() {
            
            $("#toolbar").empty();
            $("#mde").mde("destroy");
            var spinner = $("<img />", {
                src: B3pCatalog.contextPath + "/styles/images/spinner.gif",
                "class": "spinner"
            });
            //use center-wrapper insteadof mde as mde may not yet been created
            $("#center-wrapper").html(spinner);
            var scrollable = $("#center-wrapper").closest(":scrollable");
            spinner.position({
                of: scrollable.length > 0 ? scrollable : $(window),
                my: "center center",
                at: "center center"
            });

            document.title = B3pCatalog.title;
            options.done();
            if (opts.noAjax) {
                opts.noAjax();
            } else {
                $.ajax(options.ajaxOptions);
            }
        },
        cancel: options.cancel
    });
};

function endsWith(s, n) {
    return s.indexOf(n, s.length - n.length) != -1;
}

B3pCatalog.saveMetadata = function(settings) {


    if (B3pCatalog.currentMode == B3pCatalog.modes.LOCAL_MODE) {

        var me = this;

        // Get updated XML from server
 
        var changedElements = mde.getChangedElements();
        var sectionChange = mde.getSectionChange();

        $.ajax({
            url: B3pCatalog.metadataUrl,
            type: "POST",
            dataType: 'html',
            data: {
                updateElementsAndGetXml: "t",
                elementChanges: JSON.stringify(changedElements),
                sectionChange: sectionChange === null ? null : JSON.stringify(sectionChange)
            },
            success: function(data, textStatus, xhr) {

                var xml = data;
                var xmlFile = B3pCatalog.currentFilename + ".xml";

                me.loadLocal(function() {

                    me.local.callApplet("writeFileUTF8", xmlFile, xml,
                            function() {
                                B3pCatalog.fadeMessage("Metadata succesvol opgeslagen");
                                $("#saveMD").button("option", "disabled", true);
                       
                                if (!endsWith(xmlFile.toLowerCase(), ".xml")) {
                                    B3pCatalog.clickedFileAnchor.addClass("with_metadata");
                                }
                            },
                            function(e) {
                                B3pCatalog.openSimpleErrorDialog("Fout bij opslaan bestand: " + e);
                            }
                    );
                });
            }
        });

    } else {
        var options = $.extend({
            filename: B3pCatalog.currentFilename,
            updateUI: true,
            async: false
        }, settings);

        if (!options.filename)
            return;

        var mde = $("#mde").data("mde");
        var changedElements = mde.getChangedElements();
        var currentTab = mde.options.currentTab;
        var sectionChange = mde.getSectionChange();
        var viewMode = mde.options.viewMode;
        var isGeo = !mde.options.geoTabsMinimized;

        $.ajax({
            url: B3pCatalog.metadataUrl,
            type: "POST",
            dataType: "text",
            data: {
                updateAndSaveXml: "t",
                elementChanges: JSON.stringify(changedElements),
                sectionChange: sectionChange === null ? null : JSON.stringify(sectionChange),
                path: options.filename, 
                mode: B3pCatalog.currentMode
            },
            success: function(data, textStatus, xhr) {
                //log(data);
                B3pCatalog.createMdeHtml(data, false, isGeo, viewMode, {currentTab: currentTab});
                B3pCatalog.fadeMessage("Metadata succesvol opgeslagen");
                if (options.updateUI)
                    $("#saveMD").button("option", "disabled", true);
            }
        });
    }
};

var messageIndex = 1;
B3pCatalog.fadeMessage = function(message) {
    var $message = $("<div/>", {
        text: message,
        "class": "fade-message",
        "z-index": (2000 - messageIndex)
    });
    if (messageIndex<1) {
        messageIndex = 1;
    } else if (messageIndex>5) {
        messageIndex = 5;
    }
    setTimeout(function() {
        messageIndex++;
        $("#center").append($message);
    }, (2000 * (messageIndex-1)));
    setTimeout(function() {
        messageIndex--;
        $message.fadeOut(2000, function() {
            $(this).remove();
        });
    }, (2000 * messageIndex));
};

B3pCatalog.logout = function() {
    this.saveDataUserConfirm({
        done: function() {
            window.location = B3pCatalog.contextPath + "/logout.jsp";
        }
    });
};

B3pCatalog.saveDataUserConfirm = function(opts) {
    var options = $.extend({
        done: $.noop,
        cancel: $.noop,
        text: "Wilt u uw wijzigingen opslaan?",
        asyncSave: false
    }, opts);
    if ($("#mde .ui-mde-element").length > 0 && $("#mde").mde("option", "changed")) {
        $.yesNoCancel({
            text: options.text,
            yes: function() {
                B3pCatalog.saveMetadata({async: options.asyncSave});
                options.done();
            },
            no: function() {
                options.done();
            },
            cancel: function() {
                options.cancel();
            }
        });
    } else {
        options.done();
    }
};

B3pCatalog.commentUsername = null;
B3pCatalog.mdeChanged = false;

B3pCatalog.createMdeHtml = function(htmlDoc, changedOnServer, isGeo, viewMode, extraOptions) {
    $("#mde").mde("destroy");
    $("#center-wrapper").html($("<div>", {
        id: "mde"
    }));

    log("loading organisations");
    B3pCatalog.getOrganisations().done(function(organisations) {
        log("creating mde...");
       $("#mde").mde($.extend({}, B3pCatalog.basicMdeOptions, {
            xmlHtml: htmlDoc,
            organisations: organisations,
            commentPosted: function(comment) {
                //console.log("onCommentPosted");
                log("onCommentPosted");
                B3pCatalog.addComment(comment);
            },
            onServerTransformRequired: function() {
                //console.log("onServerTransformRequired");
                log("onServerTransformRequired");
                B3pCatalog.refreshMde();
            },
            onResetRequired: function() {
                //console.log("onResetRequired");
                log("onResetRequired");
                B3pCatalog.resetMde();
            },
            change: function(changed) {
                //console.log("onChange");
                log("onChange");
                B3pCatalog.setChanged(changed);
            },
        }, B3pCatalog.getExtraMdeOptions(isGeo, viewMode)
                , extraOptions));

        var mde = $("#mde").data("mde");
        $(window).bind("beforeunload.mde", function(event) {
            if (mde.options.pageLeaveWarning && B3pCatalog.mdeChanged) {
                return "Uw wijzigingen in het metadata document zullen verloren gaan als u deze pagina verlaat.";
            }
            return undefined;
        });

        B3pCatalog.createMdeToolbar(viewMode);
        B3pCatalog.setChanged(changedOnServer);
        B3pCatalog.fadeMessage("Editor gegevens zijn ververst");
        
        if(window.localStorage.getItem('last-open-index')) {
            mde.openBlock(window.localStorage.getItem('last-open-index'));
            window.localStorage.removeItem('last-open-index');
        }
        if(window.localStorage.getItem('last-scroll-position')) {
            mde.scrollTo(parseInt(window.localStorage.getItem('last-scroll-position'), 10));
            window.localStorage.removeItem('last-scroll-position');
        }
        
    });

};

B3pCatalog.getOrganisations = function() {
    return $.ajax({
        url: B3pCatalog.orgsUrl,
        type: "POST",
        data: {json: "t"},
        dataType: "json",
    });
};
    
B3pCatalog.setChanged = function(changed) {
    var docTitle = "" + document.title;
    var docTitleLastChar = docTitle.substring(docTitle.length - 1);
    if (changed) {
        if (docTitleLastChar !== "*")
            document.title = docTitle + "*";
    } else {
        if (docTitleLastChar === "*")
            document.title = docTitle.substring(0, docTitle.length - 1);
    }

    if (!changed) {
        $(".ui-mde-changed-value", this.element).removeClass("ui-mde-changed-value");
    }

    $("#saveMD").button("option", "disabled", !changed);

    B3pCatalog.mdeChanged = changed;
};

B3pCatalog.createCswMde = function(xmlDoc) {
    $.bbq.pushState({page: "csw"}, 2);
    $("#mde").mde("destroy");
    $("#center-wrapper").html($("<div>", {
        id: "mde"
    }));

    $("#mde").mde($.extend({}, B3pCatalog.basicMdeOptions, {
        xml: xmlDoc,
        viewMode: true
    }));
    B3pCatalog.createMdeToolbar(true);
};

B3pCatalog.exportMetadata = function() {
    switch (B3pCatalog.currentMode) {
        case B3pCatalog.modes.SDE_MODE:
        case B3pCatalog.modes.LOCAL_MODE:
        case B3pCatalog.modes.FILE_MODE:
            B3pCatalog._exportMetadata();
            break;
        case B3pCatalog.modes.CSW_MODE:
            B3pCatalog._exportMetadataByUUID();
            break;
        default:
            B3pCatalog.openSimpleErrorDialog(B3pCatalog.title + " is in an illegal mode: " + B3pCatalog.currentMode);
    }
};

B3pCatalog._doExportMetadata = function(exportType) {
    $("#mde").mde("option", "pageLeaveWarning", false);

    window.location = B3pCatalog.metadataUrl + "?" + $.param({
        "export": "t",
        path: B3pCatalog.currentFilename,
        mode: B3pCatalog.currentMode,
        exportType: exportType
    });
        
    $("#mde").mde("option", "pageLeaveWarning", true);
};

B3pCatalog._exportMetadata = function() {
    var $form = $("<form />");

    var $chooseTypeDiv = $("<div />", {
        html: "U heeft de volgende keuzes:<ul><li>alles: alle metadata binnen één bestand;</li>"+ 
                "<li>datasets: metadata voor datasets conform Nederlands profiel;</li>"+
                "<li>services: metadata voor services conform Nederlands profiel.</li></ul>"+
                "<p>Kies het type metadata dat u wil exporteren:</p>"
    });
            
    var $typeInput = $("<select />", {
        name: "exportType"
    });
    var option1 = $("<option></option>").attr("value", "all");
    option1.text("alles");
    option1.attr("selected", "selected");
    $typeInput.append(option1);
    var option2 = $("<option></option>").attr("value", "datasets");
    option2.text("datasets");
    $typeInput.append(option2);
    var option3 = $("<option></option>").attr("value", "services");
    option3.text("services");
    $typeInput.append(option3);

    var $submitEventInput = $("<input type='submit' name='export' value='Exporteren' class='dialog-submit'/>");

    $form.append($chooseTypeDiv);
    $form.append($typeInput);
    $form.append($submitEventInput);

    $form.submit(function() {
        log("export via form submit");
        B3pCatalog._doExportMetadata($typeInput.val());
        $dialogDiv.dialog("close");
        return false;
    });

    var $dialogDiv = $("<div/>", {
        "class": "ui-mde-textarea-wrapper",
        css: {
            overflow: "hidden"
        }
    });
    
    $dialogDiv.append($form);
    $dialogDiv.appendTo(document.body).dialog({
        title: "Metadata exporteren",
        modal: true,
        width: $("body").calculateDialogWidth(33),
        close: function(event) {
            $(this).dialog("destroy").remove();
        }
    });
};

B3pCatalog._exportMetadataByUUID = function() {
    $("#mde").mde("option", "pageLeaveWarning", false);
    window.location = B3pCatalog.catalogUrl + "?" + $.param({
        "export": "t",
        uuid: $("#search-results .search-result-selected").attr("uuid")
    });
    $("#mde").mde("option", "pageLeaveWarning", true);
};

B3pCatalog.importMetadata = function() {
    var $form = $("<form />", {
        method: "POST",
        action: B3pCatalog.metadataUrl // enctype and encoding set by form plugin
    });

    var $chooseXmlDiv = $("<div />", {
        text: "Kies een xml metadata bestand:"
    });

    var $fileInput = $("<input type='file' name='importXml' size='50' style='width: 100%' />");

    var $textarea = $("<textarea></textarea>", {
        id: "import-textarea",
        name: "metadata",
        cols: 50,
        rows: 35, // IE 6/7 pakt 100% height niet
        css: {
            width: "100%",
            height: "200px", //"100%",
            margin: 0
            // padding: 0
        }
    });
    var placeholderText = "Plak uw te importeren metadata hier";
    if ("placeholder" in $textarea[0]) {
        $textarea.attr("placeholder", placeholderText);
    } else {
        $textarea.text(placeholderText);
    }

    var $orDiv = $("<div />", {
        text: "of",
        css: {"margin-top": "1em", "margin-bottom": "1em"}
    })

    var $uuidCheckbox = $("<input type='checkbox' id='new-uuid-checkbox' name='newUuid' />");
    $uuidCheckbox.prop("checked", true);

    var $uuidLabel = $("<label for='new-uuid-checkbox'>Genereer nieuwe unieke identifiers (UUID's) voor de metadata en de bron.</label>");

    var $submitEventInput = $("<input type='submit' name='importMD' value='Importeren' class='dialog-submit'/>");

    var $newFileDiv = $("<div />", {
        html: "Indien u hier een naam invult, dan wordt een nieuw metadata bestand aangemaakt."
    });

    var $dialogDiv = $("<div/>", {
        "class": "ui-mde-textarea-wrapper",
        css: {
            overflow: "hidden"
        }
    });

    $form.append($chooseXmlDiv);
    $form.append($fileInput);
    $form.append($orDiv);
    $form.append($textarea);
    $form.append($("<hr style='margin-top: 2em' />"));
    $form.append($uuidCheckbox);
    $form.append($uuidLabel);
//    $form.append($newFileDiv);
//    $form.append($textInput);
    $form.append($submitEventInput);

    $form.submit(function() {
        if ($fileInput.val() || ($textarea.val() && $textarea.val() !== placeholderText)) {
            log("import via form submit");
            $(this).ajaxSubmit({
                async: false,
                data: {importMD: "t"},
                dataType: "html", // text from textarea must not be treated as xml immediately
                success: function(data, status, xhr) {
                    log("import success");
                    $dialogDiv.dialog("close");
                    // isGeo (3rd parameter) must be false
                    B3pCatalog.createMdeHtml(data, false, false, false);
                }
            });
        } else {
            $.ok({
                text: "Kies een bestand of plak xml in het tekstvak om metadata te importeren."
            });
        }
        return false;
    });

    $dialogDiv.append($form);
    $dialogDiv.appendTo(document.body).dialog({
        title: "Metadata importeren in " + B3pCatalog.currentFilename,
        modal: true,
        width: $("body").calculateDialogWidth(66),
        //height: $("body").calculateDialogHeight(80), // auto
        close: function(event) {
            $(this).dialog("destroy").remove();
        }
    });
};

B3pCatalog.synchronizeWithData = function() {
    var me = this;
    var mde = $("#mde").data("mde");

    //console.log("synchronizeMde");
    log("synchronizeMde");

    var viewMode = mde.options.viewMode;
    var currentTab = mde.options.currentTab;
    var isGeo = !mde.options.geoTabsMinimized;

    var doIt = function(synchronizeData) {
        //log($("#mde").mde("save", {postprocess: false}));
        $.ajax({
            url: B3pCatalog.metadataUrl,
            data: {
                synchronize: "t",
                path: B3pCatalog.currentFilename,
                mode: B3pCatalog.currentMode,
                metadata: null, // niet meer nodig, staat serverside
                synchronizeData: synchronizeData
            },
            type: "POST",
            async: false,
            dataType: "html",
            success: function(data, textStatus, xhr) {
                //console.log("synchronizeXml", data);
                log("synchronizeXml", data);
                B3pCatalog.createMdeHtml(data, true, isGeo, viewMode, {currentTab: currentTab});
                B3pCatalog.fadeMessage("Synchronisatie succesvol");
            }
        });
    }

    B3pCatalog.saveDataUserConfirm({
        text: "Wilt u uw wijzigingen opslaan alvorens uw metadata te synchroniseren? Als u \"Nee\" kiest gaan uw wijzigingen verloren.",
        done: function() {

            if (B3pCatalog.currentMode == B3pCatalog.modes.LOCAL_MODE) {
                var fn = B3pCatalog.currentFilename;
                if (endsWith(fn, ".xml")) {
                    fn = fn.substr(0, fn.length - 4);
                }
                if (endsWith(fn.toLowerCase(), ".shp")) {
                    me.local.callApplet("getShapefileMetadata",
                            fn,
                            doIt,
                            B3pCatalog.openSimpleErrorDialog);
                } else if (endsWith(fn.toLowerCase(), ".nc")) {
                    me.synchronizeNetCDF(fn);
                }
                return;
            } else {
                doIt();
            }
        }
    });
}

B3pCatalog.synchronizeNetCDF = function(fn) {
    var mde = $("#mde").data("mde");

    //console.log("synchronizeNetCDFMde");
    log("synchronizeNetCDFMde");

    var viewMode = mde.options.viewMode;
    var currentTab = mde.options.currentTab;
    var isGeo = !mde.options.geoTabsMinimized;


    var gotNCML = function(ncml) {

        $.ajax({
            url: B3pCatalog.metadataUrl,
            data: {
                synchronize: "t",
                path: B3pCatalog.currentFilename,
                mode: B3pCatalog.currentMode,
                metadata: null, // niet meer nodig, staat serverside
                synchronizeData: ncml
            },
            type: "POST",
            async: false,
            dataType: "html",
            success: function(data, textStatus, xhr) {
                //console.log("synchronizeNetCDFXml", data);
                log("synchronizeNetCDFXml", data);
                B3pCatalog.createMdeHtml(data, true, isGeo, viewMode, {currentTab: currentTab});
                B3pCatalog.fadeMessage("NCML ingelezen, exporteer volledige metadata voor <netcdf> XML");
            }
        });
    };

    this.local.callApplet("getNCML",
            fn,
            gotNCML,
            B3pCatalog.openSimpleErrorDialog);
};

B3pCatalog.publishMetadata = function() {
    $.ajax({
        url: B3pCatalog.publishUrl,
        type: "POST",
        async: false,
        data: {
            optionsList: "t"
        },
        success: function(data, textStatus, xhr) {
            B3pCatalog._publishMetadata(data);
        },
        error: function(xhr, ajaxOptions, thrownError) {
            B3pCatalog._publishMetadata("<option value=\"\">default</option>");
        }
    });
};

B3pCatalog._publishMetadata = function(cswOptions) {
    var $form = $("<form />");

    var $chooseTypeDiv = $("<div />", {
        html: "U heeft de volgende keuzes:<ul>"+ 
                "<li>datasets: metadata voor datasets conform Nederlands profiel;</li>"+
                "<li>services: metadata voor services conform Nederlands profiel.</li></ul>"+
                "<p>Kies het type metadata dat u wil publiceren:</p>"
    });
            
    var $typeInput = $("<select />", {
        name: "exportType"
    });

    var option2 = $("<option></option>").attr("value", "datasets");
    option2.text("datasets");
    option2.attr("selected", "selected");
    $typeInput.append(option2);
    var option3 = $("<option></option>").attr("value", "services");
    option3.text("services");
    $typeInput.append(option3);

    var $chooseCswDiv = $("<div />", {
        html: "<p>Kies de CSW server waar naartoe u wil publiceren:</p>"
    });
       
    //TODO cvl via ajax call namen ophalen
    var $cswInput = $("<select />", {
        name: "cswName"
    });
    
    $cswInput.html(cswOptions);

    var $submitEventInput = $("<input type='submit' name='publish' value='Publiceren' class='dialog-submit'/>");

    $form.append($chooseTypeDiv);
    $form.append($typeInput);
    $form.append($chooseCswDiv);
    $form.append($cswInput);
    $form.append($submitEventInput);

    $form.submit(function() {
        log("publish via form submit");
        $.ajax({
            url: B3pCatalog.publishUrl,
            type: "POST",
            data: {
                publish: "t",
                exportType: $typeInput.val(),
            },
            success: function(data, textStatus, xhr) {
                B3pCatalog.fadeMessage("Metadata succesvol gepubliceerd " + (data.exists ? "(update)" : "(nieuw)"));
            },
            error: function(data, textStatus, xhr) {
                B3pCatalog.fadeMessage("Metadata niet gepubliceerd");
            }
        });

        $dialogDiv.dialog("close");
        return false;
    });

    var $dialogDiv = $("<div/>", {
        "class": "ui-mde-textarea-wrapper",
        css: {
            overflow: "hidden"
        }
    });
    
    $dialogDiv.append($form);
    $dialogDiv.appendTo(document.body).dialog({
        title: "Metadata publiceren",
        modal: true,
        width: $("body").calculateDialogWidth(33),
        close: function(event) {
            $(this).dialog("destroy").remove();
        }
    });
};

B3pCatalog.createAdminOrganisationsToolbar = function() {
    var toolbar = $("#toolbar");
    toolbar.empty();

    toolbar.append(
            $("<a />", {
                href: "#",
                id: "saveOrgs",
                text: "Opslaan",
                title: "Organisaties en contactpersonen opslaan",
                click: function(event) {
                    $(this).removeClass("ui-state-hover");
                    B3pCatalog.saveOrganisations();
                    return false;
                }
            }).button({
        icons: {primary: "ui-icon-b3p-save_16 icon-disk"}
    })
            );

    B3pCatalog.resizeTabsAndToolbar();
}

B3pCatalog.createMdeToolbar = function(viewMode) {
    var toolbar = $("#toolbar");
    toolbar.empty();
    
    var simpleMode = $('#edit-doc-root').hasClass('ui-mde-simple');
    if(simpleMode) {
        toolbar.append(
            $("<a />", {
                href: "#",
                id: "exportMD",
                text: "maak metadatabestand",
                title: "Metadatabestand maken",
                click: function(event) {
                    $(this).removeClass("ui-state-hover");
                    B3pCatalog.saveMetadata({async: false});
                    B3pCatalog._doExportMetadata("datasets");
                    return false;
                }
            }).button({
                disabled: false,
                icons: { primary: "ui-icon-b3p-up_16 icon-check" }
            })
        );
        toolbar.appendTo("#bottom-wrapper");
        B3pCatalog.resizeTabsAndToolbar();
        return;
    }
    
    if (viewMode === false) {
        toolbar.append(
                $("<a />", {
                    href: "#",
                    id: "saveMD",
                    text: "Opslaan",
                    title: "Metadatadocument opslaan",
                    click: function(event) {
                        $(this).removeClass("ui-state-hover");
                        B3pCatalog.saveMetadata();
                        return false;
                    }
                }).button({
            disabled: true,
            icons: {primary: "ui-icon-b3p-save_16 icon-disk"}
        })
                );
        toolbar.append(
                $("<a />", {
                    href: "#",
                    id: "resetMD",
                    text: "Legen",
                    title: "Metadatadocument volledig leeg maken. Wordt nog niet opgeslagen.",
                    click: function(event) {
                        $(this).removeClass("ui-state-hover");
                        $.okCancel({
                            text: "Weet u zeker dat u alle metadata en commentaren wilt wissen voor dit document? Dit wordt pas definitief als u op \"Opslaan\" klikt.",
                            ok: function() {
                                B3pCatalog.resetMde();
                            }
                        });
                        return false;
                    }
                }).button({
            disabled: false,
            icons: {primary: "ui-icon-b3p-delete_16 icon-cross"}
        })
                );
        toolbar.append(
                $("<a />", {
                    href: "#",
                    id: "synchronizeMD",
                    text: "Synchroniseren",
                    title: "Metadatadocument synchroniseren met bijbehorend data-document. Wijzigingen in de data, zoals bijvoorbeeld een andere omgrenzende rechthoek, worden doorgevoerd in de metadata.",
                    click: function(event) {
                        $(this).removeClass("ui-state-hover");
                        B3pCatalog.synchronizeWithData();
                        return false;
                    }
                }).button({
            disabled: false,
            icons: {primary: "ui-icon-b3p-sync_16 icon-refresh"}
        })
                );
        toolbar.append(
                $("<a />", {
                    href: "#",
                    id: "importMD",
                    text: "Importeren",
                    title: "Metadatadocument importeren en over huidige metadatadocument heen kopiëren. Wordt nog niet opgeslagen.",
                    click: function(event) {
                        $(this).removeClass("ui-state-hover");
                        B3pCatalog.importMetadata();
                        return false;
                    }
                }).button({
            disabled: false,
            icons: {primary: "ui-icon-b3p-down_16 icon-download"}
        })
                );
    }
    toolbar.append(
            $("<a />", {
                href: "#",
                id: "exportMD",
                text: "Exporteren",
                title: "Metadatadocument exporteren.",
                click: function(event) {
                    $(this).removeClass("ui-state-hover");
                    B3pCatalog.saveDataUserConfirm({
                        done: function() {
                            B3pCatalog.exportMetadata();
                        },
                        text: "Wilt u uw wijzigingen opslaan alvorens de metadata te exporteren?",
                        asyncSave: false // data needs to be saved already when we do our export request
                    });
                    return false;
                }
            }).button({
        disabled: false,
        icons: {primary: "ui-icon-b3p-up_16 icon-upload"}
    })
            );

    if (B3pCatalog.username != null && B3pCatalog.haveCsw) {
        toolbar.append(
                $("<a />", {
                    href: "#",
                    id: "publishMD",
                    text: "Publiceren",
                    title: "Metadatadocument publiceren naar CSW",
                    click: function(event) {
                        $(this).removeClass("ui-state-hover");
                        B3pCatalog.saveDataUserConfirm({
                            done: function() {
                                B3pCatalog.publishMetadata();
                            },
                            text: "Wilt u uw wijzigingen opslaan alvorens de metadata te publiceren?",
                            asyncSave: false // data needs to be saved already when we do our publish request
                        });
                        return false;
                    }
                }).button({
            disabled: false,
            icons: {primary: "ui-icon-b3p-sync_alt_16 icon-publish"}
        })
                );

    } 

    B3pCatalog.resizeTabsAndToolbar();
};

B3pCatalog.resizeTabsAndToolbar = function() {
    $("#page-tabs-and-toolbar").css("left", $("#sidebar").width());
};

B3pCatalog.loadOrganisations = function() {
    B3pCatalog.saveDataUserConfirm({
        done: function() {
            $.ajax({
                url: B3pCatalog.adminUrl,
                data: {
                    loadOrganisations: "t"
                },
                success: function(data) {
                    showTab($("#main-tabs a[href='#admin']"));
                    $("#mde").mde("destroy"); // if it exists
                    document.title = B3pCatalog.title + B3pCatalog.titleSeparator + "Beheer organisaties";
                    B3pCatalog.currentMode = B3pCatalog.modes.ADMIN_MODE;
                    B3pCatalog.createAdminOrganisationsToolbar();
                    $("#center-wrapper").html(data);
                }
            });
        }
    });
};

B3pCatalog.saveOrganisations = function() {
    var orgs = $("#organisationsJSON").val();
    $.ajax({
        url: B3pCatalog.adminUrl,
        data: {
            saveOrganisations: "t",
            organisations: orgs
        },
        type: "POST",
        success: function(data) {
            $.globalEval(orgs);
            //TODO CvL voor beheer, maar klopt niet meer
            B3pCatalog.basicMdeOptions.organisations = organisations;
            B3pCatalog.fadeMessage("Organisaties en contacten succesvol opgeslagen");
        }
    });
};

$(document).ready(function() {
    // Convert 'nice-checkboxes' to nice checkbox
    $('.nice-checkbox').each(function() {
        var checkbox = $(this);
        var checkboxReplace = $('<span class="checkbox icon-checkbox-unchecked"></span>');
        function toggleStyle() {
            if(checkbox[0].checked) {
                checkboxReplace.removeClass('icon-checkbox-unchecked').addClass('icon-checkbox-checked');
            } else {
                checkboxReplace.removeClass('icon-checkbox-checked').addClass('icon-checkbox-unchecked');
            }
        }
        checkboxReplace.click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            checkbox[0].checked = !checkbox[0].checked;
            toggleStyle();
        });
        checkbox.change(function() {
            toggleStyle();
        });
        toggleStyle();
        $(this).hide().after(checkboxReplace);
    });
});

// dialogs:
(function($) {
    $.yesNoCancel = function(opts) {
        var options = $.extend({
            text: "Lege vraag",
            yes: $.noop,
            no: $.noop,
            cancel: $.noop
        }, opts);

        var div = $("<div/>");

        if (options.html) {
            div.html(options.html);
        } else {
            div.text(options.text);
        }
        div.appendTo(document.body).dialog($.extend({
            title: "Vraag",
            modal: true,
            buttons: [{
                    text: "Ja",
                    click: function(event) {
                        options.yes();
                        $(this).dialog("destroy").remove();
                    }
                }, {
                    text: "Nee",
                    click: function(event) {
                        options.no();
                        $(this).dialog("destroy").remove();
                    }
                }, {
                    text: "Annuleren",
                    click: function(event) {
                        $(this).dialog("close"); // close does cancel
                    }
                }],
            close: function(event) {
                options.cancel();
                $(this).dialog("destroy").remove();
            }
        }, options));
    }

    $.okCancel = function(opts) {
        var options = $.extend({
            text: "Lege vraag",
            ok: $.noop,
            cancel: $.noop
        }, opts);
        $("<div/>").text(options.text).appendTo(document.body).dialog($.extend({
            title: "Vraag",
            modal: true,
            buttons: [{
                    text: "OK",
                    click: function(event) {
                        options.ok();
                        $(this).dialog("destroy").remove();
                    }
                }, {
                    text: "Annuleren",
                    click: function(event) {
                        $(this).dialog("close"); // close does cancel
                    }
                }],
            close: function(event) {
                options.cancel();
                $(this).dialog("destroy").remove();
            }
        }, options));
    }

    $.ok = function(opts) {
        var options = $.extend({
            text: "Lege opmerking",
            ok: $.noop
        }, opts);
        $("<div/>").text(options.text).appendTo(document.body).dialog($.extend({
            title: "Opmerking",
            modal: true,
            buttons: [{
                    text: "OK",
                    click: function(event) {
                        $(this).dialog("close"); // close does ok
                    }
                }],
            close: function(event) {
                options.ok();
                $(this).dialog("destroy").remove();
            }
        }, options));
    }

    $.fn.calculateDialogWidth = function(percentageOfElementWidth, minWidth, maxWidth) {
        return calculateDialogSize(percentageOfElementWidth, minWidth, maxWidth, this.width());
    }

    $.fn.calculateDialogHeight = function(percentageOfElementHeight, minHeight, maxHeight) {
        return calculateDialogSize(percentageOfElementHeight, minHeight, maxHeight, this.height());
    }

    function calculateDialogSize(percentage, minSize, maxSize, bodySize) {
        var size = Math.floor(bodySize * percentage / 100.0);
        if (!!minSize) {
            if (size < minSize) {
                if (minSize < bodySize) {
                    size = minSize;
                } else {
                    size = bodySize;
                }
            }
        }
        if (!!maxSize) {
            if (size > maxSize)
                size = maxSize;
        }
        return size;
    }
})(jQuery);

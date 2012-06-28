/*
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Initial Developer of the Original Code is
# Davide Ficano.
# Portions created by the Initial Developer are Copyright (C) 2007
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Davide Ficano <davide.ficano@gmail.com>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/
var moreKomodoFindResults = {
    init : function() {
        //Debugger
        debugger;
        //for (var i = 1; i <= 2; i++) {
            //CH  Added pane to accomodate separation in document to contentDocument
            //var pane = document.getElementById("findresults_tabpanel-toolbarbox");
        var log = ko.logging.getLogger("morekomodo");
        log.setLevel(ko.logging.LOG_DEBUG);

        var stopButton = document.getElementById("findresults-stopsearch-button");
        if (stopButton) {
            stopButton.addEventListener("DOMAttrModified",
                        moreKomodoFindResults.handleRefreshStatus,
                        false);
        }

            // Allow to select items to copy
            //CH  Added pane to accomodate separation in document to contentDocument
            var treeWidget = document.getElementById("findresults-body");
            treeWidget.setAttribute("seltype", "multiple");
            treeWidget.setAttribute("context", "moreKomodofindResultsContext");
        //}
        this.arrFind = [];
        this.findStartedFromUI = true;
        // Contains the last options set into Find dialog
        this.lastUsedFindOptions = {};

        this._findSvc = Components.classes["@activestate.com/koFindService;1"].
               getService(Components.interfaces.koIFindService);

        //top.moreKomodoFindResultsHistory.init();
        window.controllers.appendController(this);
     },

    onRefreshFindResults : function(tabIndex) {
        //Debugger
        debugger;
        this.onRepeatFind(tabIndex, this.arrFind.length - 1);
    },

    onRepeatFind : function(tabIndex, findIndex) {
        //Debugger
        debugger;
        this.findStartedFromUI = false;
        var findInfo = this.removeIndex(this.arrFind, findIndex);
        this.executeFind(tabIndex, findInfo.options, findInfo.context, findInfo.pattern);
    },

    handleRefreshStatus : function(event) {
        //Debugger
        debugger;
        if (event.attrName == "disabled") {
            if (event.newValue == "true") { // attribute is set
                moreKomodoFindResults.onFindFinished(event);
            }
            if (event.newValue == "" && event.prevValue != "") { // attribute is removed
                moreKomodoFindResults.onFindStarted(event);
            }
        }
    },

    onFindStarted : function(event) {
        //Debugger
        debugger;
        var idName = event.target.id.replace("-stopsearch-button", "-morekomodo-refresh");
        var refreshButton = document.getElementById(idName);

        if (refreshButton) {
            refreshButton.setAttribute("disabled", "true");
            moreKomodoFindResults.updateFindInfo(event.target.id);

            if (this.findStartedFromUI) {
                moreKomodoFindResultsUtil.copyFindOptions(this._findSvc.options, this.lastUsedFindOptions);
            } else {
                this.findStartedFromUI = true;
            }
        }
    },

    onFindFinished : function(event) {
        //Debugger
        debugger;
        var idName = event.target.id.replace("-stopsearch-button", "-morekomodo-refresh");
        var refreshButton = document.getElementById(idName);

        if (refreshButton) {
            refreshButton.removeAttribute("disabled");

            // restore to last used settings so find dialog shows them correctly
            // timeOut ensures the description is updated before restoring settings
            window.setTimeout(function() {
                //Debugger
                debugger;
                moreKomodoFindResultsUtil.copyFindOptions(
                    moreKomodoFindResults.lastUsedFindOptions,
                    moreKomodoFindResults._findSvc.options);

                    top.moreKomodoFindResultsHistory.saveHistory(
                                    idName.match("([0-9]+)")[1],
                                    moreKomodoFindResults.lastUsedFindOptions);
                }, 400);
        }
    },

    updateFindInfo : function(id) {
        //Debugger
        debugger;
        var tabIndex = id.match("([0-9]+)");

        if (tabIndex.length > 0) {
            var tab = ko.findresults.getManager(tabIndex[1]);

            var findInfo = {
                    options : {},
                    context: tab.context_,
                    pattern : tab._pattern
                    };
            moreKomodoFindResultsUtil.copyFindOptions(this._findSvc.options, findInfo.options);
            this.pushItem(this.arrFind, findInfo,
                new MoreKomodoPrefs().readMaxRefreshHistoryEntries());
        } else {
            MoreKomodoCommon.log("Unable to find tabIndex for id " + id);
        }
    },
    onOpenFoundFiles : function(tabIndex, useSelectedItems) {
        //Debugger
        debugger;
        var view = ko.findresults.getManager(tabIndex).view;
        var columnId = this.getColumnIdFromType(tabIndex, moreKomodoFindResultsUtil.FILE_PATH);

        moreKomodoFindResultsUtil.openFiles(view, columnId, useSelectedItems);
    },

    onFindBySelection : function(tabIndex) {
        //Debugger
        debugger;
        var view = ko.views.manager.currentView;

        if (!(view
              //CH
              //ref: http://code.activestate.com/lists/komodo-beta/4456/
              //I made a mistake before and used var within the assignment
              && (koDoc = view.document || view.koDoc)
              && (view.getAttribute("type") == "editor"))) {
            return;
        }
        var sel = view.selection;

        if (sel.length == 0) {
            var scimoz = ko.views.manager.currentView.scimoz;
            sel = ko.interpolate.getWordUnderCursor(scimoz);
        }
        if (sel.length) {
            var tab = ko.findresults.getManager(tabIndex);
            var options = this.arrFind[this.arrFind.length - 1].options;
            if (options.patternType == Components.interfaces.koIFindOptions.FOT_REGEX_PYTHON) {
                tab._pattern = convertGlobMetaCharsToRegexpMetaChars(sel);
            } else {
                tab._pattern = sel;
            }
            this.executeFind(tabIndex, options, tab.context_, tab._pattern);
        }
    },

    initRefreshViewMenu : function(event, tabIndex) {
        var menu = event.target;
//Debugger
        debugger;
        alert(moreKomodoFindResults);
         MoreKomodoCommon.log("This is what the menu looks like before the for loops is done: "+menu);
        MoreKomodoCommon.removeMenuItems(menu);
        // Insert from last (most recent used) to first element
        for (var i = this.arrFind.length - 1; i >= 0; i--) {
            this.appendRefreshItem(menu, this.arrFind[i], tabIndex, i);
        }
         MoreKomodoCommon.log("This is what the menu is when the for loops is done: "+menu);
        this.insertExtraMenuItems(menu);

    },

    appendRefreshItem : function(menu, findInfo, tabIndex, findIndex) {
        //Debugger
        debugger;
        var item = document.createElement("menuitem");
        var label = document.getElementById("morekomodo-refresh-tooltip")
                        .createLabelFromPattern(findInfo);

        item["findInfo"] = this.arrFind[findIndex];
        item.setAttribute("id", findIndex);
        item.setAttribute("label", label);
        item.setAttribute("tooltip", "morekomodo-refresh-tooltip");
        item.setAttribute("oncommand",
                          "moreKomodoFindResults.onRepeatFind(%1, %2)"
                            .replace("%1", tabIndex)
                            .replace("%2", findIndex));

        menu.appendChild(item);
    },

    insertExtraMenuItems : function(menu) {
        //Debugger
        debugger;
        MoreKomodoCommon.log("Just jumped into this fuction: insertExtraMenuItems");
        var menuitem = document.getElementById("morekomodo-refresh-static-menupopup")
                        .firstChild;
        while (menuitem) {
            var newItem = menuitem.cloneNode(false);
            var newId = "morekomodo-" + newItem.getAttribute("id");
            newItem.setAttribute("id", newId);
            menu.appendChild(newItem);
            menuitem = menuitem.nextSibling;
        }
    },

    removeAllFindInfo : function(event) {
        //Debugger
        debugger;
        // First element is left in array
        this.arrFind.splice(1, this.arrFind.length - 1);
    },

    pushItem : function(arr, item, maxItems) {
        if (arr.length >= maxItems) {
            arr.splice(0, 1);
        }
        arr.push(item);
    },

    removeIndex : function(arr, index) {
        var item = arr[index];
        arr.splice(index, 1);

        return item;
    },

    executeFind : function(tabIndex, options, context, pattern) {
        //Debugger
        debugger;
        moreKomodoFindResultsUtil.copyFindOptions(options, this._findSvc.options);
        // Ensure output goes on correct tab
        this._findSvc.options.displayInFindResults2 = tabIndex == 2;

        switch (context.type) {
            case Components.interfaces.koIFindContext.FCT_CURRENT_DOC:
            case Components.interfaces.koIFindContext.FCT_SELECTION:
            case Components.interfaces.koIFindContext.FCT_ALL_OPEN_DOCS:
                Find_FindAll(window, context, pattern, null);
                break;
            case Components.interfaces.koIFindContext.FCT_IN_FILES:
            case Components.interfaces.koIFindContext.FCT_IN_COLLECTION:
                Find_FindAllInFiles(window, context, pattern, null);
                break;
            default:
                MoreKomodoCommon.log("Refresh Non supported for type " + context.type);
                break;
        }
    },

    onCopyToViewFindResults : function(tabIndex, copyFileNames, useSelectedItems) {

        //Debugger
        debugger;
        var view = ko.findresults.getManager(tabIndex).view;
        var type = copyFileNames
                        ? moreKomodoFindResultsUtil.FILE_PATH
                        : moreKomodoFindResultsUtil.CONTENT;

        moreKomodoFindResultsUtil.copyResultsToView(
                    view,
                    [this.getColumnIdFromType(tabIndex, type)],
                    copyFileNames,
                    useSelectedItems);
    },

    supportsCommand : function(cmd) {
        switch (cmd) {
            case "cmd_morekomodo_openFoundFiles":
            case "cmd_morekomodo_refreshFindResults":
            case "cmd_morekomodo_copyToViewFileNames":
            case "cmd_morekomodo_copyToViewContents":
            case "cmd_morekomodo_findBySelection":
                return true;
        }
        return false;
    },

    isCommandEnabled : function(cmd) {
        // at startup with no file open manager is null
        var view = ko.views.manager && ko.views.manager.currentView;

        switch (cmd) {
            case "cmd_morekomodo_openFoundFiles":
            case "cmd_morekomodo_refreshFindResults":
            case "cmd_morekomodo_copyToViewFileNames":
            case "cmd_morekomodo_copyToViewContents":
            case "cmd_morekomodo_findBySelection":
                return true;
        }
        return false;
    },

    doCommand : function(cmd) {
        var tabIndex = this.selectedTabManagerIndex;

        if (tabIndex < 0) {
            return;
        }
        switch (cmd) {
            case "cmd_morekomodo_openFoundFiles":
                this.onOpenFoundFiles(tabIndex);
                break;
            case "cmd_morekomodo_refreshFindResults":
                this.onRefreshFindResults(tabIndex);
                break;
            case "cmd_morekomodo_copyToViewFileNames":
                this.onCopyToViewFindResults(tabIndex, true);
                break;
            case "cmd_morekomodo_copyToViewContents":
                this.onCopyToViewFindResults(tabIndex, false);
                break;
            case "cmd_morekomodo_findBySelection":
                this.onFindBySelection(tabIndex);
                break;
        }
    },

    onEvent : function(evt) {
    },

    get selectedTabManagerIndex() {
        //Debugger
        debugger;
        for (var i = 1; i <= 2; i++) {
            var tab = top.document.getElementById("findresults" + i +"_tabpanel");
            if (tab
                && !tab.hasAttribute("collapsed")
                && !tab.hasAttribute("hidden")
                && tab.selected) {
                return i;
            }
            else{
                //Change to MoreKomodoLogs
                MoreKomodoCommon.log(i + " tab could not be found. selectedTabManagerIndex(): line 330, findResults.js");
            }
        }
        return -1;
    },
    getColumnIdFromType : function(tabIndex, resultType) {
        //Debugger
        debugger;
        switch (resultType) {
            case moreKomodoFindResultsUtil.LINE_NUMBER:
                return "findresults-linenum";
                break;
            case moreKomodoFindResultsUtil.FILE_PATH:
                return "findresults-filename";
                break;
            case moreKomodoFindResultsUtil.CONTENT:
                return "findresults-context";
                break;
        }
        return "findresults-context";
    },

    onCopyToViewCustomFindResults : function(tabIndex, useSelectedItems) {
        var self = this;
        moreKomodoFindResultsUtil.onCopyToViewCustomFindResults(
                    ko.findresults.getManager(tabIndex).view,
                    function(resultType) {
                        return self.getColumnIdFromType(tabIndex, resultType);
                    },
                    useSelectedItems);
    }
}

window.addEventListener("load", function(event) { moreKomodoFindResults.init(event); }, false);

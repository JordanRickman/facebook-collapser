// ==UserScript==
// @name         Facebook Post-Collapser
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Collapse items in your Facebook feed to just their title bar.
// @author       Jordan Rickman
// @match        https://*.facebook.com/*
// @grant        GM_addStyle
// Dependencies: jQuery, Underscore
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// ==/UserScript==

(function() {
    'use strict';

    ///// Configuration Constants /////
    const DEBUG = false;                        // Whether to print debug messages to the console - look for occurences of debugLog(...)
    const CSS_PREFIX = 'fbpc_';                 // Prefix for CSS classes and element IDs
    const DEBOUNCE_MS = 500;                    // Number of milliseconds to wait after posts load before collapsing them -
                                                // as you scroll, posts will be visible this long before collapsing, but make this too short and the page can flicker/stutter
                                                // (we "debounce" the listeners to this length so that lots of page changes are handled in a single sweep.)
    // Selectors based on the Facebook page at the time of making this script - these may need to change as Facebook changes itself
    const NEWSFEED_WRAPPER_SELECTOR = '._5pcb'; // Selector for a top-level div of the newsfeed
    const POST_SELECTOR = '._5jmm._5pat';       // Selector for a post or other newsfeed item
    const TITLE_SELECTOR = '._5x46';            // Selector for the titlebar - a sub-element of a newsfeed item

    ///// CSS Rules /////
    GM_addStyle('.'+CSS_PREFIX+'summary { position: relative; margin-top: 10px; background-color: white; border: 1px solid black; padding: 5px; }');
    GM_addStyle('.'+CSS_PREFIX+'expandBtn { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); }');
    GM_addStyle('.'+CSS_PREFIX+'collapseBtnWrapper { margin-top: 10px; }');
    // When a post is collapsed...
    GM_addStyle('.'+CSS_PREFIX+'collapsed { display: none; }'); // Hide the post
    GM_addStyle('.'+CSS_PREFIX+'summary.'+CSS_PREFIX+'collapsed { display: block; }'); // Display the summary
    GM_addStyle('.'+CSS_PREFIX+'collapseBtnWrapper.'+CSS_PREFIX+'collapsed { display: none; }'); // Hide the collapse button
    // When a post is expanded...
    GM_addStyle('.'+CSS_PREFIX+'expanded { display: block; }'); // Display the post
    GM_addStyle('.'+CSS_PREFIX+'summary.'+CSS_PREFIX+'expanded { display: none; }'); // Hide the summary
    GM_addStyle('.'+CSS_PREFIX+'collapseBtnWrapper.'+CSS_PREFIX+'expanded { display: block; }'); // Display the collapse button

    ///// Utility Functions /////
    const debugLog = function(message) {
        if (DEBUG) console.log(message);
    };
    // SUPER ANNOYINGLY, tampermonkey seems to eat uncaught errors, instead of letting them go to the console.
    // This wrapper function catchs and prints all errors - note that it ignores the DEBUG flag, since we always want errors logged
    const printErrors = function(func) {
        return function() {
            try {
                return func();
            } catch (e) {
                console.log(e);
            }
        };
    };

    ///// The Meat of the Code /////

    // Derive IDs for the summary and collapse buttons so that we can find the ones for a specific post
    const postIDtoSummaryID = function(postID) {
        return CSS_PREFIX+'summary_'+postID;
    };
    const postIDtoCollapseButtonID = function(postID) {
        return CSS_PREFIX+'collapseBtn_'+postID;
    };

    // Template for the elements inserted above each post
    const SUMMARY_TEMPLATE = '<div class="'+CSS_PREFIX+'summary">'
                           +   '<!-- The copied titlebar element will go here with jQuery.prepend(...) -->'
                           +   '<button class="'+CSS_PREFIX+'expandBtn">Expand</button>'
                           + '</div>'
                           + '<div class="'+CSS_PREFIX+'collapseBtnWrapper">'
                           +   '<button class="'+CSS_PREFIX+'collapseBtn">Collapse</button>'
                           + '</div>';

    // Click event listeners for expanding and collapsing a post
    const expandPost = function() {
        const postElem = this; // Thanks to the _.bind(...) when we attach this handler
        const postID = postElem.attr('id');
        const summaryElem = $('#'+postIDtoSummaryID(postID));
        const collapseBtnElem = $('#'+postIDtoCollapseButtonID(postID));
        postElem.addClass(CSS_PREFIX+'expanded').removeClass(CSS_PREFIX+'collapsed');
        summaryElem.addClass(CSS_PREFIX+'expanded').removeClass(CSS_PREFIX+'collapsed');
        collapseBtnElem.addClass(CSS_PREFIX+'expanded').removeClass(CSS_PREFIX+'collapsed');
    };
    const collapsePost = function() {
        const postElem = this; // Thanks to the _.bind(...) when we attach this handler
        const postID = postElem.attr('id');
        const summaryElem = $('#'+postIDtoSummaryID(postID));
        const collapseBtnElem = $('#'+postIDtoCollapseButtonID(postID));
        postElem.addClass(CSS_PREFIX+'collapsed').removeClass(CSS_PREFIX+'expanded');
        summaryElem.addClass(CSS_PREFIX+'collapsed').removeClass(CSS_PREFIX+'expanded');
        collapseBtnElem.addClass(CSS_PREFIX+'collapsed').removeClass(CSS_PREFIX+'expanded');
    };

    // Fill in the above template and attach click listeners, returning a jQuery wrapper for the resulting DOM fragment
    const makeSummary = function(postElem, postID) {
        const copiedTitlebar = $(TITLE_SELECTOR, postElem).clone();
        const domToInsert = $(SUMMARY_TEMPLATE);
        const summary = domToInsert.eq(0); //$('.'+CSS_PREFIX+'summary', domToInsert);
        summary.attr('id', postIDtoSummaryID(postID));
        summary.prepend(copiedTitlebar);
        summary.addClass(CSS_PREFIX+'collapsed');
        const expandButton = $('.'+CSS_PREFIX+'expandBtn', summary);
        expandButton.on('click', _.bind(expandPost, postElem));
        const collapseBtnWrapper = domToInsert.eq(1); //$('.'+CSS_PREFIX+'collapseBtnWrapper', domToInsert);
        collapseBtnWrapper.attr('id', postIDtoCollapseButtonID(postID));
        collapseBtnWrapper.addClass(CSS_PREFIX+'collapsed');
        const collapseBtn = $('.'+CSS_PREFIX+'collapseBtn', collapseBtnWrapper);
        collapseBtn.on('click', _.bind(collapsePost, postElem));
        return domToInsert;
    };

    const registeredIDs = [];
    // Collapse a newly rendered post, and register it to avoid processing it twice
    const registerAndCollapseNewPost = function(index, postElem) {
        const post = $(postElem);
        const postID = post.attr('id');
        /*if (_.contains(registeredIDs, postID)) {
            return; // Already collapsed, do nothing
        }*/
        registeredIDs.push(postID);
        post.before(makeSummary(post, postID));
        post.addClass(CSS_PREFIX+'collapsed');
    };

    // Collapse all newly rendered posts
    const collapseAllNewPosts = function() {
        const posts = $(POST_SELECTOR);
        const newPosts = posts.filter(function(index, post) {
            const postID = post.id;
            if (_.contains(registeredIDs, postID)) // Don't re-process already registered posts
                return false;
            const titleBar = $(TITLE_SELECTOR, post);
            // Wait until the the titlebar is there - FB will insert new posts (triggering our observer) before rendering their contents
            return titleBar.length >= 1;
        });
        debugLog(`Collapsing ${newPosts.length} new posts.`);
        newPosts.each(registerAndCollapseNewPost);
    };

    ///// Global Change Listeners /////
    // Fire collapseAllNewPosts 1 second after the page loads...
    $(document).ready(_.debounce(printErrors(collapseAllNewPosts), DEBOUNCE_MS));

    // ... and 1 second after FB finishes loading new posts (during infinite scrolling)
    const newsfeedObserver = new MutationObserver(_.debounce(printErrors(collapseAllNewPosts), DEBOUNCE_MS));
    $(document).ready(function() { // document.ready so that the newsfeed top-level div exists
        // we observe only the newsfeed top-level div in order to reduce unneccesary observer calls
        const newsfeedWrapper = $(NEWSFEED_WRAPPER_SELECTOR);
        newsfeedObserver.observe(newsfeedWrapper.get(0), {
            childList: true,
            subtree: true
        });
    });
})();

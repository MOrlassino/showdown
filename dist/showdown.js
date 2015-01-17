;/*! showdown 16-01-2015 */
(function(){
 'use strict';
/**
 * Created by Tivie on 06-01-2015.
 */

// Private properties
var showdown = {},
    parsers = {},
    globalOptions = {
        omitExtraWLInCodeBlocks: false
    };

///////////////////////////////////////////////////////////////////////////
// Public API
//
/**
 * helper namespace
 * @type {{}}
 */
showdown.helper = {};


///////////////////////////////////////////////////////////////////////////
// API
//

// Public properties
showdown.extensions = {};

//Public methods
showdown.setOption = function (key, value) {
    globalOptions[key] = value;

    return this;
};

/**
 * Static Method
 *
 * subParser(name)       - Get a registered subParser
 * subParser(name, func) - Register a subParser
 * @param {string} name
 * @param {function} [func]
 * @returns {*}
 */
showdown.subParser = function (name, func) {
    if (showdown.helper.isString(name)) {
        if (typeof func !== 'undefined') {
            parsers[name] = func;
        } else {
            if (parsers.hasOwnProperty(name)) {
                return parsers[name];
            } else {
                throw Error('SubParser named ' + name + ' not registered!');
            }
        }
    }
};

/**
 *
 * @param {object} [converterOptions]
 * @returns {{makeHtml: Function}}
 */
showdown.Converter = function (converterOptions) {

    converterOptions = converterOptions || {};

    var options = globalOptions,
        parserOrder = [
            'detab',
            'stripBlankLines',
            //runLanguageExtensions,
            'githubCodeBlocks',
            'hashHTMLBlocks',
            'stripLinkDefinitions',
            'blockGamut',
            'unescapeSpecialChars'
        ];

    // Merge options
    if (typeof converterOptions === 'object') {
        for (var opt in converterOptions) {
            if (converterOptions.hasOwnProperty(opt)) {
                options[opt] = converterOptions[opt];
            }
        }
    }

    var makeHtml = function (text) {

        //check if text is not falsy
        if (!text) {
            return text;
        }

        var globals = {
            gHtmlBlocks: [],
            gUrls: {},
            gTitles: {},
            gListLevel: 0
        };

        // attacklab: Replace ~ with ~T
        // This lets us use tilde as an escape char to avoid md5 hashes
        // The choice of character is arbitrary; anything that isn't
        // magic in Markdown will work.
        text = text.replace(/~/g, '~T');

        // attacklab: Replace $ with ~D
        // RegExp interprets $ as a special character
        // when it's in a replacement string
        text = text.replace(/\$/g, '~D');

        // Standardize line endings
        text = text.replace(/\r\n/g, '\n'); // DOS to Unix
        text = text.replace(/\r/g, '\n'); // Mac to Unix

        // Make sure text begins and ends with a couple of newlines:
        text = '\n\n' + text + '\n\n';

        // Run all registered parsers
        for (var i = 0; i < parserOrder.length; ++i) {
            var name = parserOrder[i];
            text = parsers[name](text, options, globals);
        }

        // attacklab: Restore dollar signs
        text = text.replace(/~D/g, '$$');

        // attacklab: Restore tildes
        text = text.replace(/~T/g, '~');

        // Run output modifiers
        //showdown.forEach(g_output_modifiers, function (x) {
        //    text = _ExecuteExtension(x, text);
        //});

        return text;
    };


    return {
        makeHtml: makeHtml
    };
};

/**
 * Created by Estevao on 11-01-2015.
 */

function isString(a) {
    return (typeof a === 'string' || a instanceof String);
}

function forEach(obj, callback) {
    if (typeof obj.forEach === 'function') {
        obj.forEach(callback);
    } else {
        var i, len = obj.length;
        for (i = 0; i < len; i++) {
            callback(obj[i], i, obj);
        }
    }
}

function isArray(a) {
    return a.constructor === Array;
}

function isUndefined(value) {
    return typeof value === 'undefined';
}

var escapeCharactersCallback = function (wholeMatch, m1) {
    var charCodeToEscape = m1.charCodeAt(0);
    return '~E' + charCodeToEscape + 'E';
};

var escapeCharacters = function (text, charsToEscape, afterBackslash) {
    // First we have to escape the escape characters so that
    // we can build a character class out of them
    var regexString = '([' + charsToEscape.replace(/([\[\]\\])/g, '\\$1') + '])';

    if (afterBackslash) {
        regexString = '\\\\' + regexString;
    }

    var regex = new RegExp(regexString, 'g');
    text = text.replace(regex, escapeCharactersCallback);

    return text;
};

if (!showdown.hasOwnProperty('helper')) {
    showdown.helper = {};
}

/**
 * isString helper function
 * @param a
 * @returns {boolean}
 */
showdown.helper.isString = isString;

/**
 * ForEach helper function
 * @param {*} obj
 * @param callback
 */
showdown.helper.forEach = forEach;

/**
 * isArray helper function
 * @param {*} a
 * @returns {boolean}
 */
showdown.helper.isArray = isArray;

/**
 * Check if value is undefined
 *
 * @static
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
 */
showdown.helper.isUndefined = isUndefined;

/**
 * Callback used to escape characters when passing through String.replace
 * @param {string} wholeMatch
 * @param {string} m1
 * @returns {string}
 */
showdown.helper.escapeCharactersCallback = escapeCharactersCallback;

/**
 * Escape characters in a string
 *
 * @param {string} text
 * @param {string} charsToEscape
 * @param {boolean} afterBackslash
 * @returns {XML|string|void|*}
 */
showdown.helper.escapeCharacters = escapeCharacters;

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * Turn Markdown link shortcuts into XHTML <a> tags.
 */
showdown.subParser('anchors', function (text, config, globals) {
    'use strict';

    var writeAnchorTag = function (wholeMatch, m1, m2, m3, m4, m5, m6, m7) {
        if (showdown.helper.isUndefined(m7)) {
            m7 = '';
        }
        wholeMatch = m1;
        var linkText = m2,
            linkId = m3.toLowerCase(),
            url = m4,
            title = m7;

        if (!url) {
            if (!linkId) {
                // lower-case and turn embedded newlines into spaces
                linkId = linkText.toLowerCase().replace(/ ?\n/g, ' ');
            }
            url = '#' + linkId;

            if (!showdown.helper.isUndefined(globals.gUrls[linkId])) {
                url = globals.gUrls[linkId];
                if (!showdown.helper.isUndefined(globals.gTitles[linkId])) {
                    title = globals.gTitles[linkId];
                }
            }
            else {
                if (wholeMatch.search(/\(\s*\)$/m) > -1) {
                    // Special case for explicit empty url
                    url = '';
                } else {
                    return wholeMatch;
                }
            }
        }

        url = showdown.helper.escapeCharacters(url, '*_');
        var result = '<a href="' + url + '"';

        if (title !== '' && title !== null) {
            title = title.replace(/"/g, '&quot;');
            title = showdown.helper.escapeCharacters(title, '*_');
            result += ' title="' + title + '"';
        }

        result += '>' + linkText + '</a>';

        return result;
    };

    // First, handle reference-style links: [link text] [id]
    /*
     text = text.replace(/
     (							// wrap whole match in $1
     \[
     (
     (?:
     \[[^\]]*\]		// allow brackets nested one level
     |
     [^\[]			// or anything else
     )*
     )
     \]

     [ ]?					// one optional space
     (?:\n[ ]*)?				// one optional newline followed by spaces

     \[
     (.*?)					// id = $3
     \]
     )()()()()					// pad remaining backreferences
     /g,_DoAnchors_callback);
     */
    text = text.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, writeAnchorTag);

    //
    // Next, inline-style links: [link text](url "optional title")
    //

    /*
     text = text.replace(/
     (						// wrap whole match in $1
     \[
     (
     (?:
     \[[^\]]*\]	// allow brackets nested one level
     |
     [^\[\]]			// or anything else
     )
     )
     \]
     \(						// literal paren
     [ \t]*
     ()						// no id, so leave $3 empty
     <?(.*?)>?				// href = $4
     [ \t]*
     (						// $5
     (['"])				// quote char = $6
     (.*?)				// Title = $7
     \6					// matching quote
     [ \t]*				// ignore any spaces/tabs between closing quote and )
     )?						// title is optional
     \)
     )
     /g,writeAnchorTag);
     */
    text = text.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\]\([ \t]*()<?(.*?(?:\(.*?\).*?)?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, writeAnchorTag);

    //
    // Last, handle reference-style shortcuts: [link text]
    // These must come last in case you've also got [link test][1]
    // or [link test](/foo)
    //

    /*
     text = text.replace(/
     (		 					// wrap whole match in $1
     \[
     ([^\[\]]+)				// link text = $2; can't contain '[' or ']'
     \]
     )()()()()()					// pad rest of backreferences
     /g, writeAnchorTag);
     */
    text = text.replace(/(\[([^\[\]]+)\])()()()()()/g, writeAnchorTag);

    return text;


});

/**
 * Created by Estevao on 12-01-2015.
 */

showdown.subParser('autoLinks', function (text) {
    'use strict';

    text = text.replace(/<((https?|ftp|dict):[^'">\s]+)>/gi, "<a href=\"$1\">$1</a>");

    // Email addresses: <address@domain.foo>

    /*
     text = text.replace(/
     <
     (?:mailto:)?
     (
     [-.\w]+
     \@
     [-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+
     )
     >
     /gi, _DoAutoLinks_callback());
     */
    text = text.replace(/<(?:mailto:)?([-.\w]+\@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi,
        function (wholeMatch, m1) {
            var unescapedStr = showdown.subParser('unescapeSpecialChars')(m1);
            return showdown.subParser('encodeEmailAddress')(unescapedStr);
        }
    );

    return text;

});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * These are all the transformations that form block-level
 * tags like paragraphs, headers, and list items.
 */
showdown.subParser('blockGamut', function (text, options, globals) {
    'use strict';

    text = showdown.subParser('headers')(text, options, globals);

    // Do Horizontal Rules:
    var key = showdown.subParser('hashBlock')('<hr />', options, globals);
    text = text.replace(/^[ ]{0,2}([ ]?\*[ ]?){3,}[ \t]*$/gm, key);
    text = text.replace(/^[ ]{0,2}([ ]?\-[ ]?){3,}[ \t]*$/gm, key);
    text = text.replace(/^[ ]{0,2}([ ]?\_[ ]?){3,}[ \t]*$/gm, key);

    text = showdown.subParser('lists')(text, options, globals);
    text = showdown.subParser('codeBlocks')(text, options, globals);
    text = showdown.subParser('blockQuotes')(text, options, globals);

    // We already ran _HashHTMLBlocks() before, in Markdown(), but that
    // was to escape raw HTML in the original Markdown source. This time,
    // we're escaping the markup we've just created, so that we don't wrap
    // <p> tags around block-level tags.
    text = showdown.subParser('hashHTMLBlocks')(text, options, globals);
    text = showdown.subParser('paragraphs')(text, options, globals);

    return text;
});


/**
 * Created by Estevao on 12-01-2015.
 */

showdown.subParser('blockQuotes', function (text, options, globals) {
    'use strict';

    /*
     text = text.replace(/
     (								// Wrap whole match in $1
     (
     ^[ \t]*>[ \t]?			// '>' at the start of a line
     .+\n					// rest of the first line
     (.+\n)*					// subsequent consecutive lines
     \n*						// blanks
     )+
     )
     /gm, function(){...});
     */

    text = text.replace(/((^[ \t]*>[ \t]?.+\n(.+\n)*\n*)+)/gm,
        function (wholeMatch, m1) {
            var bq = m1;

            // attacklab: hack around Konqueror 3.5.4 bug:
            // "----------bug".replace(/^-/g,"") == "bug"
            bq = bq.replace(/^[ \t]*>[ \t]?/gm, '~0'); // trim one level of quoting

            // attacklab: clean up hack
            bq = bq.replace(/~0/g, '');

            bq = bq.replace(/^[ \t]+$/gm, ''); // trim whitespace-only lines
            bq = showdown.subParser('blockGamut')(bq, options, globals); // recurse

            bq = bq.replace(/(^|\n)/g, '$1  ');
            // These leading spaces screw with <pre> content, so we need to fix that:
            bq = bq.replace(
                /(\s*<pre>[^\r]+?<\/pre>)/gm,
                function (wholeMatch, m1) {
                    var pre = m1;
                    // attacklab: hack around Konqueror 3.5.4 bug:
                    pre = pre.replace(/^  /mg, '~0');
                    pre = pre.replace(/~0/g, '');
                    return pre;
                });

            return showdown.subParser('hashBlock')('<blockquote>\n' + bq + '\n</blockquote>', options, globals);
        });
    return text;
});

/**
 * Created by Estevao on 12-01-2015.
 */

/**
 * Process Markdown `<pre><code>` blocks.
 */
showdown.subParser('codeBlocks', function (text, options, globals) {
    'use strict';

    /*
     text = text.replace(text,
     /(?:\n\n|^)
     (								// $1 = the code block -- one or more lines, starting with a space/tab
     (?:
     (?:[ ]{4}|\t)			// Lines must start with a tab or a tab-width of spaces - attacklab: g_tab_width
     .*\n+
     )+
     )
     (\n*[ ]{0,3}[^ \t\n]|(?=~0))	// attacklab: g_tab_width
     /g,function(){...});
     */

    // attacklab: sentinel workarounds for lack of \A and \Z, safari\khtml bug
    text += '~0';

    text = text.replace(/(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=~0))/g,
        function (wholeMatch, m1, m2) {
            var codeblock = m1,
                nextChar = m2;

            codeblock = showdown.subParser('outdent')(codeblock);
            codeblock = showdown.subParser('encodeCode')(codeblock);
            codeblock = showdown.subParser('detab')(codeblock);
            codeblock = codeblock.replace(/^\n+/g, ''); // trim leading newlines
            codeblock = codeblock.replace(/\n+$/g, ''); // trim trailing whitespace

            codeblock = '<pre><code>' + codeblock + '\n</code></pre>';

            return showdown.subParser('hashBlock')(codeblock, options, globals) + nextChar;
        }
    );

    // attacklab: strip sentinel
    text = text.replace(/~0/, '');

    return text;
});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 *
 *   *  Backtick quotes are used for <code></code> spans.
 *
 *   *  You can use multiple backticks as the delimiters if you want to
 *     include literal backticks in the code span. So, this input:
 *
 *         Just type ``foo `bar` baz`` at the prompt.
 *
 *       Will translate to:
 *
 *         <p>Just type <code>foo `bar` baz</code> at the prompt.</p>
 *
 *    There's no arbitrary limit to the number of backticks you
 *    can use as delimters. If you need three consecutive backticks
 *    in your code, use four for delimiters, etc.
 *
 *  *  You can use spaces to get literal backticks at the edges:
 *
 *         ... type `` `bar` `` ...
 *
 *       Turns to:
 *
 *         ... type <code>`bar`</code> ...
 */
showdown.subParser('codeSpans', function (text) {
    'use strict';

    /*
     text = text.replace(/
     (^|[^\\])					// Character before opening ` can't be a backslash
     (`+)						// $2 = Opening run of `
     (							// $3 = The code block
     [^\r]*?
     [^`]					// attacklab: work around lack of lookbehind
     )
     \2							// Matching closer
     (?!`)
     /gm, function(){...});
     */

    text = text.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
        function (wholeMatch, m1, m2, m3) {
            var c = m3;
            c = c.replace(/^([ \t]*)/g, '');	// leading whitespace
            c = c.replace(/[ \t]*$/g, '');	// trailing whitespace
            c = showdown.subParser('encodeCode')(c);
            return m1 + '<code>' + c + '</code>';
        });

    return text;

});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * Convert all tabs to spaces
 */
showdown.subParser('detab', function (text) {
    'use strict';

    // expand first n-1 tabs
    text = text.replace(/\t(?=\t)/g, '    '); // g_tab_width

    // replace the nth with two sentinels
    text = text.replace(/\t/g, '~A~B');

    // use the sentinel to anchor our regex so it doesn't explode
    text = text.replace(/~B(.+?)~A/g,
        function (wholeMatch, m1) {
            var leadingText = m1,
                numSpaces = 4 - leadingText.length % 4;  // g_tab_width

            // there *must* be a better way to do this:
            for (var i = 0; i < numSpaces; i++) {
                leadingText += ' ';
            }

            return leadingText;
        }
    );

    // clean up sentinels
    text = text.replace(/~A/g, '    ');  // g_tab_width
    text = text.replace(/~B/g, '');

    return text;

});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * Smart processing for ampersands and angle brackets that need to be encoded.
 */
showdown.subParser('encodeAmpsAndAngles', function (text) {
    'use strict';
    // Ampersand-encoding based entirely on Nat Irons's Amputator MT plugin:
    // http://bumppo.net/projects/amputator/
    text = text.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, '&amp;');

    // Encode naked <'s
    text = text.replace(/<(?![a-z\/?\$!])/gi, '&lt;');

    return text;
});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * Returns the string, with after processing the following backslash escape sequences.
 *
 * attacklab: The polite way to do this is with the new escapeCharacters() function:
 *
 *    text = escapeCharacters(text,"\\",true);
 *    text = escapeCharacters(text,"`*_{}[]()>#+-.!",true);
 *
 * ...but we're sidestepping its use of the (slow) RegExp constructor
 * as an optimization for Firefox.  This function gets called a LOT.
 */
showdown.subParser('encodeBackslashEscapes', function (text) {
    'use strict';
    text = text.replace(/\\(\\)/g, showdown.helper.escapeCharactersCallback);
    text = text.replace(/\\([`*_{}\[\]()>#+-.!])/g, showdown.helper.escapeCharactersCallback);
    return text;
});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * Encode/escape certain characters inside Markdown code runs.
 * The point is that in code, these characters are literals,
 * and lose their special Markdown meanings.
 */
showdown.subParser('encodeCode', function (text) {
    'use strict';

    // Encode all ampersands; HTML entities are not
    // entities within a Markdown code span.
    text = text.replace(/&/g, '&amp;');

    // Do the angle bracket song and dance:
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');

    // Now, escape characters that are magic in Markdown:
    text = showdown.helper.escapeCharacters(text, '*_{}[]\\', false);

    // jj the line above breaks this:
    //---
    //* Item
    //   1. Subitem
    //            special char: *
    // ---

    return text;

});

/**
 * Created by Estevao on 12-01-2015.
 */


/**
 *  Input: an email address, e.g. "foo@example.com"
 *
 *  Output: the email address as a mailto link, with each character
 *    of the address encoded as either a decimal or hex entity, in
 *    the hopes of foiling most address harvesting spam bots. E.g.:
 *
 *    <a href="&#x6D;&#97;&#105;&#108;&#x74;&#111;:&#102;&#111;&#111;&#64;&#101;
 *       x&#x61;&#109;&#x70;&#108;&#x65;&#x2E;&#99;&#111;&#109;">&#102;&#111;&#111;
 *       &#64;&#101;x&#x61;&#109;&#x70;&#108;&#x65;&#x2E;&#99;&#111;&#109;</a>
 *
 *  Based on a filter by Matthew Wickline, posted to the BBEdit-Talk
 *  mailing list: <http://tinyurl.com/yu7ue>
 *
 */
showdown.subParser('encodeEmailAddress', function (addr) {
    'use strict';

    var encode = [
        function (ch) {
            return '&#' + ch.charCodeAt(0) + ';';
        },
        function (ch) {
            return '&#x' + ch.charCodeAt(0).toString(16) + ';';
        },
        function (ch) {
            return ch;
        }
    ];

    addr = 'mailto:' + addr;

    addr = addr.replace(/./g, function (ch) {
        if (ch === '@') {
            // this *must* be encoded. I insist.
            ch = encode[Math.floor(Math.random() * 2)](ch);
        } else if (ch !== ':') {
            // leave ':' alone (to spot mailto: later)
            var r = Math.random();
            // roughly 10% raw, 45% hex, 45% dec
            ch = (
                r > 0.9 ? encode[2](ch) :
                    r > 0.45 ? encode[1](ch) :
                        encode[0](ch)
            );
        }
        return ch;
    });

    addr = '<a href="' + addr + '">' + addr + '</a>';
    addr = addr.replace(/">.+:/g, '">'); // strip the mailto: from the visible part

    return addr;

});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * Within tags -- meaning between < and > -- encode [\ ` * _] so they
 * don't conflict with their use in Markdown for code, italics and strong.
 */
showdown.subParser('escapeSpecialCharsWithinTagAttributes', function (text) {
    'use strict';

    // Build a regex to find HTML tags and comments.  See Friedl's
    // "Mastering Regular Expressions", 2nd Ed., pp. 200-201.
    var regex = /(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi;

    text = text.replace(regex, function (wholeMatch) {
        var tag = wholeMatch.replace(/(.)<\/?code>(?=.)/g, '$1`');
        tag = showdown.helper.escapeCharacters(tag, '\\`*_');
        return tag;
    });

    return text;
});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * Handle github codeblocks prior to running HashHTML so that
 * HTML contained within the codeblock gets escaped properly
 * Example:
 * ```ruby
 *     def hello_world(x)
 *       puts "Hello, #{x}"
 *     end
 * ```
 */
showdown.subParser('githubCodeBlocks', function (text, options, globals) {
    'use strict';

    text += '~0';

    text = text.replace(/(?:^|\n)```(.*)\n([\s\S]*?)\n```/g,
        function (wholeMatch, m1, m2) {
            var language = m1,
                codeblock = m2,
                end = '\n';

            if (options.omitExtraWLInCodeBlocks) {
                end = '';
            }

            codeblock = showdown.subParser('encodeCode')(codeblock);
            codeblock = showdown.subParser('detab')(codeblock);
            codeblock = codeblock.replace(/^\n+/g, ''); // trim leading newlines
            codeblock = codeblock.replace(/\n+$/g, ''); // trim trailing whitespace

            codeblock = '<pre><code' + (language ? ' class="' + language + '"' : '') + '>' + codeblock + end + '</code></pre>';

            return showdown.subParser('hashBlock')(codeblock, options, globals);
        }
    );

    // attacklab: strip sentinel
    text = text.replace(/~0/, '');

    return text;

});

/**
 * Created by Estevao on 11-01-2015.
 */

showdown.subParser('hashBlock', function (text, options, globals) {
    'use strict';
    text = text.replace(/(^\n+|\n+$)/g, '');
    return '\n\n~K' + (globals.gHtmlBlocks.push(text) - 1) + 'K\n\n';
});

/**
 * Created by Estevao on 11-01-2015.
 */

showdown.subParser('hashElement', function (text, options, globals) {
    'use strict';

    return function (wholeMatch, m1) {
        var blockText = m1;

        // Undo double lines
        blockText = blockText.replace(/\n\n/g, '\n');
        blockText = blockText.replace(/^\n/, '');

        // strip trailing blank lines
        blockText = blockText.replace(/\n+$/g, '');

        // Replace the element text with a marker ("~KxK" where x is its key)
        blockText = '\n\n~K' + (globals.gHtmlBlocks.push(blockText) - 1) + 'K\n\n';

        return blockText;
    };
});

/**
 * Created by Estevao on 11-01-2015.
 */

showdown.subParser('hashHTMLBlocks', function (text, options, globals) {
    'use strict';

    // attacklab: Double up blank lines to reduce lookaround
    text = text.replace(/\n/g, '\n\n');

    // Hashify HTML blocks:
    // We only want to do this for block-level HTML tags, such as headers,
    // lists, and tables. That's because we still want to wrap <p>s around
    // "paragraphs" that are wrapped in non-block-level tags, such as anchors,
    // phrase emphasis, and spans. The list of tags we're looking for is
    // hard-coded:
    //var block_tags_a = 'p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del|style|section|header|footer|nav|article|aside';
    //var block_tags_b = 'p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|style|section|header|footer|nav|article|aside';

    // First, look for nested blocks, e.g.:
    //   <div>
    //     <div>
    //     tags for inner block must be indented.
    //     </div>
    //   </div>
    //
    // The outermost tags must start at the left margin for this to match, and
    // the inner nested divs must be indented.
    // We need to do this before the next, more liberal match, because the next
    // match will start at the first `<div>` and stop at the first `</div>`.

    // attacklab: This regex can be expensive when it fails.
    /*
     var text = text.replace(/
     (						// save in $1
     ^					// start of line  (with /m)
     <($block_tags_a)	// start tag = $2
     \b					// word break
     // attacklab: hack around khtml/pcre bug...
     [^\r]*?\n			// any number of lines, minimally matching
     </\2>				// the matching end tag
     [ \t]*				// trailing spaces/tabs
     (?=\n+)				// followed by a newline
     )						// attacklab: there are sentinel newlines at end of document
     /gm,function(){...}};
     */
    text = text.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del)\b[^\r]*?\n<\/\2>[ \t]*(?=\n+))/gm, showdown.subParser('hashElement')(text, options, globals));

    //
    // Now match more liberally, simply from `\n<tag>` to `</tag>\n`
    //

    /*
     var text = text.replace(/
     (						// save in $1
     ^					// start of line  (with /m)
     <($block_tags_b)	// start tag = $2
     \b					// word break
     // attacklab: hack around khtml/pcre bug...
     [^\r]*?				// any number of lines, minimally matching
     </\2>				// the matching end tag
     [ \t]*				// trailing spaces/tabs
     (?=\n+)				// followed by a newline
     )						// attacklab: there are sentinel newlines at end of document
     /gm,function(){...}};
     */
    text = text.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|style|section|header|footer|nav|article|aside)\b[^\r]*?<\/\2>[ \t]*(?=\n+)\n)/gm, showdown.subParser('hashElement')(text, options, globals));

    // Special case just for <hr />. It was easier to make a special case than
    // to make the other regex more complicated.

    /*
     text = text.replace(/
     (						// save in $1
     \n\n				// Starting after a blank line
     [ ]{0,3}
     (<(hr)				// start tag = $2
     \b					// word break
     ([^<>])*?			//
     \/?>)				// the matching end tag
     [ \t]*
     (?=\n{2,})			// followed by a blank line
     )
     /g,showdown.subParser('hashElement')(text, options, globals));
     */
    text = text.replace(/(\n[ ]{0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g, showdown.subParser('hashElement')(text, options, globals));

    // Special case for standalone HTML comments:

    /*
     text = text.replace(/
     (						// save in $1
     \n\n				// Starting after a blank line
     [ ]{0,3}			// attacklab: g_tab_width - 1
     <!
     (--[^\r]*?--\s*)+
     >
     [ \t]*
     (?=\n{2,})			// followed by a blank line
     )
     /g,showdown.subParser('hashElement')(text, options, globals));
     */
    text = text.replace(/(\n\n[ ]{0,3}<!(--[^\r]*?--\s*)+>[ \t]*(?=\n{2,}))/g, showdown.subParser('hashElement')(text, options, globals));

    // PHP and ASP-style processor instructions (<?...?> and <%...%>)

    /*
     text = text.replace(/
     (?:
     \n\n				// Starting after a blank line
     )
     (						// save in $1
     [ ]{0,3}			// attacklab: g_tab_width - 1
     (?:
     <([?%])			// $2
     [^\r]*?
     \2>
     )
     [ \t]*
     (?=\n{2,})			// followed by a blank line
     )
     /g,showdown.subParser('hashElement')(text, options, globals));
     */
    text = text.replace(/(?:\n\n)([ ]{0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g, showdown.subParser('hashElement')(text, options, globals));

    // attacklab: Undo double lines (see comment at top of this function)
    text = text.replace(/\n\n/g, '\n');
    return text;


});

/**
 * Created by Estevao on 11-01-2015.
 */

showdown.subParser('headers', function (text, options, globals) {
    'use strict';

    // Set text-style headers:
    //	Header 1
    //	========
    //
    //	Header 2
    //	--------
    //
    text = text.replace(/^(.+)[ \t]*\n=+[ \t]*\n+/gm,
        function (wholeMatch, m1) {
            return showdown.subParser('hashBlock')('<h1 id="' + headerId(m1) + '">' +
            showdown.subParser('spanGamut')(m1, options, globals) + '</h1>', options, globals);
        });

    text = text.replace(/^(.+)[ \t]*\n-+[ \t]*\n+/gm,
        function (matchFound, m1) {
            return showdown.subParser('hashBlock')('<h2 id="' + headerId(m1) + '">' +
            showdown.subParser('spanGamut')(m1, options, globals) + '</h2>', options, globals);
        });

    // atx-style headers:
    //  # Header 1
    //  ## Header 2
    //  ## Header 2 with closing hashes ##
    //  ...
    //  ###### Header 6
    //

    /*
     text = text.replace(/
     ^(\#{1,6})				// $1 = string of #'s
     [ \t]*
     (.+?)					// $2 = Header text
     [ \t]*
     \#*						// optional closing #'s (not counted)
     \n+
     /gm, function() {...});
     */

    text = text.replace(/^(\#{1,6})[ \t]*(.+?)[ \t]*\#*\n+/gm,
        function (wholeMatch, m1, m2) {
            var span = showdown.subParser('spanGamut')(m2, options, globals),
                header = '<h' + m1.length + ' id="' + headerId(m2) + '">' + span + '</h' + m1.length + '>';

            return showdown.subParser('hashBlock')(header, options, globals);
        });

    function headerId(m) {
        return m.replace(/[^\w]/g, '').toLowerCase();
    }

    return text;
});

/**
 * Created by Estevao on 11-01-2015.
 */


/**
 * Turn Markdown image shortcuts into <img> tags.
 */
showdown.subParser('images', function (text, options, globals) {
    'use strict';

    var writeImageTag = function (wholeMatch, m1, m2, m3, m4, m5, m6, m7) {

        wholeMatch = m1;
        var altText = m2,
            linkId = m3.toLowerCase(),
            url = m4,
            title = m7,
            gUrls = globals.gUrls,
            gTitles = globals.gTitles;

        if (!title) {
            title = '';
        }

        if (url === '' || url === null) {
            if (linkId === '' || linkId === null) {
                // lower-case and turn embedded newlines into spaces
                linkId = altText.toLowerCase().replace(/ ?\n/g, ' ');
            }
            url = '#' + linkId;

            if (typeof gUrls[linkId] !== 'undefined') {
                url = gUrls[linkId];
                if (typeof gTitles[linkId] !== 'undefined') {
                    title = gTitles[linkId];
                }
            }
            else {
                return wholeMatch;
            }
        }

        altText = altText.replace(/"/g, '&quot;');
        url = showdown.helper.escapeCharacters(url, '*_');
        var result = '<img src="' + url + '" alt="' + altText + '"';

        // attacklab: Markdown.pl adds empty title attributes to images.
        // Replicate this bug.

        //if (title != "") {
        title = title.replace(/"/g, '&quot;');
        title = escapeCharacters(title, '*_');
        result += ' title="' + title + '"';
        //}

        result += ' />';

        return result;
    };


    // First, handle reference-style labeled images: ![alt text][id]
    /*
     text = text.replace(/
     (						// wrap whole match in $1
     !\[
     (.*?)				// alt text = $2
     \]

     [ ]?				// one optional space
     (?:\n[ ]*)?			// one optional newline followed by spaces

     \[
     (.*?)				// id = $3
     \]
     )()()()()				// pad rest of backreferences
     /g,writeImageTag);
     */
    text = text.replace(/(!\[(.*?)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, writeImageTag);

    // Next, handle inline images:  ![alt text](url "optional title")
    // Don't forget: encode * and _
    /*
     text = text.replace(/
     (						// wrap whole match in $1
     !\[
     (.*?)				// alt text = $2
     \]
     \s?					// One optional whitespace character
     \(					// literal paren
     [ \t]*
     ()					// no id, so leave $3 empty
     <?(\S+?)>?			// src url = $4
     [ \t]*
     (					// $5
     (['"])			// quote char = $6
     (.*?)			// title = $7
     \6				// matching quote
     [ \t]*
     )?					// title is optional
     \)
     )
     /g,writeImageTag);
     */
    text = text.replace(/(!\[(.*?)\]\s?\([ \t]*()<?(\S+?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, writeImageTag);

    return text;
});

/**
 * Created by Estevao on 12-01-2015.
 */

showdown.subParser('italicsAndBold', function (text) {
    'use strict';
    // <strong> must go first:
    text = text.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g,
        '<strong>$2</strong>');

    text = text.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g,
        '<em>$2</em>');

    return text;
});

/**
 * Created by Estevao on 12-01-2015.
 */

/**
 * Form HTML ordered (numbered) and unordered (bulleted) lists.
 */
showdown.subParser('lists', function (text, options, globals) {
    'use strict';

    /**
     * Process the contents of a single ordered or unordered list, splitting it
     * into individual list items.
     * @param listStr
     * @returns {string|*}
     */
    var processListItems = function (listStr) {
        // The $g_list_level global keeps track of when we're inside a list.
        // Each time we enter a list, we increment it; when we leave a list,
        // we decrement. If it's zero, we're not in a list anymore.
        //
        // We do this because when we're not inside a list, we want to treat
        // something like this:
        //
        //    I recommend upgrading to version
        //    8. Oops, now this line is treated
        //    as a sub-list.
        //
        // As a single paragraph, despite the fact that the second line starts
        // with a digit-period-space sequence.
        //
        // Whereas when we're inside a list (or sub-list), that line will be
        // treated as the start of a sub-list. What a kludge, huh? This is
        // an aspect of Markdown's syntax that's hard to parse perfectly
        // without resorting to mind-reading. Perhaps the solution is to
        // change the syntax rules such that sub-lists must start with a
        // starting cardinal number; e.g. "1." or "a.".

        globals.gListLevel++;

        // trim trailing blank lines:
        listStr = listStr.replace(/\n{2,}$/, '\n');

        // attacklab: add sentinel to emulate \z
        listStr += '~0';

        /*
         list_str = list_str.replace(/
         (\n)?							// leading line = $1
         (^[ \t]*)						// leading whitespace = $2
         ([*+-]|\d+[.]) [ \t]+			// list marker = $3
         ([^\r]+?						// list item text   = $4
         (\n{1,2}))
         (?= \n* (~0 | \2 ([*+-]|\d+[.]) [ \t]+))
         /gm, function(){...});
         */
        listStr = listStr.replace(/(\n)?(^[ \t]*)([*+-]|\d+[.])[ \t]+([^\r]+?(\n{1,2}))(?=\n*(~0|\2([*+-]|\d+[.])[ \t]+))/gm,
            function (wholeMatch, m1, m2, m3, m4) {
                var item = showdown.subParser('outdent')(m4, options, globals);
                //m1 - LeadingLine

                if (m1 || (item.search(/\n{2,}/) > -1)) {
                    item = showdown.subParser('blockGamut')(item, options, globals);
                } else {
                    // Recursion for sub-lists:
                    item = showdown.subParser('lists')(item, options, globals);
                    item = item.replace(/\n$/, ''); // chomp(item)
                    item = showdown.subParser('spanGamut')(item, options, globals);
                }

                return '<li>' + item + '</li>\n';
            }
        );

        // attacklab: strip sentinel
        listStr = listStr.replace(/~0/g, '');

        globals.gListLevel--;
        return listStr;
    };


    // attacklab: add sentinel to hack around khtml/safari bug:
    // http://bugs.webkit.org/show_bug.cgi?id=11231
    text += '~0';

    // Re-usable pattern to match any entirel ul or ol list:

    /*
     var whole_list = /
     (									// $1 = whole list
     (								// $2
     [ ]{0,3}					// attacklab: g_tab_width - 1
     ([*+-]|\d+[.])				// $3 = first list item marker
     [ \t]+
     )
     [^\r]+?
     (								// $4
     ~0							// sentinel for workaround; should be $
     |
     \n{2,}
     (?=\S)
     (?!							// Negative lookahead for another list item marker
     [ \t]*
     (?:[*+-]|\d+[.])[ \t]+
     )
     )
     )/g
     */
    var wholeList = /^(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm;

    if (globals.gListLevel) {
        text = text.replace(wholeList, function (wholeMatch, m1, m2) {
            var list = m1,
                listType = (m2.search(/[*+-]/g) > -1) ? 'ul' : 'ol';

            // Turn double returns into triple returns, so that we can make a
            // paragraph for the last item in a list, if necessary:
            list = list.replace(/\n{2,}/g, '\n\n\n');

            var result = processListItems(list);

            // Trim any trailing whitespace, to put the closing `</$list_type>`
            // up on the preceding line, to get it past the current stupid
            // HTML block parser. This is a hack to work around the terrible
            // hack that is the HTML block parser.
            result = result.replace(/\s+$/, '');
            result = '<' + listType + '>' + result + '</' + listType + '>\n';
            return result;
        });
    } else {
        wholeList = /(\n\n|^\n?)(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/g;

        text = text.replace(wholeList, function(wholeMatch,m1,m2,m3) {

                // Turn double returns into triple returns, so that we can make a
                // paragraph for the last item in a list, if necessary:
            var list = m2.replace(/\n{2,}/g, '\n\n\n'),
                listType = (m3.search(/[*+-]/g) > -1) ? 'ul' : 'ol',
                result = processListItems(list);

            return m1 + '<' + listType + '>\n' + result + '</' + listType + '>\n';
        });
    }

    // attacklab: strip sentinel
    text = text.replace(/~0/, '');

    return text;
});

/**
 * Created by Estevao on 12-01-2015.
 */

/**
 * Remove one level of line-leading tabs or spaces
 */
showdown.subParser('outdent', function (text) {
    'use strict';

    // attacklab: hack around Konqueror 3.5.4 bug:
    // "----------bug".replace(/^-/g,"") == "bug"
    text = text.replace(/^(\t|[ ]{1,4})/gm, '~0'); // attacklab: g_tab_width

    // attacklab: clean up hack
    text = text.replace(/~0/g, '');

    return text;
});

/**
 * Created by Estevao on 12-01-2015.
 */

/**
 *
 */
showdown.subParser('paragraphs', function (text, options, globals) {
    'use strict';

    // Strip leading and trailing lines:
    text = text.replace(/^\n+/g, '');
    text = text.replace(/\n+$/g, '');

    var grafs = text.split(/\n{2,}/g),
        grafsOut = [];

    /** Wrap <p> tags. */
    var end = grafs.length;
    for (var i = 0; i < end; i++) {
        var str = grafs[i];

        // if this is an HTML marker, copy it
        if (str.search(/~K(\d+)K/g) >= 0) {
            grafsOut.push(str);
        }
        else if (str.search(/\S/) >= 0) {
            str = showdown.subParser('spanGamut')(str, options, globals);
            str = str.replace(/^([ \t]*)/g, '<p>');
            str += '</p>';
            grafsOut.push(str);
        }
    }

    /** Unhashify HTML blocks */
    end = grafsOut.length;
    for (i = 0; i < end; i++) {
        // if this is a marker for an html block...
        while (grafsOut[i].search(/~K(\d+)K/) >= 0) {
            var blockText = globals.gHtmlBlocks[RegExp.$1];
            blockText = blockText.replace(/\$/g, '$$$$'); // Escape any dollar signs
            grafsOut[i] = grafsOut[i].replace(/~K\d+K/, blockText);
        }
    }

    return grafsOut.join('\n\n');
});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * These are all the transformations that occur *within* block-level
 * tags like paragraphs, headers, and list items.
 */
showdown.subParser('spanGamut', function (text, options, globals) {
    'use strict';


    text = showdown.subParser('codeSpans')(text, options, globals);
    text = showdown.subParser('escapeSpecialCharsWithinTagAttributes')(text, options, globals);
    text = showdown.subParser('encodeBackslashEscapes')(text, options, globals);

    // Process anchor and image tags. Images must come first,
    // because ![foo][f] looks like an anchor.
    text = showdown.subParser('images')(text, options, globals);
    text = showdown.subParser('anchors')(text, options, globals);

    // Make links out of things like `<http://example.com/>`
    // Must come after _DoAnchors(), because you can use < and >
    // delimiters in inline links like [this](<url>).
    text = showdown.subParser('autoLinks')(text, options, globals);
    text = showdown.subParser('encodeAmpsAndAngles')(text, options, globals);
    text = showdown.subParser('italicsAndBold')(text, options, globals);

    // Do hard breaks:
    text = text.replace(/  +\n/g, ' <br />\n');

    return text;

});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * Strip any lines consisting only of spaces and tabs.
 * This makes subsequent regexs easier to write, because we can
 * match consecutive blank lines with /\n+/ instead of something
 * contorted like /[ \t]*\n+/
 */
showdown.subParser('stripBlankLines', function (text) {
    'use strict';
    return text.replace(/^[ \t]+$/mg, '');
});

/**
 * Created by Estevao on 11-01-2015.
 */

/**
 * Strips link definitions from text, stores the URLs and titles in
 * hash references.
 * Link defs are in the form: ^[id]: url "optional title"
 *
 * ^[ ]{0,3}\[(.+)\]: // id = $1  attacklab: g_tab_width - 1
 * [ \t]*
 * \n?                  // maybe *one* newline
 * [ \t]*
 * <?(\S+?)>?          // url = $2
 * [ \t]*
 * \n?                // maybe one newline
 * [ \t]*
 * (?:
 * (\n*)              // any lines skipped = $3 attacklab: lookbehind removed
 * ["(]
 * (.+?)              // title = $4
 * [")]
 * [ \t]*
 * )?                 // title is optional
 * (?:\n+|$)
 * /gm,
 * function(){...});
 *
 */
showdown.subParser('stripLinkDefinitions', function (text, options, globals) {
    'use strict';

    // attacklab: sentinel workarounds for lack of \A and \Z, safari\khtml bug
    text += '~0';

    text = text.replace(/^[ ]{0,3}\[(.+)]:[ \t]*\n?[ \t]*<?(\S+?)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+?)[")][ \t]*)?(?:\n+|(?=~0))/gm,
        function (wholeMatch, m1, m2, m3, m4) {
            m1 = m1.toLowerCase();
            globals.gUrls[m1] = showdown.subParser('encodeAmpsAndAngles')(m2);  // Link IDs are case-insensitive
            if (m3) {
                // Oops, found blank lines, so it's not a title.
                // Put back the parenthetical statement we stole.
                return m3 + m4;
            } else if (m4) {
                globals.gTitles[m1] = m4.replace(/"/g, '&quot;');
            }

            // Completely remove the definition from the text
            return '';
        }
    );

    // attacklab: strip sentinel
    text = text.replace(/~0/, '');

    return text;
});

/**
 * Created by Estevao on 12-01-2015.
 */

/**
 * Swap back in all the special characters we've hidden.
 */
showdown.subParser('unescapeSpecialChars', function (text) {
    'use strict';

    text = text.replace(/~E(\d+)E/g,
        function (wholeMatch, m1) {
            var charCodeToReplace = parseInt(m1);
            return String.fromCharCode(charCodeToReplace);
        }
    );
    return text;
});

/**
 * Created by Estevao on 15-01-2015.
 */

var root = this;

// CommonJS/nodeJS Loader
if (typeof module !== 'undefined' && module.exports) {
    module.exports = showdown;
}
// AMD Loader
else if (typeof define === 'function' && define.amd) {
    define('showdown', function () {
        return showdown;
    });
}
// Regular Browser loader
else {
    root.showdown = showdown;
}
}).call(this)
//# sourceMappingURL=showdown.js.map
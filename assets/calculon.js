
jQuery(function($) {

    // ========================================================================
    //   Db Class
    // ========================================================================

    var Db= function() {
        var db = google.gears.factory.create('beta.database');
        db.open('pvd');
        db.execute('CREATE TABLE IF NOT EXISTS user_data ('
            + '  user_id INTEGER PRIMARY KEY, name TEXT'
            + ')');
        db.execute('CREATE TABLE IF NOT EXISTS q ('
            + '  qid TEXT PRIMARY KEY'
            + ')');
        db.execute('CREATE TABLE IF NOT EXISTS solved ('
            + '  user_id INTEGER, qid TEXT'
            + ')');

        // Make DB repair by creating new view
        // Have to use a catch clause until I'm online...
        try {
            db.execute('DROP VIEW user');
        }
        catch(e) {}

        // The DISTINCT thingy 'solved_d' is somewhat stupid, but it fixes a bug in a previous version, where multiple
        // identical entries in the solved table could occur.
        db.execute('CREATE VIEW user AS'
            + '  SELECT *, (SELECT COUNT(*) FROM ('
            + '      SELECT DISTINCT qid, user_id FROM solved'
            + '    ) AS solved_d WHERE solved_d.user_id = user_data.user_id'
            + '  ) AS solved_count FROM user_data'
            + '');

        var arguments2array= function(args, skip) {
            skip= skip ? skip : 0;
            if (args.length > skip && $.isArray(args[skip])) return args[skip];
            var result= [];
            for (var i= skip; i < args.length; i++) {
                result.push(args[i]);
            }
            return result;
        };

        var execute= function() {
            return db.execute.apply(db, [ arguments[0], arguments2array(arguments, 1) ]);
        };

        var fetch= function() {
            var rs = execute.apply(this, arguments);
            var result= [];
            while (rs.isValidRow()) {
                var row= {};
                for (var i= rs.fieldCount() - 1; i >= 0; i--) {
                    row[rs.fieldName(i)]= rs.field(i);
                }
                result.push(row);
                rs.next();
            }
            rs.close();
            return result;
        };

        var fetchOne= function() {
            var result= fetch.apply(this, arguments);
            return result.length ? result[0] : null;
        };

        if (!fetchOne("SELECT COUNT(*) AS c FROM q").c) {
            console.log("Building Q cache");
            for (var qid in quiz) {
                execute("INSERT INTO q (qid) VALUES(?)", qid);
            }
        }

        // Clean up "solved" table in case questions changed
        db.execute('DELETE FROM solved WHERE qid NOT IN ('
            + '  SELECT qid FROM q'
            + ')');

        // Public methods
        this.fetch= fetch;
        this.fetchOne= fetchOne;
        this.execute= execute;
    };

    // ========================================================================
    //   Users class
    // ========================================================================

    var Users= function(db, qs) {
        var game;

        var getByName= function(name) {
            return db.fetchOne('SELECT * FROM user WHERE name = ?', name);
        };

        var getById= function(id) {
            return db.fetchOne('SELECT * FROM user WHERE user_id = ?', id);
        };

        var add= function(name) {
            db.execute('INSERT INTO user_data (name) VALUES (?)', name);
        };

        var remove= function(userId) {
            db.execute('DELETE FROM user_data WHERE user_id = ?', userId);
            db.execute('DELETE FROM solved WHERE user_id = ?', userId);
        };

        var getAll= function() {
            return db.fetch('SELECT * FROM user ORDER BY name');
        };

        var setGame= function(game_) {
            game= game_;
            updateList();
        };

        var getUnsolvedQids= function(userIds) {
            var in_= userIds.join(',').replace(/\d+/g, '?');
            var result= db.fetch('SELECT * FROM q WHERE (qid NOT IN (SELECT qid FROM solved WHERE user_id IN (' + in_ + ')))', userIds);
            var qids= [];
            for (var i in result) qids.push(result[i].qid);
            return qids;
        };

        var setSolved= function(user_id, qid) {
            if (db.fetchOne('SELECT EXISTS(SELECT * FROM solved WHERE user_id = ? AND qid = ?) AS e', user_id, qid).e) {
                console.warn("Catched bug, already marked as 'solved' for user");
                return;
            }
            db.execute('INSERT INTO solved (user_id, qid) VALUES (?, ?)', user_id, qid);
        };

        var updateList= function() {
            var users= getAll();
            var html= [];            
            var players= game ? game.getPlayers() : {};
            html.push('<tr>',
                '<th>Spielt mit?</th>',
                '<th>Name</th>',
                '<th>Gel&ouml;st</td>',
                '<th>%</td>',
                '<th></td>',
                '</tr>');
            for (var user_i in users) {
                var user= users[user_i];
                var cb_id= 'user' + user.user_id + '_plays';
                var cb_attr= '';
                var a_class= '';
                var tr_class= '';
                if (game) {
                    if (!players[user.user_id]) continue;
                    cb_attr=  ' disabled="true" checked="true"';
                    a_class=  ' disabled';
                    tr_class= 'hilight';
                }
                html.push('<tr class="' + tr_class + '">',
                    '<td class="checkbox-inside"><input type="checkbox" id="' + cb_id + '"' + cb_attr + ' /></td>',
                    '<td>', user.name, '</td>',
                    '<td>', user.solved_count, '</td>',
                    '<td>', Math.floor(1000 * user.solved_count / qs.getCount()) / 10, '%</td>',
                    '<td><a class="button' + a_class + '" href="#user_remove:id=', user.user_id, ':kcount=', user.solved_count, '">L&ouml;schen</a></td>',
                    '</tr>');
            }
            $('#users').html('<table class="std">' + html.join('') + '</table>');
        };

        updateList();

        // Public methods
        this.getByName= getByName;
        this.getById= getById;
        this.getAll= getAll;
        this.add= add;
        this.remove= remove;
        this.updateList= updateList;
        this.setGame= setGame;
        this.getUnsolvedQids= getUnsolvedQids;
        this.setSolved= setSolved;
    };

    // ========================================================================
    //   DOM Event handlers
    // ========================================================================

    var cmds= {};

    // Taken from Rabak
    // Dispatches clicks to functions defined in cmds[]
    $('a').live('click', function() {
        console.log("Clicked:", $(this).attr('href'));

        if ($(this).hasClass('disabled')) return;
        var href= $(this).attr('href');

        // Not an internal link, pass on to browser
        if (href.substr(0, 1) != '#') return true;

        var paramsl= href.substr(1).split(/[:=]/);
        var cmd= paramsl.shift();
        var cmdFn= cmds[cmd];
        if (!cmdFn) {
            console.error('Command "' + cmd + '" not defined');
            return false;
        }

        var params= {};
        while (paramsl.length) {
            var key= paramsl.shift();
            params[key]= paramsl.shift();
        }

        return cmdFn(params);
    });

/*
    $('.checkbox-inside').live('click', function(ev) {
        if (ev.target.tagName == 'INPUT') return true;
        $('input[type=checkbox]', this).click();
        return false;
    });

    $('.link-inside').live('click', function(ev) {
        if (ev.target.tagName == 'A') return true;
        $('a', this).click();
        return false;
    });
*/

    // ========================================================================
    //   Global functions
    // ========================================================================

    var error= function(message) {

        // TODO: yuck, alerts! make pretty
        alert(message
            .replace(/&szlig;/, 'ss')
            .replace(/&([aouAOU])uml;/g, function(match, sub1) { return sub1 + 'e'; })
            + "!");
    };

    var showPage= function(name) {
        $('body').removeClass('show-overview').removeClass('show-quiz')
            .addClass('show-' + name);
    };

    // ========================================================================
    //   Click Events
    // ========================================================================

    cmds.quiz_start= function(params) {
        var userlist= users.getAll();
        if (userlist.length == 0) {
            error("Bitte erst Spieler anlegen");
            return;
        }
        var playerIds= [];
        for (var i in userlist) {
            var user= userlist[i];
            if ($('#user' + user.user_id + '_plays').attr('checked')) playerIds.push(user.user_id);
        }
        if (playerIds.length == 0) {
            error("Bitte erst Mitspieler ausw&auml;hlen");
            return;
        }
        startGame(playerIds);
    };

    // ========================================================================
    //   Sheet
    // ========================================================================

    var expressionCompiler= function(expr) {

console.log("COMPILING: ", expr);

        var assign;

        // Add a '.' prefix, because JS RegExs don't support look-behind. And convert to String.
        var tokens= ('\t' + expr)

            // Capture assignment
            .replace(/^\t([A-Za-z][A-Za-z0-9_]*)\s*=/, function (str, p1, p2) { assign= p1; return '\t'; })

            // Replace var='Text by var="Text"
            .replace(/^\t\s*'([^']*)$/, '"$1"')

            // Split into Tokens and join with Tab-Char (most likely unused in the string)
            .split(/([^A-Za-z_0-9\.])/).join("\t") 

            // Re-join String-Konstants
            .replace(/(\"[^\"]+\")/g, function (str, p1) { return p1.replace(/\t/g, ''); })           // " mc
            .replace(/(\'[^\']+\')/g, function (str, p1) { return p1.replace(/\t/g, ''); })           // ' mc

            // Re-join Numbers
            .replace(/([^+-]\t)((?:[+-]\t)?\d+(?:[.]\d+)?(?:[eE](?:\t[+-]\t)?\d+)?)/g, function (str, p1, p2) { return p1 + p2.replace(/\t/g, ''); })

            // Remove white space
            .replace(/[ ]+\t/g, '')

            // Remove delimiter at the start and end of the string
            .replace(/^\t+|\t+$/g, '')

            // Make array
            .split(/\t+/)

            // Spice up tokens
            .map(function (str) {
                if ( str.match(/^\d/) ) return [ 1, str ];
                if ( str.match(/^[A-Za-z]\d+$/) ) return [ 5, str ];
                if ( str.match(/^[A-Za-z]/) ) return [ 2, str ];
                if ( str === '(' ) return [ 3, str ];
                if ( str === ')' ) return [ 4, str ];
                if ( str === ':' ) return [ 6, str ];
                return [ 0, str ];
            })
        ;

        // Add dummy for end
        // (Do this extra because bug in JS spec: push returns length of array instead of array)
        tokens.push([ -1, '' ])

        var deps= [];
        var paras= 0;
        var stack= [ -1 ];
        var error;
        var code= [];
        var refDep;
        while ( tokens.length && !error ) {

            var token= tokens.shift();
            if ( token[0] < 0 ) break;

            var tokenCode= token[1];
            var nextToken= tokens[0];

            switch (token[0]) {
                case 6:
                        if ( stack[0] !== 3 ) {
                            error= ": but no ref preceding";
                            break;
                        }
                        stack.shift();
                        if ( nextToken[0] !== 2 && nextToken[0] != 5 ) {
                            error= ": but no ref following";
                            break;
                        }
                        token= tokens.shift();
                        tokenCode= '"' + token[1] + '")';
                        deps.push([ refDep, token[1] ]);
                        break;

                case 2:
                case 5:
                        if ( nextToken[0] === 3 ) {
                            tokenCode= 'Sandbox.fetch("' + token[1] + '",[';
                            stack.unshift(1);
                            deps.push([ token[1] ]);
                        }
                        else if ( nextToken[0] === 6 ) {
                            tokenCode= 'Sandbox.ref("' + token[1] + '",';
                            refDep= token[1];
                            stack.unshift(3);
                        }
                        else {
                            tokenCode= (token[0] === 2 ? 'Sandbox.fetch' : 'Sandbox.ref')
                                + '("' + token[1] + '")';
                            deps.push([ token[1] ]);
                        }
                        break;

                case 3:
                        stack.unshift(2);
                        if ( stack[1] === 1 ) {
                            tokenCode= '';
                        }
                        paras++;
                        break;

                case 4:
                        if ( paras === 0 ) {
                            error= "( < 0";
                            break;
                        }
                        if ( stack[0] !== 2 ) {
                            error= ") but no (";
                            break;
                        }
                        stack.shift();
                        if ( stack[0] === 1 ) {
                            stack.shift();
                            tokenCode= '])';
                        }
                        paras--;
                        break;
            }

            code.push(tokenCode);
        }

        code= code.join('');

        if ( !error ) {

            var Sandbox= {
                fetch: function() {},
                ref: function() {},
            };

            try {
                eval(code);
            }
            catch (e) {
                error= e.name + ': ' + e.message;
            }
        }

        if ( error ) {
            console.error(error);
            return {
                error: error
            };
        }

        return {
            error: null,
            code: code,
            deps: deps,
        }

console.log("deps=", deps, "assign=", assign, "tokens=", tokens, "expr=", expr);


    };

    var Cell= function(valStr) {

        var compiled;
        var execStr;

        var _compile= function () {
            compiled= expressionCompiler(valStr);
            if ( compiled.error ) {
                execStr= '<span style="color:red">' + compiled.error + '</span>';
            }
            else {
                execStr= compiled.code;
            }
        };

        var getValue= function () {
            if ( !compiled ) _compile();
            return valStr + '<br>' + execStr;
        };

        this.getValue= getValue;
    };

// FIXME: Extract Regular expressions
//    Cell._re= {
//    };

    /**
     *  get(sheeti, index)
     *  get(sheeti, row, col)
     */
    Cell.getValue= function(sheeti, row, col) {
        var index= (typeof col === 'undefined') ? row : row + col * 100000;
        var data= doc.sheets[sheeti].data[index];
        if ( !data ) return '';

        if ( !data.cell ) data.cell= new Cell(data.value);

        return data.cell.getValue();
    };

    var Sheet= function() {

        // FIXME: un-hardcode
        var $sheet= $('#sheet');
        var sheeti= 0;
        var cols= 30;
        var rows= 20;

        var cellHtml= function(row, col) {
            return Cell.getValue(sheeti, row, col);

            var index= row + col * 100000;
            var data= doc.sheets[0].data[index];
            if ( !data ) return '';

            return data.value;
        };

        var tableHtml= function() {
            var html= [];

            html.push('<table><tbody>');
            for ( var row= 0; row < rows; row++ ) {
                html.push('<tr>');
                for ( var col= 0; col < cols; col++ ) {
                    html.push('<td>', cellHtml(row, col), '</td>');
                }
                html.push('</tr>')
            }
            html.push('</tbody></table>');
            return html.join('');
        };

        var sheetHtml= function() {
            var html= [];

            html.push('<div class="sheet">');
            html.push(tableHtml());
            html.push('</div>');

            return html.join('');
        };

        $sheet.html(sheetHtml());
    }

    // ========================================================================
    //   MAIN
    // ========================================================================

    var db= new Db();

    // var qs= new Qs();
    // var users= new Users(db, qs);
    // var game;

    // $('.quiz-count').html(qs.getCount());

    // $(document).bind('keydown', 'space', cmds.q_skip);


    var sheet= new Sheet();


});

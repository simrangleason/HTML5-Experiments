function Dictionary(name) {
    this.name = name;
    this.dnode = new DNode('');
    this.num_words = 0;
    this.duplicates = 0;
}

Dictionary.FAIL = -1;
Dictionary.IS_PREFIX = 1;
Dictionary.IS_WORD = 2;
var all_letters = split("abcdefghijklmnopqrstuvwxyz");
var NO_NODE = -1;

Dictionary.prototype.add_words = function(wordlist) {
    for(var i=0; i < wordlist.length; i++) {
        this.add_word(wordlist[i]);
    }
}
Dictionary.prototype.add_word = function(word) {
    var chars = split(word);
    var is_unique = this.dnode.add_word(chars, 0);  // todo: check for duplicate in the add_words method?
    if (is_unique) {
        this.num_words++;
    } else {
        this.duplicates++;
    }
}

Dictionary.prototype.all_words = function() {
    var all_the_words = [];
    all_the_words = this.dnode.all_words(all_the_words, '', 0, []);
    return all_the_words;
}

// fake it until we get it right.    
function split(str) {
    chars = [];
    for(var i=0; i < str.length; i++) {
        chars.push(str.charAt(i));
    }
    //console.log("split(" + str + ") => [" + chars + "]");
    return chars;
}
    

Dictionary.prototype.test_word = function(word) {
    var chars = split(word);
    return this.dnode.test_chars(chars, 0, chars.length);
}

Dictionary.prototype.test_chars = function(chars, upto_index) {
    return this.dnode.test_chars(chars, 0, upto_index);
}

Dictionary.prototype.to_json = function() {
  var strs = [];
  strs.push("var dictionary_json = {");
  this.dnode.dump_json(strs);
  strs.push("};");
  return strs.join("\n");
}

function append(l, elt) {
    var copyl = copy_array(l);
    copyl.push(elt);
    return copyl;
}
function copy_array(l) {
    var copy = new Array();
    for(var i=0; i < l.length; i++) {
        copy[i] = l[i];
    }
    return copy;
}

Dictionary.prototype.pretty_print = function() {
    var lines = ["Dictionary: \"" + this.name + "\"",
                 this.num_words + " words"];
    lines = this.dnode.pretty_print(lines, '', 0, []);
    console.log("pretty printed.#lines: " + lines.length )
    //console.log("lines: {" + lines + "}");
    console.log(lines.join('\n'));
}

function DNode(ch) {
    this.letter = ch; // Note: we don't strictly need this here.
                      // well, we won't after we sort & enumerate the letter_branches
    this.is_word = false;
    this.num_letter_branches = 0;
    this.letter_branches = [];
    for(var i = 0; i < all_letters.length; i++) {
        this.letter_branches[all_letters[i]] = NO_NODE;
    }
}

DNode.prototype.is_prefix = function() {
    return this.num_letter_branches > 0;
}
    
DNode.prototype.add_word = function(chars, index) {
    //console.log("DN.Add_word(" + chars + " index: " + index + " chars.length: " + chars.length);
    if (index == chars.length) {
        if (this.is_word) {
            //console.log("  DUPLICATE!!!");
            return false; // found duplicate
        } else {
            this.is_word = true;
            return true;  // added
        }
    }
    var ch = chars[index];
    // note (TODO): throw-out non-letter chars; move everything to lowercase. 
    var ch_node = this.letter_branches[ch];
    if (!ch_node) {
        console.log("  got null ch_node. chars: [" + chars + "] + index: " + index + " ch: " + ch);
    }
    if (!ch_node || ch_node == NO_NODE) {
        ch_node = new DNode(ch);
        this.letter_branches[ch] = ch_node;
        this.num_letter_branches++;
    }
    return ch_node.add_word(chars, index+1)
}

//
//  test the chars up to (but not including) upto_index (i.e. pass in the
//  length of the chars array to test the whole array. 
//   we know the chars are good (at least a prefix) from 0 to index,
//    
DNode.prototype.test_chars = function(chars, index, upto_index) {
    //console.log("DNode.test_chars(" + chars + ", " + index + ") upto: " + upto_index);
    if (index == upto_index) {
        // aha! it is a word, but it isn't in the graph..
        //console.log(" DNODE. reached upto_index. this.is_word: " + this.is_word + " is_prefix: " + (this.num_letter_branches > 0));
        if (this.is_word) {
            return Dictionary.IS_WORD;
        } else if (this.num_letter_branches > 0) {
            /*
              console.log("is prefix. ");
              var plines = []
              this.pretty_print(plines, '', 0, []);
              console.log("  pretty: " + plines.join('\n'));
            */
            return Dictionary.IS_PREFIX;
        } else {
            return Dictionary.FAIL;
        }
    } else {
        var ch = chars[index];
        var ch_node = this.letter_branches[ch];
        //console.log("   DNODE. letter_branch[" + ch + "] : " + ch_node);
        if (ch_node && ch_node != NO_NODE) {
            return ch_node.test_chars(chars, index+1, upto_index);
        } else {
            return Dictionary.FAIL;
        }
    }
}

DNode.prototype.test_solution = function(solution_list, index) {
    if (solution_list.length == index) {
        if (this.is_word) {
            return Dictionary.IS_WORD;
        } else if (this.num_letter_branches > 0) {
            return Dictionary.IS_PREFIX;
        } else {
            return Dictionary.FAIL;
        }
    } else {
        var solution_elt = solution_list[index];
        var node = solution_elt[0];
        var ch = node.letter;
        var ch_node = this.letter_branches[ch];
        if (ch_node != NO_NODE) {
            return ch_node.test_chars(chars, index+1, solution.length);
        } else {
            return Dictionary.FAIL;
        }
    }
}

var words_column = 45;   
 
DNode.prototype.pretty_print = function(lines, letter, level, chars_to_here) {
    console.log("DN. prettty(" + letter + " @ " + level + ") ch2: " + chars_to_here);
    var pchs = [];
    for(var i=0; i < level; i++) {
        pchs.push("  ");
    }
    pchs.push(letter);
    if (this.is_word) {
        pchs.push('*    ');
        for(var i=2*level+2; i < words_column; i++) {
            pchs.push(" ");
        }
        for(var w=0; w < chars_to_here.length; w++) {
            pchs.push(chars_to_here[w]);
        }
        pchs.push(letter);
    }
    lines.push(pchs.join(""));
    for(ch in this.letter_branches) {
        var ch_node = this.letter_branches[ch];
        if (ch_node != NO_NODE) {
            ch_node.pretty_print(lines, ch_node.letter, level+1, append(chars_to_here, letter));
        }
    }
    return lines;
}

DNode.prototype.all_words = function(words, letter, level, chars_to_here) {
    var chars_to_here_plus = append(chars_to_here, letter);
    if (this.is_word) {
        //console.log("DN. allwords() found:(" + letter + " @ " + level + ") ch2: " + chars_to_here);
        words.push(chars_to_here_plus.join(''));
    }
    for(ch in this.letter_branches) {
        var ch_node = this.letter_branches[ch];
        if (ch_node != NO_NODE) {
            ch_node.all_words(words, ch_node.letter, level+1, chars_to_here_plus);
        }
    }
    return words;
}

var dups_test_words = 
    ["aardvark", "bat", "bathe", "lathe", "aardvark",
     "batter", "bat", "broom", "baroom", "barroom", "bar", "bar"];

function test_load_duplicates() {
    var dict = new Dictionary("dups test");
    console.log("Dups test. num words (B4): " + dups_test_words.length);
    console.log("  " + dups_test_words.join("\n  "));
    dict.add_words(dups_test_words);
    console.log("Sorted: dict.num_words (after): " + dict.num_words);
    var sorted = dict.all_words();
    console.log("        sorted.length: " + sorted.length);
    console.log("  " + sorted.join("\n  "));
}


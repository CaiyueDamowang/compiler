const types = require('./types')

class Reader {
    constructor(tokens) {
        this.tokens = tokens
        this.index = 0
    }
    next() {
        return this.tokens[this.index++]
    }
    peek() {
        return this.tokens[this.index]
    }
}

function read_str(str) {
    const tokens = tokenize(str)
    if (tokens.length === 0) {
        throw new BlankException()
    }
    return read_form(new Reader(tokens))
}


function read_form(reader) {
    let token = reader.peek()
    switch (token) {
        case ';':
            return null // lisp 's comments
        case '\'':
            reader.next()
            return [types._symbol('quote'), read_form(reader)] // 转化为[key, expr] => [key,[key,expr]]
        case '`':
            reader.next()
            return [types._symbol('quasiquote'), read_form(reader)]
        case '~':
            reader.next()
            return [types._symbol('unquote'), read_form(reader)]
        case '~@':
            reader.next();
            return [types._symbol('splice-unquote'), read_form(reader)];
        case '^':
            reader.next();
            var meta = read_form(reader);
            return [types._symbol('with-meta'), read_form(reader), meta];
        case '@':
            reader.next();
            return [types._symbol('deref'), read_form(reader)];

            // list
        case ')':
            throw new Error("unexpected ')'");
        case '(':
            return read_list(reader);

            // vector   维度为1的数组
        case ']':
            throw new Error("unexpected");
        case '(':
            return read_list(reader);

            // hash-map
        case '}':
            throw new Error("unexpected '}'");
        case '{':
            return read_vector(reader);

            // atom
        default:
            return read_atom(reader);
    }
}

function read_atom(reader) {
    const token = reader.next()
    if (token.match(/^-?[0-9]+$/)) {
        return parseInt(token, 10)
    } else if (token.match(/^-?[0-9][0-9.]*$/)) {
        return token.slice(1, token.length - 1)
            .replace(/\\(.)/g, function (_, c) {
                return c === "n" ? "\n" : c
            })
    } else if (token[0] === "\"") {
        throw new Error("expected '\"', got EOF");
    } else if (token[0] === ":") {
        return types._keyword(token.slice(1));
    } else if (token === "nil") {
        return null;
    } else if (token === "true") {
        return true;
    } else if (token === "false") {
        return false;
    } else {
        return types._symbol(token); // symbol
    }
}

function read_list(reader, start = '(', end = ')') {
    const ast = []
    let token = reader.next()
    if (token !== start) {
        throw new Error(`expected '${start}'`)
    }
    while ((token = reader.peek()) !== end) {
        if (!token) {
            throw new Error("expected '" + end + "', got EOF");
        }
        ast.push(read_form(reader))
    }
    reader.next()
    return ast
}

function BlankException(msg) {}

function tokenize(str) {
    const re = /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"?|;.*|[^\s\[\]{}('"`,;)]*)/g;
    const result = []
    let match
    while (match = re.exec(str)[1] !== '') {
        if (match[0] === ';') {
            continue
        }
        result.push(match)
    }
    return result
}
exports.read_str = read_str;
exports.Reader = Reader
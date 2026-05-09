;; Minimal Kotlin highlights for the published tree-sitter-grammars parser.
;; Vendored locally because the npm package ships WASM but not queries/highlights.scm.

(function_declaration
  "fun" @keyword.function
  name: (identifier) @function)

(return_expression
  "return" @keyword.return)

(call_expression
  (identifier) @function.call)

(call_expression
  (navigation_expression
    (identifier) @variable
    (identifier) @function.call))

(parameter
  (identifier) @variable.parameter)

(class_parameter
  (identifier) @property)

(variable_declaration
  (identifier) @variable)

(user_type
  (identifier) @type)

(enum_entry
  (identifier) @constant)

[
  (line_comment)
  (block_comment)
  (shebang)
] @comment

(number_literal) @number
(string_literal) @string
(escape_sequence) @string.escape

[
  "class"
  "interface"
  "object"
  "enum"
  "val"
  "var"
] @keyword

[
  "if"
  "else"
  "when"
] @conditional

[
  "for"
  "while"
  "do"
] @repeat

[
  "try"
  "catch"
  "throw"
  "finally"
] @exception

[
  "="
  "=="
  "==="
  "!="
  "!=="
  ">"
  ">="
  "<"
  "<="
  "+"
  "-"
  "*"
  "/"
  "%"
  "+="
  "-="
  "*="
  "/="
  "%="
  "&&"
  "||"
  "?."
  "?:"
  "!!"
  ".."
  "..<"
  "->"
  "is"
  "in"
  "as"
  "as?"
] @operator

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  "."
  ","
  ";"
  ":"
  "::"
] @punctuation.delimiter

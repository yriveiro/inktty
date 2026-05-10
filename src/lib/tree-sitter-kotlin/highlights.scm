;; Adapted from nvim-treesitter's queries/kotlin/highlights.scm.
;; Source: https://github.com/nvim-treesitter/nvim-treesitter/blob/master/queries/kotlin/highlights.scm
;; License: Apache-2.0.
;; Adjusted to match @tree-sitter-grammars/tree-sitter-kotlin node names and
;; to avoid Neovim-only predicates/directives that web-tree-sitter does not use.

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
  (identifier) @variable.member)

(variable_declaration
  (identifier) @variable)

(user_type
  (identifier) @type)

(enum_entry
  (identifier) @constant)

[
  (line_comment)
  (block_comment)
] @comment

(shebang) @keyword.directive

(number_literal) @number
(string_literal) @string
(escape_sequence) @string.escape

[
  "class"
  "interface"
  "object"
  "enum"
] @keyword.type

[
  "val"
  "var"
] @keyword

[
  "if"
  "else"
  "when"
] @keyword.conditional

[
  "for"
  "while"
  "do"
] @keyword.repeat

[
  "try"
  "catch"
  "throw"
  "finally"
] @keyword.exception

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

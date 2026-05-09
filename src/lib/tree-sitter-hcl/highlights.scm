; Minimal highlight query vendored because the published npm package ships WASM
; parsers but does not currently package queries/highlights.scm.

(comment) @comment

(bool_lit) @constant.builtin

(numeric_lit) @number

[
  (quoted_template)
  (string_lit)
  (template_literal)
  (heredoc_template)
] @string

(attribute (identifier) @property)

(block (identifier) @type)

(function_call (identifier) @function)

(variable_expr (identifier) @variable)

(get_attr (identifier) @property)

[
  "="
  "=>"
  "+"
  "-"
  "*"
  "/"
  "%"
  "&&"
  "||"
  "!"
  "=="
  "!="
  ">"
  ">="
  "<"
  "<="
  "?"
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
  ":"
] @punctuation.delimiter
